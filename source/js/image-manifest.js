import parseIIIFManifest from './parse-iiif-manifest';
import IIIFSourceAdapter from "./iiif-source-adapter";


export default class ImageManifest
{
    constructor (data, urlAdapter)
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

    static fromIIIF (iiifManifest)
    {
        const data = parseIIIFManifest(iiifManifest);
        return new ImageManifest(data, new IIIFSourceAdapter());
    }

    isPageValid (pageIndex, showNonPagedPages)
    {
        if (!showNonPagedPages && this.paged && !this.pages[pageIndex].paged)
        {
            return false;
        }

        return pageIndex >= 0 && pageIndex < this.pages.length;
    }

    getMaxPageDimensions (pageIndex)
    {
        const maxDims = this.pages[pageIndex].d[this.maxZoom];

        return {
            height: maxDims.h,
            width: maxDims.w
        };
    }

    getPageDimensionsAtZoomLevel (pageIndex, zoomLevel)
    {
        const maxDims = this.pages[pageIndex].d[this.maxZoom];

        const scaleRatio = getScaleRatio(this.maxZoom, zoomLevel);

        return {
            height: maxDims.h * scaleRatio,
            width: maxDims.w * scaleRatio
        };
    }

    /**
     * Returns a URL for the image of the given page. The optional size
     * parameter supports setting the image width or height (default is
     * full-sized).
     */
    getPageImageURL (pageIndex, size)
    {
        return this._urlAdapter.getPageImageURL(this, pageIndex, size);
    }

    /**
     * Return an array of tile objects for the specified page and integer zoom level
     */
    getPageImageTiles (pageIndex, zoomLevel, tileDimensions)
    {
        const page = this.pages[pageIndex];

        if (!isFinite(zoomLevel) || zoomLevel % 1 !== 0)
        {
            throw new TypeError('Zoom level must be an integer: ' + zoomLevel);
        }

        const rows = Math.ceil(page.d[zoomLevel].h / tileDimensions.height);
        const cols = Math.ceil(page.d[zoomLevel].w / tileDimensions.width);

        const tiles = [];

        let row, col, url;

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
    }
}

ImageManifest.prototype.getMaxWidth = zoomedPropertyGetter('_maxWidths');
ImageManifest.prototype.getMaxHeight = zoomedPropertyGetter('_maxHeights');
ImageManifest.prototype.getAverageWidth = zoomedPropertyGetter('_averageWidths');
ImageManifest.prototype.getAverageHeight = zoomedPropertyGetter('_averageHeights');
ImageManifest.prototype.getTotalWidth = zoomedPropertyGetter('_totalWidths');
ImageManifest.prototype.getTotalHeight = zoomedPropertyGetter('_totalHeights');

function zoomedPropertyGetter (privateName)
{
    return function (zoomLevel)
    {
        return this[privateName][zoomLevel];
    };
}

function getScaleRatio (sourceZoomLevel, targetZoomLevel)
{
    return 1 / Math.pow(2, sourceZoomLevel - targetZoomLevel);
}
