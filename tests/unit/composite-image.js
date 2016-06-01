'use strict';

var CompositeImage = require('../../source/js/composite-image');

QUnit.module('CompositeImage');

QUnit.test('getTiles()', function (assert)
{
    var tileLevels = [
        dummyTileLevel({ zoomLevel: 2, baseRows: 1, baseCols: 1 }),
        dummyTileLevel({ zoomLevel: 1, baseRows: 1, baseCols: 1 }),
        dummyTileLevel({ zoomLevel: 0, baseRows: 1, baseCols: 1 })
    ];

    var composite = new CompositeImage(tileLevels);

    // Load all the really low-res tiles
    composite.updateWithLoadedUrls(getUrls(tileLevels[2].tiles));

    assert.propEqual(composite.getTiles(), tileLevels[2].tiles, 'Should load available images');

    var mostOfLevel1 = tileLevels[1].tiles.slice(1);
    composite.updateWithLoadedUrls(getUrls(mostOfLevel1));

    assert.propEqual(composite.getTiles(), [tileLevels[2].tiles[0]].concat(mostOfLevel1),
        'Should load lower-res tiles if not completely covered (with low-res first)');

    composite.clear();
    composite.updateWithLoadedUrls(getUrls(tileLevels[2].tiles));
    var mostOfLevel0 = tileLevels[0].tiles.slice(1);
    composite.updateWithLoadedUrls(getUrls(mostOfLevel0));

    assert.propEqual(composite.getTiles(), [tileLevels[2].tiles[0]].concat(mostOfLevel0),
        'Should load lower-res tiles across multiple zoom levels if not completely covered');
});

function dummyTileLevel(options)
{
    var zoomLevel = options.zoomLevel,
        baseRows = options.baseRows,
        baseCols = options.baseCols;

    var tiles = [];
    var scaleRatio = Math.pow(2, zoomLevel);

    for (var baseRow=0; baseRow < baseRows; baseRow++) {
        for (var baseCol=0; baseCol < baseCols; baseCol++) {
            tiles.push.apply(tiles, dummyTiles(scaleRatio, baseRow, baseCol));
        }
    }

    return {
        zoomLevel: zoomLevel,
        rows: baseRows * scaleRatio,
        cols: baseCols * scaleRatio,
        tiles: tiles
    };
}

function dummyTiles(scaleRatio, baseRow, baseCol)
{
    var tiles = [];

    for (var rowOffset=0; rowOffset < scaleRatio; rowOffset++)
    {
        for (var colOffset=0; colOffset < scaleRatio; colOffset++)
        {
            var row = baseRow * scaleRatio + rowOffset;
            var col = baseCol * scaleRatio + colOffset;

            var url = 'dummy://ratio/' + scaleRatio + '/' +
                baseRow + '[' + rowOffset + ']/' +
                baseCol + '[' + colOffset + ']';

            // FIXME: More fields
            tiles.push({
                url: url,
                row: row,
                col: col
            });
        }
    }

    return tiles;
}

function getUrls(tiles) {
    return tiles.map(function (tile)
    {
        return tile.url;
    });
}
