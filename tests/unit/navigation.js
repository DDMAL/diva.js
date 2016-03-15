/*
Test coverage: pretty much complete
Could also test key navigation, but it's pretty difficult and doesn't seem worth it
*/

QUnit.module("Navigation", { beforeEach: clearTempDiva });

// FIXME: This test pattern is pretty iffy. There should be more robust ways to do this than
// with a timeout, and the toolbar and page index are kind of separate concerns.
var assertPageIs = function (index, divaInst, done)
{
    setTimeout(function () {
        var rendered = (index + 1) + '';

        var actualIndex = divaInst.getCurrentPageIndex();
        equal(actualIndex, index, "The page should now be " + rendered + " (index of " + index + ")");

        var actualRendered = $(divaInst.getSettings().selector + 'current-page').text();
        equal(actualRendered, rendered, "The toolbar should have been updated");

        done();
    }, 10);
};

var assertZoomIs = function (level, divaInst, controlName)
{
    var actualLevel = divaInst.getZoomLevel();
    var renderedLevel = $(divaInst.getSettings().selector + 'zoom-level').text();

    equal(actualLevel, level, "Zoom level should now be " + level);
    equal(renderedLevel, level + '', "The " + controlName + " label should have been updated");
};

QUnit.test("Scrolling in document view", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        settings.outerObject.scrollTop(10000);
        assertPageIs(34, this, done);
    });

    $.tempDiva({
        zoomLevel: 0,
        adaptivePadding: 0,
        fixedPadding: 40
    });
});

QUnit.test("Scrolling in grid view", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        settings.outerObject.scrollTop(10000);
        assertPageIs(24, this, done);
    });

    $.tempDiva({
        inGrid: true,
        pagesPerRow: 2,
        fixedHeightGrid: false
    });
});

QUnit.test("Scrolling in book view", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        settings.outerObject.scrollLeft(200);
        settings.outerObject.scrollTop(10000);
        assertPageIs(18, this, done);
    });

    $.tempDiva({
        objectData: '../demo/beromunster-iiif.json'
    });
});

QUnit.test("Zooming using the slider", function (assert) {
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        var slider = $(settings.selector + 'zoom-slider');

        slider.val(0);
        slider.change();

        assertZoomIs(0, this, 'slider');

        slider.val(4);
        slider.change();

        assertZoomIs(4, this, 'slider');

        done();
    });

    $.tempDiva({
        enableZoomControls: 'slider',
        zoomLevel: 4
    });
});

QUnit.test("Zooming using +/- buttons", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        for (var i = 0; i < 4; i++)
        {
            $(settings.selector + 'zoom-out-button').trigger('click');
        }

        assertZoomIs(0, this, 'zoom buttons');

        for (i = 0; i < 4; i++)
        {
            $(settings.selector + 'zoom-in-button').trigger('click');
        }

        assertZoomIs(4, this, 'zoom buttons');

        done();
    });

    $.tempDiva({
        zoomLevel: 4
    });
});

QUnit.test("Changing pages per row in Grid view using slider", function (assert)
{
    var done = assert.async();

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

        done();
    });

    $.tempDiva({
        enableGridControls: 'slider',
        pagesPerRow: 2
    });
});

QUnit.test("Scrolling and subsequently zooming in Grid view", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        settings.outerObject.scrollTop(10050);

        var self = this;
        setTimeout(function () {
            equal(self.getCurrentPageIndex(), 160, "The current page should be 170 (10050px down, 1000px viewport)");

            $(settings.selector + 'grid-slider').val(8);
            equal(self.getCurrentPageIndex(), 160, "The current page should still be 170");

            $(settings.selector + 'grid-slider').val(2);
            equal(self.getCurrentPageIndex(), 160, "The current page should still be 170");

            done();
        }, 10);
    });

    $.tempDiva({
        inGrid: true,
        enableGridControls: 'slider',
        pagesPerRow: 5,
        fixedHeightGrid: false
    });
});

QUnit.test("Changing pages per row in Grid view using +/- buttons", function (assert)
{
    var done = assert.async();

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

        done();
    });

    $.tempDiva({
        pagesPerRow: 2
    });
});

QUnit.test("Zooming by double-clicking", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        var wrapperOffset = $('#diva-temp').offset();
        var testEvent = $.Event("dblclick");
        testEvent.pageX = 500;
        testEvent.pageY = 350 + wrapperOffset.top;
        testEvent.target = settings.outerObject.find('.diva-document-page')[0];

        setTimeout(function () {
            settings.outerObject.trigger(testEvent);
            setTimeout(function () {
                equal(settings.zoomLevel, 2, "Zoom level should now be 2");
                equal(settings.currentPageIndex, 100, "Should still be on page 100");
                done();
            }, 10);
        }, 10);
    });

    $.tempDiva({
        zoomLevel: 1,
        goDirectlyTo: 100
    });
});

QUnit.test("Switching between document and grid view", function (assert)
{
    var done = assert.async();

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
            done();
        }, 10);
    });

    $.tempDiva({});
});

QUnit.test("Switching between regular and fullscreen mode", function (assert)
{
    var done = assert.async();

    diva.Events.subscribe('ViewerDidLoad', function(settings)
    {
        ok(!settings.inFullscreen, "Not in fullscreen initially");
        $(settings.selector + 'fullscreen-icon').click();

        // Click the fullscreen icon, then wait for a bit for the event to be triggered
        setTimeout(function () {
            ok(settings.inFullscreen, "Should now be in fullscreen");
            ok($('body').hasClass('diva-hide-scrollbar'), "Body should have the hide-scrollbar class");

            done();
        }, 10);
    });

    $.tempDiva({});
});

QUnit.test("Jumping to page in Book view", function (assert)
{
    var done = assert.async();

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

            done();
        }, 10);
    });

    $.tempDiva({
        inBookLayout: true
    });
});
