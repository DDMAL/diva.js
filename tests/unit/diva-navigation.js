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
        goDirectlyTo: 100,
        onReady: function (settings) {
            var event = $.Event("dblclick");
            event.pageX = 1000;
            event.pageY = 500;
            setTimeout(function () {
                $(settings.selector + 'page-100').trigger(event);
                setTimeout(function () {
                    equal(settings.zoomLevel, 2, "Zoom level should now be 2");
                    equal(settings.currentPageIndex, 100, "Should still be on page 100");
                    start();
                }, 10);
            }, 10);
        }
    });
});

asyncTest("Switching between document and grid view", function () {
    $.tempDiva({
        onReady: function (settings) {
            ok(!settings.inGrid, "Not in grid initially");
            $(settings.selector + 'grid-icon').click();

            // Click the grid icon, then wait a bit for the event to be triggered
            setTimeout(function () {
                ok(settings.inGrid, "Should now be in grid");
                ok($(settings.selector + 'grid-slider').is(':visible'), "Grid slider should be visible");
                ok(!$(settings.selector + 'zoom-slider').is(':visible'), "Zoom slider should not be visible");
                start();
            }, 10);
        }
    });
});

asyncTest("Switching between regular and fullscreen mode", function () {
    $.tempDiva({
        onReady: function (settings) {
            ok(!settings.inFullscreen, "Not in fullscreen initially");
            $(settings.selector + 'fullscreen').click();

            // Click the fullscreen icon, then wait for a bit for the event to be triggered
            setTimeout(function () {
                ok(settings.inFullscreen, "Should now be in fullscreen");
                ok($('body').hasClass('hide-scrollbar'), "Body should have the hide-scrollbar class");
                start();
            }, 10);
        }
    });
});
