import CompositeImage from '../source/js/composite-image';

describe('Composite Image', function () 
{
    it('getTiles(zoomLevel) works properly', function ()
    {
        let tileLevels = [
            dummyTileLevel({ zoomLevel: 2, baseRows: 1, baseCols: 1 }),
            dummyTileLevel({ zoomLevel: 1, baseRows: 1, baseCols: 1 }),
            dummyTileLevel({ zoomLevel: 0, baseRows: 1, baseCols: 1 })
        ];

        let composite = new CompositeImage(tileLevels);

        // Load the really low-res tile
        composite.updateWithLoadedUrls(getUrls(tileLevels[2].tiles));

        assert.deepEqual(composite.getTiles(2), tileLevels[2].tiles, 'Should load available images');

        let mostOfLevel1 = tileLevels[1].tiles.slice(1);
        composite.updateWithLoadedUrls(getUrls(mostOfLevel1));

        assert.deepEqual(composite.getTiles(2), [tileLevels[2].tiles[0]].concat(mostOfLevel1),
            'Should load lower-res tiles if not completely covered (with low-res first)');

        assert.deepEqual(composite.getTiles(0), tileLevels[2].tiles,
            'Should prefer tiles at the specified zoomLevel, then higher levels, then lower');

        composite.clear();
        composite.updateWithLoadedUrls(getUrls(tileLevels[2].tiles));
        let mostOfLevel0 = tileLevels[0].tiles.slice(1);
        composite.updateWithLoadedUrls(getUrls(mostOfLevel0));

        assert.deepEqual(composite.getTiles(2), [tileLevels[2].tiles[0]].concat(mostOfLevel0),
            'Should load lower-res tiles across multiple zoom levels if not completely covered');
    });
});

function dummyTileLevel(options)
{
    let zoomLevel = options.zoomLevel,
        baseRows = options.baseRows,
        baseCols = options.baseCols;

    let tiles = [];
    let scaleRatio = Math.pow(2, zoomLevel);

    for (let baseRow=0; baseRow < baseRows; baseRow++) {
        for (let baseCol=0; baseCol < baseCols; baseCol++) {
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
    let tiles = [];

    for (let rowOffset=0; rowOffset < scaleRatio; rowOffset++)
    {
        for (let colOffset=0; colOffset < scaleRatio; colOffset++)
        {
            let row = baseRow * scaleRatio + rowOffset;
            let col = baseCol * scaleRatio + colOffset;

            let url = 'dummy://ratio/' + scaleRatio + '/' +
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