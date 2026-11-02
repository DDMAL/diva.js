import {expect, test} from "@playwright/test";
import {build} from "esbuild";

test.beforeEach(async ({page}) => {
    // Optional historical source snapshot for matched before/after measurements.
    const bundle = await build({entryPoints : [process.env.DIVA_FILTER_SOURCE || "src/filters.ts"], bundle : true, write : false,
                                minify : true, format : "iife", globalName : "ProcessingFilters", target : "es2019"});
    await page.goto("/");
    await page.addScriptTag({content : bundle.outputFiles[0].text});
});

test("preserves LUT bytes, alpha, stage operations and synchronous completion", async ({page}) => {
    const result = await page.evaluate(() => {
        const {Filters} = (window as any).ProcessingFilters;
        // Independent pre-Step-8 canvas/transform path. Keep its stage boundaries
        // and number[] -> Uint8ClampedArray conversion as the reference.
        const reference = (context: CanvasRenderingContext2D, lut: number[], channel?: number) => {
            const scratch = document.createElement("canvas");
            scratch.width = context.canvas.width;
            scratch.height = context.canvas.height;
            const work = scratch.getContext("2d", {willReadFrequently : true})!;
            work.clearRect(0, 0, scratch.width, scratch.height);
            work.drawImage(context.canvas, 0, 0);
            const image = work.getImageData(0, 0, scratch.width, scratch.height);
            const out = [0, 0, 0, 0];
            for (let i = 0; i < image.data.length; i += 4)
            {
                for (let c = 0; c < 4; c += 1)
                    out[c] = c < 3 && (channel === undefined || c === channel) ? lut[image.data[i + c]] : image.data[i + c];
                for (let c = 0; c < 4; c += 1) image.data[i + c] = out[c];
            }
            work.putImageData(image, 0, 0);
            context.clearRect(0, 0, scratch.width, scratch.height);
            context.drawImage(scratch, 0, 0);
        };
        const table = (fn: (value: number) => number) => Array.from({length : 256}, (_, i) => fn(i));
        const clamp = (value: number) => Math.max(0, Math.min(255, value));
        const cases = [
            {processor : Filters.BRIGHTNESS(0.5), lut : table(i => i + 0.5)},
            {processor : Filters.BRIGHTNESS(-127.5), lut : table(i => i - 127.5)},
            {processor : Filters.CONTRAST(1.5), lut : table(i => i * 1.5)},
            {processor : Filters.GAMMA(0.8), lut : table(i => Math.pow(i / 255, 0.8) * 255)},
            {processor : Filters.GAMMA(0), lut : table(() => 255)},
            {processor : Filters.INVERT(), lut : table(i => 255 - i)},
            ...[0, 1, 2].flatMap(channel => [
                {processor : Filters[["ALT_RED_GAMMA", "ALT_GREEN_GAMMA", "ALT_BLUE_GAMMA"][channel]](37),
                 lut : table(i => clamp(Math.pow(i / 255, 1 - 0.37 * 0.8) * 255)), channel},
                {processor : Filters[["ALT_RED_SIGMOID", "ALT_GREEN_SIGMOID", "ALT_BLUE_SIGMOID"][channel]](61),
                 lut : table(i => clamp(i + (255 / (1 + Math.exp(-8 * (i / 255 - 0.5))) - i) * 0.61)), channel},
                {processor : Filters[["ALT_RED_VIBRANCE", "ALT_GREEN_VIBRANCE", "ALT_BLUE_VIBRANCE"][channel]](43),
                 lut : table(i => clamp(i + (255 - i) * ((i / 255) * (i / 255) * 0.43))), channel}
            ])
        ];
        const errors: string[] = [];
        let completions = 0;
        for (const [width, height] of [[1, 1], [3, 7], [19, 2], [256, 4], [2, 1]])
        {
            const contexts = [0, 1].map(() => {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                return canvas.getContext("2d", {willReadFrequently : true})!;
            });
            const [actual, expected] = contexts;
            const seed = actual.createImageData(width, height);
            for (let p = 0; p < width * height; p += 1)
                seed.data.set([p % 256, (p * 17 + 1) % 256, (p * 31 + 2) % 256, [0, 1, 127, 255][p % 4]], p * 4);
            for (const chain of [...cases.map(item => [item]), cases])
            {
                for (const context of contexts) context.putImageData(seed, 0, 0);
                for (const item of chain)
                {
                    reference(expected, item.lut, "channel" in item ? item.channel : undefined);
                    let returned = false;
                    let calls = 0;
                    const operations = {getImageData : 0, putImageData : 0, clearRect : 0, drawImage : 0};
                    const prototype = CanvasRenderingContext2D.prototype as any;
                    const originals = Object.fromEntries(Object.keys(operations).map(name => [name, prototype[name]]));
                    for (const name of Object.keys(operations)) prototype[name] = function(...args: any[]) {
                        operations[name as keyof typeof operations] += 1;
                        return originals[name].apply(this, args);
                    };
                    try
                    {
                        item.processor(actual, () => {
                            if (returned || calls++) errors.push("callback timing/count");
                            if (operations.putImageData !== 1 || operations.drawImage !== 2) errors.push("callback before writeback");
                            completions += 1;
                        });
                        returned = true;
                    }
                    finally { Object.assign(prototype, originals); }
                    if (calls !== 1) errors.push("missing callback");
                    if (JSON.stringify(operations) !== JSON.stringify({getImageData : 1, putImageData : 1, clearRect : 2, drawImage : 2}))
                        errors.push(JSON.stringify(operations));
                    const bytes = contexts.map(context => Array.from(context.getImageData(0, 0, width, height).data));
                    if (JSON.stringify(bytes[0]) !== JSON.stringify(bytes[1])) errors.push(`pixels ${width}x${height}`);
                }
            }
        }
        // Existing no-ops complete without canvas access; failures must not complete.
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        const original = Filters._ensureScratchContext;
        Filters._ensureScratchContext = () => { throw new Error("read failed"); };
        let noops = 0;
        for (const processor of [Filters.ALT_RED_GAMMA(0), Filters.BACKGROUND_NORMALIZE(0), Filters.UNSHARP_MASK(0)])
            processor(context, () => { noops += 1; });
        let failedCompletion = false;
        let threw = 0;
        try
        {
            for (const processor of [Filters.BRIGHTNESS(1), Filters.SATURATION(10)])
            {
                try { processor(context, () => { failedCompletion = true; }); }
                catch (error) { if ((error as Error).message === "read failed") threw += 1; }
            }
        }
        finally { Filters._ensureScratchContext = original; }
        return {errors, completions, noops, threw, failedCompletion};
    });
    expect(result).toEqual({errors : [], completions : 150, noops : 3, threw : 2, failedCompletion : false});
});

test("measures warmed optimized filter processing without timing assertions", async ({page}, testInfo) => {
    const measurements = await page.evaluate(() => {
        const {Filters} = (window as any).ProcessingFilters;
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d", {willReadFrequently : true})!;
        const seed = context.createImageData(256, 256);
        for (let p = 0; p < 256 * 256; p += 1)
            seed.data.set([p % 256, (p * 17) % 256, (p * 31) % 256, [0, 1, 127, 255][p % 4]], p * 4);
        const chains = {
            rgb : [Filters.BRIGHTNESS(17), Filters.CONTRAST(1.3), Filters.GAMMA(0.8), Filters.INVERT()],
            channel : [Filters.ALT_RED_GAMMA(37), Filters.ALT_GREEN_SIGMOID(61), Filters.ALT_BLUE_VIBRANCE(43)],
            mixed : [Filters.BRIGHTNESS(17), Filters.SATURATION(20), Filters.INVERT()],
            neighborhood : [Filters.BRIGHTNESS(-1), Filters.CONVOLUTION([0, -1, 0, -1, 5, -1, 0, -1, 0]), Filters.UNSHARP_MASK(1)]
        };
        const samples: Record<string, number[]> = {};
        for (const [name, processors] of Object.entries(chains))
        {
            samples[name] = [];
            for (let run = 0; run < 25; run += 1)
            {
                context.putImageData(seed, 0, 0);
                const start = performance.now();
                for (const processor of processors) processor(context, () => {});
                if (run >= 10) samples[name].push(performance.now() - start);
            }
        }
        return {samples, dimensions : [256, 256], userAgent : navigator.userAgent};
    });
    console.log(`[filter-processing] ${JSON.stringify(measurements)}`);
    await testInfo.attach("filter-processing.json", {body : JSON.stringify(measurements), contentType : "application/json"});
});

test("isolates scratch work and original pixels across two viewers and tile sizes", async ({page}, testInfo) => {
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "openseadragon5" : "openseadragon";
    await page.addScriptTag({url : `/node_modules/${osd}/build/openseadragon/openseadragon.min.js`});
    const result = await page.evaluate(() => {
        const {Filters, setFilterOptions} = (window as any).ProcessingFilters;
        const createViewer = () => {
            const element = document.createElement("div");
            element.style.cssText = "width:200px;height:200px";
            document.body.appendChild(element);
            return (window as any).OpenSeadragon({element, drawer : "canvas", showNavigationControl : false});
        };
        const viewers = [createViewer(), createViewer()];
        const chain = () => [Filters.BRIGHTNESS(0.5), Filters.MORPHOLOGICAL_OPERATION(3, Math.max),
                             Filters.CONVOLUTION([0, -1, 0, -1, 5, -1, 0, -1, 0]), Filters.INVERT()];
        const contexts = [[3, 7], [19, 2], [1, 1], [2, 31]].map(([width, height]) => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", {willReadFrequently : true})!;
            const image = context.createImageData(width, height);
            for (let p = 0; p < width * height; p += 1)
                image.data.set([p % 256, (p * 17) % 256, (p * 31) % 256, [0, 1, 127, 255][p % 4]], p * 4);
            context.putImageData(image, 0, 0);
            return context;
        });
        const pixels = (context: CanvasRenderingContext2D) => Array.from(context.getImageData(0, 0, context.canvas.width, context.canvas.height).data);
        const originals = contexts.map(pixels);
        // Serial independent runs establish the expected chain output. The plugin
        // runs below alternate viewers/dimensions using the same shared scratch.
        const expected = contexts.map(context => {
            const copy = document.createElement("canvas");
            copy.width = context.canvas.width;
            copy.height = context.canvas.height;
            const work = copy.getContext("2d", {willReadFrequently : true})!;
            work.putImageData(context.getImageData(0, 0, copy.width, copy.height), 0, 0);
            for (const processor of chain()) processor(work, () => {});
            return pixels(work);
        });
        const draw = (index: number) => viewers[index % 2].raiseEvent("tile-drawing", {tile : {}, rendered : contexts[index]});
        for (const viewer of viewers) setFilterOptions(viewer, {filters : {processors : chain()}});
        for (let i = 0; i < contexts.length; i += 1) draw(i);
        const filtered = contexts.map(pixels);
        for (const viewer of viewers) setFilterOptions(viewer, {filters : []});
        for (let i = contexts.length - 1; i >= 0; i -= 1) draw(i);
        const restored = contexts.map(pixels);
        for (const viewer of viewers) setFilterOptions(viewer, {filters : {processors : chain()}});
        for (let i = contexts.length - 1; i >= 0; i -= 1) draw(i);
        const reapplied = contexts.map(pixels);
        const alpha = [Filters.GREYSCALE(), Filters.THRESHOLDING(128), Filters.COLORMAP(Array.from({length : 256}, (_, i) => [i, i, i]), 128)]
            .map(processor => {
                const context = contexts[0];
                const image = context.createImageData(context.canvas.width, context.canvas.height);
                image.data.set(originals[0]);
                context.putImageData(image, 0, 0);
                processor(context, () => {});
                return pixels(context).filter((_value, index) => index % 4 === 3).every(value => value === 255);
            });
        viewers.forEach(viewer => viewer.destroy());
        return {filtered : JSON.stringify(filtered) === JSON.stringify(expected),
                restored : JSON.stringify(restored) === JSON.stringify(originals),
                reapplied : JSON.stringify(reapplied) === JSON.stringify(expected), alpha};
    });
    expect(result).toEqual({filtered : true, restored : true, reapplied : true, alpha : [true, true, true]});
});
