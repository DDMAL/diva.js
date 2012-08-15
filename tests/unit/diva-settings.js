module("Settings");

asyncTest("adaptivePadding enabled", function () {
    $.tempDiva({
        adaptivePadding: 0.10,
        onReady: function (settings) {
            notEqual(settings.verticalPadding, 10, "Adaptive padding should be used, overrides vertical/horizontal");
            notEqual(settings.horizontalPadding, 10, "Horizontal padding should be overridden by adaptive");
            start();
        }
    });
});

asyncTest("adaptivePadding disabled, fixedPadding set", function () {
    $.tempDiva({
        adaptivePadding: 0,
        fixedPadding: 11,
        onReady: function (settings) {
            equal(settings.verticalPadding, 40, "Vertical padding should be 40 (the minimum)");
            equal(settings.horizontalPadding, 11, "Horizontal padding should be 11 (fixedPadding)");
            start();
        }
    });
});

asyncTest("contained true, enableAutoTitle false", function () {
    $.tempDiva({
        contained: true,
        enableAutoTitle: false,
        onReady: function (settings) {
            // Check that the fullscreen icon does NOT have the contained class
            ok(!$(settings.selector + 'fullscreen').hasClass('diva-contained'), "Should not have the contained class");

            // The whole thing should be relatively positioned
            equal($(settings.parentSelector).css('position'), 'relative', "Container should be relatively positioned");

            // Title should not be present
            equal($(settings.selector + 'title').length, 0, "Title should not be present");

            // The left tools section should have the fullscreen-space class
            ok($(settings.selector + 'tools-left').hasClass('diva-fullscreen-space'), "Left tools section should be moved over");
            start();
        }
    });
});

asyncTest("contained true, enableAutoTitle true", function () {
    $.tempDiva({
        contained: true,
        enableAutoTitle: true,
        onReady: function (settings) {
            // Check that it does have the contained class
            ok($(settings.selector + 'fullscreen').hasClass('diva-contained'), "Should have the contained class");

            // Title SHOULD be present
            notEqual($(settings.selector + 'title').length, 0, "Title SHOULD be present");
            start();
        }
    });
});

// divaserveURL can't really be tested - just have to rely on this to work

// enableCanvas and enableDownload are tested in plugins.js

// enableFilename is tested in link.js

asyncTest("enableFullscreen false", function () {
    $.tempDiva({
        enableFullscreen: false,
        onReady: function (settings) {
            // Make sure the fullscreen icon is not there
            equal($(settings.selector + 'fullscreen').length, 0, "Fullscreen icon should not be present");
            start();
        }
    });
});

asyncTest("enableFullscreen true", function () {
    $.tempDiva({
        enableFullscreen: true,
        onReady: function (settings) {
            // Make sure the fullscreen icon is there
            notEqual($(settings.selector + 'fullscreen').length, 0, "Fullscreen icon should be present");
            start();
        }
    });
});

asyncTest("enableGotoPage false", function () {
    $.tempDiva({
        enableGotoPage: false,
        onReady: function (settings) {
            equal($(settings.selector + 'goto-page').length, 0, "Go-to-page box should not be present");
            start();
        }
    });
});

asyncTest("enableGotoPage true", function () {
    $.tempDiva({
        enableGotoPage: true,
        onReady: function (settings) {
            notEqual($(settings.selector + 'goto-page').length, 0, "Go-to-page box should be present");
            start();
        }
    });
});

asyncTest("enableGrid false, enableLink true", function () {
    $.tempDiva({
        enableGrid: false,
        onReady: function (settings) {
            equal($(settings.selector + 'grid-icon').length, 0, "Grid icon should not be present");

            // Check that the link icon is there
            notEqual($(settings.selector + 'link-icon').length, 0, "Link icon should be present");
            // But the left border should be there for the link icon
            notEqual($(settings.selector + 'link-icon').css('border-left-width'), '0px', "Link icon should have a left border");

            start();
        }
    });
});

asyncTest("enableGrid true, enableLink true", function () {
    $.tempDiva({
        enableGrid: true,
        onReady: function (settings) {
            notEqual($(settings.selector + 'grid-icon').length, 0, "Grid icon should be present");

            // The left border should not be there for the link icon
            equal($(settings.selector + 'link-icon').css('border-left-width'), '0px', "Link icon should not have a left border");

            start();
        }
    });
});

asyncTest("enableLink false, enableGrid true", function () {
    $.tempDiva({
        enableLink: false,
        enableGrid: true,
        onReady: function (settings) {
            equal($(settings.selector + 'link-icon').length, 0, "Link icon should not be present");

            // The grid icon should look normal
            notEqual($(settings.selector + 'grid-icon').css('border-right-width'), '0px', "Link icon should have a right border");
            start();
        }
    });
});

asyncTest("enableGridSlider false", function () {
    $.tempDiva({
        enableGridSlider: false,
        onReady: function (settings) {
            equal($(settings.selector + 'grid-slider').length, 0, "Grid slider should not be present");
            start();
        }
    });
});

asyncTest("enableGridSlider true", function () {
    $.tempDiva({
        enableGridSlider: true,
        onReady: function (settings) {
            notEqual($(settings.selector + 'grid-slider').length, 0, "Grid slider should not be present");
            start();
        }
    });
});

// Skipping the key and space scroll ones, because they're hard to test

asyncTest("enableZoomSlider false", function () {
    $.tempDiva({
        enableZoomSlider: false,
        onReady: function (settings) {
            equal($(settings.selector + 'zoom-slider').length, 0, "Zoom slider should not be present");
            start();
        }
    });
});

asyncTest("enableZoomSlider true", function () {
    $.tempDiva({
        enableZoomSlider: true,
        onReady: function (settings) {
            notEqual($(settings.selector + 'zoom-slider').length, 0, "Zoom slider should not be present");
            start();
        }
    });
});

// fixedPadding tested at the top (along with adaptivePadding)

asyncTest("fixedHeightGrid false", function () {
    $.tempDiva({
        fixedHeightGrid: false,
        onReady: function (settings) {
            this.enterGrid();
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
        }
    });
});

asyncTest("fixedHeightGrid true", function () {
    $.tempDiva({
        fixedHeightGrid: true,
        onReady: function (settings) {
            this.enterGrid();

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
        }
    });
});

asyncTest("goDirectlyTo, valid", function () {
    $.tempDiva({
        goDirectlyTo: 10,
        onReady: function (settings) {
            equal(settings.currentPageIndex, 10, "The initial page index should be 10");
            start();
        }
    });
});

asyncTest("goDirectlyTo, invalid", function () {
    $.tempDiva({
        goDirectlyTo: -10,
        onReady: function (settings) {
            equal(settings.currentPageIndex, 0, "The initial page index should be 0 (the fallback)");
            start();
        }
    });
});

// iipServerURL can't really be tested, just have to rely on this to work

asyncTest("inFullscreen false", function () {
    $.tempDiva({
        inFullscreen: false,
        onReady: function (settings) {
            ok(!settings.inFullscreen, "inFullscreen setting should still be false");
            ok(!$(settings.selector + 'fullscreen').hasClass('diva-in-fullscreen'), "Icon should not have the diva-in-fullscreen class");
            start();
        }
    });
});

asyncTest("inFullscreen true", function () {
    $.tempDiva({
        inFullscreen: true,
        onReady: function (settings) {
            ok(settings.inFullscreen, "inFullscreen setting should still be true");
            ok($(settings.selector + 'fullscreen').hasClass('diva-in-fullscreen'), "Icon should have the diva-in-fullscreen class");
            start();
        }
    });
});

asyncTest("inGrid false", function () {
    $.tempDiva({
        inGrid: false,
        onReady: function (settings) {
            ok(!settings.inGrid, "inGrid setting should still be false");
            ok(!$(settings.selector + 'grid-icon').hasClass('diva-in-grid'), "Icon should not have the in-grid class");
            start();
        }
    });
});

asyncTest("inGrid true", function () {
    $.tempDiva({
        inGrid: true,
        onReady: function (settings) {
            ok(settings.inGrid, "inGrid setting should be preserved");
            ok($(settings.selector + 'grid-icon').hasClass('diva-in-grid'), "Icon should have the in-grid class");
            start();
        }
    });
});

// imageDir cannot really be tested either

asyncTest("valid max/minPagesPerRow, valid pagesPerRow", function () {
    $.tempDiva({
        minPagesPerRow: 3,
        maxPagesPerRow: 5,
        pagesPerRow: 5,
        onReady: function (settings) {
            // Have to enter the grid first, otherwise pagesPerRow isn't changed
            this.enterGrid();

            equal(settings.minPagesPerRow, 3, "minPagesPerRow should be 3");
            equal(settings.maxPagesPerRow, 5, "maxPagesPerRow should be 5");
            equal(settings.pagesPerRow, 5, "pagesPerRow is valid");
            start();
        }
    });
});

asyncTest("invalid max/minPagesPerRow, valid pagesPerRow", function () {
    $.tempDiva({
        minPagesPerRow: 1,
        maxPagesPerRow: 0,
        pagesPerRow: 4,
        onReady: function (settings) {
            this.enterGrid();

            equal(settings.minPagesPerRow, 2, "minPagesPerRow is invalid, set to 2");
            equal(settings.maxPagesPerRow, 2, "maxPagesPerRow should be set to min");
            equal(settings.pagesPerRow, 2, "invalid pages per row should be set to min");
            start();
        }
    });
});

asyncTest("max/minZoomLevel, invalid values", function () {
    $.tempDiva({
        minZoomLevel: -2,
        maxZoomLevel: 6,
        onReady: function (settings) {
            equal(settings.minZoomLevel, 0, "minZoomLevel should be set to 0");
            equal(settings.maxZoomLevel, 4, "maxZoomLevel should be set to 4");
            start();
        }
    });
});

asyncTest("max/minZoomLevel, valid values, valid zoomLevel", function () {
    $.tempDiva({
        minZoomLevel: 1,
        maxZoomLevel: 3,
        zoomLevel: 2,
        onReady: function (settings) {
            equal(settings.minZoomLevel, 1, "minZoomLevel should be set to 1");
            equal(settings.maxZoomLevel, 3, "maxZoomLevel should be set to 3");
            equal(settings.zoomLevel, 2, "zoomLevel should be 2");
            start();
        }
    });
});

asyncTest("max/minZoomLevel, valid values, invalid zoomLevel", function () {
    $.tempDiva({
        minZoomLevel: 1,
        maxZoomLevel: 3,
        zoomLevel: 0,
        onReady: function (settings) {
            equal(settings.zoomLevel, 1, "Zoom level should be the minZoomLevel (1)");
            start();
        }
    });
});

asyncTest("max/minZoomLevel, invalid/valid values, invalid zoomLevel", function () {
    $.tempDiva({
        minZoomLevel: 2,
        maxZoomLevel: -2,
        zoomLevel: -2,
        onReady: function (settings) {
            equal(settings.minZoomLevel, 2, "minZoomLevel should be set to 2 (valid)");
            equal(settings.maxZoomLevel, 4, "maxZoomLevel should be set to 4 (invalid)");
            equal(settings.zoomLevel, 2, "zoomLevel should be 2 (the minimum)");
            start();
        }
    });
});

// All the on_____ settings are callback functions that are tested in callbacks.js
// Except onReady - we can only assume that it works.

// pageLoadTimeout is a bit weird to test, but the code is simple so it should be fine

// pagesPerRow is tested above, along with max/minPagesPerRow

// rowLoadTimeout is in the same boat as pageLoadTimeout

// tileFadeSpeed is also difficult, so let's skip it

// No real point testing tileHeight/Width as we don't have images of different tile sizes

asyncTest("viewportMargin, value of 0", function () {
    $.tempDiva({
        viewportMargin: 0,
        onReady: function (settings) {
            setTimeout(function () {
                notEqual($(settings.selector + 'page-0').length, 0, "The first page should be present");
                equal($(settings.selector + 'page-1').length, 0, "The second page should not be present");
                start();
            }, 100);
        }
    });
});

asyncTest("viewportMargin, value of 1000", function () {
    $.tempDiva({
        viewportMargin: 1000,
        onReady: function (settings) {
            // The second page should be visible after a timeout
            setTimeout(function () {
                notEqual($(settings.selector + 'page-0').length, 0, "The first page should be present");
                notEqual($(settings.selector + 'page-1').length, 0, "The second page should be present");
                start();
            }, 100);
        }
    });
});
