import {expect,
        test} from "@playwright/test";
import type {Page,
             TestInfo} from "@playwright/test";

const context = "http://iiif.io/api/auth/2/context.json";
const openHarness = async(page: Page, manifest: string, testInfo: TestInfo): Promise<void> => {
    const expectedVersion = testInfo.project.metadata.osdVersion as string;
    const osd = expectedVersion.startsWith("5") ? "5" : "6";
    await page.goto(`/testing/auth-harness.html?manifest=${encodeURIComponent(manifest)}&osd=${osd}`);
    await expect.poll(() => page.evaluate(() => (window as any).__divaOsdVersion)).toBe(expectedVersion);
};

test("loads the first tile without duplicate resolution requests", async ({page}, testInfo) => {
    const origin = "http://127.0.0.1:4173";
    let manifestReadyAt = 0;
    let firstTileAt = 0;
    let infoRequests = 0;
    const tileRequests: string[] = [];
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

    await page.route(`${origin}/metric/manifest`, async (route) => {
        manifestReadyAt = performance.now();
        await route.fulfill({json : {
            "@context" : "http://iiif.io/api/presentation/3/context.json",
            id : `${origin}/metric/manifest`,
            type : "Manifest",
            label : {en : [ "Load metric" ]},
            items : [ {
                id : `${origin}/metric/canvas`,
                type : "Canvas",
                width : 100,
                height : 100,
                items : [ {id : `${origin}/metric/page`, type : "AnnotationPage", items : [ {
                                                                                      id : `${origin}/metric/annotation`,
                                                                                      type : "Annotation",
                                                                                      motivation : "painting",
                                                                                      target : `${origin}/metric/canvas`,
                                                                                      body : {id : `${origin}/metric/image/full/full/0/default.jpg`, type : "Image", service : {id : `${origin}/metric/image`, type : "ImageService3"}}
                                                                                  } ]} ]
            } ]
        }});
    });
    await page.route(`${origin}/metric/image/info.json`, async (route) => {
        infoRequests += 1;
        await route.fulfill({json : {
            "@context" : "http://iiif.io/api/image/3/context.json",
            id : `${origin}/metric/image`,
            type : "ImageService3",
            protocol : "http://iiif.io/api/image",
            profile : "level0",
            width : 100,
            height : 100,
            tiles : [ {width : 100, scaleFactors : [ 1 ]} ]
        }});
    });
    await page.route(`${origin}/metric/image/**`, async (route) => {
        if (route.request().url().endsWith("/info.json"))
        {
            await route.fallback();
            return;
        }
        if (!firstTileAt)
        {
            firstTileAt = performance.now();
        }
        tileRequests.push(route.request().url());
        await route.fulfill({contentType : "image/png", body : png});
    });

    await openHarness(page, `${origin}/metric/manifest`, testInfo);
    await expect.poll(() => tileRequests.length).toBeGreaterThan(0);
    await page.waitForTimeout(250);

    const metrics = {
        firstTileMs : Math.round(firstTileAt - manifestReadyAt),
        infoRequests,
        osdVersion : testInfo.project.metadata.osdVersion,
        tileRequests : tileRequests.length
    };
    console.info(`[load-metrics] ${JSON.stringify(metrics)}`);
    await testInfo.attach("load-metrics", {body : Buffer.from(JSON.stringify(metrics, null, 2)), contentType : "application/json"});
    testInfo.annotations.push({type : "diagnostic", description : JSON.stringify(metrics)});
    expect(infoRequests).toBe(1);
    expect(tileRequests.length).toBe(new Set(tileRequests).size);
    expect(metrics.firstTileMs).toBeGreaterThanOrEqual(0);
});

test("deduplicates active login and sends bearer only to the probe", async ({context : browserContext, page}, testInfo) => {
    const origin = "http://127.0.0.1:4173";
    const authOrigin = `https://${testInfo.project.name}.auth.example.test`;
    const probeRequests: Array<{authorization?: string; cookie?: string; url : string}> = [];
    let loginRequests = 0;
    let tokenRequests = 0;
    let logoutRequests = 0;
    let logoutUrl: string|undefined;
    const nonProbeAuthorization: Array<string> = [];
    const infoRequests = new Map<string, number>();

    await browserContext.addCookies([ {
        name : "probe-cookie",
        value : "must-not-be-sent",
        url : authOrigin
    } ]);

    await page.route(`${origin}/mock/manifest`, async (route) => {
        const service = (image: string) => ({
            id : `${origin}/mock/${image}`,
            type : "ImageService3",
            service : [ {
                id : `${authOrigin}/mock/probe?uri=${encodeURIComponent(`${origin}/mock/${image}`)}`,
                type : "AuthProbeService2",
                service : [ {
                    id : `${authOrigin}/mock/login`,
                    type : "AuthAccessService2",
                    profile : "active",
                    label : {en : [ "Sign in" ]},
                    heading : {en : [ "Restricted" ]},
                    service : [
                        {id : `${authOrigin}/mock/token`, type : "AuthAccessTokenService2"},
                        {id : `${authOrigin}/mock/logout`, type : "AuthLogoutService2", label : {en : [ "Log out" ]}}
                    ]
                } ]
            } ]
        });
        const canvas = (index: number) => ({
            id : `${origin}/canvas/${index}`,
            type : "Canvas",
            width : 100,
            height : 100,
            items : [ {id : `${origin}/page/${index}`, type : "AnnotationPage", items : [ {
                                                                                    id : `${origin}/annotation/${index}`,
                                                                                    type : "Annotation",
                                                                                    motivation : "painting",
                                                                                    target : `${origin}/canvas/${index}`,
                                                                                    body : {id : `${origin}/mock/image-${index}/full/full/0/default.jpg`, type : "Image", service : service(`image-${index}`)}
                                                                                } ]} ]
        });
        await route.fulfill({json : {
            "@context" : [ context, "http://iiif.io/api/presentation/3/context.json" ],
            id : `${origin}/mock/manifest`,
            type : "Manifest",
            label : {en : [ "Auth" ]},
            items : [ canvas(1), canvas(2) ]
        }});
    });

    await page.route(`${authOrigin}/mock/probe*`, async (route) => {
        const headers = route.request().headers();
        probeRequests.push({authorization : headers.authorization, cookie : headers.cookie, url : route.request().url()});
        await route.fulfill({
            headers : {"access-control-allow-origin" : origin},
            json : {
                "@context" : context,
                type : "AuthProbeResult2",
                status : headers.authorization === "Bearer token-1" ? 200 : 401
            }
        });
    });

    await browserContext.route(`${authOrigin}/mock/login*`, async (route) => {
        loginRequests += 1;
        await route.fulfill({contentType : "text/html", body : "<script>window.close()</script>"});
    });

    await browserContext.route(`${authOrigin}/mock/token*`, async (route) => {
        tokenRequests += 1;
        const url = new URL(route.request().url());
        const messageId = url.searchParams.get("messageId");
        const targetOrigin = url.searchParams.get("origin");
        await route.fulfill({contentType : "text/html", body : `<script>parent.postMessage(${JSON.stringify({
                                                            "@context" : context,
                                                            type : "AuthAccessToken2",
                                                            accessToken : "token-1",
                                                            expiresIn : 300,
                                                            messageId
                                                        })}, ${JSON.stringify(targetOrigin)})</script>`});
    });

    await browserContext.route(`${authOrigin}/mock/logout`, async (route) => {
        logoutRequests += 1;
        logoutUrl = route.request().url();
        await route.fulfill({contentType : "text/html", body : "<script>window.close()</script>"});
    });

    await browserContext.route(`${origin}/mock/image-*/**`, async (route) => {
        const authorization = route.request().headers().authorization;
        if (authorization)
        {
            nonProbeAuthorization.push(authorization);
        }
        if (!route.request().url().endsWith("/info.json"))
        {
            await route.fulfill({status : 204});
            return;
        }
        const url = route.request().url();
        infoRequests.set(url, (infoRequests.get(url) || 0) + 1);
        if (url.includes("image-1"))
        {
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        await route.fulfill({json : {
            "@context" : "http://iiif.io/api/image/3/context.json",
            id : route.request().url().replace(/\/info\.json$/, ""),
            type : "ImageService3",
            protocol : "http://iiif.io/api/image",
            profile : "level0",
            width : 100,
            height : 100,
            tiles : [ {width : 100, scaleFactors : [ 1 ]} ]
        }});
    });

    await openHarness(page, `${origin}/mock/manifest`, testInfo);
    await expect(page.locator(".diva-auth-dialog")).toBeVisible();
    await expect(page.locator(".thumbs-image--protected")).toHaveCount(2);
    await page.locator("button[data-diva-auth-flow]").click();
    await expect(page.locator(".diva-auth-dialog")).toBeHidden({timeout : 10000});
    await expect.poll(() => probeRequests.filter((request) => request.authorization === "Bearer token-1").length).toBe(1);
    await page.getByRole("button", {name : "Page View"}).click();
    await expect(page.locator(".modal.is-page-view")).toBeVisible();
    await expect.poll(() => infoRequests.get(`${origin}/mock/image-1/info.json`) || 0).toBe(1);
    await expect.poll(() => infoRequests.get(`${origin}/mock/image-2/info.json`) || 0).toBe(1);
    await expect(page.locator("img.thumbs-image").first()).toHaveAttribute("crossorigin", "use-credentials");

    await page.evaluate(async ({sourceId, url}) => {
        const instance = (window as any).diva;
        await instance.auth.resolve({sourceId, url, isStatic : false}, new AbortController().signal);
    }, {sourceId : `${origin}/mock/image-1/info.json`, url : `${origin}/mock/image-1/info.json`});
    expect(infoRequests.get(`${origin}/mock/image-1/info.json`)).toBe(1);
    await page.locator(".modal-close-action button").click();
    await expect(page.locator(".modal.is-page-view")).toBeHidden();

    await page.evaluate(async () => {
        const viewer = document.querySelector("osd-viewer") as any;
        viewer.scrollToIndex(1);
        viewer.scrollToIndex(0);
    });
    expect(infoRequests.get(`${origin}/mock/image-1/info.json`)).toBe(1);
    expect(infoRequests.get(`${origin}/mock/image-2/info.json`)).toBe(1);

    await page.evaluate(async ({first, second}) => {
        const instance = (window as any).diva;
        instance.auth.invalidateSources([ first ]);
        await Promise.all([
            instance.auth.resolve({sourceId : first, url : first, isStatic : false}, new AbortController().signal),
            instance.auth.resolve({sourceId : second, url : second, isStatic : false}, new AbortController().signal)
        ]);
    }, {first : `${origin}/mock/image-1/info.json`, second : `${origin}/mock/image-2/info.json`});
    expect(infoRequests.get(`${origin}/mock/image-1/info.json`)).toBe(2);
    expect(infoRequests.get(`${origin}/mock/image-2/info.json`)).toBe(1);

    expect(loginRequests).toBe(1);
    expect(tokenRequests).toBe(1);
    expect(probeRequests.filter((request) => !request.authorization)).toHaveLength(1);
    expect(probeRequests).toHaveLength(2);
    expect(probeRequests[0].url).toContain("/mock/probe?uri=");
    expect(probeRequests.every((request) => !request.cookie)).toBe(true);
    expect(nonProbeAuthorization).toEqual([]);

    const logout = page.locator("button[data-diva-auth-logout]");
    await expect(logout).toHaveCount(1);
    await logout.click();
    await expect.poll(() => logoutRequests).toBe(1);
    expect(logoutUrl).toBe(`${authOrigin}/mock/logout`);
    await expect(page.locator(".diva-auth-dialog")).toBeVisible({timeout : 10000});
    await expect.poll(() => probeRequests.filter((request) => !request.authorization).length).toBe(2);
    await expect(logout).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() =>
                                                    Object.keys(sessionStorage).filter((key) => key.startsWith("diva:iiif-auth2:")).length))
        .toBe(0);

    await page.locator("button[data-diva-auth-flow]").click();
    await expect.poll(() => probeRequests.filter((request) => request.authorization === "Bearer token-1").length).toBe(2);
    await expect.poll(() => infoRequests.get(`${origin}/mock/image-1/info.json`) || 0).toBe(3);
    await expect.poll(() => infoRequests.get(`${origin}/mock/image-2/info.json`) || 0).toBe(2);
});

test("serializes independent login families in FIFO order", async ({context : browserContext, page}, testInfo) => {
    const origin = "http://127.0.0.1:4173";
    const authOrigin = `https://${testInfo.project.name}.queue-auth.example.test`;
    const loginOrder: string[] = [];
    const tokenRequests = new Map<string, number>();
    const probeRequests = new Map<string, Array<string|undefined>>();
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

    await page.route(`${origin}/queue/manifest`, async (route) => {
        const service = (family: string, image: string) => ({
            id : `${origin}/queue-images/${image}`,
            type : "ImageService3",
            service : [ {
                id : `${authOrigin}/queue/${family}/probe?uri=${encodeURIComponent(`${origin}/queue-images/${image}`)}`,
                type : "AuthProbeService2",
                service : [ {
                    id : `${authOrigin}/queue/${family}/login`,
                    type : "AuthAccessService2",
                    profile : "active",
                    label : {en : [ `Sign in to system ${family.toUpperCase()}` ]},
                    heading : {en : [ `System ${family.toUpperCase()}` ]},
                    service : [ {id : `${authOrigin}/queue/${family}/token`, type : "AuthAccessTokenService2"} ]
                } ]
            } ]
        });
        const canvas = (index: number, family: string) => {
            const image = `${family}-${index}`;
            return {
                id : `${origin}/queue-canvas/${image}`,
                type : "Canvas",
                width : 100,
                height : 100,
                items : [ {id : `${origin}/queue-page/${image}`, type : "AnnotationPage", items : [ {
                                                                                              id : `${origin}/queue-annotation/${image}`,
                                                                                              type : "Annotation",
                                                                                              motivation : "painting",
                                                                                              target : `${origin}/queue-canvas/${image}`,
                                                                                              body : {id : `${origin}/queue-images/${image}/full/full/0/default.jpg`, type : "Image", service : service(family, image)}
                                                                                          } ]} ]
            };
        };
        await route.fulfill({json : {
            "@context" : [ context, "http://iiif.io/api/presentation/3/context.json" ],
            id : `${origin}/queue/manifest`,
            type : "Manifest",
            label : {en : [ "Queued Auth" ]},
            items : [ canvas(1, "a"), canvas(2, "a"), canvas(1, "b"), canvas(2, "b") ]
        }});
    });

    await page.route(`${authOrigin}/queue/*/probe*`, async (route) => {
        const match = new URL(route.request().url()).pathname.match(/\/queue\/(a|b)\/probe/);
        const family = match?.[1] || "missing";
        const authorization = route.request().headers().authorization;
        probeRequests.set(family, [...(probeRequests.get(family) || []), authorization ]);
        if (family === "b" && !authorization)
        {
            await new Promise((resolve) => setTimeout(resolve, 75));
        }
        await route.fulfill({
            headers : {"access-control-allow-origin" : origin},
            json : {
                "@context" : context,
                type : "AuthProbeResult2",
                status : authorization === `Bearer token-${family}` ? 200 : 401
            }
        });
    });

    await browserContext.route(`${authOrigin}/queue/*/login*`, async (route) => {
        const match = new URL(route.request().url()).pathname.match(/\/queue\/(a|b)\/login/);
        loginOrder.push(match?.[1] || "missing");
        await route.fulfill({contentType : "text/html", body : "<script>window.close()</script>"});
    });

    await browserContext.route(`${authOrigin}/queue/*/token*`, async (route) => {
        const url = new URL(route.request().url());
        const match = url.pathname.match(/\/queue\/(a|b)\/token/);
        const family = match?.[1] || "missing";
        tokenRequests.set(family, (tokenRequests.get(family) || 0) + 1);
        await route.fulfill({contentType : "text/html", body : `<script>parent.postMessage(${JSON.stringify({
                                                            "@context" : context,
                                                            type : "AuthAccessToken2",
                                                            accessToken : `token-${family}`,
                                                            expiresIn : 300,
                                                            messageId : url.searchParams.get("messageId")
                                                        })}, ${JSON.stringify(url.searchParams.get("origin"))})</script>`});
    });

    await browserContext.route(`${origin}/queue-images/**`, async (route) => {
        if (!route.request().url().endsWith("/info.json"))
        {
            await route.fulfill({contentType : "image/png", body : png});
            return;
        }
        await route.fulfill({json : {
            "@context" : "http://iiif.io/api/image/3/context.json",
            id : route.request().url().replace(/\/info\.json$/, ""),
            type : "ImageService3",
            protocol : "http://iiif.io/api/image",
            profile : "level0",
            width : 100,
            height : 100,
            tiles : [ {width : 100, scaleFactors : [ 1 ]} ]
        }});
    });

    await openHarness(page, `${origin}/queue/manifest`, testInfo);
    const dialog = page.locator(".diva-auth-dialog");
    await expect(dialog).toContainText("System A");
    await dialog.locator("button[data-diva-auth-flow]").click();
    await expect(dialog).toContainText("System B", {timeout : 10000});
    await dialog.locator("button[data-diva-auth-flow]").click();
    await expect(dialog).toBeHidden({timeout : 10000});
    await expect.poll(() => tokenRequests.get("b") || 0).toBe(1);
    await expect.poll(() => probeRequests.get("b")?.length || 0).toBe(2);

    expect(loginOrder).toEqual([ "a", "b" ]);
    expect(tokenRequests.get("a")).toBe(1);
    expect(tokenRequests.get("b")).toBe(1);
    expect(probeRequests.get("a")).toEqual([ undefined, "Bearer token-a" ]);
    expect(probeRequests.get("b")).toEqual([ undefined, "Bearer token-b" ]);
});

test("isolates info.json failure and does not retry unavailable sources automatically", async ({page}, testInfo) => {
    const origin = "http://127.0.0.1:4173";
    let failedInfoRequests = 0;
    let successfulInfoRequests = 0;
    const successfulTileRequests: string[] = [];
    const canvas = (index: number) => ({
        id : `${origin}/plain-canvas/${index}`,
        type : "Canvas",
        width : 100,
        height : 100,
        items : [ {id : `${origin}/plain-page/${index}`, type : "AnnotationPage", items : [ {
                                                                                      id : `${origin}/plain-annotation/${index}`,
                                                                                      type : "Annotation",
                                                                                      motivation : "painting",
                                                                                      target : `${origin}/plain-canvas/${index}`,
                                                                                      body : {id : `${origin}/plain/image-${index}/full/full/0/default.jpg`, type : "Image", service : {id : `${origin}/plain/image-${index}`, type : "ImageService3"}}
                                                                                  } ]} ]
    });

    await page.route(`${origin}/plain/manifest`, (route) => route.fulfill({json : {
        "@context" : "http://iiif.io/api/presentation/3/context.json",
        id : `${origin}/plain/manifest`,
        type : "Manifest",
        label : {en : [ "Failure isolation" ]},
        items : [ canvas(1), canvas(2) ]
    }}));
    await page.route(`${origin}/plain/image-1/info.json`, (route) => {
        failedInfoRequests += 1;
        return route.fulfill({status : 500, json : {error : "broken"}});
    });
    await page.route(`${origin}/plain/image-2/**`, (route) => {
        if (route.request().url().endsWith("/info.json"))
        {
            successfulInfoRequests += 1;
            return route.fulfill({json : {
                "@context" : "http://iiif.io/api/image/3/context.json",
                id : route.request().url(),
                type : "ImageService3",
                protocol : "http://iiif.io/api/image",
                profile : "level0",
                width : 100,
                height : 100,
                tiles : [ {width : 100, scaleFactors : [ 1 ]} ]
            }});
        }
        successfulTileRequests.push(route.request().url());
        return route.fulfill({
            contentType : "image/png",
            body : Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
        });
    });

    await openHarness(page, `${origin}/plain/manifest`, testInfo);
    await expect(page.locator(".diva-image-unavailable")).toHaveCount(1);
    await expect(page.locator("img.thumbs-image").first()).toHaveAttribute("crossorigin", "anonymous");
    await page.waitForTimeout(1000);
    expect(failedInfoRequests).toBe(1);
    expect(successfulInfoRequests).toBe(1);
    expect(successfulTileRequests.length).toBeGreaterThan(0);
    expect(successfulTileRequests.every((url) => !url.includes("/info.json/"))).toBe(true);

    await page.evaluate(async ({sourceId, url}) => {
        const instance = (window as any).diva;
        try
        {
            await instance.auth.resolve({sourceId, url, isStatic : false}, new AbortController().signal);
        }
        catch (_error)
        {
            // The mocked source remains unavailable; only the repeated request matters here.
        }
    }, {sourceId : `${origin}/plain/image-1/info.json`, url : `${origin}/plain/image-1/info.json`});
    await expect.poll(() => failedInfoRequests).toBe(2);
});

test("cancels superseded previews, source resolutions, and destroyed viewers", async ({page}, testInfo) => {
    const origin = "http://127.0.0.1:4173";
    const sourceId = `${origin}/lifecycle/image/info.json`;
    let infoRequests = 0;
    const releases: Array<() => void> = [];
    const consoleErrors: string[] = [];
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    page.on("console", (message) => {
        if (message.type() === "error")
        {
            consoleErrors.push(message.text());
        }
    });

    await page.route(`${origin}/lifecycle/manifest`, (route) => route.fulfill({json : {
        "@context" : "http://iiif.io/api/presentation/3/context.json",
        id : `${origin}/lifecycle/manifest`,
        type : "Manifest",
        label : {en : [ "Lifecycle" ]},
        items : [ {
            id : `${origin}/lifecycle/canvas`,
            type : "Canvas",
            width : 100,
            height : 100,
            items : [ {id : `${origin}/lifecycle/page`, type : "AnnotationPage", items : [ {
                                                                                     id : `${origin}/lifecycle/annotation`,
                                                                                     type : "Annotation",
                                                                                     motivation : "painting",
                                                                                     target : `${origin}/lifecycle/canvas`,
                                                                                     body : {id : `${origin}/lifecycle/image/full/full/0/default.jpg`, type : "Image", service : {id : `${origin}/lifecycle/image`, type : "ImageService3"}}
                                                                                 } ]} ]
        } ]
    }}));
    await page.route(sourceId, async (route) => {
        infoRequests += 1;
        if (infoRequests >= 2 && infoRequests <= 4)
        {
            await new Promise<void>((resolve) => releases.push(resolve));
        }
        try
        {
            await route.fulfill({json : {
                "@context" : "http://iiif.io/api/image/3/context.json",
                id : `${origin}/lifecycle/image`,
                type : "ImageService3",
                protocol : "http://iiif.io/api/image",
                profile : "level0",
                width : 100,
                height : 100,
                tiles : [ {width : 100, scaleFactors : [ 1 ]} ]
            }});
        }
        catch (_error)
        {
            // A cancelled browser fetch can close the intercepted request before fulfillment.
        }
    });
    await page.route(`${origin}/lifecycle/image/full/**`, (route) => route.fulfill({contentType : "image/png", body : png}));

    const manifest = `${origin}/lifecycle/manifest`;
    await openHarness(page, manifest, testInfo);
    await expect.poll(() => infoRequests).toBe(1);

    await page.getByRole("button", {name : "Page View"}).click();
    await expect(page.locator(".modal.is-page-view")).toBeVisible();
    await page.locator(".modal-close-action button").click();
    await page.evaluate((id) => (window as any).diva.auth.invalidateSources([ id ]), sourceId);
    await page.getByRole("button", {name : "Page View"}).click();
    await expect.poll(() => infoRequests).toBe(2);
    await page.locator(".modal-close-action button").click();
    await expect.poll(() => page.evaluate(() => ({
                                              inflight : (window as any).diva.auth.inflight.size,
                                              pending : (window as any).diva.auth.pending.size,
                                              requests : (window as any).diva.auth.requests.size
                                          })))
        .toEqual({inflight : 0, pending : 0, requests : 0});
    releases.shift()?.();
    await expect(page.locator(".modal.is-page-view")).toBeHidden();
    await expect(page.locator(".diva-image-unavailable")).toHaveCount(0);

    await page.evaluate(({id, url}) => {
        const auth = (window as any).diva.auth;
        auth.invalidateSources([ id ]);
        (window as any).lifecycleResolution = auth.resolve({sourceId : id, url, isStatic : false}, new AbortController().signal)
                                                  .then(() => "resolved", (error: Error) => error.name);
    }, {id : sourceId, url : sourceId});
    await expect.poll(() => infoRequests).toBe(3);
    await page.evaluate(({id, url}) => (window as any).diva.auth.registerSources([ {sourceId : id, url, isStatic : false} ]),
                        {id : sourceId, url : sourceId});
    await expect.poll(() => page.evaluate(() => (window as any).lifecycleResolution)).toBe("AbortError");
    releases.shift()?.();

    await page.evaluate(({id, url}) => {
        const auth = (window as any).diva.auth;
        (window as any).destroyedResolution = auth.resolve({sourceId : id, url, isStatic : false}, new AbortController().signal)
                                                  .then(() => "resolved", (error: Error) => error.name);
    }, {id : sourceId, url : sourceId});
    await expect.poll(() => infoRequests).toBe(4);
    await page.evaluate((objectData) => {
        (window as any).diva = new (window as any).Diva("diva-wrapper", {objectData});
    }, manifest);
    await expect.poll(() => page.evaluate(() => (window as any).destroyedResolution)).toBe("AbortError");
    releases.shift()?.();
    await expect(page.getByRole("heading", {name : "Lifecycle"})).toBeVisible();
    await expect(page.locator(".diva-auth-dialog")).toHaveCount(0);
    await expect(page.locator(".diva-image-unavailable")).toHaveCount(0);

    await page.evaluate(() => {
        const viewer = document.querySelector("osd-viewer") as any;
        const events: string[] = [];
        (window as any).rapidSwitchEvents = events;
        viewer.setTileSourceResolver((source: {sourceId: string; url : string}, signal: AbortSignal) => {
            events.push(`${source.sourceId}-started`);
            if (source.sourceId === "rapid-old")
            {
                signal.addEventListener("abort", () => events.push("rapid-old-aborted"), {once : true});
                return new Promise(() => {});
            }
            return Promise.resolve({type : "image", url : source.url, crossOriginPolicy : "Anonymous"});
        });
        viewer.setPageAspects([ 1 ]);
        viewer.setTileSources([ {sourceId : "rapid-old", url : "data:image/png;base64,", isStatic : true} ]);
        viewer.setTileSources([ {
            sourceId : "rapid-new",
            url : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            isStatic : true
        } ]);
    });
    await expect.poll(() => page.evaluate(() => (window as any).rapidSwitchEvents))
        .toEqual([ "rapid-old-started", "rapid-old-aborted", "rapid-new-started" ]);
    await expect(page.locator(".diva-image-unavailable")).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
});
