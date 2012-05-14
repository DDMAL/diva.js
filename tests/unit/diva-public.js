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
