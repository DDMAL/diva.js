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
 * A manifest-derived page lookup selector.
 *
 * @remarks
 * Canvas identifiers match exactly. Labels match the complete localized label
 * selected for display by Diva, case-insensitively. Labels are not trimmed or
 * otherwise whitespace-normalized, and duplicate labels select the first page
 * in manifest order.
 */
export type DivaPageSelector = {
    /**
     * Select by exact IIIF Canvas identifier.
     */
    by: "canvasId";
    /**
     * Canvas identifier to match.
     */
    value: string;
} | {
    /**
     * Select by complete, case-insensitive localized display label.
     */
    by: "label";
    /**
     * Display label to match.
     */
    value: string;
};
/**
 * A page target accepted during initial viewer construction.
 *
 * @remarks
 * Numeric targets are zero-based, like all numeric Diva page APIs. This differs
 * from one-based page numbers an application may choose to expose in its URLs.
 */
export type DivaPageTarget = number | DivaPageSelector;
/**
 * The panel selected when the navigation sidebar is first opened.
 */
export type DivaSidebarPanel = "thumbnails" | "contents" | "metadata";
/**
 * Controls how Diva loads static image bodies that do not use the IIIF Image API.
 *
 * @remarks
 * `required` preserves Diva's canvas-safe CORS behavior. `fallback` retries a
 * failed anonymous-CORS static image once without CORS, while `none` uses that
 * non-CORS path immediately. Images loaded without CORS can be viewed but cannot
 * use Page View pixel filters or be saved from the filter view.
 */
export type DivaStaticImageCorsPolicy = "required" | "fallback" | "none";
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
 * A JSON Web Annotation accepted and returned by Diva's annotation API.
 *
 * `target` (or the IIIF Presentation 2 `on` alias) must identify a loaded
 * Canvas and use either an `xywh` fragment/selector or an inline SVG selector.
 */
export interface DivaAnnotation {
    /**
     * Stable Web Annotation identifier. Required when setting annotations.
     */
    id: string;
    /**
     * Usually `"Annotation"`; retained without interpretation.
     */
    type?: string;
    /**
     * Web Annotation body, commonly a TextualBody or string.
     */
    body?: unknown;
    /**
     * Web Annotation target.
     */
    target?: unknown;
    /**
     * IIIF Presentation 2 alias for `target`.
     */
    on?: unknown;
    [key: string]: unknown;
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
     * Whether the current resource and its required initial page are ready.
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
     * Fired when an annotation is activated in the viewer.
     */
    annotationselect: CustomEvent<{
        /** Stable identifier of the selected annotation. */
        annotationId: string;
    }>;
    /**
     * Fired once after the initial resource and selected initial page are ready.
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
     * Page to display when the initial manifest opens.
     *
     * @remarks
     * Numeric values are zero-based. Selector matching follows
     * {@link DivaPageSelector}. Invalid or unmatched targets silently fall back
     * to page index 0. This option applies only to the initial manifest;
     * resources loaded later begin at index 0.
     */
    initialPage?: DivaPageTarget;
    /**
     * Preferred HTTP Accept values for IIIF resource requests.
     */
    acceptHeaders?: string[];
    /**
     * Enable manifest-driven IIIF annotation overlays. @defaultValue `false`
     */
    enableAnnotations?: boolean;
    /**
     * Optional GET endpoint used when a canvas declares no annotation resources.
     */
    annotationServer?: string;
    /**
     * CORS policy for static image bodies without an IIIF Image API service.
     *
     * @remarks
     * `fallback` attempts anonymous CORS first and makes one non-CORS retry when
     * that load fails. `none` loads static images without CORS immediately.
     * Non-CORS images remain viewable, but Page View pixel filters and saving are
     * unavailable because the browser taints their canvas.
     *
     * @defaultValue `"required"`
     */
    staticImageCorsPolicy?: DivaStaticImageCorsPolicy;
    /**
     * Show the navigation sidebar.
     *
     * @defaultValue `true`
     */
    showSidebar?: boolean;
    /**
     * Initial width of the thumbnail and contents sidebar, in CSS pixels.
     *
     * @remarks
     * Finite values are rounded and constrained to the supported 220–520 pixel
     * resize range. Invalid runtime values use the default.
     *
     * @defaultValue `320`
     */
    sidebarWidth?: number;
    /**
     * Panel selected when the navigation sidebar is first shown.
     *
     * @remarks
     * Contents requires manifest ranges, and Metadata requires manifest metadata or
     * homepage links. Diva falls back to Thumbnails when the requested panel is not
     * available for the loaded manifest.
     *
     * @defaultValue `"thumbnails"`
     */
    sidebarPanel?: DivaSidebarPanel;
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
