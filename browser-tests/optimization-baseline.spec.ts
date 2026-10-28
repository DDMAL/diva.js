import {expect, test} from "@playwright/test";
import {build} from "esbuild";
import filterPixels from "./fixtures/optimization-filter-pixels.json";
import {annotationFixture, installOptimizationRoutes, openOptimizationHarness, optimizationOrigin} from "./helpers/optimization-fixtures";

test.beforeEach(async ({page}) => {
    await installOptimizationRoutes(page);
});

test("baseline: annotation ordering, replacement, validation and missing services", async ({page}, testInfo) => {
    await openOptimizationHarness(page, testInfo);
    await expect.poll(() => page.evaluate(() => (window as any).diva.getAnnotationBody("manifest-0"))).toBe("manifest-0");
    const first = `${optimizationOrigin}/optimization/small/canvas/0`;
    const last = `${optimizationOrigin}/optimization/small/canvas/3`;
    const annotations = [annotationFixture(first, "a"), annotationFixture(first, "b", true),
                         annotationFixture(first, "a", true), annotationFixture(last, "static")];
    const result = await page.evaluate(({annotations, first, last}) => {
        const diva = (window as any).diva;
        diva.setAnnotations(annotations);
        const ids = () => diva.getAnnotationsForCanvas(first).map((annotation: any) => annotation.id);
        const before = ids();
        let rejected = false;
        try
        {
            diva.setAnnotations([annotations[0], {...annotations[1], target : "https://invalid.test/canvas#xywh=1,2,3,4"}]);
        }
        catch (_error) { rejected = true; }
        const after = ids();
        const body = diva.getAnnotationBody("a");
        const region = diva.getImageRegionForAnnotation("static");
        diva.clearAnnotationsForCanvas(first);
        const cleared = ids();
        diva.setAnnotation(annotations[0]);
        return {before, after, rejected, body, region, cleared, restored : ids(),
                other : diva.getAnnotationsForCanvas(last).map((annotation: any) => annotation.id)};
    }, {annotations, first, last});
    expect(result).toEqual({before : ["manifest-0", "b", "a"], after : ["manifest-0", "b", "a"],
                           rejected : true, body : "<p><strong>a</strong></p>", region : null,
                           cleared : [], restored : ["manifest-0", "a"], other : ["static"]});
    await expect(page.locator('g[data-annotation-id="a"]')).toHaveCount(1);
    await page.evaluate(() => (window as any).diva.selectAnnotation("a"));
    await expect(page.locator(".diva-annotation-panel-content")).toContainText("a");

    const crossCanvas = await page.evaluate(({left, right, first, last}) => {
        const diva = (window as any).diva;
        diva.setAnnotations([left, right]);
        const batch = [first, last].map((canvas) => diva.getAnnotationsForCanvas(canvas)
            .filter((annotation: any) => annotation.id === "shared").length);
        diva.setAnnotation(right);
        const single = [first, last].map((canvas) => diva.getAnnotationsForCanvas(canvas)
            .filter((annotation: any) => annotation.id === "shared").length);
        return {batch, single};
    }, {left : annotationFixture(first, "shared"), right : annotationFixture(last, "shared"), first, last});
    // Batch duplicates currently coexist across canvases; single insertion moves
    // the API annotation. Optimizations must not silently unify these semantics.
    expect(crossCanvas).toEqual({batch : [1, 1], single : [0, 1]});
});

for (const fixture of ["large", "nested"])
{
    test(`baseline: ${fixture} manifest navigation and ranges`, async ({page}, testInfo) => {
        await openOptimizationHarness(page, testInfo, fixture);
        const count = fixture === "large" ? 1000 : 64;
        await expect(page.locator(".diva-thumbs-item")).toHaveCount(count);
        await page.getByRole("button", {name : "Contents", exact : true}).click();
        await expect(page.getByRole("button", {name : fixture === "nested" ? "Leaf" : "Section 0", exact : true})).toBeVisible();
        const measurements = await page.evaluate(async ({count, fixture}) => {
            const diva = (window as any).diva;
            const samples = [];
            // One warmup, followed by three timed navigations. Include async API
            // completion and an Elm render frame, not just command dispatch.
            for (const index of [1, count - 1, 0, Math.floor(count / 2)])
            {
                const start = performance.now();
                await diva.goToPage(index);
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                if (index !== 1) samples.push({index, milliseconds : performance.now() - start});
            }
            return {fixture, pageCount : diva.getState().pageCount, currentPage : diva.getState().currentPageIndex,
                    navigation : samples, osd : (window as any).__divaOsdVersion,
                    userAgent : navigator.userAgent};
        }, {count, fixture});
        expect(measurements.pageCount).toBe(count);
        expect(measurements.currentPage).toBe(Math.floor(count / 2));
        await testInfo.attach("navigation-baseline.json", {body : JSON.stringify(measurements, null, 2), contentType : "application/json"});
    });
}

test("baseline: annotation batches and overlay layout costs", async ({page}, testInfo) => {
    await openOptimizationHarness(page, testInfo);
    const canvas = `${optimizationOrigin}/optimization/small/canvas/0`;
    const concentrated = Array.from({length : 300}, (_, index) => annotationFixture(canvas, `bulk-${index}`, index % 2 === 0));
    const result = await page.evaluate(async (annotations) => {
        const diva = (window as any).diva;
        const viewer = document.getElementById("main-viewer") as any;
        const samples = [];
        for (let run = 0; run < 4; run += 1)
        {
            const start = performance.now();
            diva.setAnnotations(annotations);
            if (run > 0) samples.push(performance.now() - start);
        }
        const original = viewer.addOrUpdateAnnotationOverlay;
        let overlayUpdates = 0;
        viewer.addOrUpdateAnnotationOverlay = function(...args: any[]) {
            overlayUpdates += 1;
            return original.apply(this, args);
        };
        const layouts = [];
        try
        {
            for (const mode of ["spread", "spread-shift", "single"])
            {
                const start = performance.now();
                await diva.setLayoutMode(mode);
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                layouts.push({mode, milliseconds : performance.now() - start});
            }
        }
        finally { viewer.addOrUpdateAnnotationOverlay = original; }
        return {batchCount : annotations.length, batchMilliseconds : samples, layouts, overlayUpdates,
                retainedPages : viewer.loadedItems.size, osd : (window as any).__divaOsdVersion};
    }, concentrated);
    await expect(page.locator('g[data-annotation-id^="bulk-"]')).toHaveCount(300);
    expect(result.batchMilliseconds).toHaveLength(3);
    await testInfo.attach("annotation-baseline.json", {body : JSON.stringify(result, null, 2), contentType : "application/json"});

    // A separate distributed workload exercises many canvas collections without
    // making the concentrated workload depend on a thousand-page DOM.
    await page.evaluate((url) => (window as any).diva.setResource(url), `${optimizationOrigin}/optimization/large/manifest`);
    const distributed = Array.from({length : 1000}, (_, index) => annotationFixture(
        `${optimizationOrigin}/optimization/large/canvas/${index % 100}`, `distributed-${index}`));
    const timing = await page.evaluate((annotations) => {
        const diva = (window as any).diva;
        const milliseconds = [];
        for (let run = 0; run < 4; run += 1)
        {
            const start = performance.now();
            diva.setAnnotations(annotations);
            if (run > 0) milliseconds.push(performance.now() - start);
        }
        return {milliseconds, count : diva.getAllAnnotations().filter((annotation: any) => annotation.id.startsWith("distributed-")).length};
    }, distributed);
    expect(timing.count).toBe(1000);
    await testInfo.attach("distributed-baseline.json", {body : JSON.stringify(timing, null, 2), contentType : "application/json"});
});

test("baseline: Page View rotation and mirror filter generations", async ({page}, testInfo) => {
    await openOptimizationHarness(page, testInfo);
    await page.getByRole("button", {name : "Page View", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer?.world.getItemCount())).toBe(1);
    await page.getByRole("button", {name : "Colour Adjust", exact : true}).click();
    await page.getByLabel("Brightness", {exact : true}).check();
    await expect.poll(() => page.evaluate(() => Boolean((window as any).diva.filterOptions?.brightnessEnabled))).toBe(true);
    const generation = () => page.evaluate(() => (window as any).diva.filterViewer.filterPluginInstance.filterIncrement);
    const before = await generation();
    await page.getByRole("button", {name : "Transform", exact : true}).click();
    const rotation = page.locator('.diva-filter-group').filter({hasText : "Transform"}).locator('input[type="range"]');
    await rotation.fill("30");
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer.viewport.getRotation())).toBe(30);
    const rotated = await generation();
    await page.getByLabel("Mirror", {exact : true}).check();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer.viewport.getFlip())).toBe(true);
    const mirrored = await generation();
    await testInfo.attach("filter-generation-baseline.json", {
        body : JSON.stringify({before, rotated, mirrored, rotationInvalidations : rotated - before,
                               mirrorInvalidations : mirrored - rotated}, null, 2), contentType : "application/json"
    });
    // Generation counts are measurements, not assertions that lock in redundant work.
    await page.getByRole("button", {name : "Close", exact : true}).click();
    await expect(page.locator("#filter-viewer")).toHaveCount(0);
    await page.getByRole("button", {name : "Page View", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer?.world.getItemCount())).toBe(1);
});

test("baseline: deterministic filter pixels and canvas operations", async ({page}, testInfo) => {
    // Bundle the real filter module only for this test. No production test hooks
    // or generated files are added to the package.
    const bundle = await build({entryPoints : ["src/filters.ts"], bundle : true, write : false,
                                format : "iife", globalName : "OptimizationFilters", target : "es2019"});
    await page.goto("/");
    await page.addScriptTag({content : bundle.outputFiles[0].text});
    const result = await page.evaluate(() => {
        const {Filters} = (window as any).OptimizationFilters;
        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 4;
        const context = canvas.getContext("2d", {willReadFrequently : true})!;
        const seed = context.createImageData(8, 4);
        const values = [0, 1, 2, 63, 127, 128, 254, 255];
        for (let p = 0; p < 32; p += 1)
        {
            seed.data.set([values[p % 8], values[(p * 3 + 1) % 8], values[(p * 5 + 2) % 8],
                           [0, 1, 127, 255][Math.floor(p / 8)]], p * 4);
        }
        const chains = [
            {name : "tone", processors : [Filters.BRIGHTNESS(17), Filters.CONTRAST(1.3), Filters.GAMMA(0.8), Filters.INVERT()]},
            {name : "threshold", processors : [Filters.GREYSCALE(), Filters.THRESHOLDING(128)]},
            {name : "neighborhood", processors : [Filters.BRIGHTNESS(-1), Filters.CONVOLUTION(Filters.CONVOLUTION_PRESET("sharpen")), Filters.UNSHARP_MASK(1)]},
            {name : "pca", processors : [Filters.GLOBAL_PCA_COLOR("pca-rgb", 15)]}
        ];
        const outputs = [];
        const measurements = [];
        for (const chain of chains)
        {
            context.putImageData(seed, 0, 0);
            const prototype = CanvasRenderingContext2D.prototype;
            const original = prototype.getImageData;
            let reads = 0;
            prototype.getImageData = function(...args: Parameters<typeof original>) {
                reads += 1;
                return original.apply(this, args);
            };
            const start = performance.now();
            try
            {
                for (const processor of chain.processors) processor(context, () => {});
            }
            finally { prototype.getImageData = original; }
            measurements.push({name : chain.name, stages : chain.processors.length, reads, milliseconds : performance.now() - start});
            const bytes = context.getImageData(0, 0, 8, 4).data;
            outputs.push({name : chain.name, pixels : Array.from({length : 32}, (_, p) => Array.from(bytes.slice(p * 4, p * 4 + 4)))});
        }
        // Separate warmed-up throughput samples from the tiny correctness corpus.
        canvas.width = 256;
        canvas.height = 256;
        const largeSeed = context.createImageData(256, 256);
        for (let p = 0; p < 256 * 256; p += 1)
        {
            largeSeed.data.set([p % 256, (p * 17) % 256, (p * 31) % 256, [0, 1, 127, 255][p % 4]], p * 4);
        }
        const throughput = [];
        for (let run = 0; run < 6; run += 1)
        {
            context.putImageData(largeSeed, 0, 0);
            const start = performance.now();
            for (const processor of chains[0].processors) processor(context, () => {});
            if (run > 0) throughput.push(performance.now() - start);
        }
        return {outputs, measurements, throughput256x256Milliseconds : throughput, userAgent : navigator.userAgent};
    });
    expect(result.outputs).toEqual(filterPixels);
    const {outputs: _outputs, ...measurements} = result;
    await testInfo.attach("filter-baseline.json", {body : JSON.stringify(measurements, null, 2), contentType : "application/json"});
});
