module("Public functions");

asyncTest("getItemTitle()", function () {
    $.tempDiva({
        onReady: function (settings) {
            equal(this.getItemTitle(), "Beromunster", "The title should be Beromunster");
            start();
        }
    });
});

asyncTest("gotoPage() and getCurrentPage()", function () {
    $.tempDiva({
        onReady: function (settings) {
            equal(this.getCurrentPage(), 0, "Initial page should be 0");
            this.gotoPage(500); // Go to page number 500 (index: 499)
            equal(this.getCurrentPage(), 499, "The page index should now be 499");

            // Reset it to the first page
            this.gotoPage(0);
            start();
        }
    });
});

asyncTest("getZoomLevel(), zoomIn() and zoomOut()", function () {
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

            ok(this.zoomOut(), "It should be possible to zoom out");
            equal(this.getZoomLevel(), 2, "Zoom level should now be 2");
            start();
        }
    });
});

asyncTest("toggleMode(), enterFullscreen(), leaveFullscreen()", function () {
    $.tempDiva({
        onReady: function (settings) {
            ok(!settings.inFullscreen, "Should not be in fullscreen initially");
            this.toggleMode();
            ok(settings.inFullscreen, "Should now be in fullscreen");
            ok(!this.enterFullscreen(), "Should not be possible to enter fullscreen");
            ok(settings.inFullscreen, "Should still be in fullscreen");
            ok(this.leaveFullscreen(), "Should be possible to exit fullscreen");
            ok(!settings.inFullscreen, "No longer in fullscreen");
            ok(!this.leaveFullscreen(), "Should not be possible to exit fullscreen");
            ok(!settings.inFullscreen, "Still not in fullscreen");
            ok(this.enterFullscreen(), "Should be possible to enter fullscreen");
            this.toggleMode();
            ok(!settings.inFullscreen, "Should now be out of fullscreen");
            start();
        }
    });
});


asyncTest("toggleView(), enterGrid(), leaveGrid()", function () {
    $.tempDiva({
        onReady: function (settings) {
            ok(!settings.inGrid, "Should not be in grid initially");
            this.toggleView();
            ok(settings.inGrid, "Should now be in grid");
            ok(!this.enterGrid(), "Should not be possible to enter grid");
            ok(settings.inGrid, "Should still be in grid");
            ok(this.leaveGrid(), "Should be possible to exit grid");
            ok(!settings.inGrid, "No longer in grid");
            ok(!this.leaveGrid(), "Should not be possible to exit grid");
            ok(!settings.inGrid, "Still not in grid");
            ok(this.enterGrid(), "Should be possible to enter grid");
            this.toggleView();
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
            this.leaveFullscreen();
            equal($(settings.outerSelector).height(), 400, "Height of viewer should be 400");
            equal($(settings.outerSelector).width(), 800, "Width of viewer should be 800");

            equal($(settings.outerSelector).scrollTop(), 8672, "Scroll from top should be 300 more");
            equal($(settings.outerSelector).scrollLeft(), 865, "Scroll from left should be 500 more");

            start();
        }
    });
});
