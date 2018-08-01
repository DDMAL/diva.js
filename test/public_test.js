import Diva from '../source/js/diva';

describe('Public Functions', function ()
{   
    beforeEach(function ()
    {
        // recreate diva instance
        let oldDiva = document.getElementById('diva-wrapper');
        oldDiva.parentNode.removeChild(oldDiva);
        let newDiva = document.createElement('div');
        newDiva.id = 'diva-wrapper';
        document.body.appendChild(newDiva);

        Diva.Events.unsubscribeAll();
    });

    it('getItemTitle()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getItemTitle(), "Salzinnes, CDN-Hsmu M2149.L4", "The title should be Salzinnes, CDN-Hsmu M2149.L4");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("getCurrentPage()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getCurrentPageIndex(), 0, "Initial page should be 0");
            this.gotoPageByIndex(200); // Go to page index 200
            assert.strictEqual(this.getCurrentPageIndex(), 200, "The page index should now be 200");
            this.gotoPageByIndex(5); 
            assert.strictEqual(this.getCurrentPageIndex(), 5, "The page index should now be 5");

            Diva.Events.subscribe('ViewDidSwitch', function ()
            {
                this.gotoPageByIndex(100);
                assert.strictEqual(this.getCurrentPageIndex(), 100, 'Transitions in grid mode should work');

                done();
            });

            this.enterGridView();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("getCurrentPageIndex()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getCurrentPageIndex(), 0, "Initial page should be 0");
            this.gotoPageByIndex(300);
            assert.strictEqual(this.getCurrentPageIndex(), 300, "The page index should now be 300");

            // Reset it to the first page
            this.gotoPageByIndex(0);
            assert.strictEqual(this.getCurrentPageIndex(), 0, "The page index should now be 0");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("get/setZoomLevel(), zoomIn() and zoomOut()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getZoomLevel(), 2, "Initial zoom level should be 2");
            assert.isOk(this.zoomOut(), "It should be possible to zoom out once");
            assert.strictEqual(this.getZoomLevel(), 1, "Zoom level should now be 1");
            assert.isOk(!this.zoomOut(), "It should not be possible to zoom out again");
            assert.strictEqual(this.getZoomLevel(), 1, "Zoom level should still be 1");

            assert.isOk(this.zoomIn(), "It should be possible to zoom in");
            assert.strictEqual(this.getZoomLevel(), 2, "Zoom level should now be 2");
            assert.isOk(this.zoomIn(), "Zooming in again");
            assert.strictEqual(this.getZoomLevel(), 3, "Zoom level should now be 3");
            assert.isOk(!this.zoomIn(), "It should not be possible to zoom in again (hit max)");
            assert.strictEqual(this.getZoomLevel(), 3, "Zoom level should still be 3");

            assert.isOk(!this.setZoomLevel(5), "Setting zoom level to 5 should fail");
            assert.strictEqual(this.getZoomLevel(), 3, "Zoom level should still be 3");

            assert.isOk(this.setZoomLevel(2), "Setting zoom level to 2 should be fine");
            assert.strictEqual(this.getZoomLevel(), 2, "Zoom level should now be 2");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            zoomLevel: 2,
            minZoomLevel: 1,
            maxZoomLevel: 3
        });
    });

    it("isRegionInViewport()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            // Can only do fairly simple checks
            assert.isOk(this.isRegionInViewport(0, 100, 200, 100, 150));
            assert.isOk(!this.isRegionInViewport(0, 100, -200, 100, 100));
            assert.isOk(!this.isRegionInViewport(40, 100, 50, 100, 200));

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            viewportMargin: 0
        });
    });

    it("isPageInViewport()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.isOk(this.isPageInViewport(0), 'The first page should be in the viewport');
            assert.isOk(!this.isPageInViewport(100), 'The hundredth page should not be in the viewport');

            this.enterGridView();
        });

        Diva.Events.subscribe('ViewDidSwitch', function ()
        {
            assert.isOk(this.isPageInViewport(0), 'The first page should be in the viewport grid');
            assert.isOk(this.isPageInViewport(5), 'The fifth page should be in the viewport grid');
            assert.isOk(!this.isPageInViewport(100), 'The hundredth page should not be in the viewport grid');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("toggleFullscreenMode(), enterFullscreenMode(), leaveFullscreenMode()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isOk(!settings.inFullscreen, "Should not be in fullscreen initially");
            this.toggleFullscreenMode();
            assert.isOk(settings.inFullscreen, "Should now be in fullscreen");
            assert.isOk(!this.enterFullscreenMode(), "Should not be possible to enter fullscreen");
            assert.isOk(settings.inFullscreen, "Should still be in fullscreen");
            assert.isOk(this.leaveFullscreenMode(), "Should be possible to exit fullscreen");
            assert.isOk(!settings.inFullscreen, "No longer in fullscreen");
            assert.isOk(!this.leaveFullscreenMode(), "Should not be possible to exit fullscreen");
            assert.isOk(!settings.inFullscreen, "Still not in fullscreen");
            assert.isOk(this.enterFullscreenMode(), "Should be possible to enter fullscreen");
            this.toggleFullscreenMode();
            assert.isOk(!settings.inFullscreen, "Should now be out of fullscreen");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("enterGridView(), leaveGridView()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isOk(!settings.inGrid, "Should not be in grid initially");
            this.enterGridView();
            assert.isOk(settings.inGrid, "Should now be in grid");
            assert.isOk(!this.enterGridView(), "Should not be possible to enter grid");
            assert.isOk(settings.inGrid, "Should still be in grid");
            assert.isOk(this.leaveGridView(), "Should be possible to exit grid");
            assert.isOk(!settings.inGrid, "No longer in grid");
            assert.isOk(!this.leaveGridView(), "Should not be possible to exit grid");
            assert.isOk(!settings.inGrid, "Still not in grid");
            assert.isOk(this.enterGridView(), "Should be possible to enter grid");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("gotoPageByName()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.currentPageIndex, 0, "Initial page number should be 1");
            assert.isOk(!this.gotoPageByURI('https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_000r.jp2'), "It should not find anything for 000r.jp2");
            assert.isOk(this.gotoPageByURI('https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001v.jp2', "right", "center"), "It should find the page index for folio-001v");
            assert.strictEqual(settings.currentPageIndex, 1, "Now the page number should be 2");

            assert.strictEqual(settings.viewport.top, 1000, "The page should be anchored to the center (vertically)");
            assert.strictEqual(settings.viewport.left, 0, "The page should be anchored to the right");
            this.gotoPageByIndex(1, "left", "top");
            assert.strictEqual(settings.viewport.top, 917, "The page should be anchored to the top");
            assert.strictEqual(settings.viewport.left, 0, "The page should be anchored to the left");
            this.gotoPageByIndex(2, "right", "bottom");
            assert.strictEqual(settings.viewport.bottom, 2700, "The page should be anchored to the bottom");

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("getPageIndex()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this._getPageIndex('https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001v.jp2'), 1, "Valid filename");
            assert.strictEqual(this._getPageIndex('https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001lolv.jp2'), -1, "Invalid filename");

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    // Can't really test the getCurrentURL function

    // Can't really test getURLHash easily either
    // Since it relies on getState, we can test the public version of that instead

    it("getState()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            var expected = {
                f: false,
                v: 'd',
                i: 'https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001r.jp2',
                n: 5,
                p: false,
                x: null,
                y: null, 
                z: 2
            };

            var actual = this.getState();

            // Sanity check
            assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), 'State shape should be as expected');

            Object.keys(expected).forEach(function (key)
            {
                if (key === 'x' || key === 'y')
                {
                    // can't test x and y since width of wrapper isn't specified here
                }
                else
                    assert.strictEqual(actual[key], expected[key], "State key '" + key + "'");
            });

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("setState()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            var state = {
                f: true,
                v: 'd',
                i: "https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_003r.jp2",
                n: 3,
                p: false,
                x: 500,
                y: 300,
                z: 3
            };

            this.setState(state);
            assert.isOk(settings.inFullscreen, "Should now be in fullscreen");
            assert.isOk(!settings.inGrid, "Should not be in grid");
            assert.isOk(!settings.inBookLayout, "Should not be in book view");
            assert.strictEqual(settings.currentPageIndex, 4, "Current page should be 5 (index of 4)");
            assert.strictEqual(settings.pagesPerRow, 3, "Pages per row should be 3");
            assert.strictEqual(settings.zoomLevel, 3, "Zoom level should be 3");

            // NOTE: can't currently do these assertions since the diva parent size isn't fixed
            // Recompute the offsets from first principles
            // var index = this._getPageIndex("https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_003r.jp2");
            // var offset = this.getPageOffset(index);
            // var viewportElem = settings.viewportElement;
            // var x = viewportElem.scrollLeft - offset.left + (viewportElem.clientWidth / 2);
            // var y = viewportElem.scrollTop - offset.top + (viewportElem.clientHeight / 2);

            // assert.closeTo(x, 500, 1, "x offset should be the specified value");
            // assert.closeTo(y, 300, 1, "y offset should be the specified value");

            state = {
                f: false,
                v: 'g',
                i: "https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_005v.jp2",
                n: 4,
                p: true,
                x: 100,
                y: 200,
                z: 4
            };

            this.setState(state);
            assert.isOk(!settings.inFullscreen, "Should not be in fullscreen");
            assert.isOk(settings.inGrid, "Should be in grid");
            assert.strictEqual(settings.currentPageIndex, 9, "Current page should be 005v.jp2 (index of 9)");
            assert.strictEqual(settings.pagesPerRow, 4, "Pages per row should be 4");
            assert.strictEqual(settings.zoomLevel, 4, "Zoom level should be 4");

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("translateFromMaxZoomLevel()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            var state = {
                f: true,
                v: 'd',
                i: "https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_003r.jp2",
                n: 3,
                p: false,
                x: 500,
                y: 300,
                z: this.getMaxZoomLevel()
            };

            this.setState(state);

            var boxOnMaxPage = {x: 100, y: 100, width:1234, height:1324};

            // first check to make sure the box on the max zoom level is the same as the box we feed in.
            assert.strictEqual(this.translateFromMaxZoomLevel(100), boxOnMaxPage.x);
            assert.strictEqual(this.translateFromMaxZoomLevel(100), boxOnMaxPage.y);
            assert.strictEqual(this.translateFromMaxZoomLevel(1234), boxOnMaxPage.width);
            assert.strictEqual(this.translateFromMaxZoomLevel(1324), boxOnMaxPage.height);

                // reset the state to a different zoom level
                state = {
                    f: true,
                    v: 'd',
                    i: "https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_003r.jp2",
                    n: 3,
                    p: false,
                    x: 500,
                    y: 300,
                    z: 2
                };
                this.setState(state);

            // check that the box translation has changed accordingly.
            assert.strictEqual(this.translateFromMaxZoomLevel(boxOnMaxPage.x), 12.5);
            assert.strictEqual(this.translateFromMaxZoomLevel(boxOnMaxPage.y), 12.5);
            assert.strictEqual(this.translateFromMaxZoomLevel(boxOnMaxPage.width), 154.25);
            assert.strictEqual(this.translateFromMaxZoomLevel(boxOnMaxPage.height), 165.5);

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("translateToMaxZoomLevel()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            var state = {
                f: true,
                v: 'd',
                i: "https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_003r.jp2",
                n: 3,
                p: false,
                x: 500,
                y: 300,
                z: this.getMaxZoomLevel()
            };

            this.setState(state);

            var boxOnThisPage = {x: 10, y: 10, width:123, height:132};

            // first check to make sure the box on the max zoom level is the same as the box we feed in.
            assert.strictEqual(this.translateToMaxZoomLevel(10), boxOnThisPage.x);
            assert.strictEqual(this.translateToMaxZoomLevel(10), boxOnThisPage.y);
            assert.strictEqual(this.translateToMaxZoomLevel(123), boxOnThisPage.width);
            assert.strictEqual(this.translateToMaxZoomLevel(132), boxOnThisPage.height);

                // reset the state to a different zoom level
                state = {
                    f: true,
                    v: 'd',
                    i: "https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_003r.jp2",
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
            assert.strictEqual(this.translateToMaxZoomLevel(boxOnThisPage.x), 80);
            assert.strictEqual(this.translateToMaxZoomLevel(boxOnThisPage.y), 80);
            assert.strictEqual(this.translateToMaxZoomLevel(boxOnThisPage.width), 984);
            assert.strictEqual(this.translateToMaxZoomLevel(boxOnThisPage.height), 1056);

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("getPageDimensionsAtCurrentZoomLevel([pageIndex])", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            var current = this.getCurrentPageDimensionsAtCurrentZoomLevel();
            var page10 = this.getCurrentPageDimensionsAtCurrentZoomLevel();

            assert.deepEqual(current, page10, 'It should default to the current page');
            assert.ok(typeof page10.height === 'number' && typeof page10.width === 'number', 'It should ... have numbers?');

            this.leaveGridView();

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            goDirectlyTo: 10,
            inGrid: true
        });
    });
});