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

type TileSourceResolver = (source: TileSourceDescriptor, signal: AbortSignal) => Promise<ResolvedTileSource>;

type ElmPorts = {
    tileSourcesUpdated: {subscribe: (callback: (tileSources: TileSourceEntry[]) => void) => void};
    pageAspectsUpdated : {subscribe : (callback: (aspects: number[]) => void) => void};
    pageLabelsUpdated : {subscribe : (callback: (labels: string[]) => void) => void};
    zoomLevelUpdated : {subscribe : (callback: (zoom: number) => void) => void};
    zoomBy : {subscribe : (callback: (factor: number) => void) => void};
    scrollToIndex : {subscribe : (callback: (index: number) => void) => void};
    filterPreviewUpdated : {subscribe : (callback: (payload: FilterPreviewPayload|null) => void) => void};
    setFullscreen : {subscribe : (callback: (enabled: boolean) => void) => void};
    saveFilteredImage : {subscribe : (callback: () => void) => void};
    layoutModeUpdated : {subscribe : (callback: (mode: string) => void) => void};
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
};

type ElmApp = {
    ports: ElmPorts;
};

type DivaFlags = {
    objectData: string;
    acceptHeaders?: string[];
    showSidebar?: boolean;
    showTitle?: boolean;
    setLanguage?: string;
};

type DivaRoot = HTMLElement&
{
    elmTree?: unknown;
    __divaInstance?: Diva;
};

class Diva
{
    private readonly rootId: string;
    private root: HTMLElement;
    private readonly auth: AuthBrowser;
    private app: ElmApp;
    private mainViewer: any = null;
    private tileSourceResolver!: TileSourceResolver;
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
    private readonly handleZoomChangeBound: (event: Event) => void;
    private readonly handleLoadingChangeBound: (event: Event) => void;
    private readonly handleFullscreenChangeBound: () => void;
    private readonly handleRootClickBound: (event: Event) => void;

    constructor(rootId: string, flags: DivaFlags)
    {
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

        this.handlePageChangeBound = this.handlePageChange.bind(this);
        this.handleZoomChangeBound = this.handleZoomChange.bind(this);
        this.handleLoadingChangeBound = this.handleLoadingChange.bind(this);
        this.handleFullscreenChangeBound = this.handleFullscreenChange.bind(this);
        this.handleRootClickBound = this.handleRootClick.bind(this);

        let langCode = this.detectLanguage();

        this.app = Elm.Main.init({
            node : root,
            flags : {
                rootElementId : rootId,
                objectData : flags.objectData,
                acceptHeaders : flags.acceptHeaders || [],
                showSidebar : flags.showSidebar !== false,
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
        this.bindFullscreenChange();
        this.bindZoomChange();
        this.bindLoadingChange();
    }

    /**
     * Detects the current locale of the browser,
     * and return the first part of it.
     *
     * @returns {string}
     */
    private detectLanguage(): string { return navigator.language.split("-")[0]; }

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
            .subscribe((tileSources: TileSourceEntry[]) => {
                this.auth.registerSources(tileSources);
                this.callViewerMethodWhenReady("setTileSourceResolver", this.tileSourceResolver);
                this.callViewerMethodWhenReady("setTileSources", tileSources);
            });

        this.getPort("pageAspectsUpdated")
            .subscribe((aspects: number[]) => { this.callViewerMethodWhenReady("setPageAspects", aspects); });

        this.getPort("pageLabelsUpdated")
            .subscribe((labels: string[]) => { this.callViewerMethodWhenReady("setPageLabels", labels); });

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
                return;
            }
            this.callViewerMethodWhenReady("setLayoutConfig", config.mode, config.direction);
        });

        this.getPort("layoutModeUpdated")
            .subscribe((mode: string) => { this.callViewerMethod("setLayoutMode", mode); });

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

    public destroy(): void
    {
        this.isDestroyed = true;
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
        this.removeViewerEvent("diva-zoom-change", this.handleZoomChangeBound as EventListener);
        this.removeViewerEvent("diva-loading-change", this.handleLoadingChangeBound as EventListener);
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
    }

    private handleZoomChange(event: Event): void
    {
        const detail = (event as CustomEvent).detail;
        if (!detail || typeof detail.zoom !== "number")
        {
            return;
        }
        this.getPort("zoomChanged").send(detail.zoom);
    }

    private handleLoadingChange(event: Event): void
    {
        const detail = (event as CustomEvent).detail;
        if (!detail || typeof detail.loading !== "boolean")
        {
            return;
        }
        this.getPort("viewerLoadingChanged").send(detail.loading);
    }

    private handleFullscreenChange(): void
    {
        const isFullscreen = Boolean(document.fullscreenElement);
        this.getPort("fullscreenChanged").send(isFullscreen);
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

(window as any).Diva = Diva;
