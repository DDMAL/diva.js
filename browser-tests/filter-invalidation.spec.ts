import {expect, test} from "@playwright/test";
import type {Page} from "@playwright/test";
import {installOptimizationRoutes, openOptimizationHarness, optimizationOrigin} from "./helpers/optimization-fixtures";

const applyJson = async (page: Page, settings: Record<string, unknown>): Promise<void> => {
    const input = page.locator("textarea.diva-filter-json");
    if (!await input.isVisible())
    {
        await page.getByRole("button", {name : "Import / Export Filter Settings", exact : true}).click();
    }
    const version = await page.evaluate(() => (window as any).diva.filterPreviewVersion);
    await input.fill(JSON.stringify(settings));
    await page.getByRole("button", {name : "Apply", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterPreviewVersion)).toBeGreaterThan(version);
};

const rememberProcessors = (page: Page) => page.evaluate(() => {
    const plugin = (window as any).diva.filterViewer.filterPluginInstance;
    (window as any).rememberedProcessors = plugin.filters.flatMap((filter: any) => filter.processors);
    return plugin.filterIncrement;
});

const processorState = (page: Page) => page.evaluate(() => {
    const plugin = (window as any).diva.filterViewer.filterPluginInstance;
    const processors = plugin.filters.flatMap((filter: any) => filter.processors);
    return {generation : plugin.filterIncrement, count : processors.length,
            reused : processors.length === (window as any).rememberedProcessors.length
                && processors.every((processor: any, index: number) => processor === (window as any).rememberedProcessors[index])};
});

test.beforeEach(async ({page}, testInfo) => {
    await installOptimizationRoutes(page);
    await openOptimizationHarness(page, testInfo);
    await page.getByRole("button", {name : "Page View", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer?.world.getItemCount())).toBe(1);
});

test("preserves pixel processors and PCA state for rotation, mirror and identical settings", async ({page}) => {
    const settings = {brightness : 23, contrast : 1.3, pcaMode : "pca-rgb"};
    await applyJson(page, settings);
    const generation = await rememberProcessors(page);
    const pixels = () => page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 8;
        const context = canvas.getContext("2d", {willReadFrequently : true})!;
        const data = context.createImageData(8, 8);
        for (let p = 0; p < 64; p += 1) data.data.set([p * 4, (p * 17) % 256, (p * 31) % 256, 255], p * 4);
        context.putImageData(data, 0, 0);
        for (const filter of (window as any).diva.filterViewer.filterPluginInstance.filters)
        {
            for (const processor of filter.processors) processor(context, () => {});
        }
        return Array.from(context.getImageData(0, 0, 8, 8).data);
    });
    // Grow and freeze the running PCA basis before comparing output.
    for (let sample = 0; sample < 2; sample += 1)
    {
        await page.evaluate(() => {
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            const context = canvas.getContext("2d")!;
            const data = context.createImageData(256, 256);
            for (let p = 0; p < 256 * 256; p += 1) data.data.set([p % 256, (p * 17) % 256, (p * 31) % 256, 255], p * 4);
            context.putImageData(data, 0, 0);
            for (const processor of (window as any).rememberedProcessors) processor(context, () => {});
        });
    }
    const before = await pixels();
    for (const transform of [{rotation : 30}, {rotation : 30, flip : true}, {rotation : 30, flip : true}])
    {
        await applyJson(page, {...settings, ...transform});
        expect(await processorState(page)).toEqual({generation, count : 3, reused : true});
        expect(await pixels()).toEqual(before);
    }
    expect(await page.evaluate(() => ({rotation : (window as any).diva.filterViewer.viewport.getRotation(),
                                      flip : (window as any).diva.filterViewer.viewport.getFlip()})))
        .toEqual({rotation : 30, flip : true});
    await applyJson(page, {...settings, brightness : 24});
    expect(await processorState(page)).toEqual({generation : generation + 1, count : 3, reused : false});
});

test("invalidates only enabled pixel inputs across all filter families", async ({page}) => {
    // Exercise the internal settings boundary exhaustively; real Elm/DOM input is
    // covered above and in the disabled-slider regression below.
    const cases = [
        ["thresholdEnabled", "threshold", 120, 140], ["brightnessEnabled", "brightness", 2, 3],
        ["saturationEnabled", "saturation", 2, 3], ["vibranceEnabled", "vibrance", 2, 3],
        ["hueEnabled", "hue", 2, 3], ["ccRedEnabled", "ccRed", 2, 3],
        ["ccGreenEnabled", "ccGreen", 2, 3], ["ccBlueEnabled", "ccBlue", 2, 3],
        ["contrastEnabled", "contrast", 1.2, 1.3], ["gammaEnabled", "gamma", 1.2, 1.3],
        ["normalizeEnabled", "normalizeStrength", 1, 2], ["unsharpEnabled", "unsharpAmount", 1, 2],
        ["morphEnabled", "morphOperation", "erode", "dilate"], ["morphEnabled", "morphKernel", 3, 5],
        ["convolutionEnabled", "convolutionPreset", "sharpen", "blur"],
        ["colourmapEnabled", "colourmapPreset", "gray", "hot"], ["colourmapEnabled", "colourmapCenter", 128, 150],
        ["pseudoColourEnabled", "pseudoColourMode", "rg", "gb"],
        ...["Red", "Green", "Blue"].flatMap((channel) => [
            [`pseudoColourEnabled`, `pseudoColour${channel}`, 1, 2],
            ...["Gamma", "Sigmoid", "Hue", "Vibrance"].map((kind) => [`alt${channel}${kind}Enabled`, `alt${channel}${kind}`, 2, 3]),
            [`alt${channel}HueEnabled`, `alt${channel}HueWindow`, 8, 12]
        ]),
        ["globalPcaEnabled", "pcaMode", "pca-rgb", "pca1"], ["globalPcaEnabled", "pcaHue", 0, 15],
        ["colourReplaceEnabled", "colourReplaceSource", "#ffffff", "#eeeeee"],
        ["colourReplaceEnabled", "colourReplaceTarget", "#ffffff", "#000000"],
        ["colourReplaceEnabled", "colourReplaceTolerance", 24, 30],
        ["colourReplaceEnabled", "colourReplaceBlend", 1, 0.5],
        ["colourReplaceEnabled", "colourReplacePreserveLum", false, true],
        ["adaptiveEnabled", "adaptiveWindow", 15, 17], ["adaptiveEnabled", "adaptiveOffset", 10, 12]
    ];
    const failures = await page.evaluate((cases) => {
        const diva = (window as any).diva;
        const failures = [];
        for (const [toggle, parameter, first, second] of cases)
        {
            const apply = (settings: any) => { diva.filterOptions = settings; diva.applyFilterOptions(); };
            const plugin = () => diva.filterViewer.filterPluginInstance;
            apply({invert : true, [parameter as string] : first});
            const disabledGeneration = plugin().filterIncrement;
            const processor = plugin().filters[0].processors[0];
            apply({invert : true, [parameter as string] : second});
            if (plugin().filterIncrement !== disabledGeneration || plugin().filters[0].processors[0] !== processor)
                failures.push(`${parameter}: disabled input invalidated`);
            apply({invert : true, [toggle as string] : true, [parameter as string] : first});
            const enabledGeneration = plugin().filterIncrement;
            if (enabledGeneration !== disabledGeneration + 1) failures.push(`${parameter}: enabling did not invalidate`);
            apply({invert : true, [toggle as string] : true, [parameter as string] : second});
            const changedGeneration = plugin().filterIncrement;
            if (changedGeneration !== enabledGeneration + 1) failures.push(`${parameter}: changing did not invalidate`);
            apply({invert : true, [toggle as string] : true, [parameter as string] : second});
            if (plugin().filterIncrement !== changedGeneration) failures.push(`${parameter}: identical input invalidated`);
            apply({invert : true});
            if (plugin().filterIncrement !== changedGeneration + 1) failures.push(`${parameter}: disabling did not invalidate`);
        }
        for (const toggle of ["grayscale", "invert"])
        {
            diva.filterOptions = {[toggle] : true};
            diva.applyFilterOptions();
            const generation = diva.filterViewer.filterPluginInstance.filterIncrement;
            diva.filterOptions = {};
            diva.applyFilterOptions();
            if (diva.filterViewer.filterPluginInstance.filterIncrement !== generation + 1
                || diva.filterViewer.filterPluginInstance.filters.length !== 0) failures.push(`${toggle}: clearing failed`);
        }
        return failures;
    }, cases);
    expect(failures).toEqual([]);
});

test("ignores a disabled slider but rebuilds when enabled and clears the final filter", async ({page}) => {
    await applyJson(page, {pcaMode : "pca-rgb"});
    const generation = await rememberProcessors(page);
    await page.getByRole("button", {name : "Colour Adjust", exact : true}).click();
    const brightness = page.locator(".diva-filter-range-group").filter({has : page.getByLabel("Brightness", {exact : true})});
    await brightness.locator('input[type="range"]').fill("23");
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterOptions.brightness)).toBe(23);
    expect(await processorState(page)).toEqual({generation, count : 1, reused : true});
    await page.getByLabel("Brightness", {exact : true}).check();
    await expect.poll(async () => (await processorState(page)).generation).toBe(generation + 1);
    await applyJson(page, {});
    expect((await processorState(page)).count).toBe(0);
    const clearedGeneration = await rememberProcessors(page);
    await applyJson(page, {rotation : 45, flip : true});
    expect(await processorState(page)).toEqual({generation : clearedGeneration, count : 0, reused : true});
});

test("rebuilds PCA for a new source and a recreated Page View", async ({page}) => {
    await applyJson(page, {pcaMode : "pca-rgb"});
    const generation = await rememberProcessors(page);
    const source = await page.evaluate(() => (window as any).diva.currentFilterSourceKey);
    await page.getByRole("button", {name : "Next Page", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.currentFilterSourceKey)).not.toBe(source);
    await expect.poll(async () => (await processorState(page)).generation).toBeGreaterThan(generation);
    expect((await processorState(page)).reused).toBe(false);
    await rememberProcessors(page);
    await page.getByRole("button", {name : "Close", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer)).toBeNull();
    await page.getByRole("button", {name : "Page View", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer?.world.getItemCount())).toBe(1);
    // Elm intentionally resets settings on reopening Page View.
    expect((await processorState(page)).count).toBe(0);
    await applyJson(page, {pcaMode : "pca-rgb"});
    expect(await processorState(page)).toMatchObject({count : 1, reused : false});
    await page.evaluate(() => (window as any).diva.destroy());
    expect(await page.evaluate(() => ({viewer : (window as any).diva.filterViewer, source : (window as any).diva.currentFilterSourceKey,
                                      key : (window as any).diva.appliedPixelFilterKey})))
        .toEqual({viewer : null, source : null, key : null});
});

test("resets the same-source filter cache after authorization invalidation", async ({page}) => {
    await applyJson(page, {pcaMode : "pca-rgb"});
    const generation = await rememberProcessors(page);
    await page.evaluate(() => {
        const diva = (window as any).diva;
        diva.invalidateSources(["unrelated-source"]);
        diva.applyFilterOptions();
    });
    expect(await processorState(page)).toEqual({generation, count : 1, reused : true});
    await page.evaluate(() => {
        const diva = (window as any).diva;
        const resolve = diva.auth.resolve.bind(diva.auth);
        // Keep the real resolver/cache/cancellation path; change only the resolved
        // credentials to exercise the same URL becoming a credentialed source.
        diva.auth.resolve = async (...args: any[]) => {
            const source = await resolve(...args);
            return {...(typeof source === "string" ? {url : source} : source),
                    crossOriginPolicy : "use-credentials", ajaxWithCredentials : true};
        };
        const sourceId = JSON.parse(diva.currentFilterSourceKey)[0];
        diva.invalidateSources([sourceId]);
    });
    expect(await page.evaluate(() => (window as any).diva.currentFilterSourceKey)).toBeNull();
    await applyJson(page, {pcaMode : "pca-rgb"});
    await expect.poll(async () => (await processorState(page)).generation).toBeGreaterThan(generation);
    expect((await processorState(page)).reused).toBe(false);
    expect(await page.evaluate(() => (window as any).diva.filterViewer.world.getItemAt(0).source.ajaxWithCredentials)).toBe(true);
});

test("clears filters for non-CORS static sources and restores them on a filterable source", async ({page}) => {
    await page.evaluate(async (objectData) => {
        const diva = new (window as any).Diva("diva-wrapper", {objectData, staticImageCorsPolicy : "none"});
        (window as any).diva = diva;
        await diva.ready;
    }, `${optimizationOrigin}/optimization/small/manifest`);
    await page.getByRole("button", {name : "Page View", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer?.world.getItemCount())).toBe(1);
    await applyJson(page, {pcaMode : "pca-rgb"});
    await rememberProcessors(page);
    await page.evaluate(() => (window as any).diva.goToPage(3));
    await expect.poll(() => page.evaluate(() => (window as any).diva.currentFilterSourceKey)).toContain("/static.png");
    await expect(page.locator(".diva-filter-access-warning")).toBeVisible();
    await expect(page.getByRole("button", {name : "Save view", exact : true})).toBeDisabled();
    await expect.poll(async () => (await processorState(page)).count).toBe(0);
    const blockedGeneration = (await processorState(page)).generation;
    await page.evaluate(() => (window as any).diva.applyFilterOptions());
    expect((await processorState(page)).generation).toBe(blockedGeneration);
    await page.getByRole("button", {name : "Previous Page", exact : true}).click();
    await expect(page.locator(".diva-filter-access-warning")).toHaveCount(0);
    await expect.poll(async () => (await processorState(page)).count).toBe(1);
    expect((await processorState(page)).reused).toBe(false);
    await expect(page.getByRole("button", {name : "Save view", exact : true})).toBeEnabled();
});

test("resets filter bookkeeping on resource replacement", async ({page}) => {
    await applyJson(page, {pcaMode : "pca-rgb"});
    await rememberProcessors(page);
    await page.evaluate((url) => (window as any).diva.setResource(url), `${optimizationOrigin}/optimization/nested/manifest`);
    await expect(page.locator("#filter-viewer")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).diva.appliedPixelFilterKey)).toBeNull();
    await page.getByRole("button", {name : "Page View", exact : true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).diva.filterViewer?.world.getItemCount())).toBe(1);
    await applyJson(page, {pcaMode : "pca-rgb"});
    expect(await processorState(page)).toMatchObject({count : 1, reused : false});
});
