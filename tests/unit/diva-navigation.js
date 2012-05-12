module("Navigation");

asyncTest("Scrolling in document view", function () {
    $.tempDiva({
        zoomLevel: 0,
        adaptivePadding: 0,
        fixedPadding: 40,
        onReady: function (settings) {
            $(settings.outerSelector).scrollTop(10000);
            var self = this;

            // Set the timeout because we have to wait for the event handler
            setTimeout(function () {
                equal(self.getCurrentPage(), 34, "The page should now be 35 (index of 34)");
                equal($(settings.selector + 'current-page').text(), '35', "The toolbar should have been updated");
                start();
            }, 10);
        }
    });
});

asyncTest("Scrolling in grid view", function () {
    $.tempDiva({
        inGrid: true,
        pagesPerRow: 2,
        fixedHeightGrid: true,
        onReady: function (settings) {
            $(settings.outerSelector).scrollTop(10000);

            var self = this;
            setTimeout(function () {
                equal(self.getCurrentPage(), 46, "The page should now be 47 (index of 46)");
                equal($(settings.selector + 'current-page').text(), '47', "The toolbar should have been updated");
                start();
            }, 10);
        }
    });
});

asyncTest("Zooming using the slider", function () {
    $.tempDiva({
        zoomLevel: 4,
        onReady: function (settings) {
            $(settings.selector + 'zoom-slider').slider('value', 0);
            equal(this.getZoomLevel(), 0, "Zoom level should now be 0");
            equal($(settings.selector + 'zoom-level').text(), '0', "The slider label should have been updated");

            $(settings.selector + 'zoom-slider').slider('value', 4);
            equal(this.getZoomLevel(), 4, "Zoom level should now be 4");
            equal($(settings.selector + 'zoom-level').text(), '4', "The slider label should have been updated");
            start();
        }
    });
});

asyncTest("Zooming by double-clicking", function () {
    $.tempDiva({
        zoomLevel: 1,
        onReady: function (settings) {
            // Try to zoom in on the bottom left corner of the first page
            var firstPage = $(settings.selector + 'page-0');
            var offset = firstPage.offset();
            var height = firstPage.height();
            var xOffset = offset.left;
            var yOffset = offset.top + height;
            var event = $.Event("dblclick");
            event.pageX = xOffset;
            event.pageY = yOffset;
            $(settings.innerSelector).trigger(event);
            $(settings.innerSelector).trigger(event);
            ok(true);
            start();
        }
    });
});
