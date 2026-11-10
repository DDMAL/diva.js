import {expect, test} from "@playwright/test";
import {annotationFixture, installOptimizationRoutes, optimizationManifest, optimizationOrigin} from "./helpers/optimization-fixtures";

const validImageRoutes = async (page: import("@playwright/test").Page) => {
    await installOptimizationRoutes(page);
    await page.route(`${optimizationOrigin}/optimization/*/image/*/info.json`, route => route.fulfill({json : {
        "@context" : "http://iiif.io/api/image/3/context.json", id : route.request().url().replace(/\/info\.json$/, ""),
        type : "ImageService3", protocol : "http://iiif.io/api/image", profile : "level0",
        width : 64, height : 128, tiles : [{width : 64, height : 128, scaleFactors : [1]}]
    }}));
};

test("shows a non-interactive thumbnail beneath delayed tiles, tracks layouts, and releases it", async ({page}, testInfo) => {
    await validImageRoutes(page);
    const manifest = optimizationManifest("preview", 4);
    for (const [index, canvas] of manifest.items.entries())
        (canvas as any).thumbnail = [{id : `${optimizationOrigin}/optimization/preview/thumb/${index}.png`, type : "Image", width : 64, height : 128}];
    manifest.items[0].annotations[0].items.push(annotationFixture(manifest.items[0].id, "svg", true));
    const colors = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 128;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#f00000"; context.fillRect(0, 0, 64, 128);
        const red = canvas.toDataURL().split(",")[1];
        context.fillStyle = "#00e000"; context.fillRect(0, 0, 64, 128);
        return {red, green : canvas.toDataURL().split(",")[1]};
    });
    await page.route(`${optimizationOrigin}/optimization/preview/manifest`, route => route.fulfill({json : manifest}));
    await page.route(`${optimizationOrigin}/optimization/preview/image/*/info.json`, route => route.fulfill({json : {
        "@context" : "http://iiif.io/api/image/3/context.json", id : route.request().url().replace(/\/info\.json$/, ""),
        type : "ImageService3", protocol : "http://iiif.io/api/image", profile : "level0",
        width : 64, height : 128, tiles : [{width : 64, height : 128, scaleFactors : [1]}]
    }}));
    await page.route(`${optimizationOrigin}/optimization/preview/thumb/*.png`, route => route.fulfill({contentType : "image/png", body : Buffer.from(colors.red, "base64")}));
    let release!: () => void;
    const tiles = new Promise<void>(resolve => { release = resolve; });
    await page.route(`${optimizationOrigin}/optimization/preview/image/**`, async route => {
        if (route.request().url().endsWith("/info.json")) { await route.fallback(); return; }
        await tiles;
        await route.fulfill({contentType : "image/png", body : Buffer.from(colors.green, "base64")});
    });
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${optimizationOrigin}/optimization/preview/manifest&bundle=production&osd=${osd}`);
    await page.evaluate(() => (window as any).diva.ready);
    const preview = page.locator('.diva-page-preview[data-page-index="0"]');
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(64);
    await expect(preview).not.toHaveAttribute("crossorigin");
    await expect(preview).toHaveCSS("pointer-events", "none");
    // The thumbnail should be painted below, rather than replace, OSD's canvas.
    expect(await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        const layer = element.previewLayer;
        const canvas = element.viewer.drawer.canvas;
        return Boolean(layer.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await testInfo.attach("thumbnail-before-tiles", {body : await page.locator("#main-viewer").screenshot({path : testInfo.outputPath("preview-before.png")}), contentType : "image/png"});
    await page.evaluate(() => (window as any).diva.setAnnotations([
        {id : "preview-note", type : "Annotation", body : {type : "TextualBody", value : "Clickable over preview", format : "text/plain"},
            target : `${location.origin}/optimization/preview/canvas/0#xywh=8,16,24,32`}
    ]));
    await page.locator('g[data-annotation-id="preview-note"]').press("Enter");
    await expect(page.locator(".diva-annotation-panel-content")).toContainText("Clickable over preview");
    for (const mode of ["spread", "spread-shift", "single"])
    {
        await page.evaluate(mode => (window as any).diva.setLayoutMode(mode), mode);
        await expect.poll(() => page.evaluate(() => {
            const element = document.getElementById("main-viewer") as any;
            const image = element.pagePreviews.get(0);
            const point = element.viewer.viewport.pixelFromPoint(new (window as any).OpenSeadragon.Point(element.pageXOffsets[0], element.pageOffsets[0]), true);
            return Math.abs(parseFloat(image.style.left) - point.x) + Math.abs(parseFloat(image.style.top) - point.y);
        })).toBeLessThan(1);
    }
    // Spread changes can preserve a different central page as the anchor.
    // Bring page zero back into view before expecting its tiles to complete.
    await page.evaluate(() => (window as any).diva.goToPage(0));
    release();
    await expect(preview).toBeHidden();
    await testInfo.attach("tiles-after-preview", {body : await page.locator("#main-viewer").screenshot({path : testInfo.outputPath("preview-after.png")}), contentType : "image/png"});
    await page.evaluate(url => (window as any).diva.setResource(url), `${optimizationOrigin}/optimization/small/manifest`);
    await expect(page.locator('.diva-page-preview[src*="/preview/"]')).toHaveCount(0);
    await page.evaluate(() => (window as any).diva.destroy());
    await expect(page.locator(".diva-page-previews")).toHaveCount(0);
});

test("suppresses protected previews and never downgrades credentialed failures", async ({page}, testInfo) => {
    await validImageRoutes(page);
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${optimizationOrigin}/optimization/small/manifest&bundle=production&osd=${osd}`);
    await page.evaluate(() => (window as any).diva.ready);
    const requested: string[] = [];
    await page.route(`${optimizationOrigin}/preview-policy/**`, async route => {
        requested.push(route.request().url());
        await route.fulfill({status : 403});
    });
    await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        element.tileSources[0].preview = {url : `${location.origin}/preview-policy/protected.png`, fallbackUrl : `${location.origin}/preview-policy/fallback.png`, crossOrigin : null};
        // Force the tile-loading state so the underlay path is exercised.
        element.loadedItems.get(0).getFullyLoaded = () => false;
        element.setPagePreviewPolicies([{sourceId : element.tileSources[0].sourceId, crossOrigin : null}]);
    });
    await expect(page.locator('.diva-page-preview[data-page-index="0"]')).toHaveCount(0);
    expect(requested).toEqual([]);
    await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        element.setPagePreviewPolicies([{sourceId : element.tileSources[0].sourceId, crossOrigin : "use-credentials"}]);
    });
    const image = page.locator('.diva-page-preview[data-page-index="0"]');
    await expect(image).toHaveAttribute("crossorigin", "use-credentials");
    await expect(image).toHaveAttribute("data-failed", "true");
    await expect(image).toBeHidden();
    expect(requested).toEqual([`${optimizationOrigin}/preview-policy/protected.png`]);
    await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        element.setPagePreviewPolicies([{sourceId : element.tileSources[0].sourceId, crossOrigin : null}]);
    });
    await expect(image).toHaveCount(0);
});

test("bounds previews to nearby pages and uses anonymous fallback without touching the tile source", async ({page}, testInfo) => {
    await validImageRoutes(page);
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${optimizationOrigin}/optimization/large/manifest&bundle=production&osd=${osd}`);
    await page.evaluate(() => (window as any).diva.ready);
    await expect.poll(() => page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        const bounds = element.viewer.viewport.getBounds(true);
        const pageRange = element.indicesForRange(Math.max(0, bounds.y - bounds.height * 1.5), bounds.y + bounds.height * 2.5);
        return [...element.pagePreviews.keys()].some(index => index < pageRange[0] || index > pageRange[1]);
    })).toBe(true);
    const requests: string[] = [];
    await page.route(`${optimizationOrigin}/preview-fallback/**`, async route => {
        requests.push(route.request().url());
        if (route.request().url().endsWith("bad.png")) await route.fulfill({status : 404});
        else await route.fulfill({contentType : "image/png", body : Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")});
    });
    await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        element.loadedItems.get(0).getFullyLoaded = () => false;
        element.tileSources[0].preview = {url : `${location.origin}/preview-fallback/bad.png`, fallbackUrl : `${location.origin}/preview-fallback/good.png`, crossOrigin : "anonymous"};
        element.setPagePreviewPolicies([{sourceId : element.tileSources[0].sourceId, crossOrigin : "anonymous"}]);
    });
    const preview = page.locator('.diva-page-preview[data-page-index="0"]');
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
    await expect(preview).not.toHaveAttribute("crossorigin");
    expect(requests).toEqual([`${optimizationOrigin}/preview-fallback/bad.png`, `${optimizationOrigin}/preview-fallback/good.png`]);
    await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        (window as any).oldPreview = element.pagePreviews.get(0);
    });
    await page.evaluate(() => (window as any).diva.goToPage(900));
    await expect.poll(() => page.evaluate(() => (window as any).oldPreview.isConnected)).toBe(false);
    const remaining = await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        return {count : element.pagePreviews.size, indexes : Array.from(element.pagePreviews.keys()) as number[]};
    });
    expect(remaining.count).toBeLessThan(20);
    expect(remaining.indexes.every(index => index > 880 && index < 920)).toBe(true);
});
