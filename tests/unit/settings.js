/*
Test coverage: pretty much complete
*/

var $ = require('jquery');
var clearTempDiva = require('../utils').clearTempDiva;
var diva = require('../../source/js/diva');

QUnit.module("Settings", { beforeEach: clearTempDiva });

QUnit.test("adaptivePadding enabled", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings) {
        assert.notStrictEqual(settings.verticalPadding, 10, "Adaptive padding should be used, overrides vertical/horizontal");
        assert.notStrictEqual(settings.horizontalPadding, 10, "Horizontal padding should be overridden by adaptive");
        done();
    });

    $.tempDiva({
        adaptivePadding: 0.10
    });
});

QUnit.test("adaptivePadding disabled, fixedPadding set", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.verticalPadding, 40, "Vertical padding should be 40 (the minimum with plugins enabled)");
        assert.strictEqual(settings.horizontalPadding, 11, "Horizontal padding should be 11 (fixedPadding)");
        done();
    });

    $.tempDiva({
        adaptivePadding: 0,
        fixedPadding: 11
    });

});

// enableCanvas and enableDownload are tested in plugins.js

// enableFilename is tested in hashparams.js

QUnit.test("enableFullscreen false", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        // Make sure the fullscreen icon is not there
        assert.strictEqual($(settings.selector + 'fullscreen').length, 0, "Fullscreen icon should not be present");
        done();
    });

    $.tempDiva({
        enableFullscreen: false
    });
});

QUnit.test("enableFullscreen true", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        // Make sure the fullscreen icon is there
        assert.notStrictEqual($(settings.selector + 'fullscreen-icon').length, 0, "Fullscreen icon should be present");
        done();
    });

    $.tempDiva({
        enableFullscreen: true
    });
});

QUnit.test("enableGotoPage false", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual($(settings.selector + 'goto-page').length, 0, "Go-to-page box should not be present");
        done();
    });

    $.tempDiva({
        enableGotoPage: false
    });
});

QUnit.test("enableGotoPage true", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.notStrictEqual($(settings.selector + 'goto-page').length, 0, "Go-to-page box should be present");
        done();
    });

    $.tempDiva({
        enableGotoPage: true
    });
});

//TODO view icon tests

QUnit.test("enableGridIcon false, enableLinkIcon true", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
            // Check that the link icon is there
            assert.notStrictEqual($(settings.selector + 'link-icon').length, 0, "Link icon should be present");
            // But the left border should be there for the link icon
            assert.notStrictEqual($(settings.selector + 'link-icon').css('border-left-width'), '0px', "Link icon should have a left border");

            done();
    });

    $.tempDiva({
        enableGridIcon: false
    });
});

QUnit.test("enableGridIcon true, enableLinkIcon true", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.notStrictEqual($(settings.selector + 'grid-icon').length, 0, "Grid icon should be present");
        assert.notStrictEqual($(settings.selector + 'link-icon').length, 0, "Link icon should be present");
        done();
    });

    $.tempDiva({
        enableGridIcon: true
    });
});

QUnit.test("enableLinkIcon false, enableGridIcon true", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual($(settings.selector + 'link-icon').length, 0, "Link icon should not be present");

        // The grid icon should look normal
        assert.notStrictEqual($(settings.selector + 'grid-icon').css('border-right-width'), '0px', "Link icon should have a right border");
        done();
    });

    $.tempDiva({
        enableLinkIcon: false,
        enableGridIcon: true
    });
});

// Skipping the key and space scroll ones, because they're hard to test

// test enableZoom/Grid Slider/Buttons settings
QUnit.test("enableGridControls 'slider'", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.notStrictEqual($(settings.selector + 'grid-slider').length, 0, "Grid slider should be present");
        assert.notStrictEqual($(settings.selector + 'grid-label').length, 0, "Grid label should be present");
        assert.strictEqual($(settings.selector + 'grid-out-button').length, 0, "Grid buttons should not be present");
        assert.strictEqual($(settings.selector + 'grid-in-button').length, 0, "Grid buttons should not be present");
        done();
    });

    $.tempDiva({
        enableGridControls: 'slider'
    });
});

QUnit.test("enableZoomControls 'slider'", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.notStrictEqual($(settings.selector + 'zoom-slider').length, 0, "Zoom slider should be present");
        assert.notStrictEqual($(settings.selector + 'zoom-label').length, 0, "Zoom label should be present");
        assert.strictEqual($(settings.selector + 'zoom-out-button').length, 0, "Zoom buttons should not be present");
        assert.strictEqual($(settings.selector + 'zoom-in-button').length, 0, "Zoom buttons should not be present");
        assert.notStrictEqual($(settings.selector + 'grid-label').length, 0, "Grid label should be present");
        done();
    });

    $.tempDiva({
        enableZoomControls: 'slider'
    });
});

QUnit.test("enableGridControls 'buttons'", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.notStrictEqual($(settings.selector + 'grid-out-button').length, 0, "Grid out button should be present");
        assert.notStrictEqual($(settings.selector + 'grid-in-button').length, 0, "Grid in button should be present");
        assert.notStrictEqual($(settings.selector + 'grid-label').length, 0, "Grid label should be present");
        assert.strictEqual($(settings.selector + 'grid-slider').length, 0, "Grid slider should not be present");
        done();
    });

    $.tempDiva({
        enableGridControls: 'buttons'
    });
});

QUnit.test("enableZoomControls 'buttons'", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
            assert.notStrictEqual($(settings.selector + 'zoom-out-button').length, 0, "Zoom out button should be present");
            assert.notStrictEqual($(settings.selector + 'zoom-in-button').length, 0, "Zoom in button should be present");
            assert.notStrictEqual($(settings.selector + 'zoom-label').length, 0, "Zoom label should be present");
            assert.strictEqual($(settings.selector + 'zoom-slider').length, 0, "Grid slider should not be present");
            done();
    });

    $.tempDiva({
        enableZoomControls: 'buttons'
    });
});

// fixedPadding tested at the top (along with adaptivePadding)

QUnit.test("fixedHeightGrid false", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        this.enterGridView();
        // Check all the widths are the same, but that the heights are different
        var pages = $('.diva-page');
        var firstPage = $(pages[0]);
        var sameWidths = true, sameHeights = true, thisPage, i, length;
        for (i = 1, length = pages.length; i < length; i++) {
            thisPage = $(pages[i]);
            sameWidths = sameWidths && (thisPage.width() == firstPage.width());
            sameHeights = sameHeights && (thisPage.height() == firstPage.height());
        }

        assert.ok(sameWidths, "All page widths should be equal");
        assert.ok(!sameHeights, "All page heights should NOT be equal");

        done();
    });

    $.tempDiva({
        fixedHeightGrid: false
    });
});

QUnit.test("fixedHeightGrid true", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        this.enterGridView();

        // Check that all the widths are the same, bu that the heights are different
        var pages = $('.diva-page');
        var firstPage = $(pages[0]);
        var sameWidths = true, sameHeights = true, thisPage, i, length;
        for (i = 1, length = pages.length; i < length; i++) {
            thisPage = $(pages[i]);
            sameWidths = sameWidths && (thisPage.width() == firstPage.width());
            sameHeights = sameHeights && (thisPage.height() == firstPage.height());
        }

        assert.ok(!sameWidths, "All page widths should NOT be equal");
        assert.ok(sameHeights, "All page heights should be equal");

        done();
    });

    $.tempDiva({
        fixedHeightGrid: true
    });
});

QUnit.test("goDirectlyTo, valid", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.currentPageIndex, 10, "The initial page index should be 10");
        done();
    });

    $.tempDiva({
        goDirectlyTo: 10
    });
});

QUnit.test("goDirectlyTo, invalid", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.currentPageIndex, 0, "The initial page index should be 0 (the fallback)");
        done();
    });

    $.tempDiva({
        goDirectlyTo: -10
    });
});

// iipServerURL can't really be tested, just have to rely on this to work

QUnit.test("inBookLayout true", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.ok(settings.inBookLayout, 'inBookLayout should remain true after initialization');
        assert.ok(this.getPageOffset(1).left < this.getPageOffset(2).left, 'Page 1 should be to the left of page 2');
        assert.ok(this.getPageOffset(2).left > this.getPageOffset(3).left, 'Page 2 should be to the right of page 3');
        done();
    });

    $.tempDiva({
        inBookLayout: true
    });
});

QUnit.test("manifest.paged triggers inBookLayout", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.ok(settings.manifest.paged, 'settings.manifest.paged should be true when manifest has viewingHint: paged');
        assert.ok(settings.inBookLayout, 'settings.inBookLayout should be true when manifest.paged is true');

        done();
    });

    $.tempDiva({
        objectData: '../demo/beromunster-iiif.json'
    });
});

QUnit.test("inGrid false", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.ok(!settings.inGrid, "inGrid setting should still be false");
        assert.strictEqual($(settings.selector + 'view-menu').children()[0].classList[0], 'diva-document-icon', "Current toolbar view icon should be the document icon");
        done();
    });

    $.tempDiva({
        inGrid: false
    });
});

QUnit.test("inGrid true", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.ok(settings.inGrid, "inGrid setting should be preserved");
        assert.strictEqual($(settings.selector + 'view-menu').children()[0].classList[0], 'diva-grid-icon', "Current toolbar view icon should be the grid icon");
        done();
    });

    $.tempDiva({
        inGrid: true
    });
});

// imageDir cannot really be tested either

QUnit.test("valid max/minPagesPerRow, valid pagesPerRow", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.minPagesPerRow, 3, "minPagesPerRow should be 3");
        assert.strictEqual(settings.maxPagesPerRow, 5, "maxPagesPerRow should be 5");
        assert.strictEqual(settings.pagesPerRow, 5, "pagesPerRow is valid");
        done();
    });

    $.tempDiva({
        minPagesPerRow: 3,
        maxPagesPerRow: 5,
        pagesPerRow: 5
    });
});

QUnit.test("invalid max/minPagesPerRow, invalid pagesPerRow", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.minPagesPerRow, 2, "minPagesPerRow is invalid, set to 2");
        assert.strictEqual(settings.maxPagesPerRow, 2, "maxPagesPerRow should be set to min");
        assert.strictEqual(settings.pagesPerRow, 2, "invalid pages per row should be set to min");
        done();
    });

    $.tempDiva({
        minPagesPerRow: 1,
        maxPagesPerRow: 0,
        pagesPerRow: 4
    });
});

QUnit.test("max/minZoomLevel, invalid values", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.minZoomLevel, 0, "minZoomLevel should be set to 0");
        assert.strictEqual(settings.maxZoomLevel, 4, "maxZoomLevel should be set to 4");
        done();
    });

    $.tempDiva({
        minZoomLevel: -2,
        maxZoomLevel: 6
    });
});

QUnit.test("max/minZoomLevel, valid values, valid zoomLevel", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.minZoomLevel, 1, "minZoomLevel should be set to 1");
        assert.strictEqual(settings.maxZoomLevel, 3, "maxZoomLevel should be set to 3");
        assert.strictEqual(settings.zoomLevel, 2, "zoomLevel should be 2");
        done();
    });

    $.tempDiva({
        minZoomLevel: 1,
        maxZoomLevel: 3,
        zoomLevel: 2
    });
});

QUnit.test("max/minZoomLevel, valid values, invalid zoomLevel", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.zoomLevel, 1, "Zoom level should be the minZoomLevel (1)");
        done();
    });

    $.tempDiva({
        minZoomLevel: 1,
        maxZoomLevel: 3,
        zoomLevel: 0
    });
});

QUnit.test("max/minZoomLevel, invalid/valid values, invalid zoomLevel", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(settings.minZoomLevel, 2, "minZoomLevel should be set to 2 (valid)");
        assert.strictEqual(settings.maxZoomLevel, 4, "maxZoomLevel should be set to 4 (invalid)");
        assert.strictEqual(settings.zoomLevel, 2, "zoomLevel should be 2 (the minimum)");
        done();
    });

    $.tempDiva({
        minZoomLevel: 2,
        maxZoomLevel: -2,
        zoomLevel: -2
    });
});

QUnit.test("object for objectData", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        assert.strictEqual(this.getItemTitle(), "First page of Beromunster", "Should process an object for objectData like a normal manifest");
        done();
    });

    $.tempDiva({
        objectData: {
          "@context": "http://iiif.io/api/presentation/2/context.json",
          "@id": "http://dev-diva.simssa.ca/iiif/srv/images/beromunster/manifest.json",
          "@type": "sc:Manifest",
          "label": "First page of Beromunster",
          "viewingHint": "paged",
          "sequences": [
            {
              "@type": "sc:Sequence",
              "canvases": [
                {
                  "@id": "http://dev-diva.simssa.ca/iiif/srv/images/beromunster/canvas/bm_001.json",
                  "@type": "sc:Canvas",
                  "label": "Bm 001",
                  "height": 4445,
                  "width": 2846,
                  "images": [
                    {
                      "@type": "oa:Annotation",
                      "motivation": "sc:painting",
                      "resource": {
                        "@id": "http://dev-diva.simssa.ca/iiif/srv/images/beromunster/bm_001.tif/full/full/0/default.jpg",
                        "@type": "dctypes:Image",
                        "format": "image/jpeg",
                        "height": 4445,
                        "width": 2846,
                        "service": {
                          "@context": "http://iiif.io/api/image/2/context.json",
                          "@id": "http://dev-diva.simssa.ca/iiif/srv/images/beromunster/bm_001.tif",
                          "profile": "http://iiif.io/api/image/2/level2.json"
                        }
                      },
                      "on": "http://dev-diva.simssa.ca/iiif/srv/images/beromunster/canvas/bm_001.json"
                    }
                  ]
                }
              ]
            }
          ]
        }
    });
});

// pageLoadTimeout is a bit weird to test, but the code is simple so it should be fine

// pagesPerRow is tested above, along with max/minPagesPerRow

// rowLoadTimeout is in the same boat as pageLoadTimeout

// No real point testing tileHeight/Width as we don't have images of different tile sizes

QUnit.test("viewportMargin, value of 0", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        setTimeout(function ()
        {
            assert.notStrictEqual($(settings.selector + 'page-0').length, 0, "The first page should be present");
            assert.strictEqual($(settings.selector + 'page-1').length, 0, "The second page should not be present");
            done();
        }, 100);
    });

    $.tempDiva({
        viewportMargin: 0
    });
});

QUnit.test("viewportMargin, value of 1000", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        // The second page should be visible after a timeout
        setTimeout(function () {
            assert.notStrictEqual($(settings.selector + 'page-0').length, 0, "The first page should be present");
            assert.notStrictEqual($(settings.selector + 'page-1').length, 0, "The second page should be present");
            done();
        }, 100);
    });

    $.tempDiva({
        viewportMargin: 1000
    });
});
