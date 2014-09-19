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

asyncTest("enable/disableScrollable()", function () {
    $.tempDiva({
        onReady: function (settings) {
            this.setZoomLevel(2);

            // should be able to zoom by double click
            var event = $.Event("dblclick");
            event.pageX = 1000;
            event.pageY = 500;
            $(settings.selector + 'page-0').trigger(event);
            equal(settings.zoomLevel, 3, "Should be able to zoom by double click, zoom level should now be 3");

            // should be able to scroll by dragging
            var initScroll = $(settings.outerSelector).scrollTop();
            // simulate drag downwards
            $('.diva-dragger').simulate('drag', { dx: 0, dy: -500 });
            var finalScroll = $(settings.outerSelector).scrollTop();

            ok(finalScroll > initScroll, "Should have scrolled down before disableScrollable()");

            this.disableScrollable();

            // should not be able to zoom by double click
            event = $.Event("dblclick");
            event.pageX = 1000;
            event.pageY = 500;
            $(settings.selector + 'page-0').trigger(event);
            equal(settings.zoomLevel, 3, "Should not be able to zoom by double click after disableScrollable(), zoom level should still be 3");

            // should not be able to drag
            // store previous scroll in initScroll
            initScroll = $(settings.outerSelector).scrollTop();
            $('.diva-dragger').simulate('drag', { dx: 0, dy: -500 });
            finalScroll = $(settings.outerSelector).scrollTop();
            ok(finalScroll === initScroll, "Should not have scrolled down after disableScrollable()");

            this.enableScrollable();

            // should be able to zoom by double click
            event = $.Event("dblclick");
            event.pageX = 1000;
            event.pageY = 500;
            $(settings.selector + 'page-0').trigger(event);
            equal(settings.zoomLevel, 4, "Should be able to zoom by double click after enableScrollable(), zoom level should now be 4");

            // should be able to scroll by dragging
            initScroll = $(settings.outerSelector).scrollTop();
            // simulate drag downwards
            $('.diva-dragger').simulate('drag', { dx: 0, dy: -500 });
            finalScroll = $(settings.outerSelector).scrollTop();

            ok(finalScroll > initScroll, "Should have scrolled down after enableScrollable()");

            start();
        }
    });
});

asyncTest("inViewport()", function () {
    $.tempDiva({
        viewportMargin: 0,
        onReady: function (settings) {
            // Can only do fairly simple checks
            ok(this.inViewport(1, 100, 200, 100, 150));
            ok(!this.inViewport(1, 100, -200, 100, 100));
            ok(!this.inViewport(40, 100, 50, 100, 200));

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
                i: 'bm_001.tif',
                n: 5,
                p: false,
                x: 340,
                y: 335,
                z: 2
            };

            var actual = this.getState();

            // patch to remove tests from Travis CI build due to off-by-one pixel error when run in Travis
            if (!window.isTravis)
            {
                for (var key in expected) {
                    equal(actual[key], expected[key], "Checking key '" + key + "'");
                }
            } else {
                expect(0);
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
                i: "bm_005.tif",
                n: 3,
                p: false,
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

            // patch to remove tests from Travis CI build due to off-by-one pixel error when run in Travis
            if (!window.isTravis)
            {
                equal($(settings.outerSelector).scrollTop(), 8782, "Scroll from top should be default top for bm_005 after leaving fullscreen");
                equal($(settings.outerSelector).scrollLeft(), 627, "Scroll from left should be 500 more");
            }

            state = {
                f: false,
                g: true,
                i: "bm_500.tif",
                n: 4,
                p: true,
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

asyncTest("translateFromMaxZoomLevel()", function () {
    $.tempDiva({
        onReady: function (settings) {
            var state = {
                f: true,
                g: false,
                i: "bm_005.tif",
                n: 3,
                p: false,
                x: 500,
                y: 300,
                z: this.getMaxZoomLevel()
            };

            this.setState(state);

            var boxOnMaxPage = {x: 100, y: 100, width:1234, height:1324};

            // first check to make sure the box on the max zoom level is the same as the box we feed in.
            equal(this.translateFromMaxZoomLevel(100), boxOnMaxPage.x);
            equal(this.translateFromMaxZoomLevel(100), boxOnMaxPage.y);
            equal(this.translateFromMaxZoomLevel(1234), boxOnMaxPage.width);
            equal(this.translateFromMaxZoomLevel(1324), boxOnMaxPage.height);

            // reset the state to a different zoom level
            state = {
                f: true,
                g: false,
                i: "bm_005.tif",
                n: 3,
                p: false,
                x: 500,
                y: 300,
                z: 2
            };
            this.setState(state);

            // check that the box translation has changed accordingly.
            equal(this.translateFromMaxZoomLevel(boxOnMaxPage.x), 25);
            equal(this.translateFromMaxZoomLevel(boxOnMaxPage.y), 25);
            equal(this.translateFromMaxZoomLevel(boxOnMaxPage.width), 308.5);
            equal(this.translateFromMaxZoomLevel(boxOnMaxPage.height), 331);

            start();
        }
    });
});

asyncTest("translateToMaxZoomLevel()", function () {
    $.tempDiva({
        onReady: function (settings) {
            var state = {
                f: true,
                g: false,
                i: "bm_005.tif",
                n: 3,
                p: false,
                x: 500,
                y: 300,
                z: this.getMaxZoomLevel()
            };

            this.setState(state);

            var boxOnThisPage = {x: 10, y: 10, width:123, height:132};

            // first check to make sure the box on the max zoom level is the same as the box we feed in.
            equal(this.translateToMaxZoomLevel(10), boxOnThisPage.x);
            equal(this.translateToMaxZoomLevel(10), boxOnThisPage.y);
            equal(this.translateToMaxZoomLevel(123), boxOnThisPage.width);
            equal(this.translateToMaxZoomLevel(132), boxOnThisPage.height);

            // reset the state to a different zoom level
            state = {
                f: true,
                g: false,
                i: "bm_005.tif",
                n: 3,
                p: false,
                x: 500,
                y: 300,
                z: 2
            };
            this.setState(state);

            // console.log(this.translateToMaxZoomLevel(boxOnThisPage.x));
            // check that the box translation has changed accordingly. This assumes that
            // the co-ordinate we want to translate is on the current zoom level (2), and we want
            // to get it on the max page. Thus: 123 * (4-2)^2 = 984
            equal(this.translateToMaxZoomLevel(boxOnThisPage.x), 40);
            equal(this.translateToMaxZoomLevel(boxOnThisPage.y), 40);
            equal(this.translateToMaxZoomLevel(boxOnThisPage.width), 492);
            equal(this.translateToMaxZoomLevel(boxOnThisPage.height), 528);

            start();
        }
    });
});
