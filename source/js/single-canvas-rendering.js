'use strict';

var maxBy = require('lodash.maxby');
var debug = require('debug')('diva:SingleCanvasRendering');

var elt = require('./utils/elt');
var getDocumentLayout = require('./document-layout');
var DocumentRendering = require('./document-rendering');
var ImageCache = require('./image-cache');
var ImageRequestHandler = require('./image-request-handler');


module.exports = SingleCanvasRendering;

function SingleCanvasRendering(viewer, hooks)
{
    this._hooks = hooks || {};
    var settings = viewer.getSettings();

    this._viewport = settings.viewport;
    this._tileDimensions = {
        width: settings.tileWidth,
        height: settings.tileHeight
    };

    this._canvas = elt('canvas', { class: 'diva-single-canvas' });

    this._ctx = this._canvas.getContext('2d');

    this._viewer = viewer;
    this._manifest = settings.manifest;

    this._documentRendering = null;
    this._documentElement = settings.innerElement;
    this._viewerId = settings.ID;

    this._renderedPages = null;
    this._dimens = null;
    this._pageLookup = null;

    // FIXME(wabain): What level should this be maintained at?
    // Diva global?
    this._cache = new ImageCache();
    this._pendingRequests = {};
}

SingleCanvasRendering.getCompatibilityErrors = function ()
{
    if (typeof HTMLCanvasElement !== 'undefined')
        return null;

    return [
        'Your browser lacks support for the ', elt('pre', 'canvas'),
        ' element. Please upgrade your browser.'
    ];
};

SingleCanvasRendering.prototype.load = function (config)
{
    if (this._hooks.onViewWillLoad)
        this._hooks.onViewWillLoad();

    this._dimens = getDocumentLayout(config);
    this._pageLookup = getPageLookup(this._dimens.pageGroups);

    this._updateDocumentRendering();

    // FIXME(wabain): Remove this when there's more confidence the check shouldn't be needed
    var settings = this._viewer.getSettings();
    if (!this._pageLookup[settings.goDirectlyTo])
        throw new Error('invalid page: ' + settings.goDirectlyTo);

    this.goto(settings.goDirectlyTo, settings.verticalOffset, settings.horizontalOffset);
    this.adjust(0);

    if (this._canvas.width !== this._viewport.width || this._canvas.height !== this._viewport.height)
    {
        debug('Canvas dimension change: (%s, %s) -> (%s, %s)', this._canvas.width, this._canvas.height,
            this._viewport.width, this._viewport.height);

        this._canvas.width = this._viewport.width;
        this._canvas.height = this._viewport.height;
    } else {
        debug('clearRect?');
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    if (this._canvas.parentNode !== settings.outerElement)
        settings.outerElement.insertBefore(this._canvas, settings.outerElement.firstChild);

    if (this._hooks.onViewDidLoad)
        this._hooks.onViewDidLoad();
};

SingleCanvasRendering.prototype._updateDocumentRendering = function ()
{
    if (this._documentRendering)
        this._documentRendering.destroy();

    this._documentRendering = new DocumentRendering({
        element: this._documentElement,
        ID: this._viewerId
    });

    this._documentRendering.setDocumentSize({
        height: this._dimens.dimensions.height + 'px',
        width: this._dimens.dimensions.width + 'px'
    });
};

// FIXME(wabain): Remove the direction argument if it doesn't end up being needed.
SingleCanvasRendering.prototype.adjust = function (direction) // jshint ignore:line
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
    this._updateCurrentPage();
};

SingleCanvasRendering.prototype._queueTilesForPage = function (pageIndex)
{
    // TODO(wabain): Debounce
    var tileSources = this._manifest.getPageImageTiles(pageIndex, this._viewer.getZoomLevel(), this._tileDimensions);

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

SingleCanvasRendering.prototype._drawTile = function (pageIndex, tileIndex, tileRecord, img)
{
    var tileOffset = this._getTileToDocumentOffset(pageIndex, tileRecord);

    var viewportOffsetX = tileOffset.left - this._viewport.left;
    var viewportOffsetY = tileOffset.top - this._viewport.top;

    var tileX = viewportOffsetX < 0 ? -viewportOffsetX : 0;
    var tileY = viewportOffsetY < 0 ? -viewportOffsetY : 0;

    var canvasX = Math.max(0, viewportOffsetX);
    var canvasY = Math.max(0, viewportOffsetY);

    // FIXME(wabain): Get tile dimensions from img?
    var width = tileRecord.dimensions.width - tileX;
    var height = tileRecord.dimensions.height - tileY;

    debug('Drawing page %s, tile %s from %s, %s to viewport at %s, %s', pageIndex, tileIndex,
        tileX, tileY, canvasX, canvasY);

    this._ctx.drawImage(img, tileX, tileY, width, height, canvasX, canvasY, width, height);
};

SingleCanvasRendering.prototype._isTileVisible = function (pageIndex, tileSource)
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

SingleCanvasRendering.prototype._getTileToDocumentOffset = function (pageIndex, tileSource)
{
    var imageOffset = this._getImageOffset(pageIndex);

    return {
        top: imageOffset.top + tileSource.offset.top,
        left: imageOffset.left + tileSource.offset.left
    };
};

SingleCanvasRendering.prototype._getImageOffset = function (pageIndex)
{
    var pageOffset = this.getPageOffset(pageIndex);

    // FIXME?
    var padding = this._pageLookup[pageIndex].group.padding;

    return {
        top: pageOffset.top + padding.top,
        left: pageOffset.left + padding.left
    };
};

SingleCanvasRendering.prototype._updateCurrentPage = function ()
{
    // FIXME(wabain): Should this happen?
    if (!this._renderedPages || this._renderedPages.length === 0)
        return;

    var centerY = this._viewport.top + (this._viewport.height / 2);
    var centerX = this._viewport.left + (this._viewport.width / 2);

    // Find the minimum distance from the viewport center to a page.
    // Compute minus the squared distance from viewport center to the page's border.
    // http://gamedev.stackexchange.com/questions/44483/how-do-i-calculate-distance-between-a-point-and-an-axis-aligned-rectangle
    var closestPage = maxBy(this._renderedPages, function (index)
    {
        var dims = this.getPageDimensions(index);

        var imageOffset = this._getImageOffset(index);

        var midX = imageOffset.left + (dims.height / 2);
        var midY = imageOffset.top + (dims.width / 2);

        var dx = Math.max(Math.abs(centerX - midX) - (dims.width / 2), 0);
        var dy = Math.max(Math.abs(centerY - midY) - (dims.height / 2), 0);

        return -(dx * dx + dy * dy);
    }.bind(this));

    if (this._hooks.onPageDidChange && closestPage !== this._viewer.getSettings().currentPageIndex)
    {
        this._hooks.onPageDidChange(closestPage);
    }
};

// FIXME(wabain): Move this logic to the viewer
SingleCanvasRendering.prototype.goto = function (pageIndex, verticalOffset, horizontalOffset)
{
    var pageOffset = this.getPageOffset(pageIndex);

    var desiredVerticalCenter = pageOffset.top + verticalOffset;
    var top = desiredVerticalCenter - parseInt(this._viewport.height / 2, 10);

    var desiredHorizontalCenter = pageOffset.left + horizontalOffset;
    var left = desiredHorizontalCenter - parseInt(this._viewport.width / 2, 10);

    this._viewport.top = top;
    this._viewport.left = left;

    // Pretend that this is the current page
    if (this._hooks.onPageDidChange)
        this._hooks.onPageDidChange(pageIndex);

    if (this._hooks.onViewerDidJump)
        this._hooks.onViewerDidJump(pageIndex);
};

SingleCanvasRendering.prototype.preload = function ()
{
    // TODO
};

SingleCanvasRendering.prototype.isPageVisible = function (pageIndex)
{
    if (!this._pageLookup)
        return false;

    var page = this._pageLookup[pageIndex];

    if (!page)
        return false;

    return this._viewport.intersectsRegion(getPageRegionFromGroupInfo(page));
};

SingleCanvasRendering.prototype.isPageLoaded = function (pageIndex)
{
    return this._renderedPages.indexOf(pageIndex) >= 0;
};

SingleCanvasRendering.prototype.getPageDimensions = function (pageIndex)
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
SingleCanvasRendering.prototype.getPageOffset = function (pageIndex)
{
    if (!this._pageLookup || !this._pageLookup[pageIndex])
        return null;

    var region = getPageRegionFromGroupInfo(this._pageLookup[pageIndex]);

    if (!region)
        return null;

    return {
        top: region.top,
        left: region.left
    };
};

SingleCanvasRendering.prototype.getPageToViewportOffset = function ()
{
    var scrollLeft = this._viewport.left;
    var elementWidth = this._viewport.width;

    var offset = this.getPageOffset(this._viewer.getSettings().currentPageIndex);

    var x = scrollLeft - offset.left + parseInt(elementWidth / 2, 10);

    var scrollTop = this._viewport.top;
    var elementHeight = this._viewport.height;

    var y = scrollTop - offset.top + parseInt(elementHeight / 2, 10);

    return {
        x: x,
        y: y
    };
};

SingleCanvasRendering.prototype.destroy = function ()
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
