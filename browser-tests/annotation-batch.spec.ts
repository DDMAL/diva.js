import {expect, test} from "@playwright/test";
import {annotationFixture, installOptimizationRoutes, openOptimizationHarness, optimizationOrigin} from "./helpers/optimization-fixtures";

test.beforeEach(async ({page}) => {
    await installOptimizationRoutes(page);
});

test("batch replacement preserves ordering, precedence, cleared canvases and atomic validation", async ({page}, testInfo) => {
    await openOptimizationHarness(page, testInfo);
    await expect.poll(() => page.evaluate(() => (window as any).diva.getAnnotationBody("manifest-0"))).toBe("manifest-0");
    await page.evaluate(() => (window as any).diva.goToPage(3));
    await expect.poll(() => page.evaluate(() => (window as any).diva.getAnnotationBody("manifest-3"))).toBe("manifest-3");
    await page.evaluate(() => (window as any).diva.goToPage(0));
    const first = `${optimizationOrigin}/optimization/small/canvas/0`;
    const last = `${optimizationOrigin}/optimization/small/canvas/3`;
    const result = await page.evaluate(({first, last, seed}) => {
        const diva = (window as any).diva;
        const annotation = (canvas: string, id: string, value = id) => ({
            ...seed, id, body : {type : "TextualBody", value}, target : `${canvas}#xywh=8,16,24,32`
        });
        const snapshot = () => [first, last].map((canvas) => diva.getAnnotationsForCanvas(canvas));
        const ids = () => snapshot().map((entries) => entries.map((entry: any) => entry.id));
        diva.clearAllAnnotations();
        diva.setAnnotations([
            annotation(first, "a"), annotation(first, "b"), annotation(last, "shared", "right"),
            annotation(first, "a", "latest"), annotation(first, "shared", "left"),
            annotation(first, "manifest-0", "api override"), annotation(first, "b", "last b")
        ]);
        const ordered = ids();
        const bodies = snapshot().map((entries) => entries.map((entry: any) => entry.body.value));
        const before = JSON.stringify(snapshot());
        const errors = [];
        for (const invalid of [annotation("https://invalid.test/canvas", "bad"), {...seed, id : ""}])
        {
            try { diva.setAnnotations([annotation(last, "valid"), invalid, annotation(first, "trailing")]); }
            catch (error) { errors.push((error as Error).name); }
        }
        const unchanged = before === JSON.stringify(snapshot());
        diva.setAnnotations([]);
        const empty = ids();
        diva.clearAnnotationsForCanvas(first);
        diva.setAnnotations([annotation(last, "other")]);
        const stillCleared = ids();
        diva.setAnnotations([annotation(first, "restored")]);
        return {ordered, bodies, errors, unchanged, empty, stillCleared, restored : ids()};
    }, {first, last, seed : annotationFixture(first, "seed")});
    expect(result).toEqual({
        ordered : [["manifest-0", "a", "shared", "b"], ["manifest-3", "shared"]],
        bodies : [["api override", "latest", "left", "last b"], ["manifest-3", "right"]],
        errors : ["RangeError", "TypeError"], unchanged : true,
        empty : [["manifest-0"], ["manifest-3"]],
        stillCleared : [[], ["manifest-3", "other"]],
        restored : [["manifest-0", "restored"], ["manifest-3"]]
    });
    await expect(page.locator('g[data-annotation-id="restored"]')).toHaveCount(1);
    await expect(page.locator('g[data-annotation-id="a"]')).toHaveCount(0);
});

test("measures concentrated and distributed batch accumulation without overlay costs", async ({page}, testInfo) => {
    await openOptimizationHarness(page, testInfo, "large");
    const seed = annotationFixture(`${optimizationOrigin}/optimization/large/canvas/0`, "seed");
    const measurements = await page.evaluate((seed) => {
        const diva = (window as any).diva;
        const original = diva.applyAnnotationsForCanvas;
        const results = [];
        // Isolate normalization, accumulation and storage from overlay rendering
        // and the canvas/page scans intentionally deferred to Steps 4 and 5.
        diva.applyAnnotationsForCanvas = () => {};
        try
        {
            for (const canvases of [1, 100])
            {
                for (const count of [2000, 8000])
                {
                    const annotations = Array.from({length : count}, (_, index) => ({
                        ...seed, id : `batch-${index}`, target : `${seed.target.source.replace(/0$/, String(index % canvases))}#xywh=8,16,24,32`
                    }));
                    const milliseconds = [];
                    for (let run = 0; run < 6; run += 1)
                    {
                        const start = performance.now();
                        diva.setAnnotations(annotations);
                        if (run > 0) milliseconds.push(performance.now() - start);
                    }
                    const retained = Array.from(diva.apiAnnotationsByCanvas.values())
                        .reduce((sum: number, entries: any) => sum + entries.length, 0);
                    results.push({canvases, count, retained, milliseconds});
                }
            }
        }
        finally { diva.applyAnnotationsForCanvas = original; }
        return results;
    }, seed);
    for (const result of measurements) expect(result.retained).toBe(result.count);
    console.log("[annotation-batch]", JSON.stringify({osd : testInfo.project.metadata.osdVersion, measurements}));
    await testInfo.attach("annotation-batch.json", {body : JSON.stringify(measurements, null, 2), contentType : "application/json"});
});
