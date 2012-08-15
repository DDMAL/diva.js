module("Hash params");

var multipleHashParamTest = function (testName, hashParams, onReadyCallback, settings) {
    asyncTest(testName, function () {
        var previousHash = window.location.hash;
        var suffix = parseInt($.generateId(), 10) + 1;

        var hashValue;
        var first = true;
        var prefix = '';
        for (hashParam in hashParams) {
            hashValue = hashParams[hashParam];

            window.location.hash += prefix + hashParam + suffix + '=' + hashValue;

            if (first) {
                prefix = '&';
                first = false;
            }
        }

        var allSettings = {
            onReady: function (settings) {
                onReadyCallback.call(this, settings);
                window.location.hash = previousHash;
                start();
            }
        };

        if (settings) {
            $.extend(allSettings, settings);
        }

        $.tempDiva(allSettings);
    });
}

var hashParamTest = function (testName, hashParam, hashValue, onReadyCallback, settings) {
    // Has to be done this way because {hashParam: hashValue} does not work
    var hashParams = {};
    hashParams[hashParam] = hashValue;
    multipleHashParamTest(testName, hashParams, onReadyCallback, settings);
};

hashParamTest("grid (g)", "g", "true", function (settings) {
    ok(settings.inGrid, "inGrid setting should be true");
    ok($(settings.selector + 'grid-slider').is(':visible'), "Grid slider should be visible");
    ok(!$(settings.selector + 'zoom-slider').is(':visible'), "Zoom slider should not be visible");
    equal($('.diva-document-page').length, 0, "There should be no document pages");
    notEqual($('.diva-row').length, 0, "There should be at least one row");
});

hashParamTest("fullscreen (f)", "f", "true", function (settings) {
    ok(settings.inFullscreen, "inFullscreen setting should be true");
    ok($('body').hasClass('diva-hide-scrollbar'), "The body element should have the hide-scrollbar class")
});

multipleHashParamTest("grid (g) and fullscreen (f)", {g: "true", f: "true"}, function (settings) {
    ok(settings.inFullscreen, "inFullscreen setting should be true");
    ok(settings.inGrid, "inGrid setting should be true");
});

hashParamTest("zoom level (z) - valid value", "z", "3", function (settings) {
    equal(settings.zoomLevel, 3, "Initial zoom level should be 3");
});

hashParamTest("zoom level (z) - invalid value", "z", "5", function (settings) {
    equal(settings.zoomLevel, 0, "Initial zoom was invalid but >= 0, should be set to the min (0)");
});

multipleHashParamTest("zoom level (z) and grid (g)", {z: "1", g: "true"}, function (settings) {
    equal(settings.zoomLevel, 1, "Initial zoom level should be 1");
    ok(settings.inGrid, "Should be in grid initially");

    // Now let's switch into document view and see if the zoom level is preserved
    $(settings.selector + 'grid-icon').click();
    equal(settings.zoomLevel, 1, "Zoom level setting should still be 1");
    equal($(settings.selector + 'zoom-slider-label').text(), "Zoom level: 1", "Zoom slider label should show a zoom level of 1");
});

multipleHashParamTest("zoom level (z) and fullscreen (f)", {z: "1", f: "true"}, function (settings) {
    equal(settings.zoomLevel, 1, "Initial zoom level should be 1");
    ok(settings.inFullscreen, "Should be in fullscreen initially");

    // Check that we're actually in fullscreen mode
    ok($('body').hasClass('diva-hide-scrollbar'), "The body element should have the hide-scrollbar class")

    // Check that the zoom level is actually 1
    equal($(settings.selector + 'zoom-slider-label').text(), "Zoom level: 1", "Zoom slider label should show a zoom level of 1");
});

hashParamTest("pagesPerRow (n) - valid value", "n", "3", function (settings) {
    equal(settings.pagesPerRow, 3, "Pages per row should be 3 initially");
});

hashParamTest("pagesPerRow (n) - invalid value", "n", "1", function (settings) {
    equal(settings.pagesPerRow, 5, "Pages per row should just be the default");
});

multipleHashParamTest("pagesPerRow (n) and grid (g)", {n: "3", g: "true"}, function (settings) {
    equal(settings.pagesPerRow, 3, "Pages per row should be 3 initially");
    ok(settings.inGrid, "Should be in grid initially");

    // Check that the pages per row setting is actually 3
    equal($(settings.selector + 'grid-slider-label').text(), "Pages per row: 3", "Grid slider label should show 3 pages per row");
    equal($(settings.selector + 'row-0').children().length, 3, "The first row should have 3 pages");
});

hashParamTest("page filename (i) - valid value", "i", "bm_005.tif", function (settings) {
    equal(settings.currentPageIndex, 4, "The initial page should be page 5 (index of 4)");
}, {enableFilename: true});

hashParamTest("page filename (i) - invalid value", "i", "bm_000.tif", function (settings) {
    equal(settings.currentPageIndex, 0, "The initial page should just be the first page");
}, {enableFilename: true});

hashParamTest("page number (p) - valid value", "p", "5", function (settings) {
    equal(settings.currentPageIndex, 4, "The initial page should be page 5 (index of 4)");
}, {enableFilename: false});

hashParamTest("page number (p) - invalid value", "p", "600", function (settings) {
    equal(settings.currentPageIndex, 0, "The initial page should just be the first page");
}, {enableFilename: false});

multipleHashParamTest("page number (p), grid (g)", {p: "100", g: "true"}, function (settings) {
    equal(settings.currentPageIndex, 99, "The initial page should be 100 (index of 99)");
    ok(settings.inGrid, "Should be in grid");
}, {enableFilename: false});

hashParamTest("vertical offset (y) - positive value", "y", "600", function (settings) {
    var topScroll = $(settings.outerSelector).scrollTop();
    equal(topScroll, 600, "Should have scrolled 600 vertically");
});

hashParamTest("vertical offset (y) - negative value", "y", "-600", function (settings) {
    var topScroll = $(settings.outerSelector).scrollTop();
    equal(topScroll, 0, "Should not have scrolled negatively because, well, you can't");
});

multipleHashParamTest("vertical offset (y) and page number (p)", {y: 500, p: 50}, function (settings) {
    var topScroll = $(settings.outerSelector).scrollTop();
    var expectedTopScroll = 52751;
    equal(settings.currentPageIndex, 49, "Current page should be 50 (index of 49)");
    equal(topScroll, expectedTopScroll, "Should be heightAbovePages + 500 pixels of scroll from the top");

    // Check that the horizontal scroll hasn't been weirdly affected
    var leftScroll = $(settings.outerSelector).scrollLeft();
    var expectedLeftScroll = (settings.maxWidths[settings.zoomLevel] + settings.horizontalPadding * 2 - settings.panelWidth) / 2;
    equal(leftScroll, parseInt(expectedLeftScroll), "Horizontal scroll should just center it, as usual");
}, {enableFilename: false, zoomLevel: 2});

hashParamTest("horizontal offset (x) - positive value", "x", "100", function (settings) {
    var leftScroll = $(settings.outerSelector).scrollLeft();
    var expectedLeftScroll = (settings.maxWidths[settings.zoomLevel] + settings.horizontalPadding * 2 - settings.panelWidth) / 2 + 100;
    equal(leftScroll, parseInt(expectedLeftScroll), "Horizontal scroll should center it + 100 pixels to the right");
});

hashParamTest("horizontal offset (x) - negative value", "x", "-100", function (settings) {
    var leftScroll = $(settings.outerSelector).scrollLeft();
    var expectedLeftScroll = (settings.maxWidths[settings.zoomLevel] + settings.horizontalPadding * 2 - settings.panelWidth) / 2 - 100;
    equal(leftScroll, parseInt(expectedLeftScroll), "Horizontal scroll should center it + 100 pixels to the left");
});

multipleHashParamTest("horizontal offset (x) and page number (p)", {x: 100, p: 50}, function (settings) {
    var topScroll = $(settings.outerSelector).scrollTop();
    var expectedTopScroll = 52251;
    equal(topScroll, expectedTopScroll, "vertical scroll should be just to page 50");

    var leftScroll = $(settings.outerSelector).scrollLeft();
    var expectedLeftScroll = (settings.maxWidths[settings.zoomLevel] + settings.horizontalPadding * 2 - settings.panelWidth) / 2 + 100;
    equal(leftScroll, parseInt(expectedLeftScroll), "Horizontal scroll should center it + 100 pixels to the right");
}, {enableFilename: false});

multipleHashParamTest("horizontal offset (x), vertical offset (y), page number (p)", {x: 100, y: 200, p: 50}, function (settings) {
    var topScroll = $(settings.outerSelector).scrollTop();
    var expectedTopScroll = 52451;
    equal(topScroll, expectedTopScroll, "vertical scroll should be to page 50 + 200");

    var leftScroll = $(settings.outerSelector).scrollLeft();
    var expectedLeftScroll = (settings.maxWidths[settings.zoomLevel] + settings.horizontalPadding * 2 - settings.panelWidth) / 2 + 100;
    equal(leftScroll, parseInt(expectedLeftScroll), "Horizontal scroll should center it + 100 pixels to the right");
}, {enableFilename: false});

hashParamTest("viewer size (h) - valid value", "h", "450", function (settings) {
    equal($(settings.outerSelector).height(), 450, "Viewer height should be 450");
});

hashParamTest("viewer size (w) - valid value", "w", "450", function (settings) {
    equal($(settings.outerSelector).width(), 450, "Viewer width should be 450");
    equal($(settings.parentSelector).width(), 450, "Parent element width should also be 450");
});

multipleHashParamTest("viewer size (h, w) - valid values", {h: "600", w: "500"}, function (settings) {
    equal($(settings.outerSelector).height(), 600, "Viewer height should be 600");
    equal($(settings.outerSelector).width(), 500, "Viewer width should be 500");
});
