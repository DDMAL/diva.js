import "./viewer-element";
import type { DivaAnnotation, DivaEventMap, DivaLayoutMode, DivaOptions, DivaPage, DivaPageSelector, DivaRegion, DivaState, ZoomToRegionOptions } from "./public-api";
export type { DivaAnnotation, DivaEventMap, DivaImage, DivaLayoutMode, DivaOptions, DivaPage, DivaPageSelector, DivaPageTarget, DivaRegion, DivaSidebarPanel, DivaState, DivaStaticImageCorsPolicy, DivaViewingDirection, ZoomToRegionOptions, } from "./public-api";
/**
 * A browser viewer for IIIF Presentation manifests and collections.
 *
 * @remarks
 * Diva is an `EventTarget`. Listen on the instance for the typed events in
 * {@link DivaEventMap}; OpenSeadragon objects, Elm ports, and authorization state
 * are intentionally not part of the public API.
 *
 * Page indexes are zero-based. Commands that require a loaded viewer wait for
 * {@link Diva.ready} or an active {@link Diva.setResource} operation.
 *
 * @example Browser global
 * ```js
 * const viewer = new Diva("diva-wrapper", {
 *   objectData: "https://example.org/iiif/manifest.json"
 * });
 *
 * await viewer.ready;
 * console.log(viewer.getPages());
 * ```
 *
 * @example ES module
 * ```ts
 * import Diva from "diva.js";
 *
 * const viewer = new Diva("diva-wrapper", { objectData: manifestUrl });
 * await viewer.ready;
 * ```
 */
export declare class Diva extends EventTarget {
    private readonly rootId;
    private readonly root;
    private readonly auth;
    private readonly staticImageCorsPolicy;
    private app;
    private mainViewer;
    private readonly tileSourceResolver;
    private readonly pendingViewerMethods;
    private viewerMethodRafId;
    private viewerMethodAttempts;
    private filterViewer;
    private filterViewerElement;
    private filterOptions;
    private filterViewerFlipped;
    private filterAccessBlocked;
    private currentFilterSourceKey;
    private pendingFilterPreview;
    private filterPreviewVersion;
    private filterPreviewRetries;
    private filterPreviewRafId;
    private filterPreviewController;
    private isDestroyed;
    private readonly handlePageChangeBound;
    private readonly handleAnnotationSelectBound;
    private readonly handlePageLoadedBound;
    private readonly handleZoomChangeBound;
    private readonly handleLoadingChangeBound;
    private readonly handleStaticImageCorsFallbackBound;
    private readonly handlePageLoadErrorBound;
    private readonly handleFullscreenChangeBound;
    private readonly handleRootClickBound;
    private pages;
    private readonly pagesByCanvasId;
    private readonly pagesByLabel;
    private readonly manifestAnnotationsByCanvas;
    private readonly apiAnnotationsByCanvas;
    private readonly clearedAnnotationCanvases;
    private readonly annotationImageServicesByCanvas;
    private annotationResourceId;
    private state;
    private readyResolve;
    private readyReject;
    private readySettled;
    private activeResourceRequestId;
    private resourceSequence;
    private pendingResource;
    private awaitingViewerResource;
    private resourceLoading;
    private viewerLoading;
    /**
     * Resolves when the initial resource and selected initial page are ready.
     *
     * @remarks
     * Collections without an active manifest resolve when their collection UI is
     * ready. Calling {@link Diva.setResource} before readiness supersedes the
     * constructor resource, so this promise follows that replacement. It rejects
     * when the resource that owns startup fails or the instance is destroyed.
     */
    readonly ready: Promise<void>;
    /**
     * Create a Diva viewer in an existing root element.
     *
     * @param rootId - HTML `id` of the root element, without a leading `#`.
     * @param flags - Initial resource and display options.
     *
     * @throws `Error`
     * Thrown synchronously when no element has the supplied `rootId`.
     *
     * @remarks
     * Constructing another Diva instance for the same root destroys the previous
     * instance first.
     */
    constructor(rootId: string, flags: DivaOptions);
    /**
     * Detects the current locale of the browser,
     * and return the first part of it.
     *
     * @returns {string}
     */
    private detectLanguage;
    private initialPageFlag;
    private getConnectedRoot;
    private bindPorts;
    private ensureMainViewer;
    private copyPage;
    private effectiveAnnotationsForCanvas;
    private applyAnnotationsForCanvas;
    private findStoredAnnotation;
    private rebuildPageIndexes;
    private pageForSelector;
    private copyState;
    private updateState;
    private emit;
    private updateLayoutState;
    private handleResourceSucceeded;
    private completeResource;
    private handleResourceFailed;
    private assertAlive;
    private assertPageIndex;
    private refreshLoadingState;
    private waitForResource;
    private applyFilterPreview;
    private copyToClipboard;
    private bindPageChange;
    private bindFullscreenChange;
    private bindZoomChange;
    private bindLoadingChange;
    private bindRootClick;
    /**
     * Register a listener for a typed Diva event.
     *
     * @param type - Event name from {@link DivaEventMap}.
     * @param listener - Callback invoked with the event's typed `CustomEvent`.
     * @param options - Standard DOM listener options.
     */
    addEventListener<K extends keyof DivaEventMap>(type: K, listener: (this: Diva, event: DivaEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
    /**
     * Remove a previously registered Diva event listener.
     *
     * @param type - Event name from {@link DivaEventMap}.
     * @param listener - Callback originally passed to {@link Diva.addEventListener}.
     * @param options - Standard DOM listener options used for matching.
     */
    removeEventListener<K extends keyof DivaEventMap>(type: K, listener: (this: Diva, event: DivaEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
    /**
     * Return a defensive snapshot of current viewer state.
     *
     * @returns State that callers may retain without observing later mutations.
     */
    getState(): Readonly<DivaState>;
    /**
     * Return defensive metadata snapshots for every displayed page.
     *
     * @returns Pages in zero-based display order. Auth tokens and resolved loading URLs are never included.
     */
    getPages(): readonly DivaPage[];
    /**
     * Add or replace one API-supplied Web Annotation on a loaded Canvas.
     */
    setAnnotation(annotation: DivaAnnotation): void;
    /**
     * Replace the API-supplied annotation set for the loaded manifest.
     */
    setAnnotations(annotations: readonly DivaAnnotation[]): void;
    /**
     * Return defensive Web Annotation snapshots for one Canvas.
     */
    getAnnotationsForCanvas(uri: string): readonly DivaAnnotation[];
    /**
     * Return defensive Web Annotation snapshots for the loaded manifest.
     */
    getAllAnnotations(): readonly DivaAnnotation[];
    /**
     * Clear both manifest and API-supplied annotations for one Canvas.
     */
    clearAnnotationsForCanvas(uri: string): void;
    /**
     * Clear both manifest and API-supplied annotations for every Canvas.
     */
    clearAllAnnotations(): void;
    /**
     * Select an annotation and open its details panel.
     */
    selectAnnotation(annotationId: string): void;
    /**
     * Return the IIIF Image API extract URL for an annotation, when available.
     *
     * @returns The extract URL, or `null` when the annotation is unknown or has no usable image region.
     */
    getImageRegionForAnnotation(annotationId: string): string | null;
    /**
     * Return an annotation body's textual or HTML value, if present.
     */
    getAnnotationBody(annotationId: string): string | undefined;
    /**
     * Find a displayed page by Canvas identifier or localized display label.
     *
     * @param selector - Exact Canvas-ID or complete label lookup.
     * @returns A defensive page snapshot, or `undefined` when no page matches.
     *
     * @throws `TypeError`
     * Thrown when a runtime value is not a valid {@link DivaPageSelector}.
     *
     * @remarks
     * Canvas IDs are case-sensitive. Labels are case-insensitive but are not
     * trimmed, whitespace-normalized, or substring-matched. Duplicate labels
     * return the first page in manifest order.
     */
    findPage(selector: DivaPageSelector): DivaPage | undefined;
    /**
     * Return metadata for the active page, if the resource has pages.
     *
     * @returns The active page, or `undefined` before page initialization and for collections without an active manifest.
     */
    getCurrentPage(): DivaPage | undefined;
    /**
     * Return the pages in the active row or opening.
     *
     * @returns One page in `single` mode, or the pages belonging to the current logical opening in a spread mode.
     */
    getVisiblePages(): readonly DivaPage[];
    /**
     * Return the current single-page or spread layout mode.
     *
     * @returns The active {@link DivaLayoutMode}.
     */
    getLayoutMode(): DivaLayoutMode;
    /**
     * Replace the current IIIF manifest or collection without replacing this instance.
     *
     * @param url - URL of a IIIF Presentation manifest or collection.
     * @returns A promise that resolves when the replacement and its first displayable page are ready.
     *
     * @throws `TypeError`
     * Rejected when `url` is empty.
     *
     * @throws `DOMException`
     * Rejected with `AbortError` when superseded by a newer replacement, or with
     * `InvalidStateError` when the viewer has been destroyed.
     *
     * @remarks
     * Event listeners remain attached. Fetching or parsing failures leave the
     * previous resource active. Once a replacement parses, it becomes active;
     * failure of its required image rejects while leaving that replacement and
     * its unavailable-image UI in place. Calling this method before any resource
     * is ready supersedes the constructor resource and determines the outcome of
     * {@link Diva.ready}.
     *
     * @example
     * ```ts
     * await viewer.setResource("https://example.org/iiif/next-manifest.json");
     * ```
     */
    setResource(url: string): Promise<void>;
    /**
     * Navigate to a zero-based page index.
     *
     * @param index - Target index in {@link Diva.getPages}.
     * @returns A promise that resolves after the navigation command is accepted.
     *
     * @throws `RangeError`
     * Rejected when `index` is not an available integer page index.
     *
     * @throws `DOMException`
     * Rejected with `InvalidStateError` after destruction.
     */
    goToPage(index: number): Promise<void>;
    /**
     * Navigate to a page selected by Canvas identifier or display label.
     *
     * @param selector - Page lookup using the matching rules from {@link Diva.findPage}.
     * @returns `true` after navigation, or `false` without moving when no page matches.
     *
     * @throws `TypeError`
     * Rejected when a runtime selector object is malformed.
     */
    goToPage(selector: DivaPageSelector): Promise<boolean>;
    /**
     * Navigate to the next page or opening for the active layout.
     *
     * @returns A promise that resolves after navigation, or immediately at the final opening.
     *
     * @remarks
     * Spread modes advance by logical opening; clients do not need to calculate a page step.
     */
    next(): Promise<void>;
    /**
     * Navigate to the previous page or opening for the active layout.
     *
     * @returns A promise that resolves after navigation, or immediately at the first opening.
     */
    previous(): Promise<void>;
    /**
     * Set the OpenSeadragon viewport zoom to a positive value.
     *
     * @param zoom - Positive finite viewport zoom value.
     * @returns A promise that resolves after the zoom command is applied.
     *
     * @throws `RangeError`
     * Rejected when `zoom` is not positive and finite.
     */
    setZoom(zoom: number): Promise<void>;
    /**
     * Multiply the current viewport zoom by a positive factor.
     *
     * @param factor - Positive finite multiplier; values above 1 zoom in and values below 1 zoom out.
     * @returns A promise that resolves after the zoom command is applied.
     *
     * @throws `RangeError`
     * Rejected when `factor` is not positive and finite.
     */
    zoomBy(factor: number): Promise<void>;
    /**
     * Zoom in by Diva's standard zoom factor.
     *
     * @returns A promise that resolves after multiplying the zoom by 1.6.
     */
    zoomIn(): Promise<void>;
    /**
     * Zoom out by Diva's standard zoom factor.
     *
     * @returns A promise that resolves after dividing the zoom by 1.6.
     */
    zoomOut(): Promise<void>;
    /**
     * Fit a page, or the current page when omitted, into the viewport.
     *
     * @param pageIndex - Optional zero-based page index. Defaults to the active page.
     * @returns A promise that resolves after the page image loads and is fitted.
     *
     * @throws `RangeError`
     * Rejected when there is no active page or `pageIndex` is unavailable.
     */
    fitToPage(pageIndex?: number): Promise<void>;
    /**
     * Frame a full-resolution pixel rectangle on a page, waiting for that image when necessary.
     *
     * @param pageIndex - Zero-based page index containing the region.
     * @param region - Rectangle in full-resolution image pixels from the upper-left origin.
     * @param options - Optional padding and animation settings.
     * @returns A promise that resolves after the image loads and the viewport fits the region.
     *
     * @throws `RangeError`
     * Rejected for an unavailable page, negative coordinates, non-positive dimensions,
     * non-finite values, or negative padding.
     *
     * @throws `Error`
     * Rejected when authorization or image loading fails.
     *
     * @example
     * ```ts
     * await viewer.zoomToRegion(
     *   12,
     *   { x: 840, y: 1250, width: 460, height: 180 },
     *   { padding: 0.08 }
     * );
     * ```
     */
    zoomToRegion(pageIndex: number, region: DivaRegion, options?: ZoomToRegionOptions): Promise<void>;
    /**
     * Change the page layout while preserving the active page.
     *
     * @param mode - Desired single-page or spread arrangement.
     * @returns A promise that resolves after the layout is applied.
     *
     * @throws `RangeError`
     * Rejected for a value outside {@link DivaLayoutMode}.
     */
    setLayoutMode(mode: DivaLayoutMode): Promise<void>;
    /**
     * Request fullscreen display; browser user-activation rules apply.
     *
     * @returns A promise that resolves when the root enters fullscreen or is already fullscreen.
     *
     * @throws `DOMException`
     * Rejected when browser permissions or user-activation rules deny the request,
     * or with `InvalidStateError` after destruction.
     */
    enterFullscreen(): Promise<void>;
    /**
     * Exit fullscreen display when active.
     *
     * @returns A promise that resolves when fullscreen exits or when it was already inactive.
     *
     * @throws `DOMException`
     * Rejected when the browser cannot exit fullscreen or with `InvalidStateError` after destruction.
     */
    exitFullscreen(): Promise<void>;
    /**
     * Enter or exit fullscreen display; browser user-activation rules apply.
     *
     * @returns The promise returned by {@link Diva.enterFullscreen} or {@link Diva.exitFullscreen}.
     */
    toggleFullscreen(): Promise<void>;
    /**
     * Cancel outstanding work, release resources, and empty the viewer root.
     *
     * @remarks
     * Destruction is idempotent and permanent. Pending public commands reject with
     * `InvalidStateError`; later commands do the same. State snapshots remain readable.
     */
    destroy(): void;
    private closeFilterPreview;
    private setFullscreen;
    private handleRootClick;
    private toggleFullscreenFromUserActivation;
    private handlePageChange;
    private handleAnnotationSelect;
    private handlePageLoaded;
    private handleZoomChange;
    private handleLoadingChange;
    private handleStaticImageCorsFallback;
    private handlePageLoadError;
    private handleFullscreenChange;
    private ensureFilterViewer;
    private ensureFilterViewerElement;
    private applyFilterOptions;
    private saveFilteredImage;
    private isNonCorsStaticSource;
    private setFilterAccessBlocked;
    private getPort;
    private callViewerMethod;
    private callViewerMethodAsync;
    private callViewerMethodWhenReady;
    private scheduleViewerMethodFlush;
    private flushPendingViewerMethods;
    private bindViewerEvent;
    private removeViewerEvent;
}
declare global {
    interface Window {
        Diva: typeof Diva;
    }
}
