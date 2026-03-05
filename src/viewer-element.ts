import type * as OpenSeadragonType from "openseadragon";

declare const OpenSeadragon: typeof OpenSeadragonType;

const ZOOM_IN_FACTOR = 1.6
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR
const PAGE_LABEL_TOP_PADDING_PX = 28;
const PAGE_GAP_VIEWPORT_UNITS = 0.06;

class OsdViewer extends HTMLElement
{
    private container: HTMLDivElement|null = null;
    private viewer: OpenSeadragonType.Viewer|null = null;
    private loadToken = 0;
    private tileSources: string[] = [];
    private pageLabels: string[] = [];
    private pageAspects: number[] = [];
    private pageOffsets: number[] = [];
    private pageHeights: number[] = [];
    private pageRowHeights: number[] = [];
    private pageXOffsets: number[] = [];
    private layoutMode: "single"|"spread"|"spread-shift" = "single";
    private viewingDirection: "ltr"|"rtl" = "ltr";
    private hasFitFirstPage = false;
    private loadedIndexes: Set<number> = new Set();
    private loadingIndexes: Set<number> = new Set();
    private loadedItems: Map<number, any> = new Map();
    private pageOverlayElements: Map<number, HTMLDivElement> = new Map();
    private targetIndex: number|null = null;
    private scrollPlaneItem: any = null;
    private isViewportInitialized = false;
    private lastReportedIndex: number|null = null;
    private lastReportedZoom: number|null = null;
    private loadingTimer: number|null = null;
    private isLoading = false;
    private isClamping = false;
    private suppressPageChange = true;
    private suppressZoomChange = true;
    private readonly handleWheelBound: (event: WheelEvent) => void;
    private readonly handleDoubleClickBound: (event: MouseEvent) => void;
    private readonly handleViewportChangeBound: () => void;
    private readonly handleAnimationFinishBound: () => void;
    private scrollbarTrack: HTMLDivElement|null = null;
    private scrollbarThumb: HTMLDivElement|null = null;
    private isScrollbarDragging = false;
    private scrollbarMouseMove: ((e: MouseEvent) => void)|null = null;
    private scrollbarMouseUp: (() => void)|null = null;

    constructor()
    {
        super();
        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleDoubleClickBound = this.handleDoubleClick.bind(this);
        this.handleViewportChangeBound = this.handleViewportChange.bind(this);
        this.handleAnimationFinishBound = this.handleAnimationFinish.bind(this);
    }

    connectedCallback(): void
    {
        this.style.display = "block";
        if (!this.container)
        {
            this.container = document.createElement("div");
            this.container.className = "osd-container";
            this.container.style.width = "100%";
            this.container.style.height = "100%";
            this.container.addEventListener("wheel", this.handleWheelBound, {passive : false, capture : true});
            this.container.addEventListener("dblclick", this.handleDoubleClickBound);
            this.appendChild(this.container);

            this.createScrollbar();
        }
        this.syncViewer();
    }

    disconnectedCallback(): void
    {
        if (this.loadingTimer !== null)
        {
            window.clearTimeout(this.loadingTimer);
            this.loadingTimer = null;
        }
        if (this.container)
        {
            this.container.removeEventListener("wheel", this.handleWheelBound);
            this.container.removeEventListener("dblclick", this.handleDoubleClickBound);
        }
        if (this.scrollbarMouseMove)
        {
            document.removeEventListener("mousemove", this.scrollbarMouseMove);
            this.scrollbarMouseMove = null;
        }
        if (this.scrollbarMouseUp)
        {
            document.removeEventListener("mouseup", this.scrollbarMouseUp);
            this.scrollbarMouseUp = null;
        }
        if (this.viewer)
        {
            this.clearPageOverlays();
            this.viewer.destroy();
            this.viewer = null;
        }
        this.scrollbarTrack = null;
        this.scrollbarThumb = null;
    }

    private syncViewer(): void
    {
        const hasOsd = Boolean((window as any).OpenSeadragon);
        if (!hasOsd || !this.container)
        {
            return;
        }

        if (!this.viewer)
        {
            const options = {
                element : this.container,
                animationTime : 0.8,
                showNavigationControl : false,
                preserveViewport : true,
                visibilityRatio : 0,
                constrainDuringPan : false,
                minZoomLevel : 0.1,
                minZoomImageRatio : 0.1,
                maxZoomPixelRatio : 2,
                defaultZoomLevel : 0,
                sequenceMode : false,
                zoomPerScroll : 1,
                crossOriginPolicy : "Anonymous",
                loadTilesWithAjax : true,
                ajaxWithCredentials : false,
                gestureSettingsTrackpad :
                    {pinchToZoom : true, scrollToZoom : false, flickEnabled : true, dragToPan : true},
                gestureSettingsMouse :
                    {scrollToZoom : false, clickToZoom : false, dblClickToZoom : false, dragToPan : true},
                gestureSettingsTouch : {pinchToZoom : false, dragToPan : true}
            } as any;
            this.viewer = OpenSeadragon(options);
            const viewer = this.viewer;
            viewer.addHandler("pan", this.handleViewportChangeBound);
            viewer.addHandler("zoom", this.handleViewportChangeBound);
            viewer.addHandler("pan", () => this.updateScrollbar());
            viewer.addHandler("zoom", () => this.updateScrollbar());
            viewer.addHandler("animation-finish", this.handleAnimationFinishBound);
        }
    }

    public setLayoutMode(mode: string): void
    {
        const nextMode = mode === "spread" || mode === "spread-shift" ? mode : "single";
        this.applyLayoutChange({mode : nextMode});
    }

    public setViewingDirection(direction: string): void
    {
        const nextDirection = direction === "rtl" ? "rtl" : "ltr";
        this.applyLayoutChange({direction : nextDirection});
    }

    public setLayoutConfig(mode: string, direction: string): void
    {
        const nextMode = mode === "spread" || mode === "spread-shift" ? mode : "single";
        const nextDirection = direction === "rtl" ? "rtl" : "ltr";
        this.applyLayoutChange({mode : nextMode, direction : nextDirection});
    }

    public setTileSources(tileSources: string[]): void
    {
        if (!Array.isArray(tileSources) || tileSources.length === 0)
        {
            return;
        }

        this.syncViewer();
        this.resetTileSources(tileSources);
    }

    public setPageLabels(labels: string[]): void
    {
        if (!Array.isArray(labels))
        {
            return;
        }

        this.pageLabels = labels;
        this.pageOverlayElements.forEach((_element, index) => {
            this.addOrUpdatePageOverlay(index);
        });
    }

    private resetTileSources(tileSources: string[]): void
    {
        if (!this.viewer)
        {
            return;
        }
        // OSD 6 keeps more internal loader/cache state; close() clears world +
        // queues safely.
        if (typeof this.viewer.close === "function")
        {
            this.viewer.close();
        }
        else
        {
            this.viewer.world.removeAll();
        }
        this.loadToken += 1;
        this.tileSources = tileSources;
        this.hasFitFirstPage = false;
        this.isViewportInitialized = false;
        this.loadedIndexes.clear();
        this.loadingIndexes.clear();
        this.loadedItems.clear();
        this.clearPageOverlays();
        this.targetIndex = null;
        this.clearScrollPlane();
        this.buildOffsets();
        this.ensureScrollPlane();
        this.resetLoadingState();
        this.suppressPageChange = true;
        this.suppressZoomChange = true;

        this.maybeLoadMore();
    }

    private handleViewportChange(): void
    {
        if (this.isClamping)
        {
            return;
        }
        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }
        this.maybeLoadMore(viewport);
        this.maybeEmitPageChange(viewport);
        this.clampTop(viewport);
        this.clampBottom(viewport);
    }

    private handleAnimationFinish(): void
    {
        this.updateScrollbar();
        this.maybeEmitZoomChange();
    }

    private maybeLoadMore(viewport?: OpenSeadragonType.Viewport): void
    {
        if (this.tileSources.length === 0)
        {
            return;
        }

        const vp = viewport ?? this.viewer?.viewport;
        if (!vp)
        {
            return;
        }

        const bounds = vp.getBounds(true);
        const buffer = bounds.height * 1.5;
        const viewTop = Math.max(0, bounds.y - buffer);
        const viewBottom = bounds.y + bounds.height + buffer;

        const range = this.indicesForRange(viewTop, viewBottom);
        if (!range)
        {
            return;
        }

        const start = range[0];
        const end = range[1];
        let index = start;
        while (index <= end)
        {
            this.ensurePageLoaded(index);
            index += 1;
        }

        if (this.targetIndex !== null)
        {
            this.ensurePageLoaded(this.targetIndex);
        }
    }

    private ensurePageLoaded(index: number): void
    {
        if (index < 0 || index >= this.tileSources.length || index >= this.pageOffsets.length)
        {
            return;
        }

        if (this.loadedIndexes.has(index) || this.loadingIndexes.has(index))
        {
            return;
        }

        this.loadTile(index);
    }

    private loadTile(index: number): void
    {
        if (!this.viewer)
        {
            return;
        }

        const token = this.loadToken;
        const tileSource = this.tileSources[index];

        this.loadingIndexes.add(index);
        this.updateLoadingState();
        const yOffset = this.pageOffsets[index] || 0;
        const xOffset = this.pageXOffsets[index] || 0;
        const height = this.pageHeights[index] || 1;

        this.viewer.addTiledImage({
            tileSource,
            x : xOffset,
            y : yOffset,
            width : 1,
            success : (event: any) => {
                if (token !== this.loadToken)
                {
                    return;
                }
                const item = event.item;
                item.setPosition(new OpenSeadragon.Point(xOffset, yOffset), true);
                item.setWidth(1, true);
                item.setHeight(height, true);
                this.loadedIndexes.add(index);
                this.loadedItems.set(index, item);
                this.addOrUpdatePageOverlay(index);
                this.loadingIndexes.delete(index);
                this.updateLoadingState();
                if (!this.hasFitFirstPage)
                {
                    this.hasFitFirstPage = true;
                    const viewer = this.viewer;
                    if (!viewer || !viewer.viewport)
                    {
                        return;
                    }
                    const isSingleCanvas = this.isSingleCanvasLayout();
                    const bounds = isSingleCanvas
                        ? item.getBounds()
                        : (this.isSpreadMode() ? this.getRowBounds(index) : item.getBounds());
                    viewer.viewport.fitBounds(bounds, true);
                    if (!isSingleCanvas)
                    {
                        viewer.viewport.zoomBy(0.95, viewer.viewport.getCenter(true), true);
                    }
                    this.alignTopAfterFit();
                    viewer.viewport.applyConstraints();
                    this.isViewportInitialized = true;
                    this.lockHorizontalPan();
                    this.recenterAfterFit();
                    this.flushInitialPageChange();
                    this.flushInitialZoomChange();
                }
                if (this.targetIndex === index)
                {
                    this.targetIndex = null;
                }
                this.maybeLoadMore();
            },
            error : () => {
                if (token !== this.loadToken)
                {
                    return;
                }
                this.loadingIndexes.delete(index);
                this.updateLoadingState();
                this.maybeLoadMore();
            }
        });
    }

    public setPageAspects(aspects: number[]): void
    {
        if (!Array.isArray(aspects))
        {
            return;
        }

        this.pageAspects = aspects.filter((value) => value > 0);
        this.buildOffsets();
        this.updateLoadedItemPositions();
        this.ensureScrollPlane();
        this.maybeLoadMore();
    }

    private buildOffsets(): void
    {
        const count = this.tileSources.length > 0 ? this.tileSources.length : this.pageAspects.length;
        this.pageOffsets = new Array(count);
        this.pageHeights = new Array(count);
        this.pageRowHeights = new Array(count);
        this.pageXOffsets = new Array(count);

        if (this.isSpreadMode())
        {
            this.buildSpreadOffsets(count);
        }
        else
        {
            this.buildSingleOffsets(count);
        }
    }

    private buildSingleOffsets(count: number): void
    {
        const gap = PAGE_GAP_VIEWPORT_UNITS;
        let current = 0;
        let fallback = this.pageAspects[0] || 1;

        for (let index = 0; index < count; index += 1)
        {
            const height = this.pageAspects[index] || fallback;
            fallback = height;
            this.pageOffsets[index] = current;
            this.pageHeights[index] = height;
            this.pageRowHeights[index] = height;
            this.pageXOffsets[index] = 0;
            current += height + gap;
        }
    }

    private buildSpreadOffsets(count: number): void
    {
        const gap = PAGE_GAP_VIEWPORT_UNITS;
        const isRtl = this.viewingDirection === "rtl";
        let current = 0;
        let index = 0;
        let fallback = this.pageAspects[0] || 1;

        if (this.layoutMode === "spread-shift" && count > 0)
        {
            const height = this.pageAspects[0] || fallback;
            fallback = height;
            this.pageOffsets[0] = current;
            this.pageHeights[0] = height;
            this.pageRowHeights[0] = height;
            this.pageXOffsets[0] = isRtl ? 0 : 1;
            current += height + gap;
            index = 1;
        }

        while (index < count)
        {
            const leftHeight = this.pageAspects[index] || fallback;
            const rightIndex = index + 1;
            const rightHeight = rightIndex < count ? this.pageAspects[rightIndex] || leftHeight : leftHeight;
            fallback = rightHeight;

            const rowHeight = Math.max(leftHeight, rightHeight);

            this.pageOffsets[index] = current;
            this.pageHeights[index] = leftHeight;
            this.pageRowHeights[index] = rowHeight;
            this.pageXOffsets[index] = isRtl ? 1 : 0;

            if (rightIndex < count)
            {
                this.pageOffsets[rightIndex] = current;
                this.pageHeights[rightIndex] = rightHeight;
                this.pageRowHeights[rightIndex] = rowHeight;
                this.pageXOffsets[rightIndex] = isRtl ? 0 : 1;
            }

            current += rowHeight + gap;
            index += 2;
        }
    }

    private updateLoadedItemPositions(): void
    {
        if (!this.viewer)
        {
            return;
        }

        this.loadedItems.forEach((item, index) => {
            const yOffset = this.pageOffsets[index];
            const height = this.pageHeights[index];
            const xOffset = this.pageXOffsets[index];
            item.setPosition(new OpenSeadragon.Point(xOffset, yOffset), true);
            item.setWidth(1, true);
            item.setHeight(height, true);
            this.addOrUpdatePageOverlay(index);
        });
    }

    private addOrUpdatePageOverlay(index: number): void
    {
        if (!this.viewer)
        {
            return;
        }

        let element = this.pageOverlayElements.get(index);
        const isRightAligned = index % 2 === 0;
        if (!element)
        {
            element = document.createElement("div");
            element.className = "diva-page-overlay-label";
            element.style.pointerEvents = "none";
            element.style.color = "#ffffff";
            element.style.background = "transparent";
            element.style.padding = "0";
            element.style.borderRadius = "0";
            element.style.fontSize = "12px";
            element.style.fontWeight = "600";
            element.style.lineHeight = "1.2";
            element.style.whiteSpace = "nowrap";
            element.style.paddingBottom = "6px";
            element.style.paddingLeft = isRightAligned ? "0" : "12px";
            element.style.paddingRight = isRightAligned ? "12px" : "0";
            this.pageOverlayElements.set(index, element);
        }
        element.textContent = this.pageLabels[index] || `Page ${index + 1}`;

        const xOffset = (this.pageXOffsets[index] || 0) + (isRightAligned ? 1 : 0);
        const yOffset = this.pageOffsets[index] || 0;
        try
        {
            this.viewer.removeOverlay(element);
        }
        catch (_error)
        {
            // overlay may not yet exist in viewer; safe to ignore.
        }
        this.viewer.addOverlay({
            element,
            location : new OpenSeadragon.Point(xOffset, yOffset),
            placement : isRightAligned ? OpenSeadragon.Placement.BOTTOM_RIGHT : OpenSeadragon.Placement.BOTTOM_LEFT
        });
    }

    private clearPageOverlays(): void
    {
        if (this.viewer)
        {
            this.pageOverlayElements.forEach((element) => {
                try
                {
                    this.viewer?.removeOverlay(element);
                }
                catch (_error)
                {
                    // ignore missing overlay errors during teardown/reset.
                }
                element.remove();
            });
        }
        this.pageOverlayElements.clear();
    }

    private ensureScrollPlane(): void
    {
        if (!this.viewer || this.pageOffsets.length === 0)
        {
            return;
        }

        const totalHeight = this.getTotalHeight();
        const layoutWidth = this.isSpreadMode() ? 2 : 1;
        if (this.scrollPlaneItem)
        {
            this.scrollPlaneItem.setPosition(new OpenSeadragon.Point(0, 0), true);
            this.scrollPlaneItem.setWidth(layoutWidth, true);
            this.scrollPlaneItem.setHeight(totalHeight, true);
            return;
        }

        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="100%" height="100%" fill="transparent"/></svg>`;
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        this.viewer.addTiledImage({
            tileSource : {type : "image", url},
            x : 0,
            y : 0,
            width : layoutWidth,
            success : (event: any) => {
                const item = event.item;
                item.setOpacity(0);
                item.setPosition(new OpenSeadragon.Point(0, 0), true);
                item.setWidth(layoutWidth, true);
                item.setHeight(totalHeight, true);
                this.scrollPlaneItem = item;
            }
        });
    }

    private clearScrollPlane(): void
    {
        if (!this.viewer || !this.scrollPlaneItem)
        {
            return;
        }

        this.viewer.world.removeItem(this.scrollPlaneItem);
        this.scrollPlaneItem = null;
    }

    private indicesForRange(start: number, end: number): [ number, number ]|null
    {
        if (this.pageOffsets.length === 0)
        {
            return null;
        }

        const startIndex = this.findIndexForOffset(start);
        const endIndex = this.getRowEndIndex(this.findIndexForOffset(end));
        return [ startIndex, endIndex ];
    }

    private findIndexForOffset(offset: number): number
    {
        let low = 0;
        let high = this.pageOffsets.length - 1;

        while (low <= high)
        {
            const mid = Math.floor((low + high) / 2);
            const midOffset = this.pageOffsets[mid];
            const midHeight = this.pageRowHeights[mid] || this.pageHeights[mid] || 1;
            if (offset < midOffset)
            {
                high = mid - 1;
            }
            else if (offset > midOffset + midHeight)
            {
                low = mid + 1;
            }
            else
            {
                return this.getRowStartIndex(mid);
            }
        }

        if (low >= this.pageOffsets.length)
        {
            return this.pageOffsets.length - 1;
        }

        const clamped = Math.max(0, low);
        return this.getRowStartIndex(clamped);
    }

    public scrollToOffset(offset: number): void
    {
        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        const bounds = viewport.getBounds(true);
        const width = this.isSpreadMode() ? 2 : 1;
        const rect = new OpenSeadragon.Rect(0, offset, width, bounds.height);

        viewport.fitBounds(rect, true);
    }

    public scrollToIndex(index: number): void
    {
        if (index < 0 || index >= this.tileSources.length || index >= this.pageOffsets.length)
        {
            return;
        }

        const offset = this.pageOffsets[index];
        this.scrollToOffset(offset);
        this.targetIndex = index;
        this.ensurePageLoaded(index);
        this.lastReportedIndex = index;
        this.emitCustomEvent("diva-page-change", {index});
    }

    public setZoomLevel(zoom: number): void
    {
        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        const center = viewport.getCenter(true);
        viewport.zoomTo(zoom, center, false);
        viewport.applyConstraints();
    }

    public zoomBy(factor: number): void
    {
        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        const center = viewport.getCenter(true);
        viewport.zoomBy(factor, center, false);
        viewport.applyConstraints();
    }

    private handleDoubleClick(event: MouseEvent): void
    {
        event.preventDefault();

        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        // matches the factor set in the elm config.
        const zoomBy = event.shiftKey ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;
        const webPoint = new OpenSeadragon.Point(event.clientX, event.clientY);
        const viewportPoint = viewport.pointFromPixel(webPoint);
        const nextZoom = viewport.getZoom() * zoomBy;

        viewport.zoomTo(nextZoom, viewportPoint, false);
        viewport.applyConstraints();
    }

    private handleWheel(event: WheelEvent): void
    {
        if (!this.container)
        {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        const rect = this.container.getBoundingClientRect();
        const deltaY = event.deltaY || 0;
        const speed = 0.75;
        const panY = rect.height > 0 ? (deltaY / rect.height) * speed : 0;

        const center = viewport.getCenter(true);
        const nextCenter = new OpenSeadragon.Point(this.getCenterX(), center.y + panY);

        viewport.panTo(nextCenter, true);
        this.recenterBoundsX();
        this.clampTop();
        this.clampBottom();
        this.maybeEmitPageChange();
    }

    private lockHorizontalPan(): void
    {
        if (!this.isViewportInitialized)
        {
            return;
        }

        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        const center = viewport.getCenter(true);
        viewport.panTo(new OpenSeadragon.Point(this.getCenterX(), center.y), true);
        viewport.applyConstraints();
    }

    private recenterAfterFit(): void
    {
        if (!this.viewer)
        {
            return;
        }

        const handler = () => {
            if (this.viewer)
            {
                this.viewer.removeHandler("animation-finish", handler);
            }
            this.recenterBoundsX();
        };

        if (typeof this.viewer.addOnceHandler == "function")
        {
            this.viewer.addOnceHandler("animation-finish", handler);
        }
        else
        {
            this.viewer.addHandler("animation-finish", handler);
        }
    }

    private recenterBoundsX(): void
    {
        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        const center = viewport.getCenter(true);
        const targetX = this.getCenterX();
        if (Math.abs(center.x - targetX) < 0.0005)
        {
            return;
        }

        viewport.panTo(new OpenSeadragon.Point(targetX, center.y), true);
        viewport.applyConstraints();
    }

    private clampTop(viewport?: OpenSeadragonType.Viewport): void
    {
        const vp = viewport ?? this.viewer?.viewport;
        if (!vp)
        {
            return;
        }

        const bounds = vp.getBounds(true);
        const topPadding = this.getTopPaddingViewport(bounds.height);
        const minTop = -topPadding;
        if (bounds.y >= minTop)
        {
            return;
        }

        const clampedCenterY = (bounds.height / 2) + minTop;
        this.isClamping = true;
        vp.panTo(new OpenSeadragon.Point(this.getCenterX(), clampedCenterY), true);
        vp.applyConstraints();
        this.isClamping = false;
    }

    private clampBottom(viewport?: OpenSeadragonType.Viewport): void
    {
        const vp = viewport ?? this.viewer?.viewport;
        if (!vp)
        {
            return;
        }

        if (this.pageOffsets.length === 0)
        {
            return;
        }

        const totalHeight = this.getTotalHeight();

        const bounds = vp.getBounds(true);
        const containerHeight = this.container?.getBoundingClientRect().height || 1;
        const paddingViewport = (20 / containerHeight) * bounds.height;
        const maxBottom = totalHeight + paddingViewport;

        const bottomEdge = bounds.y + bounds.height;

        if (bottomEdge <= maxBottom)
        {
            return;
        }

        const clampedCenterY = maxBottom - bounds.height / 2;
        this.isClamping = true;
        vp.panTo(new OpenSeadragon.Point(this.getCenterX(), clampedCenterY), true);
        vp.applyConstraints();
        this.isClamping = false;
    }

    private maybeEmitPageChange(viewport?: OpenSeadragonType.Viewport): void
    {
        if (this.suppressPageChange || this.isScrollbarDragging)
        {
            return;
        }
        if (this.pageOffsets.length === 0)
        {
            return;
        }

        const vp = viewport ?? this.viewer?.viewport;
        if (!vp)
        {
            return;
        }

        const center = vp.getCenter(true);
        const index = this.findIndexForOffset(center.y);
        if (this.lastReportedIndex === index)
        {
            return;
        }

        this.lastReportedIndex = index;
        this.emitCustomEvent("diva-page-change", {index});
    }

    private emitPageChangeInstant(): void
    {
        if (this.pageOffsets.length === 0)
        {
            return;
        }

        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        const center = viewport.getCenter(true);
        const index = this.findIndexForOffset(center.y);
        this.lastReportedIndex = index;
        this.emitCustomEvent("diva-page-change", {index, instant : true});
    }

    private flushInitialPageChange(): void
    {
        if (this.pageOffsets.length === 0)
        {
            this.suppressPageChange = false;
            return;
        }

        if (!this.viewer || !this.viewer.viewport)
        {
            return;
        }

        const center = this.viewer.viewport.getCenter(true);
        const index = this.findIndexForOffset(center.y);
        this.lastReportedIndex = index;
        this.suppressPageChange = false;
        this.emitCustomEvent("diva-page-change", {index});
    }

    private maybeEmitZoomChange(viewport?: OpenSeadragonType.Viewport): void
    {
        if (this.suppressZoomChange)
        {
            return;
        }
        const vp = viewport ?? this.viewer?.viewport;
        if (!vp)
        {
            return;
        }

        const zoom = vp.getZoom(true);
        if (this.lastReportedZoom !== null && Math.abs(this.lastReportedZoom - zoom) < 0.0001)
        {
            return;
        }

        this.lastReportedZoom = zoom;
        this.emitCustomEvent("diva-zoom-change", {zoom});
    }

    private flushInitialZoomChange(): void
    {
        const viewport = this.viewer?.viewport;
        if (!viewport)
        {
            return;
        }

        const zoom = viewport.getZoom(true);
        this.lastReportedZoom = zoom;
        this.suppressZoomChange = false;
        this.emitCustomEvent("diva-zoom-change", {zoom});
    }

    private alignTopAfterFit(): void
    {
        if (!this.viewer)
        {
            return;
        }

        const viewport = this.viewer.viewport;
        if (!viewport)
        {
            return;
        }

        const bounds = viewport.getBounds(true);
        const topPadding = this.getTopPaddingViewport(bounds.height);
        const minTop = -topPadding;
        if (bounds.y <= minTop)
        {
            return;
        }

        const center = viewport.getCenter(true);
        viewport.panTo(new OpenSeadragon.Point(center.x, (bounds.height / 2) + minTop), true);
        viewport.applyConstraints();
    }

    private getTopPaddingViewport(viewportHeight: number): number
    {
        const containerHeight = this.container?.getBoundingClientRect().height || 1;
        return (PAGE_LABEL_TOP_PADDING_PX / containerHeight) * viewportHeight;
    }

    private resetLoadingState(): void
    {
        if (this.loadingTimer !== null)
        {
            window.clearTimeout(this.loadingTimer);
            this.loadingTimer = null;
        }
        this.isLoading = false;
        this.emitCustomEvent("diva-loading-change", {loading : false});
    }

    private updateLoadingState(): void
    {
        const shouldLoad = this.loadingIndexes.size > 0;

        if (shouldLoad)
        {
            if (this.isLoading || this.loadingTimer !== null)
            {
                return;
            }
            this.loadingTimer = window.setTimeout(() => {
                this.loadingTimer = null;
                if (this.loadingIndexes.size > 0 && !this.isLoading)
                {
                    this.isLoading = true;
                    this.emitCustomEvent("diva-loading-change", {loading : true});
                }
            }, 300);
            return;
        }

        if (this.loadingTimer !== null)
        {
            window.clearTimeout(this.loadingTimer);
            this.loadingTimer = null;
        }

        if (this.isLoading)
        {
            this.isLoading = false;
            this.emitCustomEvent("diva-loading-change", {loading : false});
        }
    }

    private applyLayoutChange(next: {mode?: "single"|"spread"|"spread-shift"; direction?: "ltr" | "rtl"}): void
    {
        const nextMode = next.mode ?? this.layoutMode;
        const nextDirection = next.direction ?? this.viewingDirection;
        if (this.layoutMode === nextMode && this.viewingDirection === nextDirection)
        {
            return;
        }

        let anchorIndex: number|null = null;
        const viewport = this.viewer?.viewport;
        if (viewport && this.pageOffsets.length > 0)
        {
            const bounds = viewport.getBounds(true);
            const anchorOffset = bounds.y + (bounds.height * 0.5);
            anchorIndex = this.findIndexForOffset(anchorOffset);
        }
        else if (this.lastReportedIndex !== null)
        {
            anchorIndex = this.lastReportedIndex;
        }

        this.layoutMode = nextMode;
        this.viewingDirection = nextDirection;
        this.buildOffsets();
        this.updateLoadedItemPositions();
        this.ensureScrollPlane();

        if (anchorIndex !== null)
        {
            const clampedAnchor = Math.max(0, Math.min(anchorIndex, this.pageOffsets.length - 1));
            this.scrollToIndex(clampedAnchor);
        }
        else
        {
            this.lockHorizontalPan();
            this.recenterAfterFit();
        }

        this.maybeLoadMore();
    }

    private emitCustomEvent(name: string, detail: Record<string, any>): void
    {
        this.dispatchEvent(new CustomEvent(name, {detail}));
    }

    private getCenterX(): number { return this.isSpreadMode() ? 1 : 0.5; }

    private isSingleCanvasLayout(): boolean
    {
        return this.tileSources.length === 1 && this.pageOffsets.length === 1;
    }

    private getTotalHeight(): number
    {
        const lastIndex = this.pageOffsets.length - 1;
        return this.pageOffsets[lastIndex] + (this.pageRowHeights[lastIndex] || 1);
    }

    private getRowBounds(index: number): OpenSeadragonType.Rect
    {
        const yOffset = this.pageOffsets[index] || 0;
        const rowHeight = this.pageRowHeights[index] || this.pageHeights[index] || 1;
        const width = this.isSpreadMode() ? 2 : 1;
        return new OpenSeadragon.Rect(0, yOffset, width, rowHeight);
    }

    private isSpreadMode(): boolean { return this.layoutMode !== "single"; }

    private getRowStartIndex(index: number): number
    {
        if (!this.isSpreadMode())
        {
            return index;
        }

        if (this.layoutMode === "spread-shift")
        {
            if (index === 0)
            {
                return 0;
            }
            return index % 2 === 1 ? index : index - 1;
        }

        return index - (index % 2);
    }

    private getRowEndIndex(startIndex: number): number
    {
        const maxIndex = this.pageOffsets.length - 1;
        if (!this.isSpreadMode())
        {
            return startIndex;
        }

        if (this.layoutMode === "spread-shift" && startIndex === 0)
        {
            return 0;
        }

        return Math.min(startIndex + 1, maxIndex);
    }

    private createScrollbar(): void
    {
        if (!this.container)
        {
            return;
        }

        this.scrollbarTrack = document.createElement("div");
        this.scrollbarTrack.className = "diva-scrollbar-track";

        this.scrollbarThumb = document.createElement("div");
        this.scrollbarThumb.className = "diva-scrollbar-thumb";

        this.scrollbarTrack.appendChild(this.scrollbarThumb);
        this.container.appendChild(this.scrollbarTrack);

        this.setupScrollbarDrag();
        this.setupScrollbarTrackClick();
    }

    private updateScrollbar(): void
    {
        if (!this.viewer || !this.scrollbarThumb || !this.scrollbarTrack)
        {
            return;
        }

        if (this.pageOffsets.length === 0)
        {
            return;
        }

        const bounds = this.viewer.viewport.getBounds(true);
        const trackHeight = this.scrollbarTrack.clientHeight;

        const totalHeight = this.getTotalHeight();
        const viewportHeight = bounds.height;
        const scrollTop = bounds.y;

        const thumbHeight = Math.max(30, (viewportHeight / totalHeight) * trackHeight);

        const maxScroll = totalHeight - viewportHeight;
        const scrollProgress = maxScroll > 0 ? Math.max(0, Math.min(1, scrollTop / maxScroll)) : 0;
        const thumbTop = scrollProgress * (trackHeight - thumbHeight);

        this.scrollbarThumb.style.height = `${thumbHeight}px`;
        this.scrollbarThumb.style.top = `${Math.max(0, thumbTop)}px`;
    }

    private setupScrollbarDrag(): void
    {
        if (!this.scrollbarThumb || !this.scrollbarTrack)
        {
            return;
        }

        let isDragging = false;
        let startY = 0;
        let startThumbTop = 0;

        const onMouseDown = (e: MouseEvent): void => {
            isDragging = true;
            this.isScrollbarDragging = true;
            startY = e.clientY;
            startThumbTop = this.scrollbarThumb?.offsetTop || 0;
            e.preventDefault();
            e.stopPropagation();
        };

        const onMouseMove = (e: MouseEvent): void => {
            if (!isDragging || !this.scrollbarTrack || !this.scrollbarThumb || !this.viewer)
            {
                return;
            }

            const deltaY = e.clientY - startY;
            const newThumbTop = startThumbTop + deltaY;
            const trackHeight = this.scrollbarTrack.clientHeight;
            const thumbHeight = this.scrollbarThumb.clientHeight;

            const clampedThumbTop = Math.max(0, Math.min(newThumbTop, trackHeight - thumbHeight));
            const scrollProgress = (trackHeight - thumbHeight) > 0 ? clampedThumbTop / (trackHeight - thumbHeight) : 0;

            const totalHeight = this.getTotalHeight();
            const viewportHeight = this.viewer.viewport.getBounds(true).height;
            const maxScroll = totalHeight - viewportHeight;
            const newScrollY = scrollProgress * maxScroll;

            this.scrollToOffset(newScrollY);
        };

        const onMouseUp = (): void => {
            if (isDragging)
            {
                isDragging = false;
                this.isScrollbarDragging = false;
                this.emitPageChangeInstant();
            }
        };

        this.scrollbarMouseMove = onMouseMove;
        this.scrollbarMouseUp = onMouseUp;
        this.scrollbarThumb.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    private setupScrollbarTrackClick(): void
    {
        if (!this.scrollbarTrack)
        {
            return;
        }

        this.scrollbarTrack.addEventListener("click", (e: MouseEvent) => {
            if (e.target === this.scrollbarThumb || !this.viewer)
            {
                return;
            }

            const rect = this.scrollbarTrack?.getBoundingClientRect();
            if (!rect)
            {
                return;
            }

            const clickY = e.clientY - rect.top;
            const trackHeight = rect.height;

            const scrollProgress = Math.max(0, Math.min(1, clickY / trackHeight));

            const totalHeight = this.getTotalHeight();
            const viewportHeight = this.viewer.viewport.getBounds(true).height;
            const maxScroll = totalHeight - viewportHeight;
            const newScrollY = scrollProgress * maxScroll;

            this.scrollToOffset(newScrollY);
        });
    }
}

customElements.define("osd-viewer", OsdViewer);
