/*
Test coverage: pretty much complete
Could also test key navigation, but it's pretty difficult and doesn't seem worth it
*/

QUnit.module("Navigation", { beforeEach: clearTempDiva });

asyncTest("Scrolling in document view", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        settings.outerObject.scrollTop(10000);
        var self = this;

        // Set the timeout because we have to wait for the event handler
        setTimeout(function () {
            equal(self.getCurrentPageIndex(), 34, "The page should now be 35 (index of 34)");
            equal($(settings.selector + 'current-page').text(), '35', "The toolbar should have been updated");
            start();
        }, 10);
    });

    $.tempDiva({
        zoomLevel: 0,
        adaptivePadding: 0,
        fixedPadding: 40
    });
});

asyncTest("Scrolling in grid view", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        settings.outerObject.scrollTop(10000);

        var self = this;
        setTimeout(function () {
            equal(self.getCurrentPageIndex(), 24, "The page should now be 25 (index of 24)");
            equal($(settings.selector + 'current-page').text(), '25', "The toolbar should have been updated");
            start();
        }, 10);
    });

    $.tempDiva({
        inGrid: true,
        pagesPerRow: 2,
        fixedHeightGrid: false
    });
});

asyncTest("Scrolling down in book view", function() {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        settings.outerObject.scrollTop(10000);

        var self = this;

        setTimeout(function () {
            equal(self.getCurrentPageIndex(), 18, "The page should now be 19 (index of 18)");
            equal($(settings.selector + 'current-page').text(), '19', "The toolbar should have been updated");
            start();
        }, 10);
    });

    $.tempDiva({
        objectData: '../demo/beromunster-iiif.json'
    });
});

asyncTest("Zooming using the slider", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        document.getElementById(settings.ID + 'zoom-slider').value = 0;
        $(settings.selector + 'zoom-slider').change();
        equal(this.getZoomLevel(), 0, "Zoom level should now be 0");
        equal($(settings.selector + 'zoom-level').text(), '0', "The slider label should have been updated");

        document.getElementById(settings.ID + 'zoom-slider').value = 4;
        $(settings.selector + 'zoom-slider').change();
        equal(this.getZoomLevel(), 4, "Zoom level should now be 4");
        equal($(settings.selector + 'zoom-level').text(), '4', "The slider label should have been updated");
        start();
    });

    $.tempDiva({
        enableZoomControls: 'slider',
        zoomLevel: 4
    });
});

asyncTest("Zooming using +/- buttons", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        for (var i = 0; i < 4; i++)
        {
            $(settings.selector + 'zoom-out-button').trigger('click');
        }
        equal(this.getZoomLevel(), 0, "Zoom level should now be 0");
        equal($(settings.selector + 'zoom-level').text(), '0', "The zoom buttons label should have been updated");

        for (i = 0; i < 4; i++)
        {
            $(settings.selector + 'zoom-in-button').trigger('click');
        }
        equal(this.getZoomLevel(), 4, "Zoom level should now be 4");
        equal($(settings.selector + 'zoom-level').text(), '4', "The zoom buttons label should have been updated");
        start();
    });

    $.tempDiva({
        zoomLevel: 4
    });
});

asyncTest("Changing pages per row in Grid view using slider", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        this.enterGridView();
        $(settings.selector + 'grid-slider').val(8);
        $(settings.selector + 'grid-slider').change();
        equal(this.getState().n, 8, "Pages per row should now be 8");
        equal($(settings.selector + 'pages-per-row').text(), '8', "The grid buttons label should have been updated");

        $(settings.selector + 'grid-slider').val(3);
        $(settings.selector + 'grid-slider').change();
        equal(this.getState().n, 3, "Pages per row should now be 3");
        equal($(settings.selector + 'pages-per-row').text(), '3', "The grid buttons label should have been updated");

        start();
    });

    $.tempDiva({
        enableGridControls: 'slider',
        pagesPerRow: 2
    });
});

asyncTest("Scrolling and subsequently zooming in Grid view", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        settings.outerObject.scrollTop(10050);

        var self = this;
        setTimeout(function () {
            equal(self.getCurrentPageIndex(), 160, "The current page should be 170 (10050px down, 1000px viewport)");
            start();

            $(settings.selector + 'grid-slider').val(8);
            equal(self.getCurrentPageIndex(), 160, "The current page should still be 170");

            $(settings.selector + 'grid-slider').val(2);
            equal(self.getCurrentPageIndex(), 160, "The current page should still be 170");
        }, 10);
    });

    $.tempDiva({
        inGrid: true,
        enableGridControls: 'slider',
        pagesPerRow: 5,
        fixedHeightGrid: false
    });
});

asyncTest("Changing pages per row in Grid view using +/- buttons", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        this.enterGridView();
        for (var i = 0; i < 6; i++)
        {
            $(settings.selector + 'grid-out-button').trigger('click');
        }
        equal(this.getState().n, 2, "Pages per row should now be 2");
        equal($(settings.selector + 'pages-per-row').text(), '2', "The grid buttons label should have been updated");

        for (i = 0; i < 6; i++)
        {
            $(settings.selector + 'grid-in-button').trigger('click');
        }
        equal(this.getState().n, 8, "Pages per row should now be 8");
        equal($(settings.selector + 'pages-per-row').text(), '8', "The grid buttons label should have been updated");

        start();
    });

    $.tempDiva({
        pagesPerRow: 2
    });
});

asyncTest("Switching between document and grid view", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        ok(!settings.inGrid, "Not in grid initially");
        $(settings.selector + 'grid-icon').click();

        // Click the grid icon, then wait a bit for the event to be triggered
        setTimeout(function () {
            ok(settings.inGrid, "Should now be in grid");
            ok($(settings.selector + 'grid-out-button').is(':visible'), "Grid buttons should be visible (-)");
            ok($(settings.selector + 'grid-in-button').is(':visible'), "Grid buttons should be visible (+)");
            ok(!$(settings.selector + 'zoom-out-buttons').is(':visible'), "Zoom buttons should not be visible (-)");
            ok(!$(settings.selector + 'zoom-in-buttons').is(':visible'), "Zoom buttons should not be visible (+)");
            start();
        }, 10);
    });

    $.tempDiva({});
});

asyncTest("Switching between regular and fullscreen mode", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        ok(!settings.inFullscreen, "Not in fullscreen initially");
        $(settings.selector + 'fullscreen').click();

        // Click the fullscreen icon, then wait for a bit for the event to be triggered
        setTimeout(function () {
            ok(settings.inFullscreen, "Should now be in fullscreen");
            ok($('body').hasClass('diva-hide-scrollbar'), "Body should have the hide-scrollbar class");
            start();
        }, 10);
    });

    $.tempDiva({});
});

asyncTest("Jumping to page in Book view", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        this.gotoPageByIndex(5);

        ok(settings.inBookLayout, "Should be in book layout");
        equal($(settings.selector + 'current-page').text(), '6', "Toolbar should indicate page 6");

        var dv = this;

        setTimeout(function() {
            ok($(settings.selector + 'page-5').length, "The element for page 6 (index 5) should be in the DOM");

            dv.gotoPageByIndex(6);
            equal($(settings.selector + 'current-page').text(), '7', "Toolbar should indicate page 7");
            ok($(settings.selector + 'page-6').length, "The element for page 7 (index 6) should be in the DOM");

            start();
        }, 10);
    });

    $.tempDiva({
        inBookLayout: true
    });
});

asyncTest("Jumping to page in Book view", function () {
    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        this.gotoPageByIndex(5);

        ok(settings.inBookLayout, "Should be in book layout");
        equal($(settings.selector + 'current-page').text(), '6', "Toolbar should indicate page 6");

        var dv = this;

        setTimeout(function() {
            ok($(settings.selector + 'page-5').length, "The element for page 6 (index 5) should be in the DOM");

            dv.gotoPageByIndex(6);
            equal($(settings.selector + 'current-page').text(), '7', "Toolbar should indicate page 7");
            ok($(settings.selector + 'page-6').length, "The element for page 7 (index 6) should be in the DOM");

            start();
        }, 10);
    });

    $.tempDiva({
        inBookLayout: true
    });
});
