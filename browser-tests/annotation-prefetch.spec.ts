import {expect, test} from "@playwright/test";
import {annotationFixture, installOptimizationRoutes, optimizationManifest, optimizationOrigin} from "./helpers/optimization-fixtures";

for (const enabled of [true, false])
test(`requests annotations in the preview band without loading page objects (enabled=${enabled})`, async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    const manifest = optimizationManifest("annotation-prefetch", 100);
    for (const [index, canvas] of manifest.items.entries())
        canvas.annotations = [{id : `${optimizationOrigin}/prefetch-annotations/${index}`, type : "AnnotationPage"} as any];
    await page.route(`${optimizationOrigin}/optimization/annotation-prefetch/manifest`, route => route.fulfill({json : manifest}));
    let releaseMetadata!: () => void;
    const metadataGate = new Promise<void>(resolve => { releaseMetadata = resolve; });
    await page.route(`${optimizationOrigin}/optimization/*/image/*/info.json`, async route => {
        const index = Number(route.request().url().match(/\/image\/(\d+)\//)![1]);
        if (index >= 3) await metadataGate;
        await route.fulfill({json : {
            "@context" : "http://iiif.io/api/image/3/context.json", id : route.request().url().replace(/\/info\.json$/, ""),
            type : "ImageService3", protocol : "http://iiif.io/api/image", profile : "level0",
            width : 64, height : 128, tiles : [{width : 64, height : 128, scaleFactors : [1]}]
        }});
    });
    const requests = new Map<number, number>();
    await page.route(`${optimizationOrigin}/prefetch-annotations/*`, route => {
        const index = Number(new URL(route.request().url()).pathname.split("/").at(-1));
        requests.set(index, (requests.get(index) ?? 0) + 1);
        return route.fulfill({json : {id : route.request().url(), type : "AnnotationPage", items : [
            annotationFixture(manifest.items[index].id, `early-${index}`, index % 2 === 0)
        ]}});
    });
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${optimizationOrigin}/optimization/annotation-prefetch/manifest&bundle=production&osd=${osd}`);
    await page.evaluate(async enabled => {
        const w = window as any;
        await w.diva.ready;
        w.diva.destroy();
        w.diva = new w.Diva("diva-wrapper", {objectData : `${location.origin}/optimization/annotation-prefetch/manifest`, enableAnnotations : enabled});
        await w.diva.ready;
    }, enabled);
    if (!enabled)
    {
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        expect(requests.size).toBe(0);
        releaseMetadata();
        return;
    }
    await expect.poll(() => requests.size).toBeGreaterThan(0);
    const indexes = await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        return {preview : [...element.previewAnnotationIndexes] as number[], loaded : [...element.loadedItems.keys()] as number[]};
    });
    const early = indexes.preview.find(index => index >= 3 && !indexes.loaded.includes(index))!;
    expect(early).toBeDefined();
    await expect.poll(() => requests.get(early) ?? 0).toBe(1);
    await expect.poll(() => page.evaluate(id => (window as any).diva.getAnnotationBody(id), `early-${early}`)).toBeTruthy();
    // The annotation can arrive before OSD has supplied image coordinates.
    await expect(page.locator(`g[data-annotation-id="early-${early}"]`)).toHaveCount(0);
    releaseMetadata();
    await page.evaluate(index => (window as any).diva.goToPage(index), early);
    await expect(page.locator(`g[data-annotation-id="early-${early}"]`)).toHaveCount(1);
    await page.evaluate(async () => {
        await (window as any).diva.goToPage(0);
        await (window as any).diva.goToPage(1);
    });
    expect(requests.get(early)).toBe(1);
    expect([...requests.values()].every(count => count === 1)).toBe(true);
    expect(requests.size).toBeLessThan(20);
});

test("ignores late annotations after resource replacement, including reused canvas IDs", async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    const old = optimizationManifest("annotation-race", 1);
    old.items[0].annotations = [{id : `${optimizationOrigin}/old-annotation-page`, type : "AnnotationPage"} as any];
    const replacement = structuredClone(old);
    replacement.id = `${optimizationOrigin}/replacement-manifest`;
    replacement.items[0].annotations = [{id : `${optimizationOrigin}/new-annotation-page`, type : "AnnotationPage"} as any];
    await page.route(`${optimizationOrigin}/optimization/annotation-race/manifest`, route => route.fulfill({json : old}));
    await page.route(`${optimizationOrigin}/replacement-manifest`, route => route.fulfill({json : replacement}));
    let release!: () => void;
    const delayed = new Promise<void>(resolve => { release = resolve; });
    await page.route(`${optimizationOrigin}/old-annotation-page`, async route => {
        await delayed;
        await route.fulfill({json : {type : "AnnotationPage", items : [annotationFixture(old.items[0].id, "late-old")]}});
    });
    await page.route(`${optimizationOrigin}/new-annotation-page`, route => route.fulfill({json : {
        type : "AnnotationPage", items : [annotationFixture(old.items[0].id, "current-new")]
    }}));
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${optimizationOrigin}/optimization/small/manifest&bundle=production&osd=${osd}`);
    const requested = page.waitForRequest(`${optimizationOrigin}/old-annotation-page`);
    await page.evaluate(async () => {
        const w = window as any;
        await w.diva.ready;
        w.diva.destroy();
        w.diva = new w.Diva("diva-wrapper", {objectData : `${location.origin}/optimization/annotation-race/manifest`, enableAnnotations : true});
        await w.diva.ready;
    });
    await requested;
    await page.evaluate(url => (window as any).diva.setResource(url), `${optimizationOrigin}/replacement-manifest`);
    await expect.poll(() => page.evaluate(() => (window as any).diva.getAnnotationBody("current-new"))).toBe("current-new");
    const response = page.waitForResponse(`${optimizationOrigin}/old-annotation-page`);
    release();
    await (await response).finished();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await page.evaluate(() => (window as any).diva.getAnnotationBody("late-old"))).toBeUndefined();
    expect(await page.evaluate(() => (window as any).diva.getAnnotationBody("current-new"))).toBe("current-new");
});

test("does not complete a replacement using the previous viewer's loaded pages", async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${optimizationOrigin}/optimization/small/manifest&bundle=production&osd=${osd}`);
    await page.evaluate(() => (window as any).diva.ready);
    const result = await page.evaluate(() => {
        const diva = (window as any).diva;
        const viewer = document.getElementById("main-viewer") as any;
        const sourceId = diva.pages[0].primaryImage.id;
        const previousLoaded = viewer.isPageLoaded(0, sourceId, viewer.resourceId);
        const saved = {request : diva.activeResourceRequestId, awaiting : diva.awaitingViewerResource,
            state : diva.state, complete : diva.completeResource};
        let completions = 0;
        try
        {
            diva.activeResourceRequestId = "replacement-before-viewer-reset";
            diva.completeResource = () => { completions += 1; };
            // Reproduce the ordering where the success port arrives before the
            // new tile-source/page ports. Old source IDs must not prove readiness.
            diva.handleResourceSucceeded(diva.activeResourceRequestId, "https://example.test/new-manifest", true, 0);
            return {previousLoaded, completions};
        }
        finally
        {
            diva.activeResourceRequestId = saved.request;
            diva.awaitingViewerResource = saved.awaiting;
            diva.state = saved.state;
            diva.completeResource = saved.complete;
        }
    });
    expect(result).toEqual({previousLoaded : true, completions : 0});
});
