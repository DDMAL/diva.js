/*
Test coverage: pretty much complete
*/

QUnit.module("Settings", { beforeEach: clearTempDiva });

QUnit.test("adaptivePadding enabled", function (assert) {
    var done = assert.async();
    diva.Events.subscribe('ViewerDidLoad', function(settings) {
        assert.notEqual(settings.verticalPadding, 10, "Adaptive padding should be used, overrides vertical/horizontal");
        assert.notEqual(settings.horizontalPadding, 10, "Horizontal padding should be overridden by adaptive");
        done();
    });

    $.tempDiva({
        adaptivePadding: 0.10
    });
});

asyncTest("adaptivePadding disabled, fixedPadding set", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal(settings.verticalPadding, 40, "Vertical padding should be 40 (the minimum with plugins enabled)");
        equal(settings.horizontalPadding, 11, "Horizontal padding should be 11 (fixedPadding)");
        start();
    });

    $.tempDiva({
        adaptivePadding: 0,
        fixedPadding: 11
    });

});

// enableCanvas and enableDownload are tested in plugins.js

// enableFilename is tested in hashparams.js

asyncTest("enableFullscreen false", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        // Make sure the fullscreen icon is not there
        equal($(settings.selector + 'fullscreen').length, 0, "Fullscreen icon should not be present");
        start();
    });

    $.tempDiva({
        enableFullscreen: false
    });
});

asyncTest("enableFullscreen true", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        // Make sure the fullscreen icon is there
        notEqual($(settings.selector + 'fullscreen-icon').length, 0, "Fullscreen icon should be present");
        start();
    });

    $.tempDiva({
        enableFullscreen: true
    });
});

asyncTest("enableGotoPage false", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal($(settings.selector + 'goto-page').length, 0, "Go-to-page box should not be present");
        start();
    });

    $.tempDiva({
        enableGotoPage: false
    });
});

asyncTest("enableGotoPage true", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        notEqual($(settings.selector + 'goto-page').length, 0, "Go-to-page box should be present");
        start();
    });

    $.tempDiva({
        enableGotoPage: true
    });
});

//TODO view icon tests

asyncTest("enableGridIcon false, enableLinkIcon true", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
            // Check that the link icon is there
            notEqual($(settings.selector + 'link-icon').length, 0, "Link icon should be present");
            // But the left border should be there for the link icon
            notEqual($(settings.selector + 'link-icon').css('border-left-width'), '0px', "Link icon should have a left border");

            start();
    });

    $.tempDiva({
        enableGridIcon: false
    });
});

asyncTest("enableGridIcon true, enableLinkIcon true", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        notEqual($(settings.selector + 'grid-icon').length, 0, "Grid icon should be present");
        notEqual($(settings.selector + 'link-icon').length, 0, "Link icon should be present");
        start();
    });

    $.tempDiva({
        enableGridIcon: true
    });
});

asyncTest("enableLinkIcon false, enableGridIcon true", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal($(settings.selector + 'link-icon').length, 0, "Link icon should not be present");

        // The grid icon should look normal
        notEqual($(settings.selector + 'grid-icon').css('border-right-width'), '0px', "Link icon should have a right border");
        start();
    });

    $.tempDiva({
        enableLinkIcon: false,
        enableGridIcon: true
    });
});

// Skipping the key and space scroll ones, because they're hard to test

// test enableZoom/Grid Slider/Buttons settings
asyncTest("enableGridControls 'slider'", function() {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        notEqual($(settings.selector + 'grid-slider').length, 0, "Grid slider should be present");
        notEqual($(settings.selector + 'grid-label').length, 0, "Grid label should be present");
        equal($(settings.selector + 'grid-out-button').length, 0, "Grid buttons should not be present");
        equal($(settings.selector + 'grid-in-button').length, 0, "Grid buttons should not be present");
        start();
    });

    $.tempDiva({
        enableGridControls: 'slider'
    });
});

asyncTest("enableZoomControls 'slider'", function() {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        notEqual($(settings.selector + 'zoom-slider').length, 0, "Zoom slider should be present");
        notEqual($(settings.selector + 'zoom-label').length, 0, "Zoom label should be present");
        equal($(settings.selector + 'zoom-out-button').length, 0, "Zoom buttons should not be present");
        equal($(settings.selector + 'zoom-in-button').length, 0, "Zoom buttons should not be present");
        notEqual($(settings.selector + 'grid-label').length, 0, "Grid label should be present");
        start();
    });

    $.tempDiva({
        enableZoomControls: 'slider'
    });
});

asyncTest("enableGridControls 'buttons'", function() {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        notEqual($(settings.selector + 'grid-out-button').length, 0, "Grid out button should be present");
        notEqual($(settings.selector + 'grid-in-button').length, 0, "Grid in button should be present");
        notEqual($(settings.selector + 'grid-label').length, 0, "Grid label should be present");
        equal($(settings.selector + 'grid-slider').length, 0, "Grid slider should not be present");
        start();
    });

    $.tempDiva({
        enableGridControls: 'buttons'
    });
});

asyncTest("enableZoomControls 'buttons'", function() {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
            notEqual($(settings.selector + 'zoom-out-button').length, 0, "Zoom out button should be present");
            notEqual($(settings.selector + 'zoom-in-button').length, 0, "Zoom in button should be present");
            notEqual($(settings.selector + 'zoom-label').length, 0, "Zoom label should be present");
            equal($(settings.selector + 'zoom-slider').length, 0, "Grid slider should not be present");
            start();
    });

    $.tempDiva({
        enableZoomControls: 'buttons'
    });
});

// fixedPadding tested at the top (along with adaptivePadding)

asyncTest("fixedHeightGrid false", function () {
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

        ok(sameWidths, "All page widths should be equal");
        ok(!sameHeights, "All page heights should NOT be equal");

        start();
    });

    $.tempDiva({
        fixedHeightGrid: false
    });
});

asyncTest("fixedHeightGrid true", function () {
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

        ok(!sameWidths, "All page widths should NOT be equal");
        ok(sameHeights, "All page heights should be equal");

        start();
    });

    $.tempDiva({
        fixedHeightGrid: true
    });
});

asyncTest("goDirectlyTo, valid", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal(settings.currentPageIndex, 10, "The initial page index should be 10");
        start();
    });

    $.tempDiva({
        goDirectlyTo: 10
    });
});

asyncTest("goDirectlyTo, invalid", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal(settings.currentPageIndex, 0, "The initial page index should be 0 (the fallback)");
        start();
    });

    $.tempDiva({
        goDirectlyTo: -10
    });
});

// iipServerURL can't really be tested, just have to rely on this to work

asyncTest("inBookLayout true", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        ok(settings.inBookLayout, 'inBookLayout should remain true after initialization');
        ok(settings.pageLeftOffsets[1] < settings.pageLeftOffsets[2], 'Page 1 should be to the left of page 2');
        ok(settings.pageLeftOffsets[2] > settings.pageLeftOffsets[3], 'Page 2 should be to the right of page 3');
        start();
    });

    $.tempDiva({
        inBookLayout: true
    });
});

asyncTest("documentPaged", function() {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        ok(settings.documentPaged, 'settings.documentPaged should be true when manifest has viewingHint: paged');
        ok(settings.inBookLayout, 'settings.inBookLayout should be true when documentPaged is true');

        start();
    });

    $.tempDiva({
        objectData: '../demo/beromunster-iiif.json'
    });
});

asyncTest("inGrid false", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        ok(!settings.inGrid, "inGrid setting should still be false");
        equal($(settings.selector + 'view-menu').children()[0].classList[0], 'diva-document-icon', "Current toolbar view icon should be the document icon");
        start();
    });

    $.tempDiva({
        inGrid: false
    });
});

asyncTest("inGrid true", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        ok(settings.inGrid, "inGrid setting should be preserved");
        equal($(settings.selector + 'view-menu').children()[0].classList[0], 'diva-grid-icon', "Current toolbar view icon should be the grid icon");
        start();
    });

    $.tempDiva({
        inGrid: true
    });
});

// imageDir cannot really be tested either

asyncTest("valid max/minPagesPerRow, valid pagesPerRow", function () {

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        // Have to enter the grid first, otherwise pagesPerRow isn't changed
        this.enterGridView();

        equal(settings.minPagesPerRow, 3, "minPagesPerRow should be 3");
        equal(settings.maxPagesPerRow, 5, "maxPagesPerRow should be 5");
        equal(settings.pagesPerRow, 5, "pagesPerRow is valid");
        start();
    });

    $.tempDiva({
        minPagesPerRow: 3,
        maxPagesPerRow: 5,
        pagesPerRow: 5
    });
});

asyncTest("invalid max/minPagesPerRow, valid pagesPerRow", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        this.enterGridView();

        equal(settings.minPagesPerRow, 2, "minPagesPerRow is invalid, set to 2");
        equal(settings.maxPagesPerRow, 2, "maxPagesPerRow should be set to min");
        equal(settings.pagesPerRow, 2, "invalid pages per row should be set to min");
        start();
    });

    $.tempDiva({
        minPagesPerRow: 1,
        maxPagesPerRow: 0,
        pagesPerRow: 4
    });
});

asyncTest("max/minZoomLevel, invalid values", function () {

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal(settings.minZoomLevel, 0, "minZoomLevel should be set to 0");
        equal(settings.maxZoomLevel, 4, "maxZoomLevel should be set to 4");
        start();
    });

    $.tempDiva({
        minZoomLevel: -2,
        maxZoomLevel: 6
    });
});

asyncTest("max/minZoomLevel, valid values, valid zoomLevel", function () {

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal(settings.minZoomLevel, 1, "minZoomLevel should be set to 1");
        equal(settings.maxZoomLevel, 3, "maxZoomLevel should be set to 3");
        equal(settings.zoomLevel, 2, "zoomLevel should be 2");
        start();
    });

    $.tempDiva({
        minZoomLevel: 1,
        maxZoomLevel: 3,
        zoomLevel: 2
    });
});

asyncTest("max/minZoomLevel, valid values, invalid zoomLevel", function () {

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal(settings.zoomLevel, 1, "Zoom level should be the minZoomLevel (1)");
        start();
    });

    $.tempDiva({
        minZoomLevel: 1,
        maxZoomLevel: 3,
        zoomLevel: 0
    });
});

asyncTest("max/minZoomLevel, invalid/valid values, invalid zoomLevel", function () {

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal(settings.minZoomLevel, 2, "minZoomLevel should be set to 2 (valid)");
        equal(settings.maxZoomLevel, 4, "maxZoomLevel should be set to 4 (invalid)");
        equal(settings.zoomLevel, 2, "zoomLevel should be 2 (the minimum)");
        start();
    });

    $.tempDiva({
        minZoomLevel: 2,
        maxZoomLevel: -2,
        zoomLevel: -2
    });
});

asyncTest("object for objectData", function ()
{
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        equal(settings.itemTitle, "First page of Beromunster", "Should process an object for objectData like a normal manifest");
        start();
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

asyncTest("viewportMargin, value of 0", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        setTimeout(function ()
        {
            notEqual($(settings.selector + 'page-0').length, 0, "The first page should be present");
            equal($(settings.selector + 'page-1').length, 0, "The second page should not be present");
            start();
        }, 100);
    });

    $.tempDiva({
        viewportMargin: 0
    });
});

asyncTest("viewportMargin, value of 1000", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        // The second page should be visible after a timeout
        setTimeout(function () {
            notEqual($(settings.selector + 'page-0').length, 0, "The first page should be present");
            notEqual($(settings.selector + 'page-1').length, 0, "The second page should be present");
            start();
        }, 100);
    });

    $.tempDiva({
        viewportMargin: 1000
    });
});
