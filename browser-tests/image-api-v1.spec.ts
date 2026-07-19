import {expect,
        test} from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const manifestUrl = `${origin}/browser-tests/fixtures/gallica-image-api-v1-manifest.json`;
const serviceUrl = `${origin}/image-api-v1/image/f1`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("loads a Gallica-style Image API 1 service", async ({page}, testInfo) => {
    let infoRequests = 0;
    const imageRequests: string[] = [];

    await page.route(`${serviceUrl}/info.json`, async (route) => {
        infoRequests += 1;
        await route.fulfill({json : {
            "@context" : "http://iiif.io/api/image/1/context.json",
            "@id" : serviceUrl,
            width : 3055,
            height : 4072,
            profile : "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level2",
            tile_width : 256,
            tile_height : 256,
            scale_factors : [ 1, 2, 4, 8, 16 ]
        }});
    });
    await page.route(`${serviceUrl}/**`, async (route) => {
        if (route.request().url().endsWith("/info.json"))
        {
            await route.fallback();
            return;
        }
        imageRequests.push(route.request().url());
        await route.fulfill({contentType : "image/png", body : png});
    });

    const expectedVersion = testInfo.project.metadata.osdVersion as string;
    const osd = expectedVersion.startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(manifestUrl)}&osd=${osd}`);
    await expect.poll(() => page.evaluate(() => (window as any).__divaOsdVersion)).toBe(expectedVersion);
    await page.evaluate(() => (window as any).diva.ready);
    await expect.poll(() => imageRequests.length).toBeGreaterThan(0);

    const state = await page.evaluate(() => {
        const diva = (window as any).diva;
        return {page : diva.getPages()[0], state : diva.getState()};
    });
    expect(state).toMatchObject({
        page : {
            canvasId : `${origin}/image-api-v1/canvas/f1`,
            label : "Plat supérieur",
            primaryImage : {id : `${serviceUrl}/info.json`, isPrimary : true}
        },
        state : {ready : true, pageCount : 1, resourceUrl : manifestUrl}
    });
    expect(infoRequests).toBe(1);
    expect(imageRequests.every((url) => url.startsWith(`${serviceUrl}/`))).toBe(true);
    expect(imageRequests.some((url) => url.endsWith("/native.jpg"))).toBe(true);
});
