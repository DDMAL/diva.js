module.exports = CompositeImage;

/**
 * @class CompositeImage
 * @private
 *
 * Utility class to composite tiles into a complete image
 * and track the rendered state of an image as new tiles
 * load.
 */

/**
 * @param levels {Array.<Array.<Tile>>}
 * @constructor
 */
function CompositeImage(levels)
{
    this._levels = levels;  // Assume levels sorted high-res first
    var urlsToTiles = this._urlsToTiles = {};

    levels.forEach(function (level)
    {
        level.tiles.forEach(function (tile)
        {
            urlsToTiles[tile.url] = {
                zoomLevel: level.zoomLevel,
                row: tile.row,
                col: tile.col
            };
        });
    });

    this.clear();
}

CompositeImage.prototype.clear = function ()
{
    var loadedByLevel = this._loadedByLevel = {};

    this._levels.forEach(function (level)
    {
        loadedByLevel[level.zoomLevel] = new TileCoverageMap(level.rows, level.cols);
    });
};

CompositeImage.prototype.getTiles = function (baseZoomLevel)
{
    var toRenderByLevel = [];
    var highestZoomLevel = this._levels[0].zoomLevel;
    var covered = new TileCoverageMap(this._levels[0].rows, this._levels[0].cols);

    var bestLevelIndex;

    // Default to the lowest zoom level
    if (baseZoomLevel === null)
    {
        bestLevelIndex = 0;
    }
    else
    {
        var ceilLevel = Math.ceil(baseZoomLevel);
        bestLevelIndex = findIndex(this._levels, function (level)
        {
            return level.zoomLevel <= ceilLevel;
        });
    }


    // The best level, followed by higher-res levels in ascending order of resolution,
    // followed by lower-res levels in descending order of resolution
    var levelsByPreference = this._levels.slice(0, bestLevelIndex + 1).reverse()
        .concat(this._levels.slice(bestLevelIndex + 1));

    levelsByPreference.forEach(function (level)
    {
        var loaded = this._loadedByLevel[level.zoomLevel];

        var additionalTiles = level.tiles.filter(function (tile)
        {
            return loaded.isLoaded(tile.row, tile.col);
        });

        // Filter out entirely covered tiles

        // FIXME: Is it better to draw all of a partially covered tile,
        // with some of it ultimately covered, or to pick out the region
        // which needs to be drawn?
        // See https://github.com/DDMAL/diva.js/issues/358

        var scaleRatio = Math.pow(2, highestZoomLevel - level.zoomLevel);

        additionalTiles = additionalTiles.filter(function (tile)
        {
            var isNeeded = false;

            var highResRow = tile.row * scaleRatio;
            var highResCol = tile.col * scaleRatio;

            for (var i=0; i < scaleRatio; i++)
            {
                for (var j=0; j < scaleRatio; j++)
                {
                    if (!covered.isLoaded(highResRow + i, highResCol + j))
                    {
                        isNeeded = true;
                        covered.set(highResRow + i, highResCol + j, true);
                    }
                }
            }

            return isNeeded;
        });

        toRenderByLevel.push(additionalTiles);
    }, this);

    // Less-preferred tiles should come first
    toRenderByLevel.reverse();

    var tiles = [];

    toRenderByLevel.forEach(function (byLevel)
    {
        tiles.push.apply(tiles, byLevel);
    });

    return tiles;
};

/**
 * Update the composite image to take into account all the URLs
 * loaded in an image cache.
 *
 * @param cache {ImageCache}
 */
CompositeImage.prototype.updateFromCache = function (cache)
{
    this.clear();

    this._levels.forEach(function (level)
    {
        var loaded = this._loadedByLevel[level.zoomLevel];

        level.tiles.forEach(function (tile)
        {
            if (cache.has(tile.url))
                loaded.set(tile.row, tile.col, true);
        });
    }, this);
};

CompositeImage.prototype.updateWithLoadedUrls = function (urls)
{
    urls.forEach(function (url)
    {
        var entry = this._urlsToTiles[url];
        this._loadedByLevel[entry.zoomLevel].set(entry.row, entry.col, true);
    }, this);
};

function TileCoverageMap(rows, cols)
{
    this._rows = rows;
    this._cols = cols;

    this._map = fill(rows).map(function ()
    {
        return fill(cols, false);
    });
}

TileCoverageMap.prototype.isLoaded = function (row, col)
{
    // Return true for out of bounds tiles because they
    // don't need to load. (Unfortunately this will also
    // mask logical errors.)
    if (row >= this._rows || col >= this._cols)
        return true;

    return this._map[row][col];
};

TileCoverageMap.prototype.set = function (row, col, value)
{
    this._map[row][col] = value;
};

function fill(count, value)
{
    var arr = new Array(count);

    for (var i=0; i < count; i++)
        arr[i] = value;

    return arr;
}

function findIndex(array, predicate)
{
    var length = array.length;
    for (var i = 0; i < length; i++)
    {
        if (predicate(array[i], i))
            return i;
    }

    return -1;
}
