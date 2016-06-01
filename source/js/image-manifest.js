/* jshint unused: true */

var parseIIIFManifest = require('./parse-iiif-manifest');

module.exports = ImageManifest;

function ImageManifest(data, urlAdapter)
{
    // Save all the data we need
    this.pages = data.pgs;
    this.maxZoom = data.max_zoom;
    this.maxRatio = data.dims.max_ratio;
    this.minRatio = data.dims.min_ratio;
    this.itemTitle = data.item_title;

    // Only given for IIIF manifests
    this.paged = !!data.paged;

    // These are arrays, the index corresponding to the zoom level
    this._maxWidths = data.dims.max_w;
    this._maxHeights = data.dims.max_h;
    this._averageWidths = data.dims.a_wid;
    this._averageHeights = data.dims.a_hei;
    this._totalHeights = data.dims.t_hei;
    this._totalWidths = data.dims.t_wid;

    this._urlAdapter = urlAdapter;
}

ImageManifest.fromIIIF = function (iiifManifest)
{
    var data = parseIIIFManifest(iiifManifest);
    return new ImageManifest(data, new IIIFSourceAdapter());
};

ImageManifest.fromLegacyManifest = function (data, config)
{
    return new ImageManifest(data, new LegacyManifestSourceAdapter(config));
};

ImageManifest.prototype.isPageValid = function (pageIndex)
{
    return pageIndex >= 0 && pageIndex < this.pages.length;
};

ImageManifest.prototype.getPageDimensionsAtZoomLevel = function (pageIndex, zoomLevel)
{
    var maxDims = this.pages[pageIndex].d[this.maxZoom];

    var scaleRatio = getScaleRatio(this.maxZoom, zoomLevel);

    return {
        height: maxDims.h * scaleRatio,
        width: maxDims.w * scaleRatio
    };
};

/**
 * Returns a URL for the image of the given page. The optional size
 * parameter supports setting the image width or height (default is
 * full-sized).
 */
ImageManifest.prototype.getPageImageURL = function (pageIndex, size)
{
    return this._urlAdapter.getPageImageURL(this, pageIndex, size);
};

/**
 * Return an array of tile objects for the specified page and integer zoom level
 */
ImageManifest.prototype.getPageImageTiles = function (pageIndex, zoomLevel, tileDimensions)
{
    var page = this.pages[pageIndex];

    if (!isFinite(zoomLevel) || zoomLevel % 1 !== 0)
        throw new TypeError('Zoom level must be an integer: ' + zoomLevel);

    var rows = Math.ceil(page.d[zoomLevel].h / tileDimensions.height);
    var cols = Math.ceil(page.d[zoomLevel].w / tileDimensions.width);

    var tiles = [];

    var row, col, url;

    for (row = 0; row < rows; row++)
    {
        for (col = 0; col < cols; col++)
        {
            url = this._urlAdapter.getTileImageURL(this, pageIndex, {
                row: row,
                col: col,
                rowCount: rows,
                colCount: cols,
                zoomLevel: zoomLevel,
                tileDimensions: tileDimensions
            });

            // FIXME: Dimensions should account for partial tiles (e.g. the
            // last row and column in a tiled image)
            tiles.push({
                row: row,
                col: col,
                zoomLevel: zoomLevel,
                dimensions: {
                    height: tileDimensions.height,
                    width: tileDimensions.width
                },
                offset: {
                    top: row * tileDimensions.height,
                    left: col * tileDimensions.width
                },
                url: url
            });
        }
    }

    return {
        zoomLevel: zoomLevel,
        rows: rows,
        cols: cols,
        tiles: tiles
    };
};

ImageManifest.prototype.getMaxWidth = zoomedPropertyGetter('_maxWidths');
ImageManifest.prototype.getMaxHeight = zoomedPropertyGetter('_maxHeights');
ImageManifest.prototype.getAverageWidth = zoomedPropertyGetter('_averageWidths');
ImageManifest.prototype.getAverageHeight = zoomedPropertyGetter('_averageHeights');
ImageManifest.prototype.getTotalWidth = zoomedPropertyGetter('_totalWidths');
ImageManifest.prototype.getTotalHeight = zoomedPropertyGetter('_totalHeights');

function zoomedPropertyGetter(privateName)
{
    return function (zoomLevel)
    {
        return this[privateName][zoomLevel];
    };
}

function getScaleRatio(sourceZoomLevel, targetZoomLevel)
{
    return 1 / Math.pow(2, sourceZoomLevel - targetZoomLevel);
}

function IIIFSourceAdapter()
{
    // No-op
}

IIIFSourceAdapter.prototype.getPageImageURL = function (manifest, pageIndex, size)
{
    var dimens;

    if (!size || (size.width == null && size.height == null))
        dimens = 'full';
    else
        dimens = (size.width == null ? '' : size.width) + ',' + (size.height == null ? '' : size.height);

    var page = manifest.pages[pageIndex];
    var quality = (page.api > 1.1) ? 'default' : 'native';

    return encodeURI(page.url + 'full/' + dimens + '/0/' + quality + '.jpg');
};

IIIFSourceAdapter.prototype.getTileImageURL = function (manifest, pageIndex, params)
{
    var page = manifest.pages[pageIndex];

    var height, width;

    if (params.row === params.rowCount - 1)
        height = page.d[params.zoomLevel].h - (params.rowCount - 1) * params.tileDimensions.height;
    else
        height = params.tileDimensions.height;

    if (params.col === params.colCount - 1)
        width = page.d[params.zoomLevel].w - (params.colCount - 1) * params.tileDimensions.width;
    else
        width = params.tileDimensions.width;

    var zoomDifference = Math.pow(2, manifest.maxZoom - params.zoomLevel);

    var x = params.col * params.tileDimensions.width * zoomDifference;
    var y = params.row * params.tileDimensions.height * zoomDifference;

    if (page.hasOwnProperty('xoffset'))
    {
        x += page.xoffset;
        y += page.yoffset;
    }

    var region = [x, y, width * zoomDifference, height * zoomDifference].join(',');

    var quality = (page.api > 1.1) ? 'default' : 'native';

    return encodeURI(page.url + region + '/' + width + ',' + height + '/0/' + quality + '.jpg');
};

function LegacyManifestSourceAdapter(config)
{
    this._config = config;
}

LegacyManifestSourceAdapter.prototype.getPageImageURL = function (manifest, pageIndex, size)
{
    // Without width or height specified, IIPImage defaults to full-size
    var dimens = '';

    if (size)
    {
        if (size.width != null)
            dimens += '&WID=' + size.width;

        if (size.height != null)
            dimens += '&HEI=' + size.height;
    }

    var filename = manifest.pages[pageIndex].f;

    return this._config.iipServerURL + "?FIF=" + this._config.imageDir + '/' + filename + dimens + '&CVT=JPEG';
};

LegacyManifestSourceAdapter.prototype.getTileImageURL = function (manifest, pageIndex, params)
{
    var page = manifest.pages[pageIndex];
    var requestedZoomLevel = params.zoomLevel + page.m - manifest.maxZoom;
    var index = (params.row * params.colCount) + params.col;
    var jtl = requestedZoomLevel + ',' + index;

    return encodeURI(this._config.iipServerURL + "?FIF=" + this._config.imageDir + '/' + page.f + '&JTL=' + jtl + '&CVT=JPEG');
};
