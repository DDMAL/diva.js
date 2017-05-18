const debug = require('debug')('diva:Renderer');
const debugPaints = require('debug')('diva:Renderer:paints');

import { elt, setAttributes } from './utils/elt';
import CompositeImage from './composite-image';
import DocumentLayout from './document-layout';
import ImageCache from './image-cache';
import ImageRequestHandler from './image-request-handler';
import InterpolateAnimation from './interpolate-animation';

const REQUEST_DEBOUNCE_INTERVAL = 250;

export default class Renderer
{
    constructor (options, hooks)
    {
        this._viewport = options.viewport;
        this._outerElement = options.outerElement;
        this._documentElement = options.innerElement;

        this._hooks = hooks || {};

        this._canvas = elt('canvas', { class: 'diva-viewer-canvas' });
        this._ctx = this._canvas.getContext('2d');

        this.layout = null;

        this._sourceResolver = null;
        this._renderedPages = null;
        this._config = null;
        this._zoomLevel = null;
        this._compositeImages = null;
        this._renderedTiles = null;
        this._animation = null;

        // FIXME(wabain): What level should this be maintained at?
        // Diva global?
        this._cache = new ImageCache();
        this._pendingRequests = {};
    }

    static getCompatibilityErrors ()
    {
        if (typeof HTMLCanvasElement !== 'undefined')
        {
            return null;
        }

        return [
            'Your browser lacks support for the ', elt('pre', 'canvas'),
            ' element. Please upgrade your browser.'
        ];
    }

    load (config, viewportPosition, sourceResolver)
    {
        this._clearAnimation();

        if (this._hooks.onViewWillLoad)
        {
            this._hooks.onViewWillLoad();
        }

        this._sourceResolver = sourceResolver;
        this._config = config;
        this._compositeImages = {};
        this._setLayoutToZoomLevel(viewportPosition.zoomLevel);

        // FIXME(wabain): Remove this when there's more confidence the check shouldn't be needed
        if (!this.layout.getPageInfo(viewportPosition.anchorPage))
        {
            throw new Error('invalid page: ' + viewportPosition.anchorPage);
        }

        if (this._canvas.width !== this._viewport.width || this._canvas.height !== this._viewport.height)
        {
            debug('Canvas dimension change: (%s, %s) -> (%s, %s)', this._canvas.width, this._canvas.height,
                this._viewport.width, this._viewport.height);

            this._canvas.width = this._viewport.width;
            this._canvas.height = this._viewport.height;
        }
        else
        {
            debug('Reload, no size change');
        }

        // FIXME: What hooks should be called here?
        this.goto(viewportPosition.anchorPage, viewportPosition.verticalOffset, viewportPosition.horizontalOffset);

        if (this._canvas.parentNode !== this._outerElement)
        {
            this._outerElement.insertBefore(this._canvas, this._outerElement.firstChild);
        }

        if (this._hooks.onViewDidLoad)
        {
            this._hooks.onViewDidLoad();
        }
    }

    _setViewportPosition (viewportPosition)
    {
        if (viewportPosition.zoomLevel !== this._zoomLevel)
        {
            if (this._zoomLevel === null)
            {
                throw new TypeError('The current view is not zoomable');
            }
            else if (viewportPosition.zoomLevel === null)
            {
                throw new TypeError('The current view requires a zoom level');
            }

            this._setLayoutToZoomLevel(viewportPosition.zoomLevel);
        }

        this._goto(viewportPosition.anchorPage, viewportPosition.verticalOffset, viewportPosition.horizontalOffset);
    }

    _setLayoutToZoomLevel (zoomLevel)
    {
        this.layout = new DocumentLayout(this._config, zoomLevel);
        this._zoomLevel = zoomLevel;

        setAttributes(this._documentElement, {
            style: {
                height: this.layout.dimensions.height + 'px',
                width: this.layout.dimensions.width + 'px'
            }
        });

        this._viewport.setInnerDimensions(this.layout.dimensions);
    }

    adjust (direction)
    {
        this._clearAnimation();

        this._render();

        if (this._hooks.onViewDidUpdate)
        {
            this._hooks.onViewDidUpdate(this._renderedPages.slice(), null);
        }
    }

    _render ()
    {
        const newRenderedPages = [];
        this.layout.pageGroups.forEach((group) =>
        {
            if (!this._viewport.intersectsRegion(group.region))
            {
                return;
            }

            const visiblePages = group.pages
                .filter(function (page)
                {
                    return this.isPageVisible(page.index);
                }, this)
                .map(page => page.index);

            newRenderedPages.push.apply(newRenderedPages, visiblePages);
        }, this);

        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._paintOutline(newRenderedPages);

        newRenderedPages.forEach((pageIndex) =>
        {
            if (!this._compositeImages[pageIndex])
            {
                const page = this.layout.getPageInfo(pageIndex);
                const zoomLevels = this._sourceResolver.getAllZoomLevelsForPage(page);
                const composite = new CompositeImage(zoomLevels);
                composite.updateFromCache(this._cache);
                this._compositeImages[pageIndex] = composite;
            }
        }, this);

        this._initiateTileRequests(newRenderedPages);

        const changes = findChanges(this._renderedPages || [], newRenderedPages);

        changes.removed.forEach((pageIndex) =>
        {
            delete this._compositeImages[pageIndex];
        }, this);

        this._renderedPages = newRenderedPages;
        this._paint();

        if (this._hooks.onPageWillLoad)
        {
            changes.added.forEach((pageIndex) =>
            {
                this._hooks.onPageWillLoad(pageIndex);
            }, this);
        }
    }

    _paint ()
    {
        debug('Repainting');

        const renderedTiles = [];

        this._renderedPages.forEach(function (pageIndex)
        {
            this._compositeImages[pageIndex].getTiles(this._zoomLevel).forEach((source) =>
            {
                const scaled = getScaledTileRecord(source, this._zoomLevel);

                if (this._isTileVisible(pageIndex, scaled))
                {
                    renderedTiles.push(source.url);
                    this._drawTile(pageIndex, scaled, this._cache.get(source.url));
                }
            }, this);
            this._hooks.onVisibleTilesDidLoad(pageIndex, this._zoomLevel);
        }, this);

        const cache = this._cache;

        const changes = findChanges(this._renderedTiles || [], renderedTiles);

        changes.added.forEach(url =>
        {
            cache.acquire(url);
        });

        changes.removed.forEach(url =>
        {
            cache.release(url);
        });

        if (changes.removed)
        {
            // FIXME: Should only need to update the composite images
            // for which tiles were removed
            this._renderedPages.forEach((pageIndex) =>
            {
                this._compositeImages[pageIndex].updateFromCache(this._cache);
            }, this);
        }

        this._renderedTiles = renderedTiles;
    }

    // Paint a page outline while the tiles are loading.
    _paintOutline (pages)
    {
        pages.forEach(function (pageIndex)
        {
            const pageInfo = this.layout.getPageInfo(pageIndex);
            const pageOffset = this._getImageOffset(pageIndex);

            // Ensure the document is drawn to the center of the viewport
            const viewportPaddingX = Math.max(0, (this._viewport.width - this.layout.dimensions.width) / 2);
            const viewportPaddingY = Math.max(0, (this._viewport.height - this.layout.dimensions.height) / 2);

            const viewportOffsetX = pageOffset.left - this._viewport.left + viewportPaddingX;
            const viewportOffsetY = pageOffset.top - this._viewport.top + viewportPaddingY;

            const destXOffset = viewportOffsetX < 0 ? -viewportOffsetX : 0;
            const destYOffset = viewportOffsetY < 0 ? -viewportOffsetY : 0;

            const canvasX = Math.max(0, viewportOffsetX);
            const canvasY = Math.max(0, viewportOffsetY);

            const destWidth = pageInfo.dimensions.width - destXOffset;
            const destHeight = pageInfo.dimensions.height - destYOffset;

            this._ctx.strokeStyle = '#AAA';
            // In order to get a 1px wide line using strokes, we need to start at a 'half pixel'
            this._ctx.strokeRect(canvasX + 0.5, canvasY + 0.5, destWidth, destHeight);
        }, this);
    }

    // This method should be sent all visible pages at once because it will initiate
    // all image requests and cancel any remaining image requests. In the case that
    // a request is ongoing and the tile is still visible in the viewport, the old request
    // is kept active instead of restarting it. The image requests are given a timeout
    // before loading in order to debounce them and have a small reaction time
    // to cancel them and avoid useless requests.
    _initiateTileRequests (pages)
    {
        // Only requests in this object are kept alive, since all others are not visible in the viewport
        const newPendingRequests = {};

        // Used later as a closure to initiate the image requests with the right source and pageIndex
        const initiateRequest = (source, pageIndex) =>
        {
            const composite = this._compositeImages[pageIndex];

            newPendingRequests[source.url] = new ImageRequestHandler({
                url: source.url,
                timeoutTime: REQUEST_DEBOUNCE_INTERVAL,
                load: img =>
                {
                    delete this._pendingRequests[source.url];
                    this._cache.put(source.url, img);

                    // Awkward way to check for updates
                    if (composite === this._compositeImages[pageIndex])
                    {
                        composite.updateWithLoadedUrls([source.url]);

                        if (this._isTileForSourceVisible(pageIndex, source))
                        {
                            this._paint();
                        }
                        else
                        {
                            debugPaints('Page %s, tile %s no longer visible on image load', pageIndex, source.url);
                        }
                    }
                },
                error: () =>
                {
                    // TODO: Could make a limited number of retries, etc.
                    delete this._pendingRequests[source.url];
                }
            });
        };

        for (let i = 0; i < pages.length; i++)
        {
            const pageIndex = pages[i];
            const tiles = this._sourceResolver.getBestZoomLevelForPage(this.layout.getPageInfo(pageIndex)).tiles;

            for (let j = 0; j < tiles.length; j++)
            {
                const source = tiles[j];
                if (this._cache.has(source.url) || !this._isTileForSourceVisible(pageIndex, source))
                {
                    continue;
                }

                // Don't create a new request if the tile is already being loaded
                if (this._pendingRequests[source.url])
                {
                    newPendingRequests[source.url] = this._pendingRequests[source.url];
                    delete this._pendingRequests[source.url];
                    continue;
                }

                // Use a closure since the load and error methods are going to be called later and
                // we need to keep the right reference to the source and the page index
                initiateRequest(source, pageIndex);
            }
        }

        for (const url in this._pendingRequests)
        {
            this._pendingRequests[url].abort();
        }
        this._pendingRequests = newPendingRequests;
    }

    _drawTile (pageIndex, scaledTile, img)
    {
        const tileOffset = this._getTileToDocumentOffset(pageIndex, scaledTile);

        // Ensure the document is drawn to the center of the viewport
        const viewportPaddingX = Math.max(0, (this._viewport.width - this.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (this._viewport.height - this.layout.dimensions.height) / 2);

        const viewportOffsetX = tileOffset.left - this._viewport.left + viewportPaddingX;
        const viewportOffsetY = tileOffset.top - this._viewport.top + viewportPaddingY;

        const destXOffset = viewportOffsetX < 0 ? -viewportOffsetX : 0;
        const destYOffset = viewportOffsetY < 0 ? -viewportOffsetY : 0;

        const sourceXOffset = destXOffset / scaledTile.scaleRatio;
        const sourceYOffset = destYOffset / scaledTile.scaleRatio;

        const canvasX = Math.max(0, viewportOffsetX);
        const canvasY = Math.max(0, viewportOffsetY);

        // Ensure that the specified dimensions are no greater than the actual
        // size of the image. Safari won't display the tile if they are.
        const destWidth = Math.min(scaledTile.dimensions.width, img.width * scaledTile.scaleRatio) - destXOffset;
        const destHeight = Math.min(scaledTile.dimensions.height, img.height * scaledTile.scaleRatio) - destYOffset;

        const sourceWidth = destWidth / scaledTile.scaleRatio;
        const sourceHeight = destHeight / scaledTile.scaleRatio;

        if (debugPaints.enabled)
        {
            debugPaints('Drawing page %s, tile %sx (%s, %s) from %s, %s to viewport at %s, %s, scale %s%%',
                pageIndex,
                scaledTile.sourceZoomLevel, scaledTile.row, scaledTile.col,
                sourceXOffset, sourceYOffset,
                canvasX, canvasY,
                Math.round(scaledTile.scaleRatio * 100));
        }

        this._ctx.drawImage(
            img,
            sourceXOffset, sourceYOffset,
            sourceWidth, sourceHeight,
            canvasX, canvasY,
            destWidth, destHeight);
    }

    _isTileForSourceVisible (pageIndex, tileSource)
    {
        return this._isTileVisible(pageIndex, getScaledTileRecord(tileSource, this._zoomLevel));
    }

    _isTileVisible (pageIndex, scaledTile)
    {
        const tileOffset = this._getTileToDocumentOffset(pageIndex, scaledTile);

        // FIXME(wabain): This check is insufficient during a zoom transition
        return this._viewport.intersectsRegion({
            top: tileOffset.top,
            bottom: tileOffset.top + scaledTile.dimensions.height,
            left: tileOffset.left,
            right: tileOffset.left + scaledTile.dimensions.width
        });
    }

    _getTileToDocumentOffset (pageIndex, scaledTile)
    {
        const imageOffset = this._getImageOffset(pageIndex);

        return {
            top: imageOffset.top + scaledTile.offset.top,
            left: imageOffset.left + scaledTile.offset.left
        };
    }

    _getImageOffset (pageIndex)
    {
        return this.layout.getPageOffset(pageIndex, {excludePadding: true});
    }

    // TODO: Update signature
    goto (pageIndex, verticalOffset, horizontalOffset)
    {
        this._clearAnimation();
        this._goto(pageIndex, verticalOffset, horizontalOffset);
        if (this._hooks.onViewDidUpdate)
        {
            this._hooks.onViewDidUpdate(this._renderedPages.slice(), pageIndex);
        }
    }

    _goto (pageIndex, verticalOffset, horizontalOffset)
    {
        // FIXME(wabain): Move this logic to the viewer
        const pageOffset = this.layout.getPageOffset(pageIndex);

        const desiredVerticalCenter = pageOffset.top + verticalOffset;
        const top = desiredVerticalCenter - parseInt(this._viewport.height / 2, 10);

        const desiredHorizontalCenter = pageOffset.left + horizontalOffset;
        const left = desiredHorizontalCenter - parseInt(this._viewport.width / 2, 10);

        this._viewport.top = top;
        this._viewport.left = left;

        this._render();
    }

    transitionViewportPosition (options)
    {
        this._clearAnimation();

        const getPosition = options.getPosition;
        const onViewDidTransition = this._hooks.onViewDidTransition;

        this._animation = InterpolateAnimation.animate({
            duration: options.duration,
            parameters: options.parameters,
            onUpdate: (values) =>
            {
                // TODO: Do image preloading, work with that
                this._setViewportPosition(getPosition(values));

                if (onViewDidTransition)
                {
                    onViewDidTransition();
                }
            },
            onEnd: (info) =>
            {
                if (options.onEnd)
                {
                    options.onEnd(info);
                }

                if (this._hooks.onViewDidUpdate && !info.interrupted)
                {
                    this._hooks.onViewDidUpdate(this._renderedPages.slice(), null);
                }
            }
        });
    }

    _clearAnimation ()
    {
        if (this._animation)
        {
            this._animation.cancel();
            this._animation = null;
        }
    }

    preload ()
    {
        // TODO
    }

    isPageVisible (pageIndex)
    {
        if (!this.layout)
        {
            return false;
        }

        const page = this.layout.getPageInfo(pageIndex);

        if (!page)
        {
            return false;
        }

        return this._viewport.intersectsRegion(this.layout.getPageRegion(pageIndex));
    }

    getRenderedPages ()
    {
        return this._renderedPages.slice();
    }

    destroy ()
    {
        this._clearAnimation();

        // FIXME(wabain): I don't know if we should actually do this
        Object.keys(this._pendingRequests).forEach((req) =>
        {
            const handler = this._pendingRequests[req];
            delete this._pendingRequests[req];

            handler.abort();
        }, this);

        this._canvas.parentNode.removeChild(this._canvas);
    }
}

function getScaledTileRecord (source, scaleFactor)
{
    let scaleRatio;

    if (scaleFactor === null)
    {
        scaleRatio = 1;
    }
    else
    {
        scaleRatio = Math.pow(2, scaleFactor - source.zoomLevel);
    }

    return {
        sourceZoomLevel: source.zoomLevel,
        scaleRatio: scaleRatio,
        row: source.row,
        col: source.col,
        dimensions: {
            width: source.dimensions.width * scaleRatio,
            height: source.dimensions.height * scaleRatio
        },
        offset: {
            left: source.offset.left * scaleRatio,
            top: source.offset.top * scaleRatio
        },
        url: source.url
    };
}

function findChanges (oldArray, newArray)
{
    if (oldArray === newArray)
    {
        return {
            added: [],
            removed: []
        };
    }

    const removed = oldArray.filter(oldEntry => newArray.indexOf(oldEntry) === -1);

    const added = newArray.filter(newEntry => oldArray.indexOf(newEntry) === -1);

    return {
        added: added,
        removed: removed
    };
}
