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

test("loads the production IIFE and exposes the ESM entry points", async ({page}, testInfo) => {
    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(`${origin}/api/first/manifest`)}&osd=${osd}&bundle=production`);
    await page.evaluate(() => (window as any).diva.ready);

    const iife = await page.evaluate(() => ({
        constructor : typeof (window as any).Diva,
        ready : (window as any).diva.getState().ready
    }));
    expect(iife).toEqual({constructor : "function", ready : true});

    await page.goto("/");
    const esm = await page.evaluate(async () => {
        const module = await import("/build/diva.esm.js");
        return {
            named : typeof module.Diva,
            defaultExport : typeof module.default,
            sameExport : module.Diva === module.default
        };
    });
    expect(esm).toEqual({named : "function", defaultExport : "function", sameExport : true});
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

test("labels modal close buttons", async ({page}) => {
    for (const opener of [ "Manifest Info", "Page View" ])
    {
        await page.getByRole("button", {name : opener, exact : true}).click();
        const closeButton = page.getByRole("button", {name : "Close", exact : true});
        await expect(closeButton).toBeVisible();
        await expect(closeButton.locator("..")).toHaveAttribute("data-tooltip", "Close");
        await closeButton.click();
        await expect(closeButton).toBeHidden();
    }
});

test("finds pages by exact Canvas ID and complete case-insensitive label", async ({page}) => {
    const name = "duplicate-labels";
    const duplicateManifest = manifest(name, 3);
    duplicateManifest.items[0].label = {en : [ "Same Label" ]};
    duplicateManifest.items[1].label = {en : [ "Same Label" ]};
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : duplicateManifest}));
    await page.evaluate((url) => (window as any).diva.setResource(url), `${origin}/api/${name}/manifest`);

    const result = await page.evaluate(async ({canvasId}) => {
        const diva = (window as any).diva;
        const byCanvas = diva.findPage({by : "canvasId", value : canvasId});
        const byLabel = diva.findPage({by : "label", value : "sAmE lAbEl"});
        byLabel.label = "mutated";
        const defensive = diva.findPage({by : "label", value : "Same Label"});
        const substring = diva.findPage({by : "label", value : "Same"});
        const whitespace = diva.findPage({by : "label", value : " Same Label "});
        const moved = await diva.goToPage({by : "canvasId", value : canvasId});
        const beforeMissing = diva.getState().currentPageIndex;
        const missing = await diva.goToPage({by : "label", value : "Missing"});
        let findError = "";
        let goError = "";
        try
        {
            diva.findPage({by : "unknown", value : "x"});
        }
        catch (error)
        {
            findError = (error as Error).name;
        }
        try
        {
            await diva.goToPage({by : "label", value : 4});
        }
        catch (error)
        {
            goError = (error as Error).name;
        }
        return {
            byCanvas,
            byLabelIndex : byLabel.index,
            defensiveLabel : defensive.label,
            substring,
            whitespace,
            moved,
            missing,
            beforeMissing,
            afterMissing : diva.getState().currentPageIndex,
            findError,
            goError
        };
    }, {canvasId : `${origin}/api/${name}/canvas/3`});

    expect(result).toMatchObject({
        byCanvas : {index : 2, canvasId : `${origin}/api/${name}/canvas/3`},
        byLabelIndex : 0,
        defensiveLabel : "Same Label",
        substring : undefined,
        whitespace : undefined,
        moved : true,
        missing : false,
        beforeMissing : 2,
        afterMissing : 2,
        findError : "TypeError",
        goError : "TypeError"
    });
});

test("rebuilds page lookup indexes after resource replacement", async ({page}) => {
    const result = await page.evaluate(async ({firstCanvas, second}) => {
        const diva = (window as any).diva;
        const before = diva.findPage({by : "canvasId", value : firstCanvas})?.index;
        await diva.setResource(second);
        return {
            before,
            stale : diva.findPage({by : "canvasId", value : firstCanvas}),
            current : diva.findPage({by : "label", value : "folio 2"})?.canvasId
        };
    }, {firstCanvas : `${origin}/api/first/canvas/4`, second : `${origin}/api/second/manifest`});

    expect(result).toEqual({before : 3, stale : undefined, current : `${origin}/api/second/canvas/2`});
});

test("opens numeric, Canvas-ID, and label initial targets", async ({page}) => {
    const objectData = `${origin}/api/first/manifest`;
    const targets = [
        2,
        {by : "canvasId", value : `${origin}/api/first/canvas/4`},
        {by : "label", value : "fOlIo 2"}
    ];
    const indexes: number[] = [];
    for (const [offset, initialPage] of targets.entries())
    {
        indexes.push(await page.evaluate(async ({objectData, initialPage, offset}) => {
            const root = document.createElement("div");
            root.id = `initial-target-${offset}`;
            root.style.cssText = "width:800px;height:600px";
            document.body.appendChild(root);
            const diva = new (window as any).Diva(root.id, {objectData, initialPage});
            await diva.ready;
            return diva.getState().currentPageIndex;
        }, {objectData, initialPage, offset}));
    }
    expect(indexes).toEqual([ 2, 3, 1 ]);
});

test("falls back to page zero for invalid and unmatched initial targets", async ({page}) => {
    const objectData = `${origin}/api/first/manifest`;
    const targets = [ 99, {by : "label", value : "missing"}, {by : "bad", value : "x"} ];
    const indexes: number[] = [];
    for (const [offset, initialPage] of targets.entries())
    {
        indexes.push(await page.evaluate(async ({objectData, initialPage, offset}) => {
            const root = document.createElement("div");
            root.id = `fallback-target-${offset}`;
            root.style.cssText = "width:800px;height:600px";
            document.body.appendChild(root);
            const diva = new (window as any).Diva(root.id, {objectData, initialPage});
            await diva.ready;
            return diva.getState().currentPageIndex;
        }, {objectData, initialPage, offset}));
    }
    expect(indexes).toEqual([ 0, 0, 0 ]);
});

test("loads a distant initial target without requesting page zero", async ({page}) => {
    const name = "distant";
    const infoRequests: string[] = [];
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : manifest(name, 24)}));
    page.on("request", (request) => {
        if (request.url().includes(`/api/${name}/image/`) && request.url().endsWith("/info.json"))
        {
            infoRequests.push(request.url());
        }
    });

    const state = await page.evaluate(async ({objectData, initialPage}) => {
        const diva = new (window as any).Diva("diva-wrapper", {objectData, initialPage});
        (window as any).diva = diva;
        await diva.ready;
        return diva.getState();
    }, {objectData : `${origin}/api/${name}/manifest`, initialPage : 18});

    expect(state.currentPageIndex).toBe(18);
    expect(infoRequests).toContain(`${origin}/api/${name}/image/19/info.json`);
    expect(infoRequests).not.toContain(`${origin}/api/${name}/image/1/info.json`);
});

test("positions a distant initial image with final page geometry", async ({page}) => {
    const name = "varied-geometry";
    const targetIndex = 19;
    const variedManifest = manifest(name, 24);
    (variedManifest as any).behavior = [ "paged" ];
    variedManifest.items.forEach((canvas, index) => {
        canvas.width = index % 2 === 0 ? 900 : 1300;
        canvas.height = 1600 + (index * 17);
        const body = canvas.items[0].items[0].body as any;
        body.id = `${origin}/api/${name}/static/${index + 1}.png`;
        delete body.service;
    });
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : variedManifest}));
    await page.route(`${origin}/api/${name}/static/*`, (route) => route.fulfill({contentType : "image/png", body : png}));

    const result = await page.evaluate(async ({objectData, initialPage}) => {
        const diva = new (window as any).Diva("diva-wrapper", {objectData, initialPage});
        (window as any).diva = diva;
        await diva.ready;
        const viewer = document.getElementById("main-viewer") as any;
        const itemBounds = viewer.loadedItems.get(initialPage).getBounds();
        return {
            currentPageIndex : diva.getState().currentPageIndex,
            itemX : itemBounds.x,
            itemY : itemBounds.y,
            itemHeight : itemBounds.height,
            expectedX : viewer.pageXOffsets[initialPage],
            expectedY : viewer.pageOffsets[initialPage],
            expectedHeight : viewer.pageHeights[initialPage]
        };
    }, {objectData : `${origin}/api/${name}/manifest`, initialPage : targetIndex});

    expect(result.currentPageIndex).toBe(targetIndex);
    expect(result.itemX).toBeCloseTo(result.expectedX, 6);
    expect(result.itemY).toBeCloseTo(result.expectedY, 6);
    expect(result.itemHeight).toBeCloseTo(result.expectedHeight, 6);
});

test("configures the initial sidebar width and retains the default", async ({page}) => {
    const sidebar = page.locator(".diva-sidebar-panel");
    await page.getByRole("button", {name : "Show Sidebar"}).evaluate((button: HTMLButtonElement) => button.click());
    await expect(sidebar).toHaveCSS("width", "320px");

    await page.evaluate(async (objectData) => {
        (window as any).diva = new (window as any).Diva("diva-wrapper", {objectData, sidebarWidth : 411.6});
        await (window as any).diva.ready;
    }, `${origin}/api/first/manifest`);
    await page.getByRole("button", {name : "Show Sidebar"}).evaluate((button: HTMLButtonElement) => button.click());
    await expect(sidebar).toHaveCSS("width", "412px");
});

test("uses the same width breakpoint for sidebar state and CSS layout", async ({page}) => {
    const sidebar = page.locator(".diva-sidebar-panel");

    await page.setViewportSize({width : 800, height : 650});
    await page.getByRole("button", {name : "Show Sidebar"}).click();
    await expect(sidebar).not.toHaveClass(/is-overlay/);
    await expect(sidebar).toHaveCSS("width", "320px");

    await page.setViewportSize({width : 720, height : 800});
    await expect(sidebar).toHaveClass(/is-mobile-hidden/);
    await page.getByRole("button", {name : "Show Sidebar"}).click();
    await expect(sidebar).toHaveClass(/is-overlay/);
    await expect(page.locator(".diva-sidebar-resizer")).toBeHidden();
});

test("defaults to thumbnails and selects the configured contents panel", async ({page}) => {
    const name = "sidebar-panels";
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : {
        ...manifest(name, 2),
        metadata : [ {
            label : {en : [ "Creator" ]},
            value : {en : [ "Test Creator" ]}
        } ],
        structures : [ {
            id : `${origin}/api/${name}/range/a`,
            type : "Range",
            label : {en : [ "Section A" ]},
            items : [ {id : `${origin}/api/${name}/canvas/1`, type : "Canvas"} ]
        } ]
    }}));

    await page.getByRole("button", {name : "Show Sidebar"}).evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByRole("button", {name : "Thumbnails", exact : true})).toHaveClass(/is-active/);
    await page.evaluate(({objectData, sidebarPanel}) => {
        (window as any).diva = new (window as any).Diva("diva-wrapper", {objectData, sidebarPanel});
    }, {objectData : `${origin}/api/${name}/manifest`, sidebarPanel : "contents"});
    await expect(page.getByRole("button", {name : "Contents", exact : true})).toHaveClass(/is-active/);
});

test("selects the configured metadata panel", async ({page}) => {
    const name = "sidebar-metadata";
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : {
        ...manifest(name, 1),
        metadata : [ {
            label : {en : [ "Creator" ]},
            value : {en : [ "Test Creator" ]}
        } ]
    }}));

    await page.evaluate(({objectData, sidebarPanel}) => {
        (window as any).diva = new (window as any).Diva("diva-wrapper", {objectData, sidebarPanel});
    }, {objectData : `${origin}/api/${name}/manifest`, sidebarPanel : "metadata"});
    await expect(page.getByRole("button", {name : "Metadata", exact : true})).toHaveClass(/is-active/);
});

test("falls back to thumbnails when the configured panel is unavailable", async ({page}) => {
    await page.evaluate(({objectData, sidebarPanel}) => {
        (window as any).diva = new (window as any).Diva("diva-wrapper", {objectData, sidebarPanel});
    }, {objectData : `${origin}/api/first/manifest`, sidebarPanel : "contents"});
    await expect(page.getByRole("button", {name : "Thumbnails", exact : true})).toHaveClass(/is-active/);
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

test("bolds ranges containing the current page in the contents index", async ({page}) => {
    const name = "ranged";
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : {
        ...manifest(name, 3),
        structures : [ {
                          id : `${origin}/api/${name}/range/a`,
                          type : "Range",
                          label : {en : [ "Section A" ]},
                          items : [
                              {id : `${origin}/api/${name}/canvas/1`, type : "Canvas"},
                              {id : `${origin}/api/${name}/canvas/2`, type : "Canvas"}
                          ]
                      },
                       {
                           id : `${origin}/api/${name}/range/b`,
                           type : "Range",
                           label : {en : [ "Section B" ]},
                           items : [ {id : `${origin}/api/${name}/canvas/3`, type : "Canvas"} ]
                       } ]
    }}));

    await page.evaluate((url) => (window as any).diva.setResource(url), `${origin}/api/${name}/manifest`);
    await page.getByRole("button", {name : "Contents"}).evaluate((button: HTMLButtonElement) => button.click());

    const sectionA = page.getByRole("button", {name : "Section A", exact : true});
    const sectionB = page.getByRole("button", {name : "Section B", exact : true});
    await expect(sectionA).toHaveClass(/is-current/);
    await expect(sectionA).toHaveAttribute("aria-current", "location");
    await expect(sectionA).toHaveCSS("font-weight", "600");
    await expect(sectionB).not.toHaveClass(/is-current/);

    await page.evaluate(() => (window as any).diva.goToPage(2));
    await expect(sectionB).toHaveClass(/is-current/);
    await expect(sectionB).toHaveAttribute("aria-current", "location");
    await expect(sectionA).not.toHaveClass(/is-current/);

    await page.getByRole("button", {name : "On this page"}).evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator(".diva-contents-button.is-current")).toHaveCount(0);
});

test("bolds ranges containing either page of a two-up spread", async ({page}) => {
    const name = "spread-ranges";
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : {
        ...manifest(name, 3),
        structures : [ {
                          id : `${origin}/api/${name}/range/left`,
                          type : "Range",
                          label : {en : [ "Left page range" ]},
                          items : [ {id : `${origin}/api/${name}/canvas/1`, type : "Canvas"} ]
                      },
                       {
                           id : `${origin}/api/${name}/range/right`,
                           type : "Range",
                           label : {en : [ "Right page range" ]},
                           items : [ {id : `${origin}/api/${name}/canvas/2`, type : "Canvas"} ]
                       },
                       {
                           id : `${origin}/api/${name}/range/not-visible`,
                           type : "Range",
                           label : {en : [ "Other page range" ]},
                           items : [ {id : `${origin}/api/${name}/canvas/3`, type : "Canvas"} ]
                       } ]
    }}));

    await page.evaluate(async (url) => {
        const diva = (window as any).diva;
        await diva.setResource(url);
        await diva.setLayoutMode("spread");
    }, `${origin}/api/${name}/manifest`);
    await page.getByRole("button", {name : "Contents"}).evaluate((button: HTMLButtonElement) => button.click());

    const leftRange = page.getByRole("button", {name : "Left page range", exact : true});
    const rightRange = page.getByRole("button", {name : "Right page range", exact : true});
    const otherRange = page.getByRole("button", {name : "Other page range", exact : true});
    await expect(leftRange).toHaveClass(/is-current/);
    await expect(rightRange).toHaveClass(/is-current/);
    await expect(otherRange).not.toHaveClass(/is-current/);

    await page.evaluate(async () => {
        const diva = (window as any).diva;
        await diva.setLayoutMode("spread-shift");
        await diva.goToPage(1);
    });
    await expect(leftRange).not.toHaveClass(/is-current/);
    await expect(rightRange).toHaveClass(/is-current/);
    await expect(otherRange).toHaveClass(/is-current/);
});

test("uses separate controls for range navigation and metadata disclosure", async ({page}) => {
    const name = "range-disclosure";
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : {
        ...manifest(name, 2),
        structures : [ {
            id : `${origin}/api/${name}/range/a`,
            type : "Range",
            label : {en : [ "Section A" ]},
            metadata : [ {label : {en : [ "Composer" ]}, value : {en : [ "Anonymous" ]}} ],
            items : [ {id : `${origin}/api/${name}/canvas/1`, type : "Canvas"} ]
        } ]
    }}));

    await page.evaluate(async (url) => {
        const diva = (window as any).diva;
        await diva.setResource(url);
        await diva.goToPage(1);
    }, `${origin}/api/${name}/manifest`);
    await page.getByRole("button", {name : "Contents"}).evaluate((button: HTMLButtonElement) => button.click());

    const showInformation = page.getByRole("button", {name : "Show information for Section A", exact : true});
    await expect(showInformation).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Anonymous", {exact : true})).toHaveCount(0);

    await showInformation.click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.getState().currentPageIndex)).toBe(1);
    const hideInformation = page.getByRole("button", {name : "Hide information for Section A", exact : true});
    await expect(hideInformation).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Anonymous", {exact : true})).toBeVisible();
    const metadataLabel = page.getByText("Composer", {exact : true});
    await expect(metadataLabel).toHaveCSS("font-weight", "600");
    await expect(metadataLabel).toHaveCSS("text-transform", "none");

    await page.getByRole("button", {name : "Section A", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.getState().currentPageIndex)).toBe(0);
    await expect(page.getByText("Anonymous", {exact : true})).toBeVisible();

    await hideInformation.click();
    await expect(page.getByText("Anonymous", {exact : true})).toHaveCount(0);
});

test("indents nested ranges in the contents index", async ({page}) => {
    const name = "nested-ranges";
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : {
        ...manifest(name, 3),
        structures : [ {
            id : `${origin}/api/${name}/range/parent`,
            type : "Range",
            label : {en : [ "Parent range" ]},
            items : [ {
                id : `${origin}/api/${name}/range/child`,
                type : "Range",
                label : {en : [ "Child range" ]},
                items : [ {
                    id : `${origin}/api/${name}/range/grandchild`,
                    type : "Range",
                    label : {en : [ "Grandchild range" ]},
                    items : [ {id : `${origin}/api/${name}/canvas/1`, type : "Canvas"} ]
                } ]
            } ]
        } ]
    }}));

    await page.evaluate((url) => (window as any).diva.setResource(url), `${origin}/api/${name}/manifest`);
    await page.getByRole("button", {name : "Contents"}).evaluate((button: HTMLButtonElement) => button.click());

    const parent = page.getByRole("button", {name : "Parent range", exact : true});
    const child = page.getByRole("button", {name : "Child range", exact : true});
    const grandchild = page.getByRole("button", {name : "Grandchild range", exact : true});
    const [parentBox, childBox, grandchildBox] = await Promise.all([
        parent.boundingBox(),
        child.boundingBox(),
        grandchild.boundingBox()
    ]);

    expect(parentBox).not.toBeNull();
    expect(childBox!.x - parentBox!.x).toBeGreaterThanOrEqual(18);
    expect(grandchildBox!.x - childBox!.x).toBeGreaterThanOrEqual(18);
    await expect(page.locator(".diva-contents-list-nested").first()).toHaveCSS("border-left-width", "1px");
});

test("keeps the previous resource when a replacement request fails", async ({page}) => {
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

test("ignores a late initial resource after an immediate replacement", async ({page}, testInfo) => {
    const slowInitial = `${origin}/api/slow-initial/manifest`;
    let releaseInitial!: () => void;
    const initialReleased = new Promise<void>((resolve) => {
        releaseInitial = resolve;
    });
    let initialRequested = false;

    await page.route(slowInitial, async (route) => {
        initialRequested = true;
        await initialReleased;
        await route.fulfill({json : manifest("slow-initial", 1)});
    });

    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(slowInitial)}&osd=${osd}`);
    await page.evaluate((replacementUrl) => {
        const diva = (window as any).diva;
        const outcomes = {
            ready : "pending",
            replacement : "pending",
            readyEvents : [] as string[],
            resourceEvents : [] as string[]
        };
        (window as any).resourceRaceOutcomes = outcomes;
        diva.addEventListener("ready", (event: CustomEvent) => outcomes.readyEvents.push(event.detail.resourceUrl));
        diva.addEventListener("resourcechange", (event: CustomEvent) => outcomes.resourceEvents.push(event.detail.resourceUrl));
        diva.ready.then(() => outcomes.ready = "resolved", (error: Error) => outcomes.ready = error.name);
        diva.setResource(replacementUrl)
            .then(() => outcomes.replacement = "resolved", (error: Error) => outcomes.replacement = error.name);
    }, `${origin}/api/second/manifest`);

    await expect.poll(() => initialRequested).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as any).resourceRaceOutcomes)).toMatchObject({
        ready : "resolved",
        replacement : "resolved",
        readyEvents : [ `${origin}/api/second/manifest` ],
        resourceEvents : [ `${origin}/api/second/manifest` ]
    });

    releaseInitial();
    await page.waitForTimeout(250);

    const result = await page.evaluate(() => ({
                                           outcomes : (window as any).resourceRaceOutcomes,
                                           pages : (window as any).diva.getPages(),
                                           state : (window as any).diva.getState()
                                       }));
    expect(result.state).toMatchObject({
        resourceUrl : `${origin}/api/second/manifest`,
        pageCount : 2,
        ready : true
    });
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].canvasId).toBe(`${origin}/api/second/canvas/1`);
    expect(result.outcomes.readyEvents).toEqual([ `${origin}/api/second/manifest` ]);
    expect(result.outcomes.resourceEvents).toEqual([ `${origin}/api/second/manifest` ]);
});

test("does not let an initial page finish after setResource has taken ownership", async ({page}, testInfo) => {
    const initialName = "parsed-initial";
    const replacementName = "delayed-replacement";
    let releaseInitialImage!: () => void;
    let releaseReplacement!: () => void;
    const initialImageReleased = new Promise<void>((resolve) => releaseInitialImage = resolve);
    const replacementReleased = new Promise<void>((resolve) => releaseReplacement = resolve);
    let initialImageRequested = false;

    await page.route(`${origin}/api/${initialName}/manifest`, (route) => route.fulfill({json : manifest(initialName, 1)}));
    await page.route(`${origin}/api/${initialName}/image/1/info.json`, async (route) => {
        initialImageRequested = true;
        await initialImageReleased;
        await route.fulfill({json : {
            "@context" : "http://iiif.io/api/image/3/context.json",
            id : `${origin}/api/${initialName}/image/1`,
            type : "ImageService3",
            protocol : "http://iiif.io/api/image",
            profile : "level0",
            width : 1000,
            height : 2000,
            tiles : [ {width : 256, scaleFactors : [ 1, 2, 4, 8 ]} ]
        }});
    });
    await page.route(`${origin}/api/${replacementName}/manifest`, async (route) => {
        await replacementReleased;
        await route.fulfill({json : manifest(replacementName, 1)});
    });

    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(`${origin}/api/${initialName}/manifest`)}&osd=${osd}`);
    await expect.poll(() => initialImageRequested).toBe(true);
    await page.evaluate((url) => {
        const diva = (window as any).diva;
        const outcomes = {ready : "pending", replacement : "pending", readyEvents : [] as string[], resourceEvents : [] as string[]};
        (window as any).parsedInitialOutcomes = outcomes;
        diva.addEventListener("ready", (event: CustomEvent) => outcomes.readyEvents.push(event.detail.resourceUrl));
        diva.addEventListener("resourcechange", (event: CustomEvent) => outcomes.resourceEvents.push(event.detail.resourceUrl));
        diva.ready.then(() => outcomes.ready = "resolved", (error: Error) => outcomes.ready = error.name);
        diva.setResource(url).then(() => outcomes.replacement = "resolved", (error: Error) => outcomes.replacement = error.name);
    }, `${origin}/api/${replacementName}/manifest`);

    releaseInitialImage();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => (window as any).parsedInitialOutcomes)).toEqual({
        ready : "pending",
        replacement : "pending",
        readyEvents : [],
        resourceEvents : []
    });

    releaseReplacement();
    await expect.poll(() => page.evaluate(() => (window as any).parsedInitialOutcomes)).toMatchObject({
        ready : "resolved",
        replacement : "resolved",
        readyEvents : [ `${origin}/api/${replacementName}/manifest` ],
        resourceEvents : [ `${origin}/api/${replacementName}/manifest` ]
    });
});

test("settles ready when an immediate replacement fails", async ({page}, testInfo) => {
    const slowInitial = `${origin}/api/uncommitted-initial/manifest`;
    let releaseInitial!: () => void;
    const initialReleased = new Promise<void>((resolve) => releaseInitial = resolve);
    await page.route(slowInitial, async (route) => {
        await initialReleased;
        await route.fulfill({json : manifest("uncommitted-initial", 1)});
    });

    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(slowInitial)}&osd=${osd}`);
    const result = await page.evaluate(async (failureUrl) => {
        const diva = (window as any).diva;
        const replacement = diva.setResource(failureUrl).then(() => "resolved", (error: Error) => error.name);
        const ready = diva.ready.then(() => "resolved", (error: Error) => error.name);
        return {replacement : await replacement, ready : await ready, state : diva.getState(), pages : diva.getPages()};
    }, `${origin}/api/failure/manifest`);

    expect(result).toMatchObject({replacement : "Error", ready : "Error", state : {ready : false, pageCount : 0}});
    expect(result.pages).toEqual([]);
    releaseInitial();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => (window as any).diva.getState().ready)).toBe(false);
});

test("waits for the required page when a prefetched neighbor fails", async ({page}, testInfo) => {
    const name = "prefetch-failure";
    let releaseFirstPage!: () => void;
    const firstPageReleased = new Promise<void>((resolve) => {
        releaseFirstPage = resolve;
    });

    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : manifest(name, 2)}));
    await page.route(`${origin}/api/${name}/image/1/info.json`, async (route) => {
        await firstPageReleased;
        await route.fulfill({json : {
            "@context" : "http://iiif.io/api/image/3/context.json",
            id : `${origin}/api/${name}/image/1`,
            type : "ImageService3",
            protocol : "http://iiif.io/api/image",
            profile : "level0",
            width : 1000,
            height : 2000,
            tiles : [ {width : 256, scaleFactors : [ 1, 2, 4, 8 ]} ]
        }});
    });
    await page.route(`${origin}/api/${name}/image/2/info.json`, (route) => route.fulfill({status : 500, body : "failed"}));

    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(`${origin}/api/${name}/manifest`)}&osd=${osd}`);
    await page.evaluate(() => {
        (window as any).requiredPageOutcome = "pending";
        (window as any).diva.ready.then(() => (window as any).requiredPageOutcome = "resolved", (error: Error) => (window as any).requiredPageOutcome = error.name);
    });

    await expect(page.locator(".diva-image-unavailable")).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).requiredPageOutcome)).toBe("pending");
    expect(await page.evaluate(() => (window as any).diva.getState().ready)).toBe(false);

    releaseFirstPage();
    await expect.poll(() => page.evaluate(() => (window as any).requiredPageOutcome)).toBe("resolved");
    await expect.poll(() => page.evaluate(() => (window as any).diva.getState().ready)).toBe(true);
});

test("rejects initial readiness when the required page fails", async ({page}, testInfo) => {
    const name = "required-page-failure";
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : manifest(name, 2)}));
    await page.route(`${origin}/api/${name}/image/1/info.json`, (route) => route.fulfill({status : 500, body : "failed"}));

    const osd = (testInfo.project.metadata.osdVersion as string).startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(`${origin}/api/${name}/manifest`)}&osd=${osd}`);
    const result = await page.evaluate(async () => {
        const diva = (window as any).diva;
        let readyOutcome = "resolved";
        try
        {
            await diva.ready;
        }
        catch (error)
        {
            readyOutcome = (error as Error).name;
        }
        return {readyOutcome, state : diva.getState()};
    });

    expect(result.readyOutcome).toBe("Error");
    expect(result.state.ready).toBe(false);
    expect(result.state.pageCount).toBe(2);
    await expect(page.locator(".diva-image-unavailable")).toHaveCount(1);
});

test("rejects a replacement when its required page fails", async ({page}) => {
    const name = "replacement-page-failure";
    await page.route(`${origin}/api/${name}/manifest`, (route) => route.fulfill({json : manifest(name, 1)}));
    await page.route(`${origin}/api/${name}/image/1/info.json`, (route) => route.fulfill({status : 500, body : "failed"}));

    const result = await page.evaluate(async (url) => {
        const diva = (window as any).diva;
        const errors: string[] = [];
        let resourceEvents = 0;
        diva.addEventListener("error", (event: CustomEvent) => errors.push(event.detail.operation));
        diva.addEventListener("resourcechange", () => resourceEvents += 1);
        let replacementOutcome = "resolved";
        try
        {
            await diva.setResource(url);
        }
        catch (error)
        {
            replacementOutcome = (error as Error).name;
        }
        return {errors, replacementOutcome, resourceEvents, state : diva.getState(), pages : diva.getPages()};
    }, `${origin}/api/${name}/manifest`);

    expect(result.replacementOutcome).toBe("Error");
    expect(result.resourceEvents).toBe(1);
    expect(result.errors).toContain("loadPage");
    expect(result.state).toMatchObject({ready : false, resourceUrl : `${origin}/api/${name}/manifest`, pageCount : 1});
    expect(result.pages[0].canvasId).toBe(`${origin}/api/${name}/canvas/1`);
    await expect(page.locator(".diva-image-unavailable")).toHaveCount(1);
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
