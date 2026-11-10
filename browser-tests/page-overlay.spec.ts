import {expect, test} from "@playwright/test";
import {installOptimizationRoutes, openOptimizationHarness, optimizationOrigin} from "./helpers/optimization-fixtures";

test.beforeEach(async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    await page.route(`${optimizationOrigin}/optimization/*/image/*/info.json`, route => route.fulfill({json : {
        "@context" : "http://iiif.io/api/image/3/context.json", id : route.request().url().replace(/\/info\.json$/, ""),
        type : "ImageService3", protocol : "http://iiif.io/api/image", profile : "level0",
        width : 64, height : 128, tiles : [{width : 64, height : 128, scaleFactors : [1]}]
    }}));
    await openOptimizationHarness(page, testInfo);
});

test("updates labels in place across layouts, directions, and text resizing", async ({page}) => {
    await page.evaluate(async () => {
        await (window as any).diva.goToPage(3);
        await (window as any).diva.goToPage(0);
        const element = document.getElementById("main-viewer") as any;
        // A prefetched neighbor can finish after goToPage resolves for its
        // target. Finish all four loads before counting relayout-only events.
        await Promise.all([0, 1, 2, 3].map(index => element.waitForPage(index)));
    });
    const result = await page.evaluate(async () => {
        const element = document.getElementById("main-viewer") as any;
        const osd = element.viewer;
        const OSD = (window as any).OpenSeadragon;
        const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        await frame();
        const retained = Array.from(element.pageOverlayElements, ([index, label]: any) => ({index, label, overlay : osd.getOverlayById(label)}));
        const selector = element.querySelector('g[data-annotation-id="manifest-0"]');
        const originalOrder = osd.currentOverlays.map((overlay: any) => overlay.element);
        const events = {add : 0, remove : 0, update : 0};
        for (const name of Object.keys(events)) osd.addHandler(`${name}-overlay`, (event: any) => {
            if (event.element.classList.contains("diva-page-overlay-label")) events[name as keyof typeof events] += 1;
        });
        const errors: string[] = [];
        const check = () => {
            for (const {index, label, overlay} of retained)
            {
                if (element.pageOverlayElements.get(index) !== label || osd.getOverlayById(label) !== overlay)
                    errors.push(`Replaced overlay ${index}`);
                const right = index % 2 === 0;
                const x = (element.pageXOffsets[index] || 0) + (right ? 1 : 0);
                const y = element.pageOffsets[index] || 0;
                if (overlay.location.x !== x || overlay.location.y !== y || overlay.placement !== (right ? OSD.Placement.BOTTOM_RIGHT : OSD.Placement.BOTTOM_LEFT))
                    errors.push(`Incorrect geometry ${index}`);
                const point = osd.viewport.pixelFromPoint(new OSD.Point(x, y), true);
                const container = osd.overlaysContainer.getBoundingClientRect();
                const bounds = overlay.elementWrapper.getBoundingClientRect();
                if (Math.abs((right ? bounds.right : bounds.left) - container.left - point.x) > 2
                    || Math.abs(bounds.bottom - container.top - point.y) > 2)
                    errors.push(`Incorrect rendered anchor ${index}`);
            }
        };
        for (const direction of ["rtl", "ltr"])
        {
            element.setViewingDirection(direction);
            for (const mode of ["spread", "spread-shift", "single"])
            {
                await (window as any).diva.setLayoutMode(mode);
                await frame();
                check();
            }
        }
        const label = element.pageOverlayElements.get(0);
        const beforeWidth = label.getBoundingClientRect().width;
        element.setPageLabels(["A much longer updated label — العربية 😀", "", "Third", "Fourth"]);
        await frame();
        check();
        const expanded = label.getBoundingClientRect().width > beforeWidth + 50;
        const changedText = label.textContent;
        const fallbackText = element.pageOverlayElements.get(1).textContent;
        element.setPageLabels(["X", "Second", "Third", "Fourth"]);
        await frame();
        check();
        return {errors, events, expanded, changedText, fallbackText,
            shrunk : label.getBoundingClientRect().width < beforeWidth,
            selectorReused : element.querySelector('g[data-annotation-id="manifest-0"]') === selector,
            orderPreserved : originalOrder.every((node: Element, i: number) => osd.currentOverlays[i].element === node),
            overlayCount : osd.currentOverlays.length, pageCount : element.loadedItems.size,
            annotationCount : element.annotationOverlayElements.size};
    });
    expect(result.errors).toEqual([]);
    expect(result.events.add).toBe(0);
    expect(result.events.remove).toBe(0);
    expect(result.events.update).toBeGreaterThan(0);
    expect(result.expanded).toBe(true);
    expect(result.shrunk).toBe(true);
    expect(result.changedText).toBe("A much longer updated label — العربية 😀");
    expect(result.fallbackText).toBe("Page 2");
    expect(result.selectorReused).toBe(true);
    expect(result.orderPreserved).toBe(true);
    expect(result.overlayCount).toBe(result.pageCount + result.annotationCount);
});

test("creates labels for newly visited pages and releases them on replacement and destruction", async ({page}) => {
    await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        (window as any).__oldLabels = Array.from(element.pageOverlayElements.values());
    });
    await page.evaluate(() => (window as any).diva.goToPage(3));
    await expect(page.locator(".diva-page-overlay-label")).toHaveCount(4);
    await expect(page.locator(".diva-page-overlay-label").filter({hasText : "Folio 4"})).toHaveCount(1);
    await page.evaluate(url => (window as any).diva.setResource(url), `${optimizationOrigin}/optimization/nested/manifest`);
    expect(await page.evaluate(() => (window as any).__oldLabels.every((label: HTMLElement) => !label.isConnected))).toBe(true);
    const released = await page.evaluate(() => {
        const element = document.getElementById("main-viewer") as any;
        const labels = Array.from(element.pageOverlayElements.values()) as HTMLElement[];
        (window as any).diva.destroy();
        return {mapEmpty : element.pageOverlayElements.size === 0, detached : labels.every(label => !label.isConnected)};
    });
    expect(released).toEqual({mapEmpty : true, detached : true});
});
