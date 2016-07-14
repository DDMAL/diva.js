'use strict';

var debug = require('debug')('diva:Renderer');
var debugPaints = require('debug')('diva:Renderer:paints');

var elt = require('./utils/elt');

var CompositeImage = require('./composite-image');
var DocumentLayout = require('./document-layout');
var ImageCache = require('./image-cache');
var ImageRequestHandler = require('./image-request-handler');
var InterpolateAnimation = require('./interpolate-animation');

var REQUEST_DEBOUNCE_INTERVAL = 250;


module.exports = Renderer;

function Renderer(options, hooks)
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

Renderer.getCompatibilityErrors = function ()
{
    if (typeof HTMLCanvasElement !== 'undefined')
        return null;

    return [
        'Your browser lacks support for the ', elt('pre', 'canvas'),
        ' element. Please upgrade your browser.'
    ];
};

Renderer.prototype.load = function (config, viewportPosition, sourceResolver)
{
    this._clearAnimation();

    if (this._hooks.onViewWillLoad)
        this._hooks.onViewWillLoad();

    this._sourceResolver = sourceResolver;
    this._config = config;
    this._compositeImages = {};
    this._setLayoutToZoomLevel(viewportPosition.zoomLevel);

    // FIXME(wabain): Remove this when there's more confidence the check shouldn't be needed
    if (!this.layout.getPageInfo(viewportPosition.anchorPage))
        throw new Error('invalid page: ' + viewportPosition.anchorPage);

    if (this._canvas.width !== this._viewport.width || this._canvas.height !== this._viewport.height)
    {
        debug('Canvas dimension change: (%s, %s) -> (%s, %s)', this._canvas.width, this._canvas.height,
            this._viewport.width, this._viewport.height);

        this._canvas.width = this._viewport.width;
        this._canvas.height = this._viewport.height;
    } else {
        debug('Reload, no size change');
    }

    // FIXME: What hooks should be called here?
    this.goto(viewportPosition.anchorPage, viewportPosition.verticalOffset, viewportPosition.horizontalOffset);

    if (this._canvas.parentNode !== this._outerElement)
        this._outerElement.insertBefore(this._canvas, this._outerElement.firstChild);

    if (this._hooks.onViewDidLoad)
        this._hooks.onViewDidLoad();
};

Renderer.prototype._setViewportPosition = function (viewportPosition)
{
    if (viewportPosition.zoomLevel !== this._zoomLevel)
    {
        if (this._zoomLevel === null)
            throw new TypeError('The current view is not zoomable');
        else if (viewportPosition.zoomLevel === null)
            throw new TypeError('The current view requires a zoom level');

        this._setLayoutToZoomLevel(viewportPosition.zoomLevel);
    }

    this._goto(viewportPosition.anchorPage, viewportPosition.verticalOffset, viewportPosition.horizontalOffset);
};

Renderer.prototype._setLayoutToZoomLevel = function (zoomLevel)
{
    this.layout = new DocumentLayout(this._config, zoomLevel);
    this._zoomLevel = zoomLevel;

    elt.setAttributes(this._documentElement, {
        style: {
            height: this.layout.dimensions.height + 'px',
            width: this.layout.dimensions.width + 'px'
        }
    });

    this._viewport.setInnerDimensions(this.layout.dimensions);
};

Renderer.prototype.adjust = function (direction)
{
    this._clearAnimation();

    this._render(direction);

    if (this._hooks.onViewDidUpdate)
    {
        this._hooks.onViewDidUpdate(this._renderedPages.slice(), null);
    }
};

// FIXME(wabain): Remove the direction argument if it doesn't end up being needed.
Renderer.prototype._render = function (direction) // jshint ignore:line
{
    var newRenderedPages = [];
    this.layout.pageGroups.forEach(function (group)
    {
        if (!this._viewport.intersectsRegion(group.region))
            return;

        var visiblePages = group.pages
            .filter(function (page)
            {
                return this.isPageVisible(page.index);
            }, this)
            .map(function (page)
            {
                return page.index;
            });

        newRenderedPages.push.apply(newRenderedPages, visiblePages);
    }, this);

    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    newRenderedPages.forEach(function (pageIndex)
    {
        if (!this._compositeImages[pageIndex])
        {
            var page = this.layout.getPageInfo(pageIndex);
            var zoomLevels = this._sourceResolver.getAllZoomLevelsForPage(page);
            var composite = new CompositeImage(zoomLevels);
            composite.updateFromCache(this._cache);
            this._compositeImages[pageIndex] = composite;
        }

        this._initiatePageTileRequests(newRenderedPages.length, pageIndex);
    }, this);

    var changes = findChanges(this._renderedPages || [], newRenderedPages);

    changes.removed.forEach(function (pageIndex)
    {
        delete this._compositeImages[pageIndex];
    }, this);

    this._renderedPages = newRenderedPages;
    this._paint();

    if (this._hooks.onPageWillLoad)
    {
        changes.added.forEach(function (pageIndex)
        {
            this._hooks.onPageWillLoad(pageIndex);
        }, this);
    }
};

Renderer.prototype._paint = function ()
{
    debug('Repainting');

    var renderedTiles = [];

    this._renderedPages.forEach(function (pageIndex)
    {
        this._compositeImages[pageIndex].getTiles(this._zoomLevel).forEach(function (source)
        {
            var scaled = getScaledTileRecord(source, this._zoomLevel);

            if (this._isTileVisible(pageIndex, scaled))
            {
                renderedTiles.push(source.url);
                this._drawTile(pageIndex, scaled, this._cache.get(source.url));
            }
        }, this);
    }, this);

    var cache = this._cache;

    var changes = findChanges(this._renderedTiles || [], renderedTiles);

    changes.added.forEach(function (url)
    {
        cache.acquire(url);
    });

    changes.removed.forEach(function (url)
    {
        cache.release(url);
    });

    if (changes.removed)
    {
        // FIXME: Should only need to update the composite images
        // for which tiles were removed
        this._renderedPages.forEach(function (pageIndex)
        {
            this._compositeImages[pageIndex].updateFromCache(this._cache);
        }, this);
    }

    this._renderedTiles = renderedTiles;
};

// This is a debounced function that will keep the last 'nbVisiblePage' number of calls
// active. e.g. if you call _initiatePageTileRequests(2, 0) and there are more than
// 2 calls waiting on the timeout, the oldest ones will be cancelled to leave space for
// the latest call and to have at most 'nbVisiblePage' number of calls active at once.
// This means that only requests for currently visible pages will be kept active, while
// the ones that are scrolled out of the view before they start will be cancelled.
Renderer.prototype._initiatePageTileRequests = (function customDebounce(wait)
    {
        var timeouts = []; // Use this array as a queue of method calls

        // The arguments just below are the ones that need to be passed to _initiatePageTileRequests
        return function(nbVisiblePages, pageIndex)
        {
            var removedTimeouts = timeouts.splice(0, timeouts.length - nbVisiblePages + 1);

            for (var i = 0; i < removedTimeouts.length; i++)
                clearTimeout(removedTimeouts[i]);

            timeouts.push(setTimeout(function()
            {
                // HERE is where the real method '_initiatePageTileRequests' call begins

                var tileSources = this._sourceResolver.getBestZoomLevelForPage(this.layout.getPageInfo(pageIndex)).tiles;
                var composite = this._compositeImages[pageIndex];

                tileSources.forEach(function (source, tileIndex)
                {
                    if (this._pendingRequests[source.url] || this._cache.has(source.url) || !this._isTileForSourceVisible(pageIndex, source))
                        return;

                    this._pendingRequests[source.url] = new ImageRequestHandler({
                        url: source.url,
                        load: function (img)
                        {
                            delete this._pendingRequests[source.url];
                            this._cache.put(source.url, img);

                            // Awkward way to check for updates
                            if (composite === this._compositeImages[pageIndex])
                            {
                                composite.updateWithLoadedUrls([source.url]);

                                if (this._isTileForSourceVisible(pageIndex, source))
                                    this._paint();
                                else
                                    debugPaints('Page %s, tile %s no longer visible on image load', pageIndex, tileIndex);
                            }
                        }.bind(this),
                        error: function ()
                        {
                            // TODO: Could make a limited number of retries, etc.
                            delete this._pendingRequests[source.url];
                        }.bind(this)
                    });
                }, this);
            }.bind(this), wait));
        };
    }
)(REQUEST_DEBOUNCE_INTERVAL);

Renderer.prototype._drawTile = function (pageIndex, scaledTile, img)
{
    var tileOffset = this._getTileToDocumentOffset(pageIndex, scaledTile);

    // Ensure the document is drawn to the center of the viewport
    var viewportPaddingX = Math.max(0, (this._viewport.width - this.layout.dimensions.width) / 2);
    var viewportPaddingY = Math.max(0, (this._viewport.height - this.layout.dimensions.height) / 2);

    var viewportOffsetX = tileOffset.left - this._viewport.left + viewportPaddingX;
    var viewportOffsetY = tileOffset.top - this._viewport.top + viewportPaddingY;

    var destXOffset = viewportOffsetX < 0 ? -viewportOffsetX : 0;
    var destYOffset = viewportOffsetY < 0 ? -viewportOffsetY : 0;

    var sourceXOffset = destXOffset / scaledTile.scaleRatio;
    var sourceYOffset = destYOffset / scaledTile.scaleRatio;

    var canvasX = Math.max(0, viewportOffsetX);
    var canvasY = Math.max(0, viewportOffsetY);

    // Ensure that the specified dimensions are no greater than the actual
    // size of the image. Safari won't display the tile if they are.
    var destWidth = Math.min(scaledTile.dimensions.width, img.width * scaledTile.scaleRatio) - destXOffset;
    var destHeight = Math.min(scaledTile.dimensions.height, img.height * scaledTile.scaleRatio) - destYOffset;

    var sourceWidth = destWidth / scaledTile.scaleRatio;
    var sourceHeight = destHeight / scaledTile.scaleRatio;

    if (debugPaints.enabled) {
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
};

Renderer.prototype._isTileForSourceVisible = function (pageIndex, tileSource)
{
    return this._isTileVisible(pageIndex, getScaledTileRecord(tileSource, this._zoomLevel));
};

Renderer.prototype._isTileVisible = function (pageIndex, scaledTile)
{
    var tileOffset = this._getTileToDocumentOffset(pageIndex, scaledTile);

    // FIXME(wabain): This check is insufficient during a zoom transition
    return this._viewport.intersectsRegion({
        top: tileOffset.top,
        bottom: tileOffset.top + scaledTile.dimensions.height,
        left: tileOffset.left,
        right: tileOffset.left + scaledTile.dimensions.width
    });
};

Renderer.prototype._getTileToDocumentOffset = function (pageIndex, scaledTile)
{
    var imageOffset = this._getImageOffset(pageIndex);

    return {
        top: imageOffset.top + scaledTile.offset.top,
        left: imageOffset.left + scaledTile.offset.left
    };
};

Renderer.prototype._getImageOffset = function (pageIndex)
{
    return this.layout.getPageOffset(pageIndex, {excludePadding: true});
};

// TODO: Update signature
Renderer.prototype.goto = function (pageIndex, verticalOffset, horizontalOffset)
{
    this._clearAnimation();
    this._goto(pageIndex, verticalOffset, horizontalOffset);
    if (this._hooks.onViewDidUpdate)
    {
        this._hooks.onViewDidUpdate(this._renderedPages.slice(), pageIndex);
    }
};

Renderer.prototype._goto = function (pageIndex, verticalOffset, horizontalOffset)
{
    // FIXME(wabain): Move this logic to the viewer
    var pageOffset = this.layout.getPageOffset(pageIndex);

    var desiredVerticalCenter = pageOffset.top + verticalOffset;
    var top = desiredVerticalCenter - parseInt(this._viewport.height / 2, 10);

    var desiredHorizontalCenter = pageOffset.left + horizontalOffset;
    var left = desiredHorizontalCenter - parseInt(this._viewport.width / 2, 10);

    this._viewport.top = top;
    this._viewport.left = left;

    this._render(0);
};

Renderer.prototype.transitionViewportPosition = function (options)
{
    this._clearAnimation();

    var getPosition = options.getPosition;
    var self = this;

    var onViewDidTransition = this._hooks.onViewDidTransition;

    this._animation = InterpolateAnimation.animate({
        duration: options.duration,
        parameters: options.parameters,
        onUpdate: function (values)
        {
            // TODO: Do image preloading, work with that
            self._setViewportPosition(getPosition(values));

            if (onViewDidTransition)
                onViewDidTransition();
        },
        onEnd: function (info)
        {
            if (options.onEnd)
                options.onEnd(info);

            if (self._hooks.onViewDidUpdate && !info.interrupted)
            {
                self._hooks.onViewDidUpdate(self._renderedPages.slice(), null);
            }
        }
    });
};

Renderer.prototype._clearAnimation = function ()
{
    if (this._animation)
    {
        this._animation.cancel();
        this._animation = null;
    }
};

Renderer.prototype.preload = function ()
{
    // TODO
};

Renderer.prototype.isPageVisible = function (pageIndex)
{
    if (!this.layout)
        return false;

    var page = this.layout.getPageInfo(pageIndex);

    if (!page)
        return false;

    return this._viewport.intersectsRegion(this.layout.getPageRegion(pageIndex));
};

Renderer.prototype.isPageLoaded = function (pageIndex)
{
    return this._renderedPages.indexOf(pageIndex) >= 0;
};

Renderer.prototype.getRenderedPages = function ()
{
    return this._renderedPages.slice();
};

Renderer.prototype.destroy = function ()
{
    this._clearAnimation();

    // FIXME(wabain): I don't know if we should actually do this
    Object.keys(this._pendingRequests).forEach(function (req)
    {
        var handler = this._pendingRequests[req];
        delete this._pendingRequests[req];

        handler.abort();
    }, this);

    this._canvas.parentNode.removeChild(this._canvas);
};

function getScaledTileRecord(source, scaleFactor)
{
    var scaleRatio;

    if (scaleFactor === null)
        scaleRatio = 1;
    else
        scaleRatio = Math.pow(2, scaleFactor - source.zoomLevel);

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

function findChanges(oldArray, newArray)
{
    if (oldArray === newArray)
    {
        return {
            added: [],
            removed: []
        };
    }

    var removed = oldArray.filter(function (oldEntry)
    {
        return newArray.indexOf(oldEntry) === -1;
    });

    var added = newArray.filter(function (newEntry)
    {
        return oldArray.indexOf(newEntry) === -1;
    });

    return {
        added: added,
        removed: removed
    };
}
