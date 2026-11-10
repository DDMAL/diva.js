import {expect, test} from "@playwright/test";
import {annotationFixture, installOptimizationRoutes, openOptimizationHarness, optimizationManifest, optimizationOrigin} from "./helpers/optimization-fixtures";

const bodies = [
    {type : "TextualBody", value : '<p dir="ltr>ltr</p>', format : "text/html", language : "en"},
    {type : "TextualBody", value : '<p dir="rtl>rtl</p>', format : "text/html", language : "ar"},
    {id : "https://example.test/not-text", type : "Image"},
    {type : "TextualBody", value : '<p dir="ltr"><strong>English</strong><br>Actual transcription</p><p dir="rtl">كتاب غرايب الفنون</p>', format : "text/html"},
    {type : "TextualBody", value : 'Literal <img src="/not-an-image" onerror="alert(1)"> & text', format : "text/plain", language : "en"},
    {type : "TextualBody", value : '<p><a href="javascript:alert(1)" onclick="alert(1)">Unsafe link</a></p>', format : "text/html"}
];

for (const version of [2, 3])
for (const source of ["manifest", "inline", "api"])
{
    test(`displays every v${version} ${source} body independently`, async ({page}, testInfo) => {
        await installOptimizationRoutes(page);
        const canvas = `${optimizationOrigin}/optimization/small/canvas/0`;
        const target = annotationFixture(canvas, "multi").target;
        const annotation = version === 2
            ? {"@id" : "multi", resource : bodies.map(body => ({...body, chars : body.value, value : undefined})), on : `${canvas}#xywh=8,16,24,32`}
            : {id : "multi", body : bodies, target};
        if (source !== "api")
        {
            await page.route(`${optimizationOrigin}/optimization/small/canvas/0/comments`, route => route.fulfill({json : version === 2
                ? {resources : [annotation]} : {items : [annotation]}}));
            // Replace only the annotation source on the existing local fixture.
            await page.route(`${optimizationOrigin}/optimization/small/manifest`, async route => {
                const manifest = optimizationManifest("small", 4);
                (manifest.items[0] as any).annotations = [source === "inline"
                    ? {id : `${canvas}/comments`, type : "AnnotationPage", items : [annotation]}
                    : {id : `${canvas}/comments`, type : "AnnotationPage"}];
                await route.fulfill({json : manifest});
            });
        }
        await openOptimizationHarness(page, testInfo);
        if (source === "api")
            await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), version === 2 ? {...annotation, id : "multi"} : annotation);
        await expect(page.locator('g[data-annotation-id="multi"]')).toHaveCount(1);
        await page.locator('g[data-annotation-id="multi"]').hover();
        const tooltip = page.locator('.diva-annotation-overlay:has(g[data-annotation-id="multi"]) .diva-annotation-tooltip');
        await expect(tooltip).toBeVisible();
        expect(await tooltip.textContent()).toMatch(/^English\nActual transcription\n\nكتاب غرايب الفنون/);
        await expect(tooltip).toHaveCSS("white-space", "pre-line");
        await expect(tooltip).toHaveCSS("unicode-bidi", "plaintext");
        const bounds = await tooltip.boundingBox();
        const viewerBounds = await page.locator("#main-viewer").boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(viewerBounds!.y);
        expect(bounds!.x).toBeGreaterThanOrEqual(viewerBounds!.x);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewerBounds!.x + viewerBounds!.width + 1);
        expect(bounds!.width).toBeGreaterThan(200);
        await page.locator('g[data-annotation-id="multi"]').dispatchEvent("mouseleave");
        await expect(tooltip).toBeHidden();
        await page.evaluate(() => (window as any).diva.selectAnnotation("multi"));
        const panel = page.locator(".diva-annotation-panel-content");
        await expect(panel).toContainText("Actual transcription");
        await expect(panel).toContainText("كتاب غرايب الفنون");
        await expect(panel).toContainText('Literal <img src="/not-an-image" onerror="alert(1)"> & text');
        await expect(panel.locator("strong")).toHaveText("English");
        await expect(panel.locator('p[dir="rtl"]')).toHaveText("كتاب غرايب الفنون");
        await expect(panel.locator('img[src="/not-an-image"], [onclick], a[href^="javascript:"]')).toHaveCount(0);
        expect(await page.evaluate(() => (window as any).diva.getAnnotationBody("multi"))).toContain("Actual transcription");
        // Body-only format/language changes must invalidate retained panel content.
        if (source === "api")
        {
            const updated = {...annotationFixture(canvas, "multi"), body : [{type : "TextualBody", value : "<em>changed</em>", format : "text/plain"}]};
            await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), updated);
            await page.evaluate(() => (window as any).diva.selectAnnotation("multi"));
            await expect(panel).toContainText("<em>changed</em>");
            await expect(panel.locator("em")).toHaveCount(0);
            await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), {...updated, body : [{...updated.body[0], format : "text/html", language : "ar"}]});
            await expect(page.locator(".diva-annotation-panel")).toBeHidden();
            await page.evaluate(() => (window as any).diva.selectAnnotation("multi"));
            await expect(panel.locator("em")).toHaveText("changed");
            const metadataOnly = {...updated, body : [{type : "TextualBody", value : "unchanged", format : "text/plain", language : "en"}]};
            await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), metadataOnly);
            await page.evaluate(() => (window as any).diva.selectAnnotation("multi"));
            await expect(panel).toContainText("unchanged");
            await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), {...metadataOnly, body : [{...metadataOnly.body[0], format : "text/html"}]});
            await expect(page.locator(".diva-annotation-panel")).toBeHidden();
            await page.evaluate(() => (window as any).diva.selectAnnotation("multi"));
            await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), {...metadataOnly, body : [{...metadataOnly.body[0], format : "text/html", language : "ar"}]});
            await expect(page.locator(".diva-annotation-panel")).toBeHidden();
            await page.evaluate(() => (window as any).diva.selectAnnotation("multi"));
            await expect(panel.locator(".diva-annotation-body")).toHaveAttribute("lang", "ar");
        }
    });
}

test("keeps hover previews concise without truncating the inspector body", async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    await openOptimizationHarness(page, testInfo);
    const value = `${"Long annotation detail 😀 العربية. ".repeat(100)}END OF COMPLETE BODY`;
    await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), {
        ...annotationFixture(`${optimizationOrigin}/optimization/small/canvas/0`, "long"),
        body : {type : "TextualBody", format : "text/plain", value}
    });
    const group = page.locator('g[data-annotation-id="long"]');
    await group.hover();
    const tooltip = page.locator('.diva-annotation-overlay:has(g[data-annotation-id="long"]) .diva-annotation-tooltip');
    await expect(tooltip).toBeVisible();
    const preview = await tooltip.textContent();
    expect(preview!.length).toBeLessThan(280);
    expect(preview).toContain("Click annotation for full text");
    expect(preview).not.toContain("END OF COMPLETE BODY");
    await group.click();
    await expect(page.locator(".diva-annotation-panel-content")).toContainText("END OF COMPLETE BODY");
    await page.getByRole("button", {name : "Close annotation details", exact : true}).click();
    await group.focus();
    await group.press("Enter");
    await expect(page.locator(".diva-annotation-panel-content")).toContainText("END OF COMPLETE BODY");
    expect(await page.evaluate(() => (window as any).diva.getAnnotationBody("long"))).toBe(value);
    await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), {
        ...annotationFixture(`${optimizationOrigin}/optimization/small/canvas/0`, "lines"),
        body : {type : "TextualBody", format : "text/plain", value : "English\nThe book\n\nArabic\nكتاب غرايب الفنون وملح العيون\n\nRomanized\nKitab"}
    });
    await page.locator('g[data-annotation-id="lines"]').focus();
    const lines = page.locator('.diva-annotation-overlay:has(g[data-annotation-id="lines"]) .diva-annotation-tooltip');
    expect(await lines.textContent()).toBe("English\nThe book\n\nArabic\nكتاب غرايب الفنون وملح العيون\n… Click annotation for full text");
});

test("prepares readable hover text lazily and reuses it during pointer movement", async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    await openOptimizationHarness(page, testInfo);
    await page.evaluate(() => {
        const viewer = document.getElementById("main-viewer") as any;
        const sanitize = viewer.sanitizeAnnotationHtml;
        (window as any).tooltipParses = 0;
        viewer.sanitizeAnnotationHtml = function(...args: any[]) {
            (window as any).tooltipParses += 1;
            return sanitize.apply(this, args);
        };
    });
    await page.evaluate(annotation => (window as any).diva.setAnnotation(annotation), {
        ...annotationFixture(`${optimizationOrigin}/optimization/small/canvas/0`, "preview"),
        body : {type : "TextualBody", format : "text/html", value : "<p>First &amp; second<br>Next line</p><p>Another paragraph</p>"}
    });
    const group = page.locator('g[data-annotation-id="preview"]');
    await expect(group).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).tooltipParses)).toBe(0);
    await group.dispatchEvent("mouseenter", {clientX : 100, clientY : 100});
    const tooltip = page.locator('.diva-annotation-overlay:has(g[data-annotation-id="preview"]) .diva-annotation-tooltip');
    expect(await tooltip.textContent()).toBe("First & second\nNext line\n\nAnother paragraph");
    await expect(group).toHaveAttribute("aria-label", "First & second\nNext line\n\nAnother paragraph");
    for (let i = 0; i < 5; i += 1) await group.dispatchEvent("mousemove", {clientX : 100 + i, clientY : 100});
    expect(await page.evaluate(() => (window as any).tooltipParses)).toBe(1);
});
