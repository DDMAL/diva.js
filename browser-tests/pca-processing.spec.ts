import {expect, test} from "@playwright/test";
import {build} from "esbuild";
import expectedPixels from "./fixtures/pca-pixels.json";

test.beforeEach(async ({page}) => {
    const bundle = await build({entryPoints : [process.env.DIVA_FILTER_SOURCE || "src/filters.ts"], bundle : true, write : false,
                                minify : true, format : "iife", globalName : "PcaFilters", target : "es2019"});
    await page.goto("/");
    await page.addScriptTag({content : bundle.outputFiles[0].text});
    if (process.env.PCA_BASELINE_SOURCE)
    {
        const reference = await build({entryPoints : [process.env.PCA_BASELINE_SOURCE], bundle : true, write : false,
                                       minify : true, format : "iife", globalName : "BaselinePcaFilters", target : "es2019"});
        await page.addScriptTag({content : reference.outputFiles[0].text});
    }
});

test("preserves exact PCA pixels through local fallback, basis learning and reset", async ({page}) => {
    const results = await page.evaluate(async () => {
        const {Filters} = (window as any).PcaFilters;
        const snapshots = [];
        let completions = 0;
        for (const mode of ["pca-rgb", "pca1", "pca2", "pca3"])
        for (const hue of [-180, -37, 0, 37, 180])
        {
            const outputs: Uint8ClampedArray[] = [];
            const process = (processor: any, width: number, height: number, kind: string) => {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext("2d", {willReadFrequently : true})!;
                const image = context.createImageData(width, height);
                let state = 123456789;
                for (let p = 0; p < width * height; p += 1)
                {
                    state ^= state << 13;
                    state ^= state >>> 17;
                    state ^= state << 5;
                    image.data.set(kind === "uniform" ? [128, 128, 128, 255]
                        : kind === "near-uniform" ? [128, 128 + p % 2, 128 + p % 3, 255]
                        : [state & 255, state >>> 8 & 255, state >>> 16 & 255,
                           kind === "transparent" ? [0, 1, 127, 128, 254, 255][p % 6] : 255], p * 4);
                }
                context.putImageData(image, 0, 0);
                let calls = 0;
                processor(context, () => { calls += 1; completions += 1; });
                if (calls !== 1) throw new Error("PCA completion changed");
                outputs.push(context.getImageData(0, 0, width, height).data);
            };
            // Fresh processors: all these tiles remain on local min/max output.
            for (const [width, height, kind] of [[1, 1, "uniform"], [7, 5, "uniform"], [7, 5, "near-uniform"],
                                                [8, 4, "transparent"], [19, 2, "varied"]] as const)
                process(Filters.GLOBAL_PCA_COLOR(mode, hue), width, height, kind);
            // A continuous stream: 1,990 samples, then nine, then one crosses the
            // real threshold. Uniform/transparent tiles subsequently reuse it.
            const stream = Filters.GLOBAL_PCA_COLOR(mode, hue);
            for (const [width, height, kind] of [[160, 199, "varied"], [8, 18, "varied"], [4, 4, "varied"],
                                                [7, 5, "uniform"], [7, 5, "near-uniform"], [8, 4, "transparent"]] as const)
                process(stream, width, height, kind);
            // A new source/settings processor starts from local fallback again.
            process(Filters.GLOBAL_PCA_COLOR(mode, hue), 8, 4, "transparent");
            if (JSON.stringify(Array.from(outputs[3])) !== JSON.stringify(Array.from(outputs[outputs.length - 1])))
                throw new Error("Fresh PCA processor retained an old basis");
            const bytes = new Uint8Array(outputs.reduce((length, output) => length + output.length, 0));
            let offset = 0;
            for (const output of outputs) { bytes.set(output, offset); offset += output.length; }
            const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
            snapshots.push({mode, hue, sha256 : Array.from(digest, value => value.toString(16).padStart(2, "0")).join("")});
        }
        return {snapshots, completions};
    });
    // Frozen from 896e9c2 before Step 10, including every byte of every tile in
    // each stream. Keep these hashes fixed rather than blessing refactor output.
    expect(results.completions).toBe(240);
    expect(results.snapshots).toEqual(expectedPixels);
});

test("measures local and learned PCA output with matched optimized modules", async ({page}, testInfo) => {
    const measurements = await page.evaluate(() => {
        const modules = {current : (window as any).PcaFilters, baseline : (window as any).BaselinePcaFilters};
        const samples: Record<string, number[]> = {};
        for (const mode of ["pca-rgb", "pca1", "pca2", "pca3"])
        for (const path of ["local", "learned"])
        {
            const size = path === "local" ? 128 : 256;
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = size;
            const context = canvas.getContext("2d", {willReadFrequently : true})!;
            const image = context.createImageData(size, size);
            let state = 123456789;
            for (let p = 0; p < size * size; p += 1)
            {
                state ^= state << 13;
                state ^= state >>> 17;
                state ^= state << 5;
                image.data.set([state & 255, state >>> 8 & 255, state >>> 16 & 255, 255], p * 4);
            }
            const factories = Object.entries(modules).filter(([, module]) => module).map(([name, module]) => ({
                name, factory : () => module.Filters.GLOBAL_PCA_COLOR(mode, 37), learned : module.Filters.GLOBAL_PCA_COLOR(mode, 37)
            }));
            for (let run = 0; run < 35; run += 1)
            for (const item of (run % 2 ? factories : [...factories].reverse()))
            {
                // Fresh processors keep local normalization below the threshold;
                // learned processors establish their basis during warmup.
                const processors = Array.from({length : 10}, () => path === "local" ? item.factory() : item.learned);
                const start = performance.now();
                for (const processor of processors)
                {
                    context.putImageData(image, 0, 0);
                    processor(context, () => {});
                }
                const elapsed = (performance.now() - start) / processors.length;
                const key = `${mode}/${path}/${item.name}`;
                samples[key] ||= [];
                if (run >= 15) samples[key].push(elapsed);
            }
        }
        return {samples, userAgent : navigator.userAgent, baselineLoaded : Boolean(modules.baseline)};
    });
    console.log(`[pca-processing] ${JSON.stringify(measurements)}`);
    await testInfo.attach("pca-processing.json", {body : JSON.stringify(measurements), contentType : "application/json"});
});
