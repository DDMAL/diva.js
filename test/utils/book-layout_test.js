import ImageManifest from '../../source/js/image-manifest';
import getBookLayout from '../../source/js/page-layouts/book-layout';

var beromunsterManifest = require('../manifests/beromunsterManifest.json');
var manifest = ImageManifest.fromIIIF(beromunsterManifest);

describe('Get Book Layout', function ()
{
    it('In vertical orientation positions first page to the right', function ()
    {
        var layouts = getBookLayout({
            manifest: manifest,
            verticallyOriented: true
        });

        var firstGroup = layouts[0];
        var width = manifest.getMaxPageDimensions(0).width;

        assert.strictEqual(firstGroup.pages.length, 1, 'First group should be a single page');
        assert.strictEqual(firstGroup.dimensions.width, 2 * width, 1, 'Group size should be twice page width');
        assert.strictEqual(firstGroup.pages[0].groupOffset.left, width, 1, 'Page should be offset to the left by its width');
    });

    it('In horizontal orientation, shrink first group to single page size', function ()
    {
        var layouts = getBookLayout({
            manifest: manifest,
            verticallyOriented: false
        });

        var firstGroup = layouts[0];
        var width = manifest.getMaxPageDimensions(0).width;

        assert.strictEqual(firstGroup.pages.length, 1, 'First group should be a single page');
        assert.strictEqual(firstGroup.dimensions.width, width, 1, 'Group width should be page width');
        assert.strictEqual(firstGroup.pages[0].groupOffset.left, 0, 1, 'Page should not be offset to the left');
    });

    it('In vertical orientation, facing pages groups fit max height, width', function ()
    {
        var layouts = getBookLayout({
            manifest: manifest,
            verticallyOriented: true
        });

        var group = layouts[1];

        assertDifferentSizePages(group);

        assertFitsMax(group, 'width');
        assertFitsMax(group, 'height');
    });

    it('In horizontal orientation, facing pages groups fit max height, tight width', function ()
    {
        var layouts = getBookLayout({
            manifest: manifest,
            verticallyOriented: false
        });

        var group = layouts[1];

        assertDifferentSizePages(group);
        assertFitsMax(group, 'height');

        var width1 = group.pages[0].dimensions.width;
        var width2 = group.pages[1].dimensions.width;
        var groupWidth = group.dimensions.width;

        assert.closeTo(groupWidth, width1 + width2, 1, 'Group width should be sum of page widths');
    });

    it('In vertical orientation, final left page is left-aligned', function ()
    {
        var layouts = getBookLayout({
            manifest: manifest,
            verticallyOriented: true
        });

        var lastGroup = layouts[layouts.length - 1];

        assert.strictEqual(lastGroup.pages.length, 1, 'Sanity check: Last group should be a single page');

        assert.closeTo(lastGroup.dimensions.width,
            lastGroup.pages[0].dimensions.width * 2,
            1,
            'Group width should be twice page width');

        assert.strictEqual(lastGroup.dimensions.height,
            lastGroup.pages[0].dimensions.height,
            'Group height should be page height');

        assert.closeTo(lastGroup.pages[0].groupOffset.left, 0, 1, 'Page should not be offset to the left');
    });

    it('In horizontal orientation, final left page is is in tight-fit group', function ()
    {
        var layouts = getBookLayout({
            manifest: manifest,
            verticallyOriented: false
        });

        var lastGroup = layouts[layouts.length - 1];

        assert.strictEqual(lastGroup.pages.length, 1, 'Sanity check: Last group should be a single page');

        assert.deepEqual(lastGroup.dimensions, lastGroup.pages[0].dimensions, 1, 'Group size should be page size');
        assert.closeTo(lastGroup.pages[0].groupOffset.left, 0, 1, 'Page should not be offset to the left');
    });

    it('Displays facing pages in tight-fit group', function ()
    {
        var layouts = getBookLayout({
            manifest: manifest,
            verticallyOriented: true
        });

        var group = layouts[17];

        assert.strictEqual(group.pages.length, 1, 'In own group');
        assert.strictEqual(group.dimensions.width, group.pages[0].dimensions.width, 'Tight fit width');
    });

    function assertFitsMax(group, dimension)
    {
        var p1 = group.pages[0].dimensions[dimension];
        var p2 = group.pages[1].dimensions[dimension];
        var g = group.dimensions[dimension];

        var times = dimension === 'width' ? 2 : 1;

        assert.closeTo(g, Math.max(p1, p2) * times, 1, 'Group ' + dimension + ' should be derived from max page ' + dimension);
    }

    function assertDifferentSizePages(group)
    {
        assertDimenDiffers(group, 'height');
        assertDimenDiffers(group, 'width');
    }

    function assertDimenDiffers(group, dimension)
    {
        var p1 = group.pages[0].dimensions[dimension];
        var p2 = group.pages[1].dimensions[dimension];

        assert.notStrictEqual(p1, p2, 'Sanity check: page ' + dimension + ' differs');
    }
});