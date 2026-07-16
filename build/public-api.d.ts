/**
 * The page arrangement used by the document viewer.
 *
 * @remarks
 * `single` displays one page per row. `spread` pairs pages starting at index 0.
 * `spread-shift` displays index 0 alone and pairs the remaining pages as openings.
 */
export type DivaLayoutMode = "single" | "spread" | "spread-shift";
/**
 * The direction in which pages are arranged within a spread.
 *
 * @remarks
 * This controls visual placement, not the zero-based order returned by {@link DivaPage.index}.
 */
export type DivaViewingDirection = "ltr" | "rtl";
/**
 * A painted image described by a IIIF canvas.
 */
export interface DivaImage {
    /**
     * Manifest-derived identifier for the painted image.
     */
    id: string;
    /**
     * Human-readable image label in the viewer's selected language.
     */
    label: string;
    /**
     * Whether Diva selected this image as the canvas's primary display image.
     */
    isPrimary: boolean;
}
/**
 * Stable, manifest-derived metadata for one displayed canvas.
 */
export interface DivaPage {
    /**
     * Zero-based index in Diva's displayed page sequence.
     */
    index: number;
    /**
     * IIIF Presentation canvas identifier.
     */
    canvasId: string;
    /**
     * Human-readable canvas label in the viewer's selected language.
     */
    label: string;
    /**
     * Full-resolution canvas width in pixels when declared by the manifest.
     */
    width?: number;
    /**
     * Full-resolution canvas height in pixels when declared by the manifest.
     */
    height?: number;
    /**
     * Image Diva displays by default for this canvas.
     */
    primaryImage: DivaImage;
    /**
     * Every painted image choice declared for this canvas.
     */
    images: readonly DivaImage[];
}
/**
 * A rectangle in full-resolution image pixels, measured from the upper-left corner.
 */
export interface DivaRegion {
    /**
     * Horizontal offset from the image's left edge, in full-resolution pixels.
     */
    x: number;
    /**
     * Vertical offset from the image's top edge, in full-resolution pixels.
     */
    y: number;
    /**
     * Region width in full-resolution pixels. Must be positive.
     */
    width: number;
    /**
     * Region height in full-resolution pixels. Must be positive.
     */
    height: number;
}
/**
 * Options controlling how an image region is framed.
 */
export interface ZoomToRegionOptions {
    /**
     * Fractional padding added to every side of the region.
     *
     * @defaultValue `0.05`
     */
    padding?: number;
    /**
     * Whether to skip the viewport animation.
     *
     * @defaultValue `false`
     */
    immediately?: boolean;
}
/**
 * A point-in-time snapshot of public viewer state.
 */
export interface DivaState {
    /**
     * URL of the successfully loaded IIIF manifest or collection.
     */
    resourceUrl: string;
    /**
     * Whether the current resource and its first displayable page are ready.
     */
    ready: boolean;
    /**
     * Whether resource or image work affecting the viewer is in progress.
     */
    loading: boolean;
    /**
     * Number of displayable pages in the current resource.
     */
    pageCount: number;
    /**
     * Zero-based active page index, or `null` when no page is active.
     */
    currentPageIndex: number | null;
    /**
     * Zero-based indexes in the active row or opening.
     */
    visiblePageIndexes: readonly number[];
    /**
     * Current page arrangement.
     */
    layoutMode: DivaLayoutMode;
    /**
     * Current direction of pages within an opening.
     */
    viewingDirection: DivaViewingDirection;
    /**
     * Current OpenSeadragon viewport zoom, or `null` before initialization.
     */
    zoom: number | null;
    /**
     * Whether a document element is currently fullscreen.
     */
    fullscreen: boolean;
    /**
     * Whether {@link Diva.destroy} has permanently disposed of the instance.
     */
    destroyed: boolean;
}
/**
 * Typed details for events dispatched by a Diva instance.
 */
export interface DivaEventMap {
    /**
     * Fired once after the initial resource and first displayable page are ready.
     */
    ready: CustomEvent<Readonly<DivaState>>;
    /**
     * Fired after an initial or replacement IIIF resource becomes ready.
     */
    resourcechange: CustomEvent<{
        /**
           URL of the newly active resource.
         */
        resourceUrl: string;
        /**
           State snapshot taken before the event is dispatched.
         */
        state: Readonly<DivaState>;
    }>;
    /**
     * Fired when the active page changes.
     */
    pagechange: CustomEvent<{
        /**
           Zero-based active page index.
         */
        pageIndex: number;
        /**
           Metadata for the active page.
         */
        page: DivaPage;
        /**
           Pages in the active row or opening.
         */
        visiblePages: readonly DivaPage[];
    }>;
    /**
     * Fired when the single-page or spread arrangement changes.
     */
    layoutchange: CustomEvent<{
        /**
           New layout mode.
         */
        layoutMode: DivaLayoutMode;
        /**
           Direction used to place pages within an opening.
         */
        viewingDirection: DivaViewingDirection;
    }>;
    /**
     * Fired when the OpenSeadragon viewport zoom changes.
     */
    zoomchange: CustomEvent<{
        /**
           New viewport zoom value.
         */
        zoom: number;
    }>;
    /**
     * Fired when combined resource/image loading state changes.
     */
    loadingchange: CustomEvent<{
        /**
           New loading state.
         */
        loading: boolean;
    }>;
    /**
     * Fired when browser fullscreen state changes.
     */
    fullscreenchange: CustomEvent<{
        /**
           New fullscreen state.
         */
        fullscreen: boolean;
    }>;
    /**
     * Fired for resource or image failures that clients may want to report.
     */
    error: CustomEvent<{
        /**
           Error associated with the failed operation.
         */
        error: Error;
        /**
           Stable operation name, such as `setResource` or `loadPage`.
         */
        operation: string;
        /**
           Whether the Diva instance remains usable after the failure.
         */
        recoverable: boolean;
    }>;
}
/**
 * Constructor options for a Diva viewer.
 */
export interface DivaOptions {
    /**
     * URL of the initial IIIF manifest or collection.
     */
    objectData: string;
    /**
     * Preferred HTTP Accept values for IIIF resource requests.
     */
    acceptHeaders?: string[];
    /**
     * Show the navigation sidebar.
     *
     * @defaultValue `true`
     */
    showSidebar?: boolean;
    /**
     * Show the resource title.
     *
     * @defaultValue `true`
     */
    showTitle?: boolean;
    /**
     * Preferred interface language; otherwise the browser language is used.
     */
    setLanguage?: string;
}
