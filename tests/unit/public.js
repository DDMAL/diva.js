/*
Test coverage: pretty much complete
*/

module("Public functions");

asyncTest("getItemTitle()", function () {
    $.tempDiva({
        onReady: function (settings) {
            equal(this.getItemTitle(), "Beromunster", "The title should be Beromunster");
            start();
        }
    });
});

asyncTest("gotoPageByNumber() and getCurrentPage()", function () {
    $.tempDiva({
        onReady: function (settings) {
            equal(this.getCurrentPage(), 0, "Initial page should be 0");
            this.gotoPageByNumber(500); // Go to page number 500 (index: 499)
            equal(this.getCurrentPage(), 499, "The page index should now be 499");

            // Reset it to the first page
            this.gotoPageByNumber(0);
            start();
        }
    });
});

asyncTest("getCurrentPageIndex()", function () {
    $.tempDiva({
        onReady: function (settings) {
            equal(this.getCurrentPageIndex(), 0, "Initial page should be 0");
            this.gotoPageByIndex(300);
            equal(this.getCurrentPageIndex(), 300, "The page index should now be 300");

            // Reset it to the first page
            this.gotoPageByIndex(0);
            equal(this.getCurrentPageIndex(), 0, "The page index should now be 0");
            start();
        }
    });
});

asyncTest("get/setZoomLevel(), zoomIn() and zoomOut()", function () {
    $.tempDiva({
        zoomLevel: 2,
        minZoomLevel: 1,
        maxZoomLevel: 3,
        onReady: function (settings) {
            equal(this.getZoomLevel(), 2, "Initial zoom level should be 2");
            ok(this.zoomOut(), "It should be possible to zoom out once");
            equal(this.getZoomLevel(), 1, "Zoom level should now be 1");
            ok(!this.zoomOut(), "It should not be possible to zoom out again");
            equal(this.getZoomLevel(), 1, "Zoom level should still be 1");

            ok(this.zoomIn(), "It should be possible to zoom in");
            equal(this.getZoomLevel(), 2, "Zoom level should now be 2");
            ok(this.zoomIn(), "Zooming in again");
            equal(this.getZoomLevel(), 3, "Zoom level should now be 3");
            ok(!this.zoomIn(), "It should not be possible to zoom in again (hit max)");
            equal(this.getZoomLevel(), 3, "Zoom level should still be 3");

            ok(!this.setZoomLevel(5), "Setting zoom level to 5 should fail");
            equal(this.getZoomLevel(), 3, "Zoom level should still be 3");

            ok(this.setZoomLevel(2), "Setting zoom level to 2 should be fine");
            equal(this.getZoomLevel(), 2, "Zoom level should now be 2");
            start();
        }
    });
});

asyncTest("inViewport()", function () {
    $.tempDiva({
        viewportMargin: 0,
        onReady: function (settings) {
            // Can only do fairly simple checks
            ok(this.inViewport(1, 100, 50));
            ok(!this.inViewport(1, -100, 50));
            ok(!this.inViewport(40, 100, 50));

            start();
        }
    });
});

asyncTest("toggleFullscreenMode(), enterFullscreen(), leaveFullscreen()", function () {
    $.tempDiva({
        onReady: function (settings) {
            ok(!settings.inFullscreen, "Should not be in fullscreen initially");
            this.toggleFullscreenMode();
            ok(settings.inFullscreen, "Should now be in fullscreen");
            ok(!this.enterFullscreenMode(), "Should not be possible to enter fullscreen");
            ok(settings.inFullscreen, "Should still be in fullscreen");
            ok(this.leaveFullscreenMode(), "Should be possible to exit fullscreen");
            ok(!settings.inFullscreen, "No longer in fullscreen");
            ok(!this.leaveFullscreenMode(), "Should not be possible to exit fullscreen");
            ok(!settings.inFullscreen, "Still not in fullscreen");
            ok(this.enterFullscreenMode(), "Should be possible to enter fullscreen");
            this.toggleFullscreenMode();
            ok(!settings.inFullscreen, "Should now be out of fullscreen");
            start();
        }
    });
});


asyncTest("toggleGridView(), enterGridView(), leaveGridView()", function () {
    $.tempDiva({
        onReady: function (settings) {
            ok(!settings.inGrid, "Should not be in grid initially");
            this.toggleGridView();
            ok(settings.inGrid, "Should now be in grid");
            ok(!this.enterGridView(), "Should not be possible to enter grid");
            ok(settings.inGrid, "Should still be in grid");
            ok(this.leaveGridView(), "Should be possible to exit grid");
            ok(!settings.inGrid, "No longer in grid");
            ok(!this.leaveGridView(), "Should not be possible to exit grid");
            ok(!settings.inGrid, "Still not in grid");
            ok(this.enterGridView(), "Should be possible to enter grid");
            this.toggleGridView();
            ok(!settings.inGrid, "Should now be out of grid");
            start();
        }
    });
});

asyncTest("gotoPageByName()", function () {
    $.tempDiva({
        onReady: function (settings) {
            equal(settings.currentPageIndex, 0, "Initial page number should be 1");
            ok(this.gotoPageByName('bm_002.tif'), "It should find the page index for bm_002.tif");
            equal(settings.currentPageIndex, 1, "Now the page number should be 2");
            ok(!this.gotoPageByName('bm_000.tif'), "It should not find anything for bm_000.tif");
            start();
        }
    });
});

asyncTest("getPageIndex()", function () {
    $.tempDiva({
        onReady: function (settings) {
            equal(this.getPageIndex('bm_002.tif'), 1, "Valid filename");
            equal(this.getPageIndex('bm_lol.tif'), -1, "Invalid filename");

            start();
        }
    });
});

// Can't really test the getCurrentURL function

// Can't really test getURLHash easily either
// Since it relies on getState, we can test the public version of that instead

asyncTest("getState()", function () {
    $.tempDiva({
        onReady: function (settings) {
            var expected = {
                f: false,
                g: false,
                h: 700,
                i: 'bm_001.tif',
                n: 5,
                p: false,
                w: 968,
                x: 0,
                y: 0,
                z: 2
            };

            var actual = this.getState();

            for (var key in expected) {
                equal(actual[key], expected[key], "Checking key '" + key + "'");
            }

            start();
        }
    });
});

asyncTest("setState()", function () {
    $.tempDiva({
        onReady: function (settings) {
            var state = {
                f: true,
                g: false,
                h: 400,
                i: "bm_005.tif",
                n: 3,
                p: false,
                w: 800,
                x: 500,
                y: 300,
                z: 3
            };
            this.setState(state);
            ok(settings.inFullscreen, "Should now be in fullscreen");
            ok(!settings.inGrid, "Should not be in grid");
            equal(settings.currentPageIndex, 4, "Current page should be 5 (index of 4)");
            equal(settings.pagesPerRow, 3, "Pages per row should be 3");
            equal(settings.zoomLevel, 3, "Zoom level should be 3");

            // Have to leave fullscreen to test dimension-related things
            this.leaveFullscreenMode();
            equal($(settings.outerSelector).height(), 400, "Height of viewer should be 400");
            equal($(settings.outerSelector).width(), 800, "Width of viewer should be 800");

            equal($(settings.outerSelector).scrollTop(), 8672, "Scroll from top should be 300 more");
            equal($(settings.outerSelector).scrollLeft(), 865, "Scroll from left should be 500 more");

            state = {
                f: false,
                g: true,
                h: 500,
                i: "bm_500.tif",
                n: 4,
                p: true,
                w: 700,
                x: 100,
                y: 200,
                z: 4
            };

            this.setState(state);
            ok(!settings.inFullscreen, "Should not be in fullscreen");
            ok(settings.inGrid, "Should be in grid");
            equal(settings.currentPageIndex, 498, "Current page should be 500 (index of 499)");
            equal(settings.pagesPerRow, 4, "Pages per row should be 4");
            equal(settings.zoomLevel, 4, "Zoom level should be 4");

            start();
        }
    });
});

asyncTest("resizeViewer()", function () {
    $.tempDiva({
        onReady: function (settings) {
            var width = $(settings.outerSelector).width();
            var height = $(settings.outerSelector).height();
            notEqual(width, 500, "Original width should not be 500");
            notEqual(height, 600, "Original height should not be 600");

            this.resize(500, 600);

            width = $(settings.outerSelector).width();
            height = $(settings.outerSelector).height();
            equal(width, 500, "Width should now be 500");
            equal(height, 600, "Height should now be 600");

            // Try an invalid value
            this.resize(10, 500);
            width = $(settings.outerSelector).width();
            height = $(settings.outerSelector).height();
            equal(width, 500, "Width should still be 500");
            equal(height, 500, "Height should now be 500");

            start();
        }
    });
});
