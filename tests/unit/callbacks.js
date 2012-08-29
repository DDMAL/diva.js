/*
Test coverage: All the testable ones are covered! Done.
*/

module("Callbacks");

asyncTest("onModeToggle", function () {
    var callbackExecuted = false;

    $.tempDiva({
        onModeToggle: function () {
            callbackExecuted = true;
        },
        onReady: function (settings) {
            ok(!callbackExecuted);
            this.enterFullscreen();
            ok(callbackExecuted);

            callbackExecuted = false;
            this.leaveFullscreen();
            ok(callbackExecuted);

            start();
        }
    });
});

asyncTest("onViewToggle", function () {
    var callbackExecuted = false;

    $.tempDiva({
        onViewToggle: function () {
            callbackExecuted = true;
        },
        onReady: function (settings) {
            ok(!callbackExecuted);
            this.enterGrid();
            ok(callbackExecuted);

            callbackExecuted = false;
            this.leaveGrid();
            ok(callbackExecuted);

            start();
        }
    });
});

asyncTest("onJump", function () {
    var callbackExecuted;
    var pageIndexParam;

    $.tempDiva({
        onJump: function (pageIndex) {
            pageIndexParam = pageIndex;
            callbackExecuted = true;
        },
        onReady: function (settings) {
            pageIndexParam = 0;
            callbackExecuted = false;

            ok(!callbackExecuted);
            this.gotoPage(100);
            ok(callbackExecuted);

            equal(pageIndexParam, 99);

            start();
        }
    });
});

asyncTest("onPageLoad", function () {
    $.tempDiva({
        onPageLoad: function (pageIndex, filename, pageSelector) {
            equal(pageIndex, 0, "Page index")
            equal(filename, 'bm_001.tif', "Filename");

            notEqual($(pageSelector).length, 0, "Selector should select something");

            start();
        }
    });
});

// Can't really test onReady, just assume that it works for the other tests

asyncTest("onScroll(|Up|Down)", function () {
    var scrollAmount;
    var downScroll;
    var upScroll;

    $.tempDiva({
        onScrollUp: function (verticalScroll) {
            upScroll = true;
        },
        onScrollDown: function (verticalScroll) {
            downScroll = true;
        },
        onScroll: function (verticalScroll) {
            scrollAmount = verticalScroll;
        },
        onReady: function (settings) {
            scrollAmount = 0;
            downScroll = false;
            upScroll = false;

            $(settings.outerSelector).scrollTop(100);

            // Wait a few milliseconds for the event to be triggered
            setTimeout(function () {
                ok(downScroll, "Scrolled down");
                ok(!upScroll, "Did not scroll up");
                downScroll = false;

                equal(scrollAmount, 100, "scroll amount");

                $(settings.outerSelector).scrollTop(50);

                setTimeout(function () {
                    ok(!downScroll, "Did not scroll down");
                    ok(upScroll, "Did scroll up");

                    equal(scrollAmount, 50, "Vertical scroll amount");
                    start();
                }, 10);
            }, 10);
        }
    });
});

asyncTest("onZoom(|In|Out)", function () {
    var zoomLevel;
    var zoomedIn;
    var zoomedOut;

    $.tempDiva({
        zoomLevel: 0,
        onZoom: function (zoom) {
            zoomLevel = zoom;
        },
        onZoomIn: function (zoom) {
            zoomedIn = true;
        },
        onZoomOut: function (zoom) {
            zoomedOut = true;
        },
        onReady: function (settings) {
            zoomLevel = 0;
            zoomedIn = false;
            zoomedOut = false;

            this.zoomIn();
            equal(zoomLevel, 1, "New zoom level is 1");
            ok(zoomedIn, "Just zoomed in");
            ok(!zoomedOut, "Did not zoom out");
            zoomedIn = false;

            this.zoomOut();
            equal(zoomLevel, 0, "New zoom level is 0");
            ok(zoomedOut, "Just zoomed out");
            ok(!zoomedIn, "Did not zoom in");

            start();
        }
    });
});
