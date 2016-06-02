var ImageManifest = require('../../../source/js/image-manifest');
var getBookLayout = require('../../../source/js/page-layouts/book-layout');

var iiifBeromunster = require('../../../demo/beromunster-iiif.json');

var manifest = ImageManifest.fromIIIF(iiifBeromunster);

QUnit.module('getBookLayout');

QUnit.test('In vertical orientation positions first page to the right', function (assert)
{
    var layouts = getBookLayout({
        manifest: manifest,
        zoomLevel: 2,
        verticallyOriented: true
    });

    var firstGroup = layouts[0];
    var width = manifest.pages[0].d[2].w;

    assert.strictEqual(firstGroup.pages.length, 1, 'First group should be a single page');
    assert.close(firstGroup.dimensions.width, 2 * width, 1, 'Group size should be twice page width');
    assert.close(firstGroup.pages[0].groupOffset.left, width, 1, 'Page should be offset to the left by its width');
});

QUnit.test('In horizontal orientation, shrink first group to single page size', function (assert)
{
    var layouts = getBookLayout({
        manifest: manifest,
        zoomLevel: 2,
        verticallyOriented: false
    });

    var firstGroup = layouts[0];
    var width = manifest.pages[0].d[2].w;

    assert.strictEqual(firstGroup.pages.length, 1, 'First group should be a single page');
    assert.close(firstGroup.dimensions.width, width, 1, 'Group width should be page width');
    assert.close(firstGroup.pages[0].groupOffset.left, 0, 1, 'Page should not be offset to the left');
});

QUnit.test('In vertical orientation, facing pages groups fit max height, width', function (assert)
{
    var layouts = getBookLayout({
        manifest: manifest,
        zoomLevel: 2,
        verticallyOriented: true
    });

    var group = layouts[1];

    assertDifferentSizePages(group, assert);

    assertFitsMax(group, 'width', assert);
    assertFitsMax(group, 'height', assert);
});

QUnit.test('In horizontal orientation, facing pages groups fit max height, tight width', function (assert)
{
    var layouts = getBookLayout({
        manifest: manifest,
        zoomLevel: 2,
        verticallyOriented: false
    });

    var group = layouts[1];

    assertDifferentSizePages(group, assert);
    assertFitsMax(group, 'height', assert);

    var width1 = group.pages[0].dimensions.width;
    var width2 = group.pages[1].dimensions.width;
    var groupWidth = group.dimensions.width;

    assert.close(groupWidth, width1 + width2, 1, 'Group width should be sum of page widths');
});

QUnit.test('In vertical orientation, final left page is left-aligned', function (assert)
{
    var layouts = getBookLayout({
        manifest: manifest,
        zoomLevel: 2,
        verticallyOriented: true
    });

    var lastGroup = layouts[layouts.length - 1];

    assert.strictEqual(lastGroup.pages.length, 1, 'Sanity check: Last group should be a single page');

    assert.close(lastGroup.dimensions.width,
        lastGroup.pages[0].dimensions.width * 2,
        1,
        'Group width should be twice page width');

    assert.strictEqual(lastGroup.dimensions.height,
        lastGroup.pages[0].dimensions.height,
        'Group height should be page height');

    assert.close(lastGroup.pages[0].groupOffset.left, 0, 1, 'Page should not be offset to the left');
});

QUnit.test('In horizontal orientation, final left page is is in tight-fit group', function (assert)
{
    var layouts = getBookLayout({
        manifest: manifest,
        zoomLevel: 2,
        verticallyOriented: false
    });

    var lastGroup = layouts[layouts.length - 1];

    assert.strictEqual(lastGroup.pages.length, 1, 'Sanity check: Last group should be a single page');

    assert.propEqual(lastGroup.dimensions, lastGroup.pages[0].dimensions, 1, 'Group size should be page size');
    assert.close(lastGroup.pages[0].groupOffset.left, 0, 1, 'Page should not be offset to the left');
});

QUnit.test('Displays facing pages in tight-fit group', function (assert)
{
    var layouts = getBookLayout({
        manifest: manifest,
        zoomLevel: 2,
        verticallyOriented: true
    });

    var group = layouts[17];

    assert.strictEqual(group.pages.length, 1, 'In own group');
    assert.strictEqual(group.dimensions.width, group.pages[0].dimensions.width, 'Tight fit width');
});

function assertFitsMax(group, dimension, assert)
{
    var p1 = group.pages[0].dimensions[dimension];
    var p2 = group.pages[1].dimensions[dimension];
    var g = group.dimensions[dimension];

    var times = dimension === 'width' ? 2 : 1;

    assert.close(g, Math.max(p1, p2) * times, 1, 'Group ' + dimension + ' should be derived from max page ' + dimension);
}

function assertDifferentSizePages(group, assert)
{
    assertDimenDiffers(group, 'height', assert);
    assertDimenDiffers(group, 'width', assert);
}

function assertDimenDiffers(group, dimension, assert)
{
    var p1 = group.pages[0].dimensions[dimension];
    var p2 = group.pages[1].dimensions[dimension];

    assert.notStrictEqual(p1, p2, 'Sanity check: page ' + dimension + ' differs');
}
