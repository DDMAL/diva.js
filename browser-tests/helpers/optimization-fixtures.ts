import type {Page, TestInfo} from "@playwright/test";

export const optimizationOrigin = "http://127.0.0.1:4173";
const root = `${optimizationOrigin}/optimization`;

export const annotationFixture = (canvasId: string, id: string, svg = false) => ({
    id,
    type : "Annotation",
    motivation : "commenting",
    body : {type : "TextualBody", format : svg ? "text/html" : "text/plain",
            value : svg ? `<p><strong>${id}</strong></p>` : id},
    target : {
        type : "SpecificResource",
        source : canvasId,
        selector : svg
            ? {type : "SvgSelector", value : '<svg xmlns="http://www.w3.org/2000/svg"><rect x="8" y="16" width="24" height="32"/></svg>'}
            : {type : "FragmentSelector", value : "xywh=8,16,24,32"}
    }
});

export const optimizationManifest = (name: string, count: number, depth = 0) => {
    const id = `${root}/${name}`;
    const items = Array.from({length : count}, (_, index) => {
        const canvasId = `${id}/canvas/${index}`;
        // The final canvas deliberately has no IIIF Image API service.
        const body = index === count - 1
            ? {id : `${id}/static.png`, type : "Image", width : 64, height : 128}
            : {id : `${id}/image/${index}/full/max/0/default.png`, type : "Image", width : 64, height : 128,
               service : [{id : `${id}/image/${index}`, type : "ImageService3", profile : "level0"}]};
        return {
            id : canvasId, type : "Canvas", width : 64, height : 128, label : {en : [`Folio ${index + 1}`]},
            items : [{id : `${canvasId}/painting`, type : "AnnotationPage", items : [{
                id : `${canvasId}/painting/0`, type : "Annotation", motivation : "painting", target : canvasId, body
            }]}],
            annotations : [{id : `${canvasId}/comments`, type : "AnnotationPage", items : index === 0 || index === count - 1
                ? [annotationFixture(canvasId, `manifest-${index}`)] : []}]
        };
    });
    type Range = {id: string; type: string; label: {en: string[]}; items: Array<Range|{id: string; type: string}>};
    let nested: Range = {id : `${id}/range/leaf`, type : "Range", label : {en : ["Leaf"]},
                         items : [{id : items[0].id, type : "Canvas"}]};
    for (let level = depth - 1; level >= 0; level -= 1)
    {
        nested = {id : `${id}/range/depth-${level}`, type : "Range", label : {en : [`Depth ${level}`]}, items : [nested]};
    }
    const broad: Range[] = Array.from({length : Math.min(count, 16)}, (_, index) => ({
        id : `${id}/range/broad-${index}`, type : "Range", label : {en : [`Section ${index}`]},
        items : [{id : items[index].id, type : "Canvas"}]
    }));
    return {"@context" : "http://iiif.io/api/presentation/3/context.json", id : `${id}/manifest`,
            type : "Manifest", label : {en : [name]}, items, structures : depth ? [nested, ...broad] : broad};
};

export const installOptimizationRoutes = async (page: Page): Promise<void> => {
    // Generate a real, non-uniform image locally, rather than fetching remote tiles.
    const image = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 128;
        const context = canvas.getContext("2d")!;
        const pixels = context.createImageData(64, 128);
        for (let i = 0; i < pixels.data.length; i += 4)
        {
            const p = i / 4;
            pixels.data.set([p % 256, (p * 17) % 256, (p * 31) % 256, 255], i);
        }
        context.putImageData(pixels, 0, 0);
        return canvas.toDataURL("image/png").split(",")[1];
    });
    const manifests = new Map([
        ["small", optimizationManifest("small", 4)],
        ["large", optimizationManifest("large", 1000)],
        ["nested", optimizationManifest("nested", 64, 64)]
    ]);
    await page.route(`${root}/**`, async (route) => {
        const url = new URL(route.request().url());
        const parts = url.pathname.split("/");
        if (url.pathname.endsWith("/manifest") && manifests.has(parts[2]))
        {
            await route.fulfill({json : manifests.get(parts[2])});
        }
        else if (url.pathname.endsWith("/info.json"))
        {
            await route.fulfill({json : {
                "@context" : "http://iiif.io/api/image/3/context.json",
                id : `${url.origin}${url.pathname.replace(/\/info\.json$/, "")}`,
                type : "ImageService3", protocol : "http://iiif.io/api/image", profile : "level0",
                width : 64, height : 128
            }});
        }
        else if (/\.(png|jpg)$/.test(url.pathname))
        {
            await route.fulfill({contentType : "image/png", body : Buffer.from(image, "base64")});
        }
        else
        {
            await route.fulfill({status : 404, body : "Unknown optimization fixture"});
        }
    });
};

export const openOptimizationHarness = async (page: Page, testInfo: TestInfo, name = "small"): Promise<void> => {
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    const manifest = `${root}/${name}/manifest`;
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(manifest)}&osd=${osd}&bundle=production`);
    await page.evaluate(async (objectData) => {
        await (window as any).diva.ready;
        (window as any).diva.destroy();
        const diva = new (window as any).Diva("diva-wrapper", {objectData, enableAnnotations : true, showSidebar : true});
        (window as any).diva = diva;
        await diva.ready;
    }, manifest);
};
