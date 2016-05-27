'use strict';

var debug = require('debug')('diva:SingleCanvasRendering');

var elt = require('./utils/elt');
var getDocumentLayout = require('./document-layout');
var ImageCache = require('./image-cache');
var ImageRequestHandler = require('./image-request-handler');
var Transition = require('./utils/transition');


module.exports = SingleCanvasRendering;

function SingleCanvasRendering(viewer, hooks)
{
    this._hooks = hooks || {};
    var settings = viewer.getSettings();

    this._viewport = settings.viewport;

    this._canvas = elt('canvas', { class: 'diva-single-canvas' });

    this._ctx = this._canvas.getContext('2d');

    this._viewer = viewer;

    this._documentElement = settings.innerElement;

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

SingleCanvasRendering.prototype.load = function (config, getImageSourcesForPage)
{
    if (this._hooks.onViewWillLoad)
        this._hooks.onViewWillLoad();

    this._getImageSourcesForPage = getImageSourcesForPage;
    this._dimens = getDocumentLayout(config);
    this._pageLookup = getPageLookup(this._dimens.pageGroups);

    this._updateDocumentSize();

    // FIXME(wabain): Remove this when there's more confidence the check shouldn't be needed
    var settings = this._viewer.getSettings();
    if (!this._pageLookup[settings.goDirectlyTo])
        throw new Error('invalid page: ' + settings.goDirectlyTo);

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
    this.goto(settings.goDirectlyTo, settings.verticalOffset, settings.horizontalOffset);

    if (this._canvas.parentNode !== settings.outerElement)
        settings.outerElement.insertBefore(this._canvas, settings.outerElement.firstChild);

    if (this._hooks.onViewDidLoad)
        this._hooks.onViewDidLoad();
};

SingleCanvasRendering.prototype._updateDocumentSize = function ()
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

SingleCanvasRendering.prototype.adjust = function (direction)
{
    this._render(direction);

    if (this._hooks.onViewDidUpdate)
    {
        var pageStats = this._getPageInfoForUpdateHook();
        this._hooks.onViewDidUpdate(pageStats, null);
    }
};

SingleCanvasRendering.prototype._getPageInfoForUpdateHook = function ()
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
SingleCanvasRendering.prototype._render = function (direction) // jshint ignore:line
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

SingleCanvasRendering.prototype._queueTilesForPage = function (pageIndex)
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

SingleCanvasRendering.prototype.goto = function (pageIndex, verticalOffset, horizontalOffset)
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
