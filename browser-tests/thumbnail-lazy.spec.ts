import { expect, test } from "@playwright/test";
import {
    installOptimizationRoutes,
    openOptimizationHarness,
    optimizationManifest,
    optimizationOrigin,
} from "./helpers/optimization-fixtures";

for (const direction of ["left-to-right", "right-to-left"])
{
    test(
        `keeps large-manifest thumbnail activity, ordering, and scroll in ${direction}`,
        async ({ page }, testInfo) => {
            await installOptimizationRoutes(page);
            const manifest = optimizationManifest(`thumbs-${direction}`, 1000);
            (manifest as any).viewingDirection = direction;
            const manifestUrl = `${optimizationOrigin}/optimization/thumbs-${direction}/manifest`;
            await page.route(manifestUrl, (route) => route.fulfill({ json: manifest }));
            await openOptimizationHarness(page, testInfo, `thumbs-${direction}`);
            await expect(page.locator(".diva-thumbs-item")).toHaveCount(1000);

            const indexes = async (): Promise<number[]> =>
                page.locator(".diva-thumbs-item.is-active")
                    .evaluateAll((items) =>
                        items.map((item) => Number((item as HTMLElement).dataset.thumbIndex)).sort((a, b) => a - b)
                    );
            const navigate = async (mode: "single" | "spread" | "spread-shift", index: number, expected: number[]) => {
                await page.evaluate(async ({ mode, index }) => {
                    const diva = (window as any).diva;
                    await diva.setLayoutMode(mode);
                    await diva.goToPage(index);
                }, { mode, index });
                await expect.poll(async () => {
                    const state = await page.evaluate(() => (window as any).diva.getState());
                    return {
                        mode: state.layoutMode,
                        active: await indexes(),
                        visible: [...state.visiblePageIndexes].sort((a: number, b: number) => a - b),
                    };
                }).toEqual({ mode, active: expected, visible: expected });
                await expect(page.locator(`#thumb-${index} diva-lazy-image`)).toHaveCount(1);
            };

            await navigate("single", 137, [137]);
            await navigate("spread", 138, [138, 139]);
            await navigate("spread-shift", 0, [0]);
            await navigate("spread-shift", 138, [137, 138]);
            await navigate("spread-shift", 139, [139, 140]);

            if (direction === "right-to-left")
            {
                const firstSix = await page.locator(".diva-thumbs-item").evaluateAll((items) =>
                    items.slice(0, 6)
                        .map((item) => Number((item as HTMLElement).dataset.thumbIndex))
                );
                expect(firstSix).toEqual([2, 1, 0, 5, 4, 3]);
            }

            // Selection only changes active classes; the image nodes and lazy URLs
            // for distant, unrelated thumbnails remain intact.
            const distant = page.locator("#thumb-900 diva-lazy-image");
            await expect(distant).toHaveAttribute("data-src", /image\/900\/full/);
            await distant.evaluate((node) => {
                (window as any).__thumb900 = node;
            });
            await page.evaluate(async () => {
                await (window as any).diva.setLayoutMode("single");
                const container = document.getElementById("thumbs")!;
                container.scrollTop = 0;
                document.getElementById("thumb-900")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            });
            await expect.poll(indexes).toEqual([900]);
            await expect.poll(() => page.locator("#thumbs").evaluate((container) => container.scrollTop))
                .toBeGreaterThan(0);
            expect(await distant.evaluate((node) => node === (window as any).__thumb900)).toBe(true);
            await page.evaluate(async () => (window as any).diva.goToPage(901));
            await expect.poll(indexes).toEqual([901]);
            expect(await distant.evaluate((node) => node === (window as any).__thumb900)).toBe(true);
        },
    );
}
