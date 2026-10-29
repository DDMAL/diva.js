import {expect, test} from "@playwright/test";
import {installOptimizationRoutes, openOptimizationHarness, optimizationManifest, optimizationOrigin} from "./helpers/optimization-fixtures";

test("uses the primary image for thumbnail fallback and keeps a protected primary protected", async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    const root = `${optimizationOrigin}/optimization/selection`;
    const authOrigin = "https://selection.auth.example.test";
    const manifest = optimizationManifest("selection", 4);
    const missingThumbnail = `${root}/missing-thumbnail.jpg`;
    const image = (index: number, protectedImage = false) => ({
        id : `${root}/image/${index}/full/max/0/default.png`, type : "Image", width : 64, height : 128,
        service : [{id : `${root}/image/${index}`, type : "ImageService3", profile : "level0",
                    ...(protectedImage ? {service : [{
                        id : `${authOrigin}/probe`, type : "AuthProbeService2", service : [{
                            id : `${authOrigin}/access`, type : "AuthAccessService2", profile : "active", label : {en : ["Sign in"]},
                            service : [{id : `${authOrigin}/token`, type : "AuthAccessTokenService2"}]
                        }]
                    }]} : {})}]
    });
    // Choice images have no explicit primary; the first image must be promoted.
    (manifest.items[0] as any).thumbnail = [{id : missingThumbnail, type : "Image"}];
    (manifest.items[0].items[0].items[0] as any).body = {type : "Choice", items : [image(0), image(10)]};
    (manifest.items[1].items[0].items[0] as any).body = {type : "Choice", items : [image(1, true), image(11)]};
    const thumbnails: string[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/full/180,/")) thumbnails.push(request.url());
    });
    await page.route(`${root}/manifest`, (route) => route.fulfill({json : manifest}));
    await page.route(missingThumbnail, (route) => route.fulfill({status : 404}));
    await page.route(`${authOrigin}/probe`, (route) => route.fulfill({headers : {"access-control-allow-origin" : optimizationOrigin}, json : {
        "@context" : "http://iiif.io/api/auth/2/context.json", type : "AuthProbeResult2", status : 401
    }}));
    await openOptimizationHarness(page, testInfo, "selection");

    const publicThumbnail = page.locator("#thumb-0 diva-lazy-image");
    const fallback = `${root}/image/0/full/180,/0/default.jpg`;
    await expect(publicThumbnail).toHaveAttribute("data-src", missingThumbnail);
    await expect(publicThumbnail).toHaveAttribute("data-fallback-src", fallback);
    await expect(publicThumbnail).toHaveAttribute("data-crossorigin", "anonymous");
    await expect(publicThumbnail.locator("img")).toHaveAttribute("src", fallback);
    await expect(publicThumbnail.locator("img")).not.toHaveAttribute("crossorigin");
    await expect(page.locator("#thumb-0 .diva-thumbs-label")).toHaveText("Folio 1 *");
    await expect(page.locator("#thumb-1 .diva-thumbs-image--protected")).toBeVisible();
    await expect(page.locator("#thumb-1 diva-lazy-image")).toHaveCount(0);
    expect(thumbnails).toContain(fallback);
    expect(thumbnails.some((url) => /\/image\/(1|10|11)\//.test(url))).toBe(false);
    const pages = await page.evaluate(() => (window as any).diva.getPages().slice(0, 2));
    expect(pages.map((entry: any) => entry.images.map((choice: any) => choice.isPrimary))).toEqual([[true, false], [true, false]]);
    expect(pages.map((entry: any) => entry.primaryImage.id)).toEqual([`${root}/image/0/info.json`, `${root}/image/1/info.json`]);
});
