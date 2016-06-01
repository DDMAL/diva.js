'use strict';

var debug = require('debug')('diva:Renderer');

var elt = require('./utils/elt');
var getDocumentLayout = require('./document-layout');
var ImageCache = require('./image-cache');
var ImageRequestHandler = require('./image-request-handler');
var Transition = require('./utils/transition');


module.exports = Renderer;

function Renderer(options, hooks)
{
    this._viewport = options.viewport;
    this._outerElement = options.outerElement;
    this._documentElement = options.innerElement;

    this._hooks = hooks || {};

    this._canvas = elt('canvas', { class: 'diva-viewer-canvas' });
    this._ctx = this._canvas.getContext('2d');

    this._renderedPages = null;
    this._dimens = null;
    this._pageLookup = null;

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

Renderer.prototype.load = function (config, getImageSourcesForPage)
{
    if (this._hooks.onViewWillLoad)
        this._hooks.onViewWillLoad();

    this._getImageSourcesForPage = getImageSourcesForPage;
    this._dimens = getDocumentLayout(config);
    this._pageLookup = getPageLookup(this._dimens.pageGroups);

    this._updateDocumentSize();

    // FIXME(wabain): Remove this when there's more confidence the check shouldn't be needed
    if (!this._pageLookup[config.position.anchorPage])
        throw new Error('invalid page: ' + config.position.anchorPage);

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
    this.goto(config.position.anchorPage, config.position.verticalOffset, config.position.horizontalOffset);

    if (this._canvas.parentNode !== this._outerElement)
        this._outerElement.insertBefore(this._canvas, this._outerElement.firstChild);

    if (this._hooks.onViewDidLoad)
        this._hooks.onViewDidLoad();
};

Renderer.prototype._updateDocumentSize = function ()
{
    var elem = this._documentElement;

    // Post-zoom: clear scaling
    elem.style[Transition.property] = '';
    elem.style.transform = '';
    elem.style.transformOrigin = '';

    elt.setAttributes(elem, {
        style: {
            height: this._dimens.dimensions.height + 'px',
            width: this._dimens.dimensions.width + 'px'
        }
    });
};

Renderer.prototype.adjust = function (direction)
{
    this._render(direction);

    if (this._hooks.onViewDidUpdate)
    {
        var pageStats = this._getPageInfoForUpdateHook();
        this._hooks.onViewDidUpdate(pageStats, null);
    }
};

Renderer.prototype._getPageInfoForUpdateHook = function ()
{
    // TODO(wabain): Standardize how dimensions are given
    return this._renderedPages.map(function (index)
    {
        var page = this._pageLookup[index];

        return {
            index: index,
            dimensions: page.dimensions,
            group: page.group,
            paddingRegionOffset: this.getPageOffset(index),
            imageOffset: this._getImageOffset(index)
        };
    }, this);
};

// FIXME(wabain): Remove the direction argument if it doesn't end up being needed.
Renderer.prototype._render = function (direction) // jshint ignore:line
{
    var newRenderedPages = [];
    this._dimens.pageGroups.forEach(function (group)
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
    newRenderedPages.forEach(this._queueTilesForPage, this);

    this._renderedPages = newRenderedPages;
};

Renderer.prototype._queueTilesForPage = function (pageIndex)
{
    // TODO(wabain): Debounce
    var tileSources = this._getImageSourcesForPage(this._pageLookup[pageIndex]);

    tileSources.forEach(function (source, tileIndex)
    {
        if (this._pendingRequests[source.url] || !this._isTileVisible(pageIndex, source))
            return;

        if (this._cache.has(source.url))
        {
            this._drawTile(pageIndex, tileIndex, source, this._cache.get(source.url));
            return;
        }

        this._pendingRequests[source.url] = new ImageRequestHandler(source.url, function (img)
        {
            delete this._pendingRequests[source.url];
            this._cache.put(source.url, img);

            if (!this._isTileVisible(pageIndex, source))
            {
                debug('Page %s, tile %s no longer visible on image load', pageIndex, tileIndex);
                return;
            }

            this._drawTile(pageIndex, tileIndex, source, img);
        }.bind(this));
    }, this);
};

Renderer.prototype._drawTile = function (pageIndex, tileIndex, tileRecord, img)
{
    var tileOffset = this._getTileToDocumentOffset(pageIndex, tileRecord);

    // Ensure the document is drawn to the center of the viewport
    var viewportPaddingX = Math.max(0, (this._viewport.width - this._dimens.dimensions.width) / 2);
    var viewportPaddingY = Math.max(0, (this._viewport.height - this._dimens.dimensions.height) / 2);

    var viewportOffsetX = tileOffset.left - this._viewport.left + viewportPaddingX;
    var viewportOffsetY = tileOffset.top - this._viewport.top + viewportPaddingY;

    var destXOffset = viewportOffsetX < 0 ? -viewportOffsetX : 0;
    var destYOffset = viewportOffsetY < 0 ? -viewportOffsetY : 0;

    var sourceXOffset = destXOffset / tileRecord.scaleRatio;
    var sourceYOffset = destYOffset / tileRecord.scaleRatio;

    var canvasX = Math.max(0, viewportOffsetX);
    var canvasY = Math.max(0, viewportOffsetY);

    // Ensure that the specified dimensions are no greater than the actual
    // size of the image. Safari won't display the tile if they are.
    var destWidth = Math.min(tileRecord.dimensions.width, img.width * tileRecord.scaleRatio) - destXOffset;
    var destHeight = Math.min(tileRecord.dimensions.height, img.height * tileRecord.scaleRatio) - destYOffset;

    var sourceWidth = destWidth / tileRecord.scaleRatio;
    var sourceHeight = destHeight / tileRecord.scaleRatio;

    debug.enabled && debug('Drawing page %s, tile %s from %s, %s to viewport at %s, %s, scale %s%%',
        pageIndex, tileIndex,
        sourceXOffset, sourceYOffset,
        canvasX, canvasY,
        Math.round(tileRecord.scaleRatio * 100));

    this._ctx.drawImage(
        img,
        sourceXOffset, sourceYOffset,
        sourceWidth, sourceHeight,
        canvasX, canvasY,
        destWidth, destHeight);
};

Renderer.prototype._isTileVisible = function (pageIndex, tileSource)
{
    var tileOffset = this._getTileToDocumentOffset(pageIndex, tileSource);

    // FIXME(wabain): This check is insufficient during a zoom transition
    return this._viewport.intersectsRegion({
        top: tileOffset.top,
        bottom: tileOffset.top + tileSource.dimensions.height,
        left: tileOffset.left,
        right: tileOffset.left + tileSource.dimensions.width
    });
};

Renderer.prototype._getTileToDocumentOffset = function (pageIndex, tileSource)
{
    var imageOffset = this._getImageOffset(pageIndex);

    return {
        top: imageOffset.top + tileSource.offset.top,
        left: imageOffset.left + tileSource.offset.left
    };
};

Renderer.prototype._getImageOffset = function (pageIndex)
{
    var pageOffset = this.getPageOffset(pageIndex);

    // FIXME?
    var padding = this._pageLookup[pageIndex].group.padding;

    return {
        top: pageOffset.top + padding.top,
        left: pageOffset.left + padding.left
    };
};

Renderer.prototype.goto = function (pageIndex, verticalOffset, horizontalOffset)
{
    // FIXME(wabain): Move this logic to the viewer
    var pageOffset = this.getPageOffset(pageIndex);

    var desiredVerticalCenter = pageOffset.top + verticalOffset;
    var top = desiredVerticalCenter - parseInt(this._viewport.height / 2, 10);

    var desiredHorizontalCenter = pageOffset.left + horizontalOffset;
    var left = desiredHorizontalCenter - parseInt(this._viewport.width / 2, 10);

    this._viewport.top = top;
    this._viewport.left = left;

    this._render(0);

    if (this._hooks.onViewDidUpdate)
    {
        var pages = this._getPageInfoForUpdateHook();
        this._hooks.onViewDidUpdate(pages, pageIndex);
    }
};

Renderer.prototype.preload = function ()
{
    // TODO
};

Renderer.prototype.isPageVisible = function (pageIndex)
{
    if (!this._pageLookup)
        return false;

    var page = this._pageLookup[pageIndex];

    if (!page)
        return false;

    return this._viewport.intersectsRegion(getPageRegionFromGroupInfo(page));
};

Renderer.prototype.isPageLoaded = function (pageIndex)
{
    return this._renderedPages.indexOf(pageIndex) >= 0;
};

Renderer.prototype.getRenderedPages = function ()
{
    return this._renderedPages.slice();
};

Renderer.prototype.getPageDimensions = function (pageIndex)
{
    if (!this._pageLookup || !this._pageLookup[pageIndex])
        return null;

    var region = getPageRegionFromGroupInfo(this._pageLookup[pageIndex]);

    return {
        height: region.bottom - region.top,
        width: region.right - region.left
    };
};

// TODO(wabain): Get rid of this; it's a subset of the page region, so
// give that instead
Renderer.prototype.getPageOffset = function (pageIndex)
{
    var region = this.getPageRegion(pageIndex);

    if (!region)
        return null;

    return {
        top: region.top,
        left: region.left
    };
};

Renderer.prototype.getPageRegion = function (pageIndex)
{
    if (!this._pageLookup || !this._pageLookup[pageIndex])
        return null;

    return getPageRegionFromGroupInfo(this._pageLookup[pageIndex]);
};

Renderer.prototype.getPageToViewportCenterOffset = function (pageIndex)
{
    var scrollLeft = this._viewport.left;
    var elementWidth = this._viewport.width;

    var offset = this.getPageOffset(pageIndex);

    var x = scrollLeft - offset.left + parseInt(elementWidth / 2, 10);

    var scrollTop = this._viewport.top;
    var elementHeight = this._viewport.height;

    var y = scrollTop - offset.top + parseInt(elementHeight / 2, 10);

    return {
        x: x,
        y: y
    };
};

Renderer.prototype.destroy = function ()
{
    // FIXME(wabain): I don't know if we should actually do this
    Object.keys(this._pendingRequests).forEach(function (req)
    {
        var handler = this._pendingRequests[req];
        delete this._pendingRequests[req];

        handler.abort();
    }, this);

    this._canvas.parentNode.removeChild(this._canvas);
};

function getPageLookup(pageGroups)
{
    var pageLookup = {};

    pageGroups.forEach(function (group)
    {
        group.pages.forEach(function (page)
        {
            pageLookup[page.index] = {
                index: page.index,
                group: group,
                dimensions: page.dimensions,
                groupOffset: page.groupOffset
            };
        });
    });

    return pageLookup;
}

function getPageRegionFromGroupInfo(page)
{
    var top    = page.groupOffset.top  + page.group.region.top;
    var bottom = top + page.dimensions.height;
    var left   = page.groupOffset.left + page.group.region.left;
    var right  = left + page.dimensions.width;

    return {
        top: top,
        bottom: bottom,
        left: left,
        right: right
    };
}
