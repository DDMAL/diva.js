import {expect, test} from "@playwright/test";
import {build} from "esbuild";

test.beforeEach(async ({page}) => {
    const bundle = await build({entryPoints : ["src/filters.ts"], bundle : true, write : false,
                                minify : true, format : "iife", globalName : "BatchFilters", target : "es2019"});
    await page.goto("/");
    await page.addScriptTag({content : bundle.outputFiles[0].text});
});

test("batches only adjacent compatible stages and preserves opaque and transparent bytes", async ({page}) => {
    const results = await page.evaluate(() => {
        const {Filters: F, batchFilterProcessors} = (window as any).BatchFilters;
        const colorMap = Array.from({length : 256}, (_, i) => [i, 255 - i, i]);
        const chains = [
            {name : "tone", groups : 1, factory : () => [F.BRIGHTNESS(0.5), F.CONTRAST(1.5), F.GAMMA(0.8), F.INVERT()]},
            {name : "channels", groups : 1, factory : () => [F.ALT_RED_GAMMA(37), F.ALT_GREEN_SIGMOID(61), F.ALT_BLUE_VIBRANCE(43)]},
            {name : "pointwise", groups : 1, factory : () => [F.BRIGHTNESS(-127.5), F.SATURATION(21), F.VIBRANCE(17), F.HUE(25),
                F.CC_RED(31), F.CC_GREEN(-29), F.CC_BLUE(13), F.COLOR_REPLACE("#ffffff", "#123456", 128, 0.6, true),
                F.PSEUDOCOLOR("heat", 0.5, 1.5, 1), F.ALT_RED_HUE(20, 8)]},
            {name : "alpha-forcing", groups : 1, factory : () => [F.GREYSCALE(), F.THRESHOLDING(128), F.INVERT()]},
            {name : "convolution", groups : 3, factory : () => [F.BRIGHTNESS(17), F.GAMMA(0.8),
                F.CONVOLUTION([0, -1, 0, -1, 5, -1, 0, -1, 0]), F.CONTRAST(1.3), F.INVERT()]},
            {name : "morphology", groups : 3, factory : () => [F.BRIGHTNESS(17), F.GAMMA(0.8),
                F.MORPHOLOGICAL_OPERATION(3, Math.max), F.CONTRAST(1.3), F.INVERT()]},
            {name : "pca", groups : 3, factory : () => [F.BRIGHTNESS(17), F.GAMMA(0.8),
                F.GLOBAL_PCA_COLOR("pca-rgb", 15), F.CONTRAST(1.3), F.INVERT()]},
            {name : "colormap", groups : 3, factory : () => [F.BRIGHTNESS(17), F.GAMMA(0.8),
                F.COLORMAP(colorMap, 128), F.CONTRAST(1.3), F.INVERT()]}
        ];
        const failures: string[] = [];
        const counts: Record<string, number> = {};
        for (const [width, height] of [[1, 1], [3, 7], [256, 4], [64, 64], [2, 1]])
        for (const opacity of ["opaque", "transparent", "late-alpha"])
        for (const chain of chains)
        {
            const opaque = opacity === "opaque";
            const contexts = [0, 1].map(() => {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                return canvas.getContext("2d", {willReadFrequently : true})!;
            });
            const seed = contexts[0].createImageData(width, height);
            for (let p = 0; p < width * height; p += 1)
                seed.data.set([p % 256, (p * 17 + 1) % 256, (p * 31 + 2) % 256,
                               opacity === "transparent" ? [0, 1, 2, 63, 127, 128, 254, 255][p % 8] : 255], p * 4);
            if (opacity === "late-alpha") seed.data[seed.data.length - 1] = 127;
            contexts.forEach(context => context.putImageData(seed, 0, 0));
            const original = chain.factory();
            const batched = batchFilterProcessors(chain.factory());
            if (batched.length !== chain.groups) failures.push(`${chain.name}: groups ${batched.length}`);
            for (const processor of original) processor(contexts[0], () => {});
            const prototype = CanvasRenderingContext2D.prototype;
            const get = prototype.getImageData;
            const put = prototype.putImageData;
            let reads = 0;
            let writes = 0;
            prototype.getImageData = function(...args: Parameters<typeof get>) {
                reads += 1;
                return get.apply(this, args);
            };
            prototype.putImageData = function(...args: Parameters<typeof put>) {
                writes += 1;
                return put.apply(this, args);
            };
            try
            {
                for (const processor of batched)
                {
                    let calls = 0;
                    let returned = false;
                    const previousWrites = writes;
                    processor(contexts[1], () => {
                        if (returned || calls++) failures.push("completion timing/count");
                        if (writes <= previousWrites || writes !== reads) failures.push("completion before writeback");
                    });
                    returned = true;
                    if (calls !== 1) failures.push("completion missing");
                }
            }
            finally { prototype.getImageData = get; prototype.putImageData = put; }
            if (opaque && reads !== chain.groups) failures.push(`${chain.name}: opaque reads ${reads}`);
            if (writes !== reads) failures.push(`${chain.name}: writes ${writes} / reads ${reads}`);
            // Alpha-preserving chains must retain every boundary on transparency.
            if (!opaque && ["tone", "channels", "pointwise"].includes(chain.name) && reads !== original.length)
                failures.push(`${chain.name}: transparent reads ${reads}`);
            const pixels = contexts.map(context => Array.from(get.call(context, 0, 0, width, height).data));
            if (JSON.stringify(pixels[0]) !== JSON.stringify(pixels[1])) failures.push(`${chain.name}: pixels ${width}x${height}/${opacity}`);
            if (width === 256 && chain.name === "tone") counts[opaque ? "opaque" : "transparent"] = reads;
        }
        return {failures, counts};
    });
    expect(results).toEqual({failures : [], counts : {opaque : 1, transparent : 4}});
});

test("retains custom processor boundaries and non-default canvas compositing", async ({page}) => {
    const result = await page.evaluate(() => {
        const {Filters: F, batchFilterProcessors} = (window as any).BatchFilters;
        const custom = (context: CanvasRenderingContext2D, done: () => void) => {
            context.fillStyle = "rgba(20,40,80,0.5)";
            context.fillRect(0, 0, 3, 3);
            done();
        };
        const original = [F.BRIGHTNESS(0.5), F.CONTRAST(1.5), custom, F.GAMMA(0.8), F.INVERT()];
        const batch = batchFilterProcessors(original);
        const matches = [];
        for (const mode of ["alpha", "composite", "transform", "shadow", "filter"])
        {
            const contexts = [0, 1].map(() => {
                const canvas = document.createElement("canvas");
                canvas.width = 8;
                canvas.height = 4;
                const context = canvas.getContext("2d", {willReadFrequently : true})!;
                context.fillStyle = "#123456";
                context.fillRect(0, 0, 8, 4);
                if (mode === "alpha") context.globalAlpha = 0.5;
                if (mode === "composite") context.globalCompositeOperation = "copy";
                if (mode === "transform") context.translate(1, 0);
                if (mode === "shadow") { context.shadowColor = "red"; context.shadowBlur = 1; }
                if (mode === "filter") context.filter = "brightness(80%)";
                return context;
            });
            for (const processor of original) processor(contexts[0], () => {});
            for (const processor of batch) processor(contexts[1], () => {});
            matches.push(JSON.stringify(Array.from(contexts[0].getImageData(0, 0, 8, 4).data)) ===
                         JSON.stringify(Array.from(contexts[1].getImageData(0, 0, 8, 4).data)));
        }
        const single = F.INVERT();
        return {groups : batch.length, customRetained : batch[1] === custom,
                singleRetained : batchFilterProcessors([single])[0] === single,
                empty : batchFilterProcessors([]), matches};
    });
    expect(result).toEqual({groups : 3, customRetained : true, singleRetained : true, empty : [], matches : [true, true, true, true, true]});
});

test("propagates read and caller-table failures without completing failed stages", async ({page}) => {
    const result = await page.evaluate(() => {
        const {Filters: F, batchFilterProcessors} = (window as any).BatchFilters;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 8;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#123456";
        context.fillRect(0, 0, 8, 8);
        let completions = 0;
        let readFailed = false;
        const getScratch = F._ensureScratchContext;
        F._ensureScratchContext = () => { throw new Error("read failed"); };
        try { batchFilterProcessors([F.BRIGHTNESS(17), F.GAMMA(0.8)])[0](context, () => { completions += 1; }); }
        catch (error) { readFailed = (error as Error).message === "read failed"; }
        finally { F._ensureScratchContext = getScratch; }
        const factory = () => [F.BRIGHTNESS(17), F.GAMMA(0.8), F.COLORMAP([], 128), F.INVERT()];
        const outputs = [];
        let tableFailures = 0;
        for (const processors of [factory(), batchFilterProcessors(factory())])
        {
            context.fillStyle = "#123456";
            context.fillRect(0, 0, 8, 8);
            try { for (const processor of processors) processor(context, () => {}); }
            catch { tableFailures += 1; }
            outputs.push(Array.from(context.getImageData(0, 0, 8, 8).data));
        }
        return {completions, readFailed, tableFailures, matches : JSON.stringify(outputs[0]) === JSON.stringify(outputs[1])};
    });
    expect(result).toEqual({completions : 0, readFailed : true, tableFailures : 2, matches : true});
});

test("preserves PCA fallback and learned-basis streams across batch boundaries", async ({page}) => {
    const failures = await page.evaluate(() => {
        const {Filters: F, batchFilterProcessors} = (window as any).BatchFilters;
        const failures: string[] = [];
        for (const mode of ["pca-rgb", "pca1", "pca2", "pca3"])
        {
            const factory = () => [F.BRIGHTNESS(0.5), F.SATURATION(21), F.GLOBAL_PCA_COLOR(mode, 37), F.CONTRAST(1.5), F.INVERT()];
            const original = factory();
            const stages = factory();
            const batched = batchFilterProcessors(stages);
            if (batched[1] !== stages[2] || batched.length !== 3) failures.push("PCA grouping");
            // The first tile uses local PCA, the next crosses the global-basis
            // threshold, and subsequent uniform/near-uniform tiles reuse it.
            for (const [size, kind] of [[8, "varied"], [192, "varied"], [3, "uniform"], [7, "near-uniform"]] as const)
            {
                const contexts = [0, 1].map(() => {
                    const canvas = document.createElement("canvas");
                    canvas.width = canvas.height = size;
                    const context = canvas.getContext("2d", {willReadFrequently : true})!;
                    const image = context.createImageData(size, size);
                    for (let p = 0; p < size * size; p += 1)
                        image.data.set(kind === "varied" ? [p % 256, p * 17 % 256, p * 31 % 256, 255]
                            : [128, 128 + (kind === "near-uniform" ? p % 2 : 0), 128, 255], p * 4);
                    context.putImageData(image, 0, 0);
                    return context;
                });
                for (const processor of original) processor(contexts[0], () => {});
                for (const processor of batched) processor(contexts[1], () => {});
                if (JSON.stringify(Array.from(contexts[0].getImageData(0, 0, size, size).data)) !==
                    JSON.stringify(Array.from(contexts[1].getImageData(0, 0, size, size).data))) failures.push(`${mode}/${kind}`);
            }
        }
        return failures;
    });
    expect(failures).toEqual([]);
});

test("cancels superseded tile callbacks before entering the next batch", async ({page}) => {
    const result = await page.evaluate(() => {
        const {Filters: F, batchFilterProcessors, setFilterOptions} = (window as any).BatchFilters;
        const handlers: Record<string, (event: any) => void> = {};
        const viewer: any = {addHandler : (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
                             forceRedraw : () => {}};
        const source = document.createElement("canvas");
        source.width = source.height = 8;
        source.getContext("2d")!.fillRect(0, 0, 8, 8);
        let resume = () => {};
        const waiting = (_context: CanvasRenderingContext2D, done: () => void) => { resume = done; };
        let staleCompletions = 0;
        let currentCompletions = 0;
        setFilterOptions(viewer, {loadMode : "sync", filters : {processors : batchFilterProcessors([
            F.BRIGHTNESS(17), F.CONTRAST(1.3), waiting, F.GAMMA(0.8), F.INVERT()
        ])}});
        const oldTile: any = {};
        handlers["tile-loaded"]({tile : oldTile, data : source, getCompletionCallback : () => () => { staleCompletions += 1; }});
        const heldPixels = Array.from(oldTile._renderedContext.getImageData(0, 0, 8, 8).data);
        const factory = () => [F.BRIGHTNESS(31), F.GAMMA(0.5), F.INVERT()];
        setFilterOptions(viewer, {loadMode : "sync", filters : {processors : batchFilterProcessors(factory())}});
        resume();
        const stoppedBeforeNextBatch = JSON.stringify(heldPixels) ===
            JSON.stringify(Array.from(oldTile._renderedContext.getImageData(0, 0, 8, 8).data));
        const currentTile: any = {};
        handlers["tile-loaded"]({tile : currentTile, data : source, getCompletionCallback : () => () => { currentCompletions += 1; }});
        const reference = document.createElement("canvas");
        reference.width = reference.height = 8;
        const context = reference.getContext("2d")!;
        context.drawImage(source, 0, 0);
        for (const processor of factory()) processor(context, () => {});
        const expected = Array.from(context.getImageData(0, 0, 8, 8).data);
        const current = Array.from(currentTile._renderedContext.getImageData(0, 0, 8, 8).data);
        // A superseded source's cached rendering must be discarded rather than
        // copied over the replacement settings on a later tile-drawing event.
        context.drawImage(source, 0, 0);
        handlers["tile-drawing"]({tile : oldTile, rendered : context});
        return {staleCompletions, currentCompletions, stoppedBeforeNextBatch, currentMatches : JSON.stringify(current) === JSON.stringify(expected),
                staleDiscarded : !oldTile._renderedContext,
                redrawnMatches : JSON.stringify(Array.from(context.getImageData(0, 0, 8, 8).data)) === JSON.stringify(expected)};
    });
    expect(result).toEqual({staleCompletions : 0, currentCompletions : 1, stoppedBeforeNextBatch : true,
                            currentMatches : true, staleDiscarded : true, redrawnMatches : true});
});

test("measures matched staged and batched chains on opaque and transparent tiles", async ({page}, testInfo) => {
    const results = await page.evaluate(() => {
        const {Filters: F, batchFilterProcessors} = (window as any).BatchFilters;
        const samples: Record<string, number[]> = {};
        for (const opacity of ["opaque", "transparent", "late-alpha"])
        for (const size of [256, 512])
        {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = size;
            const context = canvas.getContext("2d", {willReadFrequently : true})!;
            const seed = context.createImageData(size, size);
            for (let p = 0; p < size * size; p += 1)
                seed.data.set([p % 256, (p * 17) % 256, (p * 31) % 256,
                    opacity === "transparent" ? [0, 1, 127, 255][p % 4] : 255], p * 4);
            if (opacity === "late-alpha") seed.data[seed.data.length - 1] = 127;
            const staged = [F.BRIGHTNESS(17), F.CONTRAST(1.3), F.GAMMA(0.8), F.INVERT()];
            const batch = batchFilterProcessors(staged);
            for (let run = 0; run < 30; run += 1)
            for (const name of (run % 2 ? ["staged", "batch"] : ["batch", "staged"]))
            {
                context.putImageData(seed, 0, 0);
                const start = performance.now();
                for (const processor of name === "batch" ? batch : staged) processor(context, () => {});
                const elapsed = performance.now() - start;
                const key = `${size}/${opacity}/${name}`;
                samples[key] ||= [];
                if (run >= 10) samples[key].push(elapsed);
            }
        }
        return {samples, userAgent : navigator.userAgent};
    });
    console.log(`[filter-batching] ${JSON.stringify(results)}`);
    await testInfo.attach("filter-batching.json", {body : JSON.stringify(results), contentType : "application/json"});
});
