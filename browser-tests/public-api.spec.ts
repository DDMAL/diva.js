import {expect,
        test} from "@playwright/test";
import type {Page, Route, TestInfo} from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

const manifest = (name: string, count: number) => ({
    "@context" : "http://iiif.io/api/presentation/3/context.json",
    id : `${origin}/api/${name}/manifest`,
    type : "Manifest",
    label : {en : [ name ]},
    items : Array.from({length : count}, (_value, offset) => {
        const index = offset + 1;
        return {
            id : `${origin}/api/${name}/canvas/${index}`,
            type : "Canvas",
            width : 1000,
            height : 2000,
            label : {en : [ `Folio ${index}` ]},
            items : [ {
                id : `${origin}/api/${name}/page/${index}`,
                type : "AnnotationPage",
                items : [ {
                    id : `${origin}/api/${name}/annotation/${index}`,
                    type : "Annotation",
                    motivation : "painting",
                    target : `${origin}/api/${name}/canvas/${index}`,
                    body : {
                        id : `${origin}/api/${name}/image/${index}/full/max/0/default.jpg`,
                        type : "Image",
                        service : {id : `${origin}/api/${name}/image/${index}`, type : "ImageService3"}
                    }
                } ]
            } ]
        };
    })
});

const installRoutes = async(page: Page): Promise<void> => {
    await page.route(`${origin}/api/first/manifest`, (route) => route.fulfill({json : manifest("first", 4)}));
    await page.route(`${origin}/api/second/manifest`, (route) => route.fulfill({json : manifest("second", 2)}));
    await page.route(`${origin}/api/failure/manifest`, (route) => route.fulfill({status : 500, body : "failed"}));
    await page.route(`${origin}/api/slow/manifest`, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await route.fulfill({json : manifest("slow", 1)});
    });
    await page.route(`${origin}/api/*/image/*/info.json`, (route: Route) => route.fulfill({json : {
        "@context" : "http://iiif.io/api/image/3/context.json",
        id : route.request().url().replace(/\/info\.json$/, ""),
        type : "ImageService3",
        protocol : "http://iiif.io/api/image",
        profile : "level0",
        width : 1000,
        height : 2000,
        tiles : [ {width : 256, scaleFactors : [ 1, 2, 4, 8 ]} ]
    }}));
    await page.route(`${origin}/api/*/image/*/**`, async (route) => {
        if (route.request().url().endsWith("/info.json"))
        {
            await route.fallback();
            return;
        }
        await route.fulfill({contentType : "image/png", body : png});
    });
};

const openHarness = async(page: Page, testInfo: TestInfo): Promise<void> => {
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(`${origin}/api/first/manifest`)}&osd=${osd}`);
    await page.evaluate(() => (window as any).diva.ready);
};

test.beforeEach(async ({page}, testInfo) => {
    await installRoutes(page);
    await openHarness(page, testInfo);
});

test("exposes immutable IIIF page metadata and state", async ({page}) => {
    const result = await page.evaluate(() => {
        const diva = (window as any).diva;
        const pages = diva.getPages();
        pages[0].label = "mutated";
        pages[0].images[0].label = "mutated";
        return {
            first : diva.getPages()[0],
            state : diva.getState()
        };
    });

    expect(result.first).toMatchObject({
        index : 0,
        canvasId : `${origin}/api/first/canvas/1`,
        label : "Folio 1",
        width : 1000,
        height : 2000,
        primaryImage : {id : `${origin}/api/first/image/1/info.json`, isPrimary : true}
    });
    expect(result.state).toMatchObject({ready : true, pageCount : 4, resourceUrl : `${origin}/api/first/manifest`});
});

test("navigates by openings and frames an image region", async ({page}) => {
    await page.evaluate(async () => {
        const diva = (window as any).diva;
        await diva.setLayoutMode("spread");
        await diva.next();
    });
    await expect.poll(() => page.evaluate(() => (window as any).diva.getState().currentPageIndex)).toBe(2);

    const visible = await page.evaluate(() => (window as any).diva.getVisiblePages().map((page: any) => page.index));
    expect(visible).toEqual([ 2, 3 ]);

    await page.evaluate(() => (window as any).diva.zoomToRegion(2, {x : 100, y : 200, width : 300, height : 400}, {padding : 0.1, immediately : true}));
    await expect.poll(() => page.evaluate(() => (window as any).diva.getState().zoom)).not.toBeNull();
});

test("replaces resources atomically and reports recoverable failure", async ({page}) => {
    const result = await page.evaluate(async ({second, failure}) => {
        const diva = (window as any).diva;
        let resourceEvents = 0;
        let errorEvents = 0;
        diva.addEventListener("resourcechange", () => resourceEvents += 1);
        diva.addEventListener("error", () => errorEvents += 1);
        await diva.setResource(second);
        const afterSuccess = {state : diva.getState(), pages : diva.getPages()};
        let failureName = "";
        try
        {
            await diva.setResource(failure);
        }
        catch (error)
        {
            failureName = (error as Error).name;
        }
        return {afterSuccess, afterFailure : diva.getState(), resourceEvents, errorEvents, failureName};
    }, {second : `${origin}/api/second/manifest`, failure : `${origin}/api/failure/manifest`});

    expect(result.afterSuccess.state).toMatchObject({resourceUrl : `${origin}/api/second/manifest`, pageCount : 2});
    expect(result.afterSuccess.pages).toHaveLength(2);
    expect(result.afterFailure.resourceUrl).toBe(`${origin}/api/second/manifest`);
    expect(result.afterFailure.pageCount).toBe(2);
    expect(result.resourceEvents).toBe(1);
    expect(result.errorEvents).toBe(1);
    expect(result.failureName).toBe("Error");
});

test("validates commands and cancels superseded resource loads", async ({page}) => {
    const result = await page.evaluate(async ({slow, second}) => {
        const diva = (window as any).diva;
        let regionError = "";
        try
        {
            await diva.zoomToRegion(0, {x : 0, y : 0, width : 0, height : 10});
        }
        catch (error)
        {
            regionError = (error as Error).name;
        }

        const superseded = diva.setResource(slow).catch((error: Error) => error.name);
        const replacement = diva.setResource(second);
        return {regionError, superseded : await superseded, replacement : await replacement.then(() => diva.getState())};
    }, {slow : `${origin}/api/slow/manifest`, second : `${origin}/api/second/manifest`});

    expect(result.regionError).toBe("RangeError");
    expect(result.superseded).toBe("AbortError");
    expect(result.replacement).toMatchObject({resourceUrl : `${origin}/api/second/manifest`, pageCount : 2, ready : true});
});

test("rejects commands after destruction", async ({page}) => {
    const result = await page.evaluate(async () => {
        const diva = (window as any).diva;
        diva.destroy();
        let errorName = "";
        try
        {
            await diva.next();
        }
        catch (error)
        {
            errorName = (error as Error).name;
        }
        return {errorName, state : diva.getState(), root : document.getElementById("diva-wrapper")?.innerHTML};
    });

    expect(result.errorName).toBe("InvalidStateError");
    expect(result.state).toMatchObject({destroyed : true, loading : false});
    expect(result.root).toBe("");
});
