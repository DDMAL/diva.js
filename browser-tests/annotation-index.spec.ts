import {expect, test} from "@playwright/test";
import {annotationFixture, installOptimizationRoutes, openOptimizationHarness, optimizationOrigin} from "./helpers/optimization-fixtures";

test.beforeEach(async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    await openOptimizationHarness(page, testInfo);
    await expect.poll(() => page.evaluate(() => (window as any).diva.getAnnotationBody("manifest-0"))).toBe("manifest-0");
});

test("single updates apply each affected canvas once and indexed lookups match collection order", async ({page}) => {
    const result = await page.evaluate((seed) => {
        const diva = (window as any).diva;
        const first = diva.getPages()[0].canvasId;
        const second = diva.getPages()[1].canvasId;
        const annotation = (canvas: string, id: string, body: string) => ({
            ...seed, id, body : {type : "TextualBody", value : body}, target : `${canvas}#xywh=8,16,24,32`
        });
        const calls: string[] = [];
        const original = diva.applyAnnotationsForCanvas;
        diva.applyAnnotationsForCanvas = function(canvas: string) {
            calls.push(canvas);
            return original.call(this, canvas);
        };
        const results = [];
        const check = () => {
            const ids = ["shared", "manifest-0", "other", "missing"];
            for (const id of ids)
            {
                // The former full-scan algorithm is the oracle, including its
                // manifest-canvas-first ordering and per-canvas API precedence.
                const canvases = new Set<string>([...diva.manifestAnnotationsByCanvas.keys(), ...diva.apiAnnotationsByCanvas.keys()]);
                const expected = Array.from(canvases).flatMap((canvas) => diva.effectiveAnnotationsForCanvas(canvas))
                    .find((entry: any) => entry.viewerAnnotation.id === id);
                if (diva.findStoredAnnotation(id) !== expected) throw new Error(`Stale lookup: ${id}`);
            }
        };
        const update = (value: any) => {
            calls.length = 0;
            diva.setAnnotation(value);
            check();
            results.push([...calls]);
        };
        try
        {
            diva.setAnnotations([annotation(second, "shared", "second"), annotation(first, "shared", "first")]);
            // Refreshing one canvas must not change cross-canvas lookup or
            // application order when both canvases still contain the same ID.
            diva.setAnnotation(annotation(second, "other", "unrelated"));
            check();
            const precedence = diva.getAnnotationBody("shared");
            update(annotation(first, "shared", "replaced"));
            update(annotation(first, "shared", "same canvas"));
            const extract = diva.getImageRegionForAnnotation("shared");
            update(annotation(second, "shared", "moved"));
            diva.clearAnnotationsForCanvas(second);
            check();
            const cleared = diva.getAnnotationBody("shared");
            update(annotation(second, "shared", "restored"));
            diva.setAnnotations([annotation(first, "manifest-0", "override"), annotation(second, "other", "other")]);
            check();
            diva.setAnnotations([]);
            check();
            diva.clearAllAnnotations();
            check();
            update(annotation(first, "shared", "final"));
            // A body lookup must no longer construct effective collections.
            const effective = diva.effectiveAnnotationsForCanvas;
            diva.effectiveAnnotationsForCanvas = () => { throw new Error("Full collection lookup"); };
            let body;
            try { body = diva.getAnnotationBody("shared"); }
            finally { diva.effectiveAnnotationsForCanvas = effective; }
            return {results, first, second, precedence, extract, cleared, body};
        }
        finally { diva.applyAnnotationsForCanvas = original; }
    }, annotationFixture("unused", "seed"));
    expect(result.results).toEqual([
        [result.second, result.first], [result.first], [result.first, result.second], [result.second], [result.first]
    ]);
    expect(result.precedence).toBe("first");
    expect(result.extract).toContain("/image/0/8,16,24,32/");
    expect(result.cleared).toBeUndefined();
    expect(result.body).toBe("final");
    await page.evaluate(() => (window as any).diva.selectAnnotation("shared"));
    await expect(page.locator(".diva-annotation-panel-content")).toContainText("final");
    await page.evaluate(() => {
        const viewer = document.getElementById("main-viewer")!;
        const parent = viewer.parentElement!;
        viewer.remove();
        parent.appendChild(viewer);
        (window as any).diva.selectAnnotation("shared");
    });
    await expect(page.locator(".diva-annotation-panel-content")).toContainText("final");
    expect(await page.evaluate(() => (window as any).diva.getImageRegionForAnnotation("shared"))).toBe(result.extract);
});

test("viewer indexes address repeated canvases and preserve first-match selection through reset", async ({page}) => {
    const result = await page.evaluate(() => {
        // Detached custom element exercises repeated canvas entries without
        // changing Elm's authoritative page state or loading extra OSD images.
        const viewer = document.createElement("osd-viewer") as any;
        const source = (canvasId: string) => ({canvasId, sourceId : canvasId, url : "https://images.test/info.json", isStatic : false});
        const annotation = (text: string) => ({id : "shared", text, html : text, imageService : "https://images.test/info.json",
            shape : {kind : "rect", x : 1, y : 2, width : 3, height : 4}});
        viewer.setTileSources([source("first"), source("second"), source("first")]);
        const updates: number[] = [];
        viewer.addOrUpdateAnnotationOverlay = (index: number) => updates.push(index);
        let selected = "";
        viewer.openAnnotationPanel = (value: any) => { selected = value.text; };
        viewer.setAnnotations("second", [annotation("second")]);
        viewer.setAnnotations("first", [annotation("first"), annotation("duplicate")]);
        const applied = [...updates];
        viewer.setAnnotations("second", []);
        viewer.selectAnnotation("shared");
        const duplicateFirst = selected;
        viewer.setAnnotations("second", [annotation("second")]);
        viewer.tileSources.findIndex = () => { throw new Error("Page scan"); };
        viewer.tileSources.forEach = () => { throw new Error("Page scan"); };
        viewer.setAnnotations("first", [annotation("updated")]);
        viewer.selectAnnotation("shared");
        const initial = selected;
        const region = viewer.getImageRegionForAnnotation("shared");
        viewer.setAnnotations("second", []);
        viewer.selectAnnotation("shared");
        const remaining = selected;
        viewer.setTileSources([source("new")], 0, "replacement");
        const reset = viewer.getImageRegionForAnnotation("shared");
        updates.length = 0;
        viewer.setAnnotations("first", [annotation("old canvas")]);
        viewer.setAnnotations("new", [annotation("new")]);
        return {applied, duplicateFirst, initial, remaining, region, reset, newUpdates : updates};
    });
    expect(result).toEqual({applied : [1, 0, 2], duplicateFirst : "first", initial : "second", remaining : "updated",
        region : "https://images.test/1,2,3,4/!320,320/0/default.jpg", reset : null, newUpdates : [0]});
});

test("indexes follow late manifest annotation arrival, resource replacement and teardown", async ({page}) => {
    const last = `${optimizationOrigin}/optimization/small/canvas/3`;
    await page.evaluate((seed) => (window as any).diva.setAnnotations([seed]), annotationFixture(last, "manifest-3", true));
    await page.evaluate(() => (window as any).diva.goToPage(3));
    await expect.poll(() => page.evaluate(() => (window as any).diva.manifestAnnotationsByCanvas.has(
        (window as any).diva.getPages()[3].canvasId))).toBe(true);
    expect(await page.evaluate(() => (window as any).diva.getAnnotationBody("manifest-3"))).toBe("<p><strong>manifest-3</strong></p>");
    await page.evaluate(() => (window as any).diva.setAnnotations([]));
    expect(await page.evaluate(() => (window as any).diva.getAnnotationBody("manifest-3"))).toBe("manifest-3");
    await page.evaluate((seed) => (window as any).diva.setAnnotation(seed), annotationFixture(last, "old-resource"));
    await page.evaluate((url) => (window as any).diva.setResource(url), `${optimizationOrigin}/optimization/nested/manifest`);
    expect(await page.evaluate(() => (window as any).diva.getAnnotationBody("old-resource"))).toBeUndefined();
    const destroyed = await page.evaluate(() => {
        const diva = (window as any).diva;
        const viewer = document.getElementById("main-viewer") as any;
        diva.destroy();
        return {api : diva.apiAnnotationIndex.entries("old-resource") === undefined,
            manifest : diva.manifestAnnotationIndex.entries("manifest-0") === undefined,
            viewer : viewer.annotationIndex.entries("manifest-0") === undefined, pages : viewer.pageIndexesByCanvas.size};
    });
    expect(destroyed).toEqual({api : true, manifest : true, viewer : true, pages : 0});
});

test("measures indexed lookup against the former full-scan algorithm", async ({page}, testInfo) => {
    await page.evaluate((url) => (window as any).diva.setResource(url), `${optimizationOrigin}/optimization/large/manifest`);
    const result = await page.evaluate((seed) => {
        const diva = (window as any).diva;
        const pages = diva.getPages();
        const apply = diva.applyAnnotationsForCanvas;
        diva.applyAnnotationsForCanvas = () => {};
        try
        {
            diva.setAnnotations(Array.from({length : 8000}, (_, index) => ({
                ...seed, id : `lookup-${index}`, target : `${pages[index % 100].canvasId}#xywh=1,2,3,4`
            })));
        }
        finally { diva.applyAnnotationsForCanvas = apply; }
        let canvasVisits = 0;
        const scan = (id: string) => {
            for (const canvas of new Set<string>([...diva.manifestAnnotationsByCanvas.keys(), ...diva.apiAnnotationsByCanvas.keys()]))
            {
                canvasVisits += 1;
                const found = diva.effectiveAnnotationsForCanvas(canvas).find((entry: any) => entry.viewerAnnotation.id === id);
                if (found) return found;
            }
        };
        const indexed = (id: string) => diva.findStoredAnnotation(id);
        const queries = Array.from({length : 1000}, (_, index) => index % 2 ? "missing" : "lookup-7999");
        for (const id of ["lookup-7999", "missing"]) if (scan(id) !== indexed(id)) throw new Error("Lookup differs");
        const samples = [];
        for (const lookup of [scan, indexed])
        {
            const milliseconds = [];
            for (let run = 0; run < 4; run += 1)
            {
                const start = performance.now();
                queries.forEach(lookup);
                if (run > 0) milliseconds.push(performance.now() - start);
            }
            samples.push(milliseconds);
        }
        canvasVisits = 0;
        queries.forEach(scan);
        return {annotations : 8000, queries : queries.length, canvasVisits,
            indexedCandidates : queries.filter((id) => id !== "missing").length,
            scanMilliseconds : samples[0], indexedMilliseconds : samples[1]};
    }, annotationFixture("unused", "seed"));
    expect(result.canvasVisits).toBeGreaterThanOrEqual(100000);
    expect(result.indexedCandidates).toBe(500);
    console.log("[annotation-index]", JSON.stringify({osd : testInfo.project.metadata.osdVersion, ...result}));
    await testInfo.attach("annotation-index.json", {body : JSON.stringify(result, null, 2), contentType : "application/json"});
});
