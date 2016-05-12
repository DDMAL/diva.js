var elt = require('./utils/elt');
var ImageRequestHandler = require('./image-request-handler');

var debug = require('debug')('diva:TiledImageRenderer');

module.exports = TiledImageRenderer;

var NOT_REQUESTED = 'not requested';
var REQUEST_PENDING = 'request pending';
var REQUEST_COMPLETE = 'request complete';
var REQUEST_ABORTED = 'request aborted';

function TiledImageRenderer(options)
{
    this._viewport = options.viewport;
    this._manifest = options.manifest;
    this._pageIndex = options.pageIndex;
    this._tileDimensions = options.tileDimensions;

    this._zoomLevel = options.initialZoomLevel;
    this._currentRendering = null;

    debug('Instantiating (page %s, zoom level %s)', this._pageIndex, this._zoomLevel);
}

TiledImageRenderer.prototype.updateZoomLevel = function (zoomLevel)
{
    if (this._zoomLevel === zoomLevel)
        return;

    var prevRendering = this._currentRendering;
    var prevZoomLevel = this._zoomLevel;

    this._zoomLevel = zoomLevel;
    var newRendering = this._createRendering();

    debug('Zoom level update (page %s): %s -> %s', this._pageIndex, prevZoomLevel, zoomLevel);

    if (prevRendering)
    {
        debug('Copying image from prior zoom level (page %s)', this._pageIndex);

        newRendering.context.drawImage(
            prevRendering.canvas, 0, 0,
            newRendering.dimensions.width, newRendering.dimensions.height);

        this._clearRendering();
    }

    this._currentRendering = newRendering;
};

/**
 * @returns {Element} rendering
 */
TiledImageRenderer.prototype.getImageRendering = function ()
{
    if (!this._currentRendering)
        this._currentRendering = this._createRendering();

    return this._currentRendering.canvas;
};

TiledImageRenderer.prototype._createRendering = function ()
{
    // TODO(wabain): Make helper method in ImageManifest for this
    var dims = {
        height: Math.round(this._manifest.pages[this._pageIndex].d[this._zoomLevel].h),
        width: Math.round(this._manifest.pages[this._pageIndex].d[this._zoomLevel].w)
    };

    var canvas = elt('canvas', dims);

    var tileSources = this._manifest.getPageImageTiles(this._pageIndex, this._zoomLevel, this._tileDimensions);

    var tiles = tileSources.map(function (tileSource, tileIndex)
    {
        return {
            index: tileIndex,
            source: tileSource,
            state: NOT_REQUESTED,
            loadHandler: null
        };
    });

    return {
        canvas: canvas,
        context: canvas.getContext('2d'),
        zoomLevel: this._zoomLevel,
        dimensions: dims,
        tiles: tiles,
        allTilesRequested: false
    };
};

TiledImageRenderer.prototype.fullImageIsLoading = function ()
{
    return this._currentRendering && this._currentRendering.allTilesRequested;
};

TiledImageRenderer.prototype.load = function (imageOffset)
{
    if (!this._currentRendering)
    {
        this._currentRendering = this._createRendering();
    }
    else if (this._currentRendering.allTilesRequested)
    {
        return;
    }

    var allTilesRequested = true;

    this._currentRendering.tiles.forEach(function (tile)
    {
        switch (tile.state)
        {
            case NOT_REQUESTED:
            case REQUEST_ABORTED:
                if (this._isTileVisible(tile, imageOffset))
                    this._requestTile(tile);
                else
                    allTilesRequested = false;

                break;

            case REQUEST_PENDING:
            case REQUEST_COMPLETE:
                break;

            /* istanbul ignore next */
            default:
                throw new Error('unreachable');
        }
    }, this);

    if (allTilesRequested)
        debug('All tiles requested (page %s, zoom level %s)', this._pageIndex, this._zoomLevel);

    this._currentRendering.allTilesRequested = allTilesRequested;
};

TiledImageRenderer.prototype._isTileVisible = function (tile, imageOffset)
{
    var top = imageOffset.top + tile.source.top;
    var left = imageOffset.left + tile.source.left;

    // FIXME(wabain): This check is insufficient during a zoom transition
    return this._viewport.intersectsRegion({
        top: top,
        bottom: top + this._tileDimensions.height,
        left: left,
        right: left + this._tileDimensions.width
    });
};

TiledImageRenderer.prototype._requestTile = function (tile)
{
    var source = tile.source;
    var rendering = this._currentRendering;

    tile.loadHandler = new ImageRequestHandler(source.url, function (image)
    {
        tile.state = REQUEST_COMPLETE;
        tile.loadHandler = null;

        rendering.context.drawImage(image, source.left, source.top);
    });
};

TiledImageRenderer.prototype.destroy = function ()
{
    this._clearRendering();
};

TiledImageRenderer.prototype._clearRendering = function ()
{
    debug('Rendering cleared (page %s, zoom level %s)', this._pageIndex, this._currentRendering.zoomLevel);

    this._currentRendering.tiles.forEach(function (tile)
    {
        if (tile.loadHandler)
        {
            tile.loadHandler.abort();
            tile.loadHandler = null;
            tile.state = REQUEST_ABORTED;
        }
    });

    this._currentRendering = null;
};
