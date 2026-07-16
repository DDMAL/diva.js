import "./viewer-element";

// @ts-ignore
import divaCss from "../cache/diva.css";
// @ts-ignore
import {Elm} from "../cache/elm-esm.js";

import {AuthBrowser,
        type ResolvedTileSource,
        type TileSourceDescriptor} from "./auth";
import {Filters,
        setFilterOptions} from "./filters";
import type {DivaEventMap,
             DivaImage,
             DivaLayoutMode,
             DivaOptions,
             DivaPage,
             DivaPageSelector,
             DivaPageTarget,
             DivaRegion,
             DivaSidebarPanel,
             DivaState,
             DivaViewingDirection,
             ZoomToRegionOptions} from "./public-api";

export type {DivaEventMap,
             DivaImage,
             DivaLayoutMode,
             DivaOptions,
             DivaPage,
             DivaPageSelector,
             DivaPageTarget,
             DivaRegion,
             DivaSidebarPanel,
             DivaState,
             DivaViewingDirection,
             ZoomToRegionOptions} from "./public-api";

declare const OpenSeadragon: any;

const DIVA_STYLE_ID = "diva-inline-styles";

const injectStyles = (cssText: string) => {
    if (typeof document === "undefined")
    {
        return;
    }

    if (document.getElementById(DIVA_STYLE_ID))
    {
        return;
    }

    const styleEl = document.createElement("style");
    styleEl.id = DIVA_STYLE_ID;
    styleEl.textContent = cssText;

    const target = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
    target.appendChild(styleEl);
};

injectStyles(divaCss);

type FilterSettings = {
    rotation?: number;
    flip?: boolean;
    thresholdEnabled?: boolean;
    threshold?: number;
    brightnessEnabled?: boolean;
    brightness?: number;
    saturationEnabled?: boolean;
    saturation?: number;
    vibranceEnabled?: boolean;
    vibrance?: number;
    hueEnabled?: boolean;
    hue?: number;
    ccRedEnabled?: boolean;
    ccRed?: number;
    ccGreenEnabled?: boolean;
    ccGreen?: number;
    ccBlueEnabled?: boolean;
    ccBlue?: number;
    contrastEnabled?: boolean;
    contrast?: number;
    gammaEnabled?: boolean;
    gamma?: number;
    grayscale?: boolean;
    invert?: boolean;
    morphEnabled?: boolean;
    morphOperation?: string;
    morphKernel?: number;
    convolutionEnabled?: boolean;
    convolutionPreset?: string;
    colourmapEnabled?: boolean;
    colourmapPreset?: string;
    colourmapCenter?: number;
    pseudoColourEnabled?: boolean;
    pseudoColourMode?: string;
    pseudoColourRed?: number;
    pseudoColourGreen?: number;
    pseudoColourBlue?: number;
    globalPcaEnabled?: boolean;
    pcaMode?: string;
    pcaHue?: number;
    colourReplaceEnabled?: boolean;
    colourReplaceSource?: string;
    colourReplaceTarget?: string;
    colourReplaceTolerance?: number;
    colourReplaceBlend?: number;
    colourReplacePreserveLum?: boolean;
    normalizeEnabled?: boolean;
    normalizeStrength?: number;
    unsharpEnabled?: boolean;
    unsharpAmount?: number;
    adaptiveEnabled?: boolean;
    adaptiveWindow?: number;
    adaptiveOffset?: number;
    altRedGamma?: number;
    altRedGammaEnabled?: boolean;
    altRedSigmoid?: number;
    altRedSigmoidEnabled?: boolean;
    altRedHue?: number;
    altRedHueEnabled?: boolean;
    altRedHueWindow?: number;
    altGreenGamma?: number;
    altGreenGammaEnabled?: boolean;
    altGreenSigmoid?: number;
    altGreenSigmoidEnabled?: boolean;
    altGreenHue?: number;
    altGreenHueEnabled?: boolean;
    altGreenHueWindow?: number;
    altGreenVibranceEnabled?: boolean;
    altGreenVibrance?: number;
    altBlueGamma?: number;
    altBlueGammaEnabled?: boolean;
    altBlueSigmoid?: number;
    altBlueSigmoidEnabled?: boolean;
    altBlueHue?: number;
    altBlueHueEnabled?: boolean;
    altBlueHueWindow?: number;
    altBlueVibranceEnabled?: boolean;
    altBlueVibrance?: number;
    altRedVibrance?: number;
    altRedVibranceEnabled?: boolean;
};

type FilterPreviewPayload = {
    sourceId: string; tileSource : string; isStatic : boolean;
    aspect : number;
    filters?: FilterSettings;
};

type TileSourceEntry = {
    sourceId: string; url : string; isStatic : boolean
};

type PublicPageEntry = {
    index: number;
    canvasId : string;
    label : string;
    width : number | null;
    height : number | null;
    primaryImage : DivaImage;
    images : DivaImage[];
};

type TileSourceResolver = (source: TileSourceDescriptor, signal: AbortSignal) => Promise<ResolvedTileSource>;

type ElmPorts = {
    tileSourcesUpdated: {subscribe: (callback: (update: {tileSources: TileSourceEntry[]; initialPageIndex : number}) => void) => void};
    pageAspectsUpdated : {subscribe : (callback: (aspects: number[]) => void) => void};
    pageLabelsUpdated : {subscribe : (callback: (labels: string[]) => void) => void};
    pagesUpdated : {subscribe : (callback: (pages: PublicPageEntry[]) => void) => void};
    zoomLevelUpdated : {subscribe : (callback: (zoom: number) => void) => void};
    zoomBy : {subscribe : (callback: (factor: number) => void) => void};
    scrollToIndex : {subscribe : (callback: (index: number) => void) => void};
    filterPreviewUpdated : {subscribe : (callback: (payload: FilterPreviewPayload|null) => void) => void};
    setFullscreen : {subscribe : (callback: (enabled: boolean) => void) => void};
    saveFilteredImage : {subscribe : (callback: () => void) => void};
    layoutModeUpdated : {subscribe : (callback: (mode: string) => void) => void};
    layoutModeRequested : {send : (mode: string) => void};
    layoutConfigUpdated : {subscribe : (callback: (config: {mode: string; direction : string}) => void) => void};
    pageIndexChanged : {send : (index: number) => void};
    pageIndexChangedInstant : {send : (index: number) => void};
    fullscreenChanged : {send : (enabled: boolean) => void};
    zoomChanged : {send : (zoom: number) => void};
    viewerLoadingChanged : {send : (loading: boolean) => void};
    copyToClipboard : {subscribe : (callback: (text: string) => void) => void};
    resolveTileSourceRequested : {send : (value: {requestId: string; sourceId : string}) => void};
    resolveTileSourceCancelled : {send : (requestId: string) => void};
    tileSourceResolutionSucceeded : {subscribe : (callback: (value: any) => void) => void};
    tileSourceResolutionFailed : {subscribe : (callback: (value: any) => void) => void};
    authHttpRequested : {subscribe : (callback: (value: any) => void) => void};
    authHttpCancelled : {subscribe : (callback: (value: string) => void) => void};
    authHttpResponded : {send : (value: any) => void};
    authHttpFailed : {send : (value: any) => void};
    authStorageRequested : {subscribe : (callback: (value: any) => void) => void};
    authStorageResponded : {send : (value: any) => void};
    authTokenFrameRequested : {subscribe : (callback: (value: any) => void) => void};
    authTokenFrameCancelled : {subscribe : (callback: (value: string) => void) => void};
    authTokenMessage : {send : (value: any) => void};
    authTokenFailed : {send : (value: any) => void};
    authPopupChanged : {send : (value: any) => void};
    authLogoutChanged : {send : (value: any) => void};
    authSourcesInvalidated : {subscribe : (callback: (value: string[]) => void) => void};
    authDestroyed : {send : (value: null) => void};
    resourceRequested : {send : (value: {requestId: string; url : string}) => void};
    resourceLoadSucceeded : {subscribe : (callback: (value: {requestId: string; url : string; hasPages : boolean; pageIndex : number}) => void) => void};
    resourceLoadFailed : {subscribe : (callback: (value: {requestId: string; url : string; message : string}) => void) => void};
};

type ElmApp = {
    ports: ElmPorts;
};

type DivaRoot = HTMLElement&
{
    elmTree?: unknown;
    __divaInstance?: Diva;
};

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 520;

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
export class Diva extends EventTarget
{
    private readonly rootId: string;
    private readonly root: HTMLElement;
    private readonly auth: AuthBrowser;
    private app: ElmApp;
    private mainViewer: any = null;
    private readonly tileSourceResolver!: TileSourceResolver;
    private readonly pendingViewerMethods: Map<string, any[]> = new Map();
    private viewerMethodRafId: number|null = null;
    private viewerMethodAttempts = 0;
    private filterViewer: any = null;
    private filterViewerElement: HTMLElement|null = null;
    private filterOptions: FilterSettings|null = null;
    private filterViewerFlipped = false;
    private currentFilterSourceKey: string|null = null;
    private pendingFilterPreview: FilterPreviewPayload|null = null;
    private filterPreviewVersion = 0;
    private filterPreviewRetries = 0;
    private filterPreviewRafId: number|null = null;
    private filterPreviewController: AbortController|null = null;
    private isDestroyed = false;
    private readonly handlePageChangeBound: (event: Event) => void;
    private readonly handlePageLoadedBound: (event: Event) => void;
    private readonly handleZoomChangeBound: (event: Event) => void;
    private readonly handleLoadingChangeBound: (event: Event) => void;
    private readonly handlePageLoadErrorBound: (event: Event) => void;
    private readonly handleFullscreenChangeBound: () => void;
    private readonly handleRootClickBound: (event: Event) => void;
    private pages: DivaPage[] = [];
    private readonly pagesByCanvasId: Map<string, DivaPage> = new Map();
    private readonly pagesByLabel: Map<string, DivaPage> = new Map();
    private state: DivaState;
    private readyResolve!: () => void;
    private readyReject!: (error: Error) => void;
    private readySettled = false;
    private resourceSequence = 0;
    private pendingResource: {id: string; promise : Promise<void>; resolve : () => void; reject : (error: Error) => void}|null = null;
    private awaitingViewerResource: {id: string; url : string; pageIndex : number}|null = null;
    private resourceLoading = true;
    private viewerLoading = false;
    /**
     * Resolves when the initial resource and selected initial page are ready.
     *
     * @remarks
     * Collections without an active manifest resolve when their collection UI is
     * ready. The promise rejects when the initial resource fails or the instance is
     * destroyed before readiness.
     */
    public readonly ready: Promise<void>;

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
    constructor(rootId: string, flags: DivaOptions)
    {
        super();
        const root = document.getElementById(rootId);
        if (!root)
        {
            throw new Error(`Missing root element: ${rootId}`);
        }
        const rootAny = root as DivaRoot;

        if (rootAny.__divaInstance)
        {
            rootAny.__divaInstance.destroy();
        }

        // if an elmTree instance is already defined on this element, destroy
        // it.
        if (rootAny.elmTree)
        {
            delete rootAny.elmTree;
            root.innerHTML = "";
        }

        this.rootId = rootId;
        this.root = root;
        this.isDestroyed = false;
        this.state = {
            resourceUrl : flags.objectData,
            ready : false,
            loading : true,
            pageCount : 0,
            currentPageIndex : null,
            visiblePageIndexes : [],
            layoutMode : "single",
            viewingDirection : "ltr",
            zoom : null,
            fullscreen : false,
            destroyed : false
        };
        this.ready = new Promise<void>((resolve, reject) => {
            this.readyResolve = resolve;
            this.readyReject = reject;
        });
        void this.ready.catch(() => {});

        this.handlePageChangeBound = this.handlePageChange.bind(this);
        this.handlePageLoadedBound = this.handlePageLoaded.bind(this);
        this.handleZoomChangeBound = this.handleZoomChange.bind(this);
        this.handleLoadingChangeBound = this.handleLoadingChange.bind(this);
        this.handlePageLoadErrorBound = this.handlePageLoadError.bind(this);
        this.handleFullscreenChangeBound = this.handleFullscreenChange.bind(this);
        this.handleRootClickBound = this.handleRootClick.bind(this);

        let langCode = this.detectLanguage();
        const requestedSidebarWidth = flags.sidebarWidth;
        const sidebarWidth = typeof requestedSidebarWidth === "number" && Number.isFinite(requestedSidebarWidth)
                                 ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(requestedSidebarWidth)))
                                 : DEFAULT_SIDEBAR_WIDTH;
        const sidebarPanel: DivaSidebarPanel = flags.sidebarPanel === "contents" || flags.sidebarPanel === "metadata"
                                                   ? flags.sidebarPanel
                                                   : "thumbnails";

        this.app = Elm.Main.init({
            node : root,
            flags : {
                rootElementId : rootId,
                objectData : flags.objectData,
                initialPage : this.initialPageFlag(flags.initialPage),
                acceptHeaders : flags.acceptHeaders || [],
                showSidebar : flags.showSidebar !== false,
                sidebarWidth,
                sidebarPanel,
                showTitle : flags.showTitle !== false,
                userLanguage : flags.setLanguage || langCode
            }
        });
        this.root = this.getConnectedRoot();
        this.auth = new AuthBrowser(this.app.ports, this.root);
        this.tileSourceResolver = (source: TileSourceDescriptor, signal: AbortSignal) => this.auth.resolve(source, signal);
        const connectedRootAny = this.root as DivaRoot;
        connectedRootAny.__divaInstance = this;

        this.bindPorts();
        this.callViewerMethodWhenReady("setTileSourceResolver", this.tileSourceResolver);
        this.bindRootClick();
        this.bindPageChange();
        this.bindViewerEvent("diva-page-loaded", this.handlePageLoadedBound as EventListener);
        this.bindFullscreenChange();
        this.bindZoomChange();
        this.bindLoadingChange();
        this.bindViewerEvent("diva-page-load-error", this.handlePageLoadErrorBound as EventListener);
    }

    /**
     * Detects the current locale of the browser,
     * and return the first part of it.
     *
     * @returns {string}
     */
    private detectLanguage(): string { return navigator.language.split("-")[0]; }

    private initialPageFlag(target: DivaPageTarget|undefined): unknown
    {
        if (typeof target === "number")
        {
            return Number.isInteger(target) && target >= 0 ? target : null;
        }
        if (target && typeof target === "object" &&
            (target.by === "canvasId" || target.by === "label") && typeof target.value === "string")
        {
            return {by : target.by, value : target.value};
        }
        return null;
    }

    private getConnectedRoot(): HTMLElement
    {
        const root = document.getElementById(this.rootId);
        if (root)
        {
            return root;
        }

        return this.root;
    }

    private bindPorts(): void
    {
        this.getPort("tileSourcesUpdated")
            .subscribe((update: {tileSources: TileSourceEntry[]; initialPageIndex : number}) => {
                this.auth.registerSources(update.tileSources);
                this.callViewerMethodWhenReady("setTileSourceResolver", this.tileSourceResolver);
                this.callViewerMethodWhenReady("setTileSources", update.tileSources, update.initialPageIndex);
            });

        this.getPort("pageAspectsUpdated")
            .subscribe((aspects: number[]) => { this.callViewerMethodWhenReady("setPageAspects", aspects); });

        this.getPort("pageLabelsUpdated")
            .subscribe((labels: string[]) => { this.callViewerMethodWhenReady("setPageLabels", labels); });

        this.getPort("pagesUpdated").subscribe((pages: PublicPageEntry[]) => {
            this.pages = pages.map((page) => this.copyPage(page));
            this.rebuildPageIndexes();
            this.updateState({pageCount : this.pages.length, currentPageIndex : null, visiblePageIndexes : []});
        });

        this.getPort("zoomLevelUpdated").subscribe((zoom: number) => { this.callViewerMethodWhenReady("setZoomLevel", zoom); });

        this.getPort("zoomBy").subscribe((factor: number) => { this.callViewerMethod("zoomBy", factor); });

        this.getPort("scrollToIndex").subscribe((index: number) => { this.callViewerMethod("scrollToIndex", index); });

        this.getPort("filterPreviewUpdated").subscribe((payload: FilterPreviewPayload|null) => {
            if (!payload)
            {
                this.closeFilterPreview();
                return;
            }
            this.filterPreviewVersion += 1;
            this.filterPreviewController?.abort();
            this.filterPreviewController = null;
            this.pendingFilterPreview = payload;
            void this.applyFilterPreview();
        });

        this.getPort("setFullscreen").subscribe((enabled: boolean) => { this.setFullscreen(enabled); });

        this.getPort("saveFilteredImage").subscribe(() => { this.saveFilteredImage(); });

        this.getPort("layoutConfigUpdated").subscribe((config: {mode: string; direction : string}) => {
            if (this.callViewerMethod("setLayoutConfig", config.mode, config.direction))
            {
                this.updateLayoutState(config.mode, config.direction);
                return;
            }
            this.callViewerMethodWhenReady("setLayoutConfig", config.mode, config.direction);
            this.updateLayoutState(config.mode, config.direction);
        });

        this.getPort("layoutModeUpdated")
            .subscribe((mode: string) => {
                this.callViewerMethod("setLayoutMode", mode);
                this.updateLayoutState(mode, this.state.viewingDirection);
            });

        this.getPort("resourceLoadSucceeded").subscribe((value: {requestId: string; url : string; hasPages : boolean; pageIndex : number}) => {
            this.handleResourceSucceeded(value.requestId, value.url, value.hasPages, value.pageIndex);
        });

        this.getPort("resourceLoadFailed").subscribe((value: {requestId: string; url : string; message : string}) => {
            this.handleResourceFailed(value.requestId, value.message);
        });

        this.getPort("copyToClipboard").subscribe((text: string) => { this.copyToClipboard(text); });

        this.getPort("authSourcesInvalidated")
            .subscribe((sourceIds: string[]) => {
                this.auth.invalidateSources(sourceIds);
                this.callViewerMethodWhenReady("invalidateTileSources", sourceIds);
            });
    }

    private ensureMainViewer(): any
    {
        const current = document.getElementById("main-viewer");
        if (current && current !== this.mainViewer)
        {
            this.mainViewer = current;
        }
        return this.mainViewer;
    }

    private copyPage(page: DivaPage|PublicPageEntry): DivaPage
    {
        const images = page.images.map((image) => ({...image}));
        const primary = images.find((image) => image.id === page.primaryImage.id && image.isPrimary) ?? {...page.primaryImage};
        return {
            index : page.index,
            canvasId : page.canvasId,
            label : page.label,
            ...(page.width === null || page.width === undefined ? {} : {width : page.width}),
            ...(page.height === null || page.height === undefined ? {} : {height : page.height}),
            primaryImage : {...primary},
            images
        };
    }

    private rebuildPageIndexes(): void
    {
        this.pagesByCanvasId.clear();
        this.pagesByLabel.clear();
        this.pages.forEach((page) => {
            if (!this.pagesByCanvasId.has(page.canvasId))
            {
                this.pagesByCanvasId.set(page.canvasId, page);
            }
            const label = page.label.toLowerCase();
            if (!this.pagesByLabel.has(label))
            {
                this.pagesByLabel.set(label, page);
            }
        });
    }

    private pageForSelector(selector: DivaPageSelector): DivaPage|undefined
    {
        if (!selector || typeof selector !== "object" ||
            (selector.by !== "canvasId" && selector.by !== "label") || typeof selector.value !== "string")
        {
            throw new TypeError("A page selector must contain a supported 'by' value and a string 'value'.");
        }
        return selector.by === "canvasId"
                   ? this.pagesByCanvasId.get(selector.value)
                   : this.pagesByLabel.get(selector.value.toLowerCase());
    }

    private copyState(): Readonly<DivaState>
    {
        return {...this.state, visiblePageIndexes : this.state.visiblePageIndexes.slice()};
    }

    private updateState(next: Partial<DivaState>): void
    {
        this.state = {...this.state, ...next};
    }

    private emit(type: keyof DivaEventMap, detail: any): void
    {
        this.dispatchEvent(new CustomEvent(type, {detail}));
    }

    private updateLayoutState(mode: string, direction: string): void
    {
        const layoutMode: DivaLayoutMode = mode === "spread" || mode === "spread-shift" ? mode : "single";
        const viewingDirection: DivaViewingDirection = direction === "rtl" ? "rtl" : "ltr";
        const viewer = this.ensureMainViewer();
        const visible = viewer && typeof viewer.getVisiblePageIndexes === "function"
                            ? viewer.getVisiblePageIndexes()
                            : this.state.visiblePageIndexes;
        const changed = layoutMode !== this.state.layoutMode || viewingDirection !== this.state.viewingDirection;
        this.updateState({layoutMode, viewingDirection, visiblePageIndexes : visible});
        if (changed)
        {
            this.emit("layoutchange", {layoutMode, viewingDirection});
        }
    }

    private handleResourceSucceeded(requestId: string, url: string, hasPages: boolean, pageIndex: number): void
    {
        if (requestId !== "initial" && this.pendingResource?.id !== requestId)
        {
            return;
        }
        if (hasPages)
        {
            this.awaitingViewerResource = {id : requestId, url, pageIndex};
            const viewer = this.ensureMainViewer();
            const sourceId = this.pages[pageIndex]?.primaryImage.id;
            if (sourceId && viewer && typeof viewer.isPageLoaded === "function" && viewer.isPageLoaded(pageIndex, sourceId))
            {
                this.completeResource(requestId, url);
            }
            return;
        }
        this.completeResource(requestId, url);
    }

    private completeResource(requestId: string, url: string): void
    {
        this.awaitingViewerResource = null;
        this.updateState({resourceUrl : url, ready : true});
        this.resourceLoading = false;
        this.refreshLoadingState();
        if (!this.readySettled)
        {
            this.readySettled = true;
            this.readyResolve();
            this.emit("ready", this.copyState());
        }
        if (requestId !== "initial" && this.pendingResource)
        {
            this.pendingResource.resolve();
            this.pendingResource = null;
        }
        this.emit("resourcechange", {resourceUrl : url, state : this.copyState()});
    }

    private handleResourceFailed(requestId: string, message: string): void
    {
        if (requestId !== "initial" && this.pendingResource?.id !== requestId)
        {
            return;
        }
        const error = new Error(message);
        this.awaitingViewerResource = null;
        this.updateState({ready : requestId !== "initial"});
        this.resourceLoading = false;
        this.refreshLoadingState();
        if (requestId === "initial" && !this.readySettled)
        {
            this.readySettled = true;
            this.readyReject(error);
        }
        else if (this.pendingResource)
        {
            this.pendingResource.reject(error);
            this.pendingResource = null;
        }
        this.emit("error", {error, operation : "setResource", recoverable : requestId !== "initial"});
    }

    private assertAlive(): void
    {
        if (this.isDestroyed)
        {
            throw new DOMException("The Diva instance was destroyed.", "InvalidStateError");
        }
    }

    private assertPageIndex(index: number): void
    {
        if (!Number.isInteger(index) || index < 0 || index >= this.pages.length)
        {
            throw new RangeError(`Page index ${index} is outside the available page range.`);
        }
    }

    private refreshLoadingState(): void
    {
        const loading = this.resourceLoading || this.viewerLoading;
        if (loading === this.state.loading)
        {
            return;
        }
        this.updateState({loading});
        this.emit("loadingchange", {loading});
    }

    private async waitForResource(): Promise<void>
    {
        this.assertAlive();
        if (this.pendingResource)
        {
            await this.pendingResource.promise;
        }
        else
        {
            await this.ready;
        }
        this.assertAlive();
    }

    private async applyFilterPreview(): Promise<void>
    {
        if (this.isDestroyed)
        {
            return;
        }
        if (!this.pendingFilterPreview)
        {
            return;
        }
        const element = this.ensureFilterViewerElement();
        if (!element)
        {
            if (this.filterPreviewRetries < 10)
            {
                this.filterPreviewRetries += 1;
                if (this.filterPreviewRafId === null)
                {
                    this.filterPreviewRafId = requestAnimationFrame(() => {
                        this.filterPreviewRafId = null;
                        void this.applyFilterPreview();
                    });
                }
            }
            return;
        }

        const payload = this.pendingFilterPreview;
        this.pendingFilterPreview = null;
        this.filterPreviewRetries = 0;
        const version = this.filterPreviewVersion;
        this.filterOptions = payload.filters || null;
        this.ensureFilterViewer();
        if (this.filterViewer)
        {
            const sourceKey = JSON.stringify([ payload.sourceId, payload.tileSource, payload.isStatic ]);
            const tileSourceChanged = this.currentFilterSourceKey !== sourceKey;
            if (tileSourceChanged)
            {
                let tileSource: ResolvedTileSource;
                const controller = new AbortController();
                this.filterPreviewController = controller;
                try
                {
                    tileSource = await this.auth.resolve({sourceId : payload.sourceId, url : payload.tileSource, isStatic : payload.isStatic}, controller.signal);
                }
                catch (error)
                {
                    if (!controller.signal.aborted && !this.isDestroyed && version === this.filterPreviewVersion)
                    {
                        console.error("Unable to authorize filter preview source", error);
                    }
                    return;
                }
                finally
                {
                    if (this.filterPreviewController === controller)
                    {
                        this.filterPreviewController = null;
                    }
                }
                if (this.isDestroyed || version !== this.filterPreviewVersion)
                {
                    return;
                }
                this.currentFilterSourceKey = sourceKey;
                this.filterViewer.open(tileSource);
            }
            else
            {
                this.applyFilterOptions();
            }
        }
    }

    private copyToClipboard(text: string): void
    {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function")
        {
            navigator.clipboard.writeText(text).catch(() => {});
            return;
        }
    }

    private bindPageChange(): void
    {
        this.bindViewerEvent("diva-page-change", this.handlePageChangeBound as EventListener);
    }

    private bindFullscreenChange(): void
    {
        document.addEventListener("fullscreenchange", this.handleFullscreenChangeBound);
    }

    private bindZoomChange(): void
    {
        this.bindViewerEvent("diva-zoom-change", this.handleZoomChangeBound as EventListener);
    }

    private bindLoadingChange(): void
    {
        this.bindViewerEvent("diva-loading-change", this.handleLoadingChangeBound as EventListener);
    }

    private bindRootClick(): void
    {
        this.getConnectedRoot().addEventListener("click", this.handleRootClickBound, true);
    }

    /**
     * Register a listener for a typed Diva event.
     *
     * @param type - Event name from {@link DivaEventMap}.
     * @param listener - Callback invoked with the event's typed `CustomEvent`.
     * @param options - Standard DOM listener options.
     */
    public addEventListener<K extends keyof DivaEventMap>(
        type: K, listener: (this: Diva, event: DivaEventMap[K]) => any, options?: boolean|AddEventListenerOptions): void;
    public addEventListener(type: string, listener: EventListenerOrEventListenerObject|null,
                            options?: boolean|AddEventListenerOptions): void;
    public addEventListener(type: string, listener: EventListenerOrEventListenerObject|null,
                            options?: boolean|AddEventListenerOptions): void
    {
        super.addEventListener(type, listener, options);
    }

    /**
     * Remove a previously registered Diva event listener.
     *
     * @param type - Event name from {@link DivaEventMap}.
     * @param listener - Callback originally passed to {@link Diva.addEventListener}.
     * @param options - Standard DOM listener options used for matching.
     */
    public removeEventListener<K extends keyof DivaEventMap>(
        type: K, listener: (this: Diva, event: DivaEventMap[K]) => any, options?: boolean|EventListenerOptions): void;
    public removeEventListener(type: string, listener: EventListenerOrEventListenerObject|null,
                               options?: boolean|EventListenerOptions): void;
    public removeEventListener(type: string, listener: EventListenerOrEventListenerObject|null,
                               options?: boolean|EventListenerOptions): void
    {
        super.removeEventListener(type, listener, options);
    }

    /**
     * Return a defensive snapshot of current viewer state.
     *
     * @returns State that callers may retain without observing later mutations.
     */
    public getState(): Readonly<DivaState> { return this.copyState(); }

    /**
     * Return defensive metadata snapshots for every displayed page.
     *
     * @returns Pages in zero-based display order. Auth tokens and resolved loading URLs are never included.
     */
    public getPages(): readonly DivaPage[] { return this.pages.map((page) => this.copyPage(page)); }

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
    public findPage(selector: DivaPageSelector): DivaPage|undefined
    {
        const page = this.pageForSelector(selector);
        return page ? this.copyPage(page) : undefined;
    }

    /**
     * Return metadata for the active page, if the resource has pages.
     *
     * @returns The active page, or `undefined` before page initialization and for collections without an active manifest.
     */
    public getCurrentPage(): DivaPage|undefined
    {
        const index = this.state.currentPageIndex;
        return index === null || !this.pages[index] ? undefined : this.copyPage(this.pages[index]);
    }

    /**
     * Return the pages in the active row or opening.
     *
     * @returns One page in `single` mode, or the pages belonging to the current logical opening in a spread mode.
     */
    public getVisiblePages(): readonly DivaPage[]
    {
        return this.state.visiblePageIndexes.map((index) => this.pages[index]).filter(Boolean).map((page) => this.copyPage(page));
    }

    /**
     * Return the current single-page or spread layout mode.
     *
     * @returns The active {@link DivaLayoutMode}.
     */
    public getLayoutMode(): DivaLayoutMode { return this.state.layoutMode; }

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
     * Event listeners remain attached. A failed request leaves the previous resource
     * active and emits a recoverable `error` event.
     *
     * @example
     * ```ts
     * await viewer.setResource("https://example.org/iiif/next-manifest.json");
     * ```
     */
    public setResource(url: string): Promise<void>
    {
        this.assertAlive();
        if (!url || typeof url !== "string")
        {
            return Promise.reject(new TypeError("A resource URL is required."));
        }
        if (this.pendingResource)
        {
            this.pendingResource.reject(new DOMException("The resource load was superseded.", "AbortError"));
            this.pendingResource = null;
        }
        const id = `public-${++this.resourceSequence}`;
        let resolve!: () => void;
        let reject!: (error: Error) => void;
        const promise = new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        void promise.catch(() => {});
        this.pendingResource = {id, promise, resolve, reject};
        this.updateState({ready : false});
        this.resourceLoading = true;
        this.refreshLoadingState();
        this.getPort("resourceRequested").send({requestId : id, url});
        return promise;
    }

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
    public goToPage(index: number): Promise<void>;
    /**
     * Navigate to a page selected by Canvas identifier or display label.
     *
     * @param selector - Page lookup using the matching rules from {@link Diva.findPage}.
     * @returns `true` after navigation, or `false` without moving when no page matches.
     *
     * @throws `TypeError`
     * Rejected when a runtime selector object is malformed.
     */
    public goToPage(selector: DivaPageSelector): Promise<boolean>;
    public async goToPage(target: number|DivaPageSelector): Promise<void|boolean>
    {
        await this.waitForResource();
        if (typeof target !== "number")
        {
            const page = this.pageForSelector(target);
            if (!page)
            {
                return false;
            }
            await this.callViewerMethodAsync("scrollToIndex", page.index);
            return true;
        }
        const index = target;
        this.assertPageIndex(index);
        await this.callViewerMethodAsync("scrollToIndex", index);
    }

    /**
     * Navigate to the next page or opening for the active layout.
     *
     * @returns A promise that resolves after navigation, or immediately at the final opening.
     *
     * @remarks
     * Spread modes advance by logical opening; clients do not need to calculate a page step.
     */
    public async next(): Promise<void>
    {
        await this.waitForResource();
        await this.callViewerMethodAsync("next");
    }

    /**
     * Navigate to the previous page or opening for the active layout.
     *
     * @returns A promise that resolves after navigation, or immediately at the first opening.
     */
    public async previous(): Promise<void>
    {
        await this.waitForResource();
        await this.callViewerMethodAsync("previous");
    }

    /**
     * Set the OpenSeadragon viewport zoom to a positive value.
     *
     * @param zoom - Positive finite viewport zoom value.
     * @returns A promise that resolves after the zoom command is applied.
     *
     * @throws `RangeError`
     * Rejected when `zoom` is not positive and finite.
     */
    public async setZoom(zoom: number): Promise<void>
    {
        await this.waitForResource();
        if (!Number.isFinite(zoom) || zoom <= 0)
        {
            throw new RangeError("Zoom must be a positive finite number.");
        }
        await this.callViewerMethodAsync("setZoomLevel", zoom);
    }

    /**
     * Multiply the current viewport zoom by a positive factor.
     *
     * @param factor - Positive finite multiplier; values above 1 zoom in and values below 1 zoom out.
     * @returns A promise that resolves after the zoom command is applied.
     *
     * @throws `RangeError`
     * Rejected when `factor` is not positive and finite.
     */
    public async zoomBy(factor: number): Promise<void>
    {
        await this.waitForResource();
        if (!Number.isFinite(factor) || factor <= 0)
        {
            throw new RangeError("Zoom factor must be a positive finite number.");
        }
        await this.callViewerMethodAsync("zoomBy", factor);
    }

    /**
     * Zoom in by Diva's standard zoom factor.
     *
     * @returns A promise that resolves after multiplying the zoom by 1.6.
     */
    public zoomIn(): Promise<void> { return this.zoomBy(1.6); }
    /**
     * Zoom out by Diva's standard zoom factor.
     *
     * @returns A promise that resolves after dividing the zoom by 1.6.
     */
    public zoomOut(): Promise<void> { return this.zoomBy(1 / 1.6); }

    /**
     * Fit a page, or the current page when omitted, into the viewport.
     *
     * @param pageIndex - Optional zero-based page index. Defaults to the active page.
     * @returns A promise that resolves after the page image loads and is fitted.
     *
     * @throws `RangeError`
     * Rejected when there is no active page or `pageIndex` is unavailable.
     */
    public async fitToPage(pageIndex?: number): Promise<void>
    {
        await this.waitForResource();
        const index = pageIndex ?? this.state.currentPageIndex;
        if (index === null)
        {
            throw new RangeError("There is no current page.");
        }
        this.assertPageIndex(index);
        await this.callViewerMethodAsync("fitToPage", index);
    }

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
    public async zoomToRegion(pageIndex: number, region: DivaRegion, options: ZoomToRegionOptions = {}): Promise<void>
    {
        await this.waitForResource();
        this.assertPageIndex(pageIndex);
        if (![region.x, region.y, region.width, region.height].every(Number.isFinite) || region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0)
        {
            throw new RangeError("Region coordinates must be finite, non-negative, and have positive dimensions.");
        }
        const padding = options.padding ?? 0.05;
        if (!Number.isFinite(padding) || padding < 0)
        {
            throw new RangeError("Region padding must be a non-negative finite number.");
        }
        await this.callViewerMethodAsync("zoomToRegion", pageIndex, region, options);
    }

    /**
     * Change the page layout while preserving the active page.
     *
     * @param mode - Desired single-page or spread arrangement.
     * @returns A promise that resolves after the layout is applied.
     *
     * @throws `RangeError`
     * Rejected for a value outside {@link DivaLayoutMode}.
     */
    public async setLayoutMode(mode: DivaLayoutMode): Promise<void>
    {
        await this.waitForResource();
        if (!["single", "spread", "spread-shift"].includes(mode))
        {
            throw new RangeError(`Unsupported layout mode: ${mode}`);
        }
        await this.callViewerMethodAsync("setLayoutMode", mode);
        this.updateLayoutState(mode, this.state.viewingDirection);
        this.getPort("layoutModeRequested").send(mode);
    }

    /**
     * Request fullscreen display; browser user-activation rules apply.
     *
     * @returns A promise that resolves when the root enters fullscreen or is already fullscreen.
     *
     * @throws `DOMException`
     * Rejected when browser permissions or user-activation rules deny the request,
     * or with `InvalidStateError` after destruction.
     */
    public async enterFullscreen(): Promise<void>
    {
        this.assertAlive();
        if (!document.fullscreenElement)
        {
            await this.getConnectedRoot().requestFullscreen();
        }
    }

    /**
     * Exit fullscreen display when active.
     *
     * @returns A promise that resolves when fullscreen exits or when it was already inactive.
     *
     * @throws `DOMException`
     * Rejected when the browser cannot exit fullscreen or with `InvalidStateError` after destruction.
     */
    public async exitFullscreen(): Promise<void>
    {
        this.assertAlive();
        if (document.fullscreenElement)
        {
            await document.exitFullscreen();
        }
    }

    /**
     * Enter or exit fullscreen display; browser user-activation rules apply.
     *
     * @returns The promise returned by {@link Diva.enterFullscreen} or {@link Diva.exitFullscreen}.
     */
    public toggleFullscreen(): Promise<void>
    {
        return document.fullscreenElement ? this.exitFullscreen() : this.enterFullscreen();
    }

    /**
     * Cancel outstanding work, release resources, and empty the viewer root.
     *
     * @remarks
     * Destruction is idempotent and permanent. Pending public commands reject with
     * `InvalidStateError`; later commands do the same. State snapshots remain readable.
     */
    public destroy(): void
    {
        if (this.isDestroyed)
        {
            return;
        }
        this.isDestroyed = true;
        const destroyed = new DOMException("The Diva instance was destroyed.", "InvalidStateError");
        if (!this.readySettled)
        {
            this.readySettled = true;
            this.readyReject(destroyed);
        }
        this.pendingResource?.reject(destroyed);
        this.pendingResource = null;
        this.awaitingViewerResource = null;
        this.updateState({destroyed : true, loading : false});
        this.closeFilterPreview();
        this.auth.destroy();
        if (this.viewerMethodRafId !== null)
        {
            cancelAnimationFrame(this.viewerMethodRafId);
            this.viewerMethodRafId = null;
        }
        this.pendingViewerMethods.clear();
        const root = this.getConnectedRoot();
        this.removeViewerEvent("diva-page-change", this.handlePageChangeBound as EventListener);
        this.removeViewerEvent("diva-page-loaded", this.handlePageLoadedBound as EventListener);
        this.removeViewerEvent("diva-zoom-change", this.handleZoomChangeBound as EventListener);
        this.removeViewerEvent("diva-loading-change", this.handleLoadingChangeBound as EventListener);
        this.removeViewerEvent("diva-page-load-error", this.handlePageLoadErrorBound as EventListener);
        root.removeEventListener("click", this.handleRootClickBound, true);
        document.removeEventListener("fullscreenchange", this.handleFullscreenChangeBound);
        if (root)
        {
            const rootAny = root as DivaRoot;
            if (rootAny.__divaInstance === this)
            {
                delete rootAny.__divaInstance;
            }
            if (rootAny.elmTree)
            {
                delete rootAny.elmTree;
            }
            root.innerHTML = "";
        }
    }

    private closeFilterPreview(): void
    {
        this.filterPreviewVersion += 1;
        this.filterPreviewController?.abort();
        this.filterPreviewController = null;
        if (this.filterPreviewRafId !== null)
        {
            cancelAnimationFrame(this.filterPreviewRafId);
            this.filterPreviewRafId = null;
        }
        if (this.filterViewer && typeof this.filterViewer.destroy === "function")
        {
            this.filterViewer.destroy();
        }
        this.filterViewer = null;
        this.filterViewerElement = null;
        this.currentFilterSourceKey = null;
        this.pendingFilterPreview = null;
        this.filterOptions = null;
        this.filterPreviewRetries = 0;
    }

    private setFullscreen(enabled: boolean): void
    {
        const root = this.getConnectedRoot();

        if (enabled)
        {
            if (document.fullscreenElement || !document.fullscreenEnabled)
            {
                return;
            }
            root.requestFullscreen().catch(() => {});
            return;
        }

        if (!document.fullscreenElement)
        {
            return;
        }
        document.exitFullscreen().catch(() => {});
    }

    private handleRootClick(event: Event): void
    {
        const target = event.target;
        if (!(target instanceof Element))
        {
            return;
        }

        const root = this.getConnectedRoot();
        const fullscreenButton = target.closest("button[data-diva-action='fullscreen']");
        if (!fullscreenButton || !root.contains(fullscreenButton))
        {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.toggleFullscreenFromUserActivation();
    }

    private toggleFullscreenFromUserActivation(): void
    {
        if (document.fullscreenElement)
        {
            document.exitFullscreen().catch(() => {});
            return;
        }

        if (!document.fullscreenEnabled)
        {
            return;
        }

        this.getConnectedRoot().requestFullscreen().catch(() => {});
    }

    private handlePageChange(event: Event): void
    {
        const detail = (event as CustomEvent).detail;
        if (!detail || typeof detail.index !== "number")
        {
            return;
        }
        if (detail.instant)
        {
            this.getPort("pageIndexChangedInstant").send(detail.index);
        }
        else
        {
            this.getPort("pageIndexChanged").send(detail.index);
        }
        const viewer = this.ensureMainViewer();
        const visible = viewer && typeof viewer.getVisiblePageIndexes === "function"
                            ? viewer.getVisiblePageIndexes()
                            : [ detail.index ];
        this.updateState({currentPageIndex : detail.index, visiblePageIndexes : visible});
        const page = this.pages[detail.index];
        if (page)
        {
            this.emit("pagechange", {
                pageIndex : detail.index,
                page : this.copyPage(page),
                visiblePages : this.getVisiblePages()
            });
        }
    }

    private handlePageLoaded(event: Event): void
    {
        const detail = (event as CustomEvent).detail;
        if (!detail || typeof detail.index !== "number")
        {
            return;
        }
        const awaiting = this.awaitingViewerResource;
        if (awaiting && detail.index === awaiting.pageIndex)
        {
            this.completeResource(awaiting.id, awaiting.url);
        }
    }

    private handleZoomChange(event: Event): void
    {
        const detail = (event as CustomEvent).detail;
        if (!detail || typeof detail.zoom !== "number")
        {
            return;
        }
        this.getPort("zoomChanged").send(detail.zoom);
        this.updateState({zoom : detail.zoom});
        this.emit("zoomchange", {zoom : detail.zoom});
    }

    private handleLoadingChange(event: Event): void
    {
        const detail = (event as CustomEvent).detail;
        if (!detail || typeof detail.loading !== "boolean")
        {
            return;
        }
        this.getPort("viewerLoadingChanged").send(detail.loading);
        this.viewerLoading = detail.loading;
        this.refreshLoadingState();
    }

    private handlePageLoadError(event: Event): void
    {
        const detail = (event as CustomEvent).detail;
        const error = new Error(detail?.message || "The image could not be loaded.");
        const awaiting = this.awaitingViewerResource;
        if (awaiting && detail?.index === awaiting.pageIndex)
        {
            this.awaitingViewerResource = null;
            this.updateState({ready : false});
            this.resourceLoading = false;
            this.refreshLoadingState();
            if (!this.readySettled)
            {
                this.readySettled = true;
                this.readyReject(error);
            }
            if (awaiting.id !== "initial" && this.pendingResource?.id === awaiting.id)
            {
                this.pendingResource.reject(error);
                this.pendingResource = null;
            }
        }
        this.emit("error", {error, operation : "loadPage", recoverable : true});
    }

    private handleFullscreenChange(): void
    {
        const isFullscreen = Boolean(document.fullscreenElement);
        this.getPort("fullscreenChanged").send(isFullscreen);
        this.updateState({fullscreen : isFullscreen});
        this.emit("fullscreenchange", {fullscreen : isFullscreen});
    }

    private ensureFilterViewer(): void
    {
        if (this.filterViewer || !this.filterViewerElement)
        {
            return;
        }

        this.filterViewer = OpenSeadragon({
            element : this.filterViewerElement,
            showNavigationControl : false,
            preserveViewport : true,
            visibilityRatio : 0,
            drawer : "canvas",
            crossOriginPolicy : "Anonymous",
            loadTilesWithAjax : true,
            ajaxWithCredentials : false
        });

        this.filterViewer.addHandler("open", () => {
            const drawer = this.filterViewer?.drawer as any;
            const canvas = drawer && drawer.canvas ? drawer.canvas : null;
            if (canvas && typeof canvas.getContext === "function")
            {
                const context = canvas.getContext("2d", {willReadFrequently : true});
                if (context)
                {
                    drawer.context = context;
                }
            }
            if (this.filterViewer && this.filterViewer.viewport)
            {
                this.filterViewer.viewport.fitBounds(this.filterViewer.world.getHomeBounds(), true);
            }
            this.filterViewerFlipped = false;
            this.applyFilterOptions();
        });
    }

    private ensureFilterViewerElement(): HTMLElement|null
    {
        const element = document.getElementById("filter-viewer");
        if (!element)
        {
            this.filterViewerElement = null;
            return null;
        }

        if (this.filterViewerElement !== element)
        {
            if (this.filterViewer && typeof this.filterViewer.destroy === "function")
            {
                this.filterViewer.destroy();
            }
            this.filterViewer = null;
            this.currentFilterSourceKey = null;
            this.filterViewerFlipped = false;
            this.filterViewerElement = element;
        }

        return this.filterViewerElement;
    }

    private applyFilterOptions(): void
    {
        if (!this.filterViewer)
        {
            return;
        }
        const options = buildFilterOptions(this.filterOptions);
        setFilterOptions(this.filterViewer, options);

        if (this.filterViewer.viewport)
        {
            const rotation = this.filterOptions?.rotation || 0;
            this.filterViewer.viewport.setRotation(rotation);

            const shouldFlip = Boolean(this.filterOptions?.flip);
            const viewport = this.filterViewer.viewport;
            if (typeof viewport.toggleFlip === "function")
            {
                let isFlipped = this.filterViewerFlipped;
                if (typeof viewport.getFlip === "function")
                {
                    isFlipped = Boolean(viewport.getFlip());
                }
                if (shouldFlip != isFlipped)
                {
                    viewport.toggleFlip();
                    this.filterViewerFlipped = shouldFlip;
                }
            }
        }
    }

    private saveFilteredImage(): void
    {
        if (!this.filterViewer)
        {
            return;
        }
        const drawer = (this.filterViewer as any).drawer;
        const canvas = drawer && drawer.canvas ? drawer.canvas as HTMLCanvasElement : null;
        if (!canvas)
        {
            return;
        }
        try
        {
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `diva-filtered-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
        catch (error)
        {
            console.error("Failed to save filtered image", error);
        }
    }

    private getPort<Name extends keyof ElmPorts>(name: Name): ElmPorts[Name]
    {
        const ports = this.app.ports as Partial<ElmPorts>| undefined;
        const port = ports ? ports[name] : undefined;
        if (!port)
        {
            throw new Error(`Missing Elm port: ${String(name)}`);
        }
        return port as ElmPorts[Name];
    }

    private callViewerMethod(name: string, ...args: any[]): boolean
    {
        const viewer = this.ensureMainViewer();
        if (!viewer)
        {
            return false;
        }
        const method = viewer[name];
        if (typeof method !== "function")
        {
            return false;
        }
        method.apply(viewer, args);
        return true;
    }

    private async callViewerMethodAsync(name: string, ...args: any[]): Promise<any>
    {
        let attempts = 0;
        while (attempts < 120)
        {
            this.assertAlive();
            const viewer = this.ensureMainViewer();
            const method = viewer?.[name];
            if (typeof method === "function")
            {
                return await method.apply(viewer, args);
            }
            attempts += 1;
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        throw new DOMException(`The viewer method ${name} is not available.`, "InvalidStateError");
    }

    private callViewerMethodWhenReady(name: string, ...args: any[]): void
    {
        if (this.callViewerMethod(name, ...args))
        {
            this.viewerMethodAttempts = 0;
            return;
        }

        this.pendingViewerMethods.set(name, args);
        this.viewerMethodAttempts = 0;
        this.scheduleViewerMethodFlush();
    }

    private scheduleViewerMethodFlush(): void
    {
        if (this.isDestroyed || this.viewerMethodRafId !== null)
        {
            return;
        }
        this.viewerMethodRafId = requestAnimationFrame(() => {
            this.viewerMethodRafId = null;
            this.flushPendingViewerMethods();
        });
    }

    private flushPendingViewerMethods(): void
    {
        if (this.isDestroyed || this.pendingViewerMethods.size === 0)
        {
            return;
        }

        const pending = Array.from(this.pendingViewerMethods.entries());
        this.pendingViewerMethods.clear();
        pending.forEach(([ name, args ]) => {
            if (!this.callViewerMethod(name, ...args))
            {
                this.pendingViewerMethods.set(name, args);
            }
        });

        if (this.pendingViewerMethods.size === 0)
        {
            this.viewerMethodAttempts = 0;
            return;
        }
        if (this.viewerMethodAttempts < 120)
        {
            this.viewerMethodAttempts += 1;
            this.scheduleViewerMethodFlush();
        }
    }

    private bindViewerEvent(name: string, handler: EventListener): void
    {
        const viewer = this.ensureMainViewer();
        if (!viewer)
        {
            return;
        }
        viewer.removeEventListener(name, handler);
        viewer.addEventListener(name, handler);
    }

    private removeViewerEvent(name: string, handler: EventListener): void
    {
        const viewer = this.ensureMainViewer();
        if (!viewer)
        {
            return;
        }
        viewer.removeEventListener(name, handler);
    }
}

type FilterMapping = {
    enabled: keyof FilterSettings; filter : keyof typeof filterFunctions;
    args?: (keyof FilterSettings)[];
    defaults?: number[];
};

const filterFunctions = {
    THRESHOLDING : Filters.THRESHOLDING,
    BRIGHTNESS : Filters.BRIGHTNESS,
    SATURATION : Filters.SATURATION,
    VIBRANCE : Filters.VIBRANCE,
    HUE : Filters.HUE,
    CC_RED : Filters.CC_RED,
    CC_GREEN : Filters.CC_GREEN,
    CC_BLUE : Filters.CC_BLUE,
    CONTRAST : Filters.CONTRAST,
    GAMMA : Filters.GAMMA,
    GREYSCALE : Filters.GREYSCALE,
    INVERT : Filters.INVERT,
    BACKGROUND_NORMALIZE : Filters.BACKGROUND_NORMALIZE,
    UNSHARP_MASK : Filters.UNSHARP_MASK,
    ALT_RED_GAMMA : Filters.ALT_RED_GAMMA,
    ALT_GREEN_GAMMA : Filters.ALT_GREEN_GAMMA,
    ALT_BLUE_GAMMA : Filters.ALT_BLUE_GAMMA,
    ALT_RED_SIGMOID : Filters.ALT_RED_SIGMOID,
    ALT_GREEN_SIGMOID : Filters.ALT_GREEN_SIGMOID,
    ALT_BLUE_SIGMOID : Filters.ALT_BLUE_SIGMOID,
    ALT_RED_HUE : Filters.ALT_RED_HUE,
    ALT_GREEN_HUE : Filters.ALT_GREEN_HUE,
    ALT_BLUE_HUE : Filters.ALT_BLUE_HUE,
    ALT_RED_VIBRANCE : Filters.ALT_RED_VIBRANCE,
    ALT_GREEN_VIBRANCE : Filters.ALT_GREEN_VIBRANCE,
    ALT_BLUE_VIBRANCE : Filters.ALT_BLUE_VIBRANCE,
    GLOBAL_PCA_COLOR : Filters.GLOBAL_PCA_COLOR,
    ADAPTIVE_THRESHOLD : Filters.ADAPTIVE_THRESHOLD
};

const simpleFilterMappings: FilterMapping[] = [
    {enabled : "thresholdEnabled", filter : "THRESHOLDING", args : [ "threshold" ]},
    {enabled : "brightnessEnabled", filter : "BRIGHTNESS", args : [ "brightness" ]},
    {enabled : "saturationEnabled", filter : "SATURATION", args : [ "saturation" ]},
    {enabled : "vibranceEnabled", filter : "VIBRANCE", args : [ "vibrance" ]},
    {enabled : "hueEnabled", filter : "HUE", args : [ "hue" ]},
    {enabled : "ccRedEnabled", filter : "CC_RED", args : [ "ccRed" ]},
    {enabled : "ccGreenEnabled", filter : "CC_GREEN", args : [ "ccGreen" ]},
    {enabled : "ccBlueEnabled", filter : "CC_BLUE", args : [ "ccBlue" ]},
    {enabled : "contrastEnabled", filter : "CONTRAST", args : [ "contrast" ]},
    {enabled : "gammaEnabled", filter : "GAMMA", args : [ "gamma" ]},
    {enabled : "grayscale", filter : "GREYSCALE"},
    {enabled : "invert", filter : "INVERT"},
    {enabled : "normalizeEnabled", filter : "BACKGROUND_NORMALIZE", args : [ "normalizeStrength" ]},
    {enabled : "unsharpEnabled", filter : "UNSHARP_MASK", args : [ "unsharpAmount" ]},
];

const altFilterMappings: FilterMapping[] = [
    {enabled : "altRedGammaEnabled", filter : "ALT_RED_GAMMA", args : [ "altRedGamma" ]},
    {enabled : "altGreenGammaEnabled", filter : "ALT_GREEN_GAMMA", args : [ "altGreenGamma" ]},
    {enabled : "altBlueGammaEnabled", filter : "ALT_BLUE_GAMMA", args : [ "altBlueGamma" ]},
    {enabled : "altRedSigmoidEnabled", filter : "ALT_RED_SIGMOID", args : [ "altRedSigmoid" ]},
    {enabled : "altGreenSigmoidEnabled", filter : "ALT_GREEN_SIGMOID", args : [ "altGreenSigmoid" ]},
    {enabled : "altBlueSigmoidEnabled", filter : "ALT_BLUE_SIGMOID", args : [ "altBlueSigmoid" ]},
    {
        enabled : "altRedHueEnabled",
        filter : "ALT_RED_HUE",
        args : [ "altRedHue", "altRedHueWindow" ],
        defaults : [ 0, 8 ]
    },
    {
        enabled : "altGreenHueEnabled",
        filter : "ALT_GREEN_HUE",
        args : [ "altGreenHue", "altGreenHueWindow" ],
        defaults : [ 0, 8 ]
    },
    {
        enabled : "altBlueHueEnabled",
        filter : "ALT_BLUE_HUE",
        args : [ "altBlueHue", "altBlueHueWindow" ],
        defaults : [ 0, 8 ]
    },
    {enabled : "altRedVibranceEnabled", filter : "ALT_RED_VIBRANCE", args : [ "altRedVibrance" ]},
    {enabled : "altGreenVibranceEnabled", filter : "ALT_GREEN_VIBRANCE", args : [ "altGreenVibrance" ]},
    {enabled : "altBlueVibranceEnabled", filter : "ALT_BLUE_VIBRANCE", args : [ "altBlueVibrance" ]},
    {
        enabled : "adaptiveEnabled",
        filter : "ADAPTIVE_THRESHOLD",
        args : [ "adaptiveWindow", "adaptiveOffset" ],
        defaults : [ 15, 10 ]
    },
];

const appendMappedProcessors = (processors: any[], filters: FilterSettings, mappings: FilterMapping[]): void => {
    for (const mapping of mappings)
    {
        if (filters[mapping.enabled])
        {
            const filterArgs = mapping.args?.map((key, i) => filters[key] ?? (mapping.defaults?.[i] ?? 0)) ?? [];
            const filterFn = filterFunctions[mapping.filter] as (...args: any[]) => any;
            processors.push(filterFn(...(filterArgs as any[])));
        }
    }
};

const buildFilterOptions = (filters: FilterSettings|null): any => {
    if (!filters)
    {
        return {filters : [], loadMode : "sync"};
    }

    const processors: any[] = [];

    // Keep this order stable: simple -> special-case -> alt mappings.
    appendMappedProcessors(processors, filters, simpleFilterMappings);

    if (filters.morphEnabled)
    {
        const comparator = filters.morphOperation === "dilate" ? Math.max : Math.min;
        processors.push(Filters.MORPHOLOGICAL_OPERATION(filters.morphKernel ?? 3, comparator));
    }

    if (filters.convolutionEnabled)
    {
        const kernel = Filters.CONVOLUTION_PRESET(filters.convolutionPreset || "");
        if (kernel)
        {
            processors.push(Filters.CONVOLUTION(kernel));
        }
    }

    if (filters.colourmapEnabled)
    {
        const colourmap = Filters.COLORMAP_PRESET(filters.colourmapPreset || "");
        if (colourmap)
        {
            processors.push(Filters.COLORMAP(colourmap, filters.colourmapCenter ?? 128));
        }
    }

    if (filters.pseudoColourEnabled)
    {
        processors.push(Filters.PSEUDOCOLOR(filters.pseudoColourMode || "", filters.pseudoColourRed ?? 1,
                                            filters.pseudoColourGreen ?? 1, filters.pseudoColourBlue ?? 1));
    }

    if (filters.globalPcaEnabled)
    {
        processors.push(Filters.GLOBAL_PCA_COLOR(filters.pcaMode || "", filters.pcaHue ?? 0));
    }

    if (filters.colourReplaceEnabled)
    {
        processors.push(Filters.COLOR_REPLACE(filters.colourReplaceSource || "#ffffff",
                                              filters.colourReplaceTarget || "#ffffff",
                                              filters.colourReplaceTolerance ?? 24, filters.colourReplaceBlend ?? 1,
                                              filters.colourReplacePreserveLum ?? false));
    }

    appendMappedProcessors(processors, filters, altFilterMappings);

    if (processors.length === 0)
    {
        return {filters : [], loadMode : "sync"};
    }

    return {filters : {processors}, loadMode : "sync"};
};

declare global
{
    interface Window
    {
        Diva: typeof Diva;
    }
}

window.Diva = Diva;
