import {expect, test} from "@playwright/test";
import {annotationFixture, installOptimizationRoutes, openOptimizationHarness, optimizationOrigin} from "./helpers/optimization-fixtures";

test.beforeEach(async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    await openOptimizationHarness(page, testInfo);
    await expect.poll(() => page.evaluate(() => (window as any).diva.getAnnotationBody("manifest-0"))).toBe("manifest-0");
});

test("reuses equivalent content but invalidates selected content and releases removed DOM", async ({page}) => {
    const first = `${optimizationOrigin}/optimization/small/canvas/0`;
    const last = `${optimizationOrigin}/optimization/small/canvas/3`;
    const annotations = [annotationFixture(first, "rect"), annotationFixture(first, "svg", true), annotationFixture(last, "static")];
    await page.evaluate((annotations) => (window as any).diva.setAnnotations(annotations), annotations);
    await expect(page.locator('g[data-annotation-id="svg"]')).toHaveCount(1);
    await page.evaluate(() => {
        const viewer = document.getElementById("main-viewer") as any;
        (window as any).diva.selectAnnotation("rect");
        const element = viewer.annotationOverlayElements.get(0);
        const state = {
            group : element.querySelector('g[data-annotation-id="rect"]'),
            tooltip : element.querySelector(".diva-annotation-tooltip"),
            panel : viewer.querySelector(".diva-annotation-panel-content"),
            builds : 0,
            original : viewer.buildAnnotationOverlayContent
        };
        (window as any).__overlayContent = state;
        viewer.buildAnnotationOverlayContent = function(...args: any[]) {
            if (args[0] === element) state.builds += 1;
            return state.original.apply(this, args);
        };
    });
    // Public normalization creates fresh objects with equivalent content.
    await page.evaluate((annotations) => (window as any).diva.setAnnotations(annotations), annotations);
    expect(await page.evaluate(() => {
        const viewer = document.getElementById("main-viewer") as any;
        const state = (window as any).__overlayContent;
        return {builds : state.builds, group : state.group.isConnected,
            panel : viewer.querySelector(".diva-annotation-panel-content") === state.panel};
    })).toEqual({builds : 0, group : true, panel : true});
    await page.evaluate((canvas) => (window as any).diva.clearAnnotationsForCanvas(canvas), last);
    await expect(page.locator(".diva-annotation-panel")).toBeVisible();

    await page.evaluate((annotation) => (window as any).diva.setAnnotation(annotation), {
        ...annotations[0], body : {type : "TextualBody", format : "text/html", value : "<p><em>Updated</em></p>"},
        target : {...annotations[0].target, selector : {type : "FragmentSelector", value : "xywh=4,8,16,32"}}
    });
    await expect(page.locator(".diva-annotation-panel")).toBeHidden();
    expect(await page.evaluate(() => {
        const state = (window as any).__overlayContent;
        const viewer = document.getElementById("main-viewer") as any;
        return {builds : state.builds, oldGroup : state.group.isConnected, oldTooltip : state.tooltip.isConnected,
            panelEmpty : viewer.annotationPanel.childElementCount === 0, released : viewer.panelAnnotation === null};
    })).toEqual({builds : 1, oldGroup : false, oldTooltip : false, panelEmpty : true, released : true});
    await page.evaluate(() => (window as any).diva.selectAnnotation("rect"));
    await expect(page.locator(".diva-annotation-panel-content em")).toHaveText("Updated");
    expect(await page.evaluate(() => (window as any).diva.getImageRegionForAnnotation("rect")))
        .toBe(`${optimizationOrigin}/optimization/small/image/0/4,8,16,32/!320,320/0/default.jpg`);
    // Retained handlers must read current visibility/selection policy.
    await page.evaluate(() => {
        const viewer = document.getElementById("main-viewer") as any;
        viewer.setAnnotationSelectionEnabled(false);
        viewer.closeAnnotationPanel();
    });
    await page.locator('g[data-annotation-id="rect"]').dispatchEvent("keydown", {key : "Enter"});
    await expect(page.locator(".diva-annotation-panel")).toBeHidden();
    await page.evaluate(() => (document.getElementById("main-viewer") as any).setAnnotationSelectionEnabled(true));
    await page.locator('g[data-annotation-id="rect"]').dispatchEvent("keydown", {key : " "});
    await expect(page.locator(".diva-annotation-panel-content")).toContainText("Updated");
    await page.evaluate((canvas) => (window as any).diva.clearAnnotationsForCanvas(canvas), first);
    await expect(page.locator('g[data-annotation-id="rect"]')).toHaveCount(0);
    await expect(page.locator(".diva-annotation-panel")).toBeHidden();

    await page.evaluate((annotation) => (window as any).diva.setAnnotation(annotation), annotations[2]);
    await page.evaluate(() => (window as any).diva.goToPage(3));
    await expect(page.locator('g[data-annotation-id="static"]')).toHaveCount(1);
    await page.evaluate(() => (window as any).diva.selectAnnotation("static"));
    await expect(page.locator(".diva-annotation-panel-content")).toHaveText("static");
    expect(await page.evaluate(() => (window as any).diva.getImageRegionForAnnotation("static"))).toBeNull();
    await page.evaluate((url) => (window as any).diva.setResource(url), `${optimizationOrigin}/optimization/nested/manifest`);
    await expect(page.locator('g[data-annotation-id="static"]')).toHaveCount(0);
    await expect(page.locator(".diva-annotation-panel")).toBeHidden();
    await expect(page.locator('g[data-annotation-id="manifest-0"]')).toHaveCount(1);
    const released = await page.evaluate(() => {
        const viewer = document.getElementById("main-viewer") as any;
        (window as any).diva.selectAnnotation("manifest-0");
        const group = viewer.querySelector('g[data-annotation-id="manifest-0"]');
        (window as any).diva.destroy();
        return viewer.annotationOverlayElements.size === 0 && viewer.panelAnnotation === null && !group?.isConnected;
    });
    expect(released).toBe(true);
});

test("updates image-coordinate geometry without replacing selectors or handlers", async ({page}) => {
    await expect(page.locator('g[data-annotation-id="manifest-0"]')).toHaveCount(1);
    const result = await page.evaluate(() => {
        const viewer = document.getElementById("main-viewer") as any;
        const item = viewer.loadedItems.get(0);
        const group = viewer.querySelector('g[data-annotation-id="manifest-0"]');
        const svg = group.closest("svg");
        const dimensions = item.source.dimensions;
        const oldX = dimensions.x;
        const oldY = dimensions.y;
        let changed;
        try
        {
            dimensions.x = oldX * 2;
            dimensions.y = oldY * 2;
            viewer.updateLoadedItemPositions();
            changed = svg.getAttribute("viewBox");
        }
        finally
        {
            dimensions.x = oldX;
            dimensions.y = oldY;
            viewer.updateLoadedItemPositions();
        }
        return {changed, expected : `0 0 ${oldX * 2} ${oldY * 2}`, same : viewer.querySelector('g[data-annotation-id="manifest-0"]') === group,
            restored : svg.getAttribute("viewBox") === `0 0 ${oldX} ${oldY}`};
    });
    expect(result.changed).toBe(result.expected);
    expect(result.same).toBe(true);
    expect(result.restored).toBe(true);
});
