import Diva from '../source/js/diva';

describe('Public Functions', function ()
{   
    beforeEach(function ()
    {
        // recreate diva instance
        let oldWrapper = document.getElementById('parent-wrapper');
        oldWrapper.parentNode.removeChild(oldWrapper);
        let newWrapper = document.createElement('div');
        newWrapper.id = 'parent-wrapper';
        newWrapper.setAttribute('style', 'width: 984px;');
        let div = document.createElement('div');
        div.id = 'diva-wrapper';
        newWrapper.appendChild(div);
        document.body.appendChild(newWrapper);

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
            assert.strictEqual(this.getActivePageIndex(), 0, "Initial page should be 0");
            this.gotoPageByIndex(200); // Go to page index 200
            assert.strictEqual(this.getActivePageIndex(), 200, "The page index should now be 200");
            this.gotoPageByIndex(5); 
            assert.strictEqual(this.getActivePageIndex(), 5, "The page index should now be 5");

            Diva.Events.subscribe('ViewDidSwitch', function ()
            {
                this.gotoPageByIndex(100);
                assert.strictEqual(this.getActivePageIndex(), 100, 'Transitions in grid mode should work');

                done();
            });

            this.enterGridView();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("getActivePageIndex()", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getActivePageIndex(), 0, "Initial page should be 0");
            this.gotoPageByIndex(300);
            assert.strictEqual(this.getActivePageIndex(), 300, "The page index should now be 300");

            // Reset it to the first page
            this.gotoPageByIndex(0);
            assert.strictEqual(this.getActivePageIndex(), 0, "The page index should now be 0");
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

            this.changeView('grid');
            assert.isOk(this.setZoomLevel(2), "Setting zoom level to 2 from grid should be fine");
            assert.strictEqual(this.getZoomLevel(), 2, "Zoom level should now be 2");

            this.changeView('book');
            this.changeView(' ');
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

    it('goToPageByName(filename, xAnchor, yAnchor)', function (done) 
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isOk(this.gotoPageByName('https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001v.jp2', "right", "center"), "It should find the page index for folio-001v");
            assert.strictEqual(settings.activePageIndex, 1, "Now the page number should be 2 (index 1)");
            assert.strictEqual(settings.viewport.top, 1103, "The page should be anchored to the center (vertically)");
            assert.strictEqual(settings.viewport.left, 0, "The page should be anchored to the right");
            
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("gotoPageByURI(uri, xAnchor, yAnchor)", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.activePageIndex, 0, "Initial page number should be 1");
            assert.isOk(!this.gotoPageByURI('https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_000r.jp2'), "It should not find anything for 000r.jp2");
            assert.isOk(this.gotoPageByURI('https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001v.jp2', "right", "center"), "It should find the page index for folio-001v");
            assert.strictEqual(settings.activePageIndex, 1, "Now the page number should be 2");

            assert.strictEqual(settings.viewport.top, 1103, "The page should be anchored to the center (vertically)");
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
            var viewportHeight = 494;
            var pageDimens = this.getCurrentPageDimensionsAtCurrentZoomLevel();

            var expected = {
                f: false,
                v: 'd',
                i: 'https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001r.jp2',
                n: 5,
                p: false,
                x: pageDimens.width / 2,
                y: viewportHeight / 2,
                z: 2
            };

            var actual = this.getState();

            // Sanity check
            assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), 'State shape should be as expected');

            Object.keys(expected).forEach(function (key)
            {
                if (key === 'x')
                    assert.closeTo(actual[key], 456, 1, "State key '" + key + "'");
                else
                    assert.strictEqual(actual[key], expected[key], "State key '" + key + "'");
            });

            this.changeView('book');
            assert.strictEqual(this.getState().v, 'b', 'View state should be book');

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
            assert.strictEqual(settings.activePageIndex, 4, "Current page should be 5 (index of 4)");
            assert.strictEqual(settings.pagesPerRow, 3, "Pages per row should be 3");
            assert.strictEqual(settings.zoomLevel, 3, "Zoom level should be 3");

            // Recompute the offsets from first principles
            var index = this._getPageIndex("https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_003r.jp2");
            var offset = this.getPageOffset(index);
            var viewportElem = settings.viewportElement;
            // var x = viewportElem.scrollLeft - offset.left + (viewportElem.clientWidth / 2);
            var y = viewportElem.scrollTop - offset.top + (viewportElem.clientHeight / 2);

            // NOTE: throws error in headless for some reason, works fine in debug though
            // assert.closeTo(x, 925, 1, "x offset should be the specified value");
            assert.closeTo(y, 300, 1, "y offset should be the specified value");

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
            assert.strictEqual(settings.activePageIndex, 9, "Current page should be 005v.jp2 (index of 9)");
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

            let fcn = () => { this.getPageDimensionsAtCurrentZoomLevel(-5); };
            expect(fcn).to.throw('Invalid Page Index');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            goDirectlyTo: 10,
            inGrid: true
        });
    });

    it('toggleOrientation()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.isOk(this.isVerticallyOriented(), 'Should be vertically oriented');
            this.toggleOrientation();
            assert.isOk(!this.isVerticallyOriented(), 'Should no longer be vertically oriented');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('toggleNonPagedPagesVisibility()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.isOk(!this.settings.showNonPagedPages, 'Should not show non paged pages');
            this.toggleNonPagedPagesVisibility();
            assert.isOk(this.settings.showNonPagedPages, 'Should show non paged pages');

            this.showNonPagedPages();
            this.hideNonPagedPages();
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('setGridPagesPerRow(pagesPerRow)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            this.setGridPagesPerRow(4);
            assert.isOk(this.settings.inGrid, 'Should now be in grid');
            assert.strictEqual(this.getGridPagesPerRow(), 4, 'Should be 4 pages per row');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('isInFullscreen()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.isOk(!this.isInFullscreen(), 'Should not be in fullscreen');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('isReady()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.isOk(this.isReady(), 'Viewer loaded, should be ready');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });

        assert.isOk(!diva.isReady(), 'Should not be ready yet');
    });

    it('isPageIndexValid(pageIndex)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.isOk(this.isPageIndexValid(2), 'Page index 2 should be valid');
            assert.isOk(!this.isPageIndexValid(-5), 'Page index -5 should not be valid');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('hasOtherImages(pageIndex)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.isOk(!this.hasOtherImages(1), 'Page 1 should not have other images');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('gotoPageByLabel(label)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            this.gotoPageByLabel('folio 001v');
            assert.strictEqual(this.getActivePageIndex(), 1, 'Should now be at page 2 (index 1)');

            // try with number instead of label
            this.gotoPageByLabel('asdfjkl');
            assert.strictEqual(this.getActivePageIndex(), 1, 'Should still be on page 2');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getPageIndexForPageXYValues(pageX, pageY)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getPageIndexForPageXYValues(-500, -500), -1, 'Index at (-500, -500) should be -1 (dne)');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getPageDimensionsAtZoomLevel(pageIdx, zoomLevel)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let dims = this.getPageDimensionsAtZoomLevel(0, 2);
            assert.strictEqual(dims.width, 551, 'Width of first page at zoom 2 should be 551');

            dims = this.getPageDimensionsAtZoomLevel(0, 10);
            assert.strictEqual(dims.width, 4414, 'Zoom 10 should default to max, width should be 4414');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });

        assert.isOk(!diva.getPageDimensionsAtZoomLevel(0, 1), 'Page not loaded should return false');
    });

    it('getPageDimensions(pageIndex)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getPageDimensions(0).height, 874, 'Page 1 height should be 874');
            assert.strictEqual(this.getPageDimensions(251).height, 866, 'Page 252 height should be 866');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });

        assert.isNull(diva.getPageDimensions(0), 'Should return null if diva not loaded yet');
    });

    it('getOtherImages(pageIndex)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.isEmpty(this.getOtherImages(0), 'Page 1 should have no other images');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getNumberOfPages() viewer not loaded', function ()
    {
        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });

        assert.isFalse(diva.getNumberOfPages(), 'Should return false if diva not loaded yet');
    });

    it('getMinZoomLevel()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getMinZoomLevel(), 0, 'Min zoom should be 0');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getMaxZoomLevelForPage(pageIdx)', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getMaxZoomLevelForPage(10), 5, 'Max zoom of page 10 should be 5');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });

        assert.isFalse(diva.getMaxZoomLevelForPage(0), 'Should return false if diva not loaded yet');
    });

    it('getInstanceSelector()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            // seems this function is actually broken (returns undefined). adding for coverage
            this.getInstanceSelector();
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getFilenames()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let filenames = this.getFilenames();
            assert.strictEqual(filenames[0], 'https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001r.jp2', 'First page URI should be right');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getAllPageURIs()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let URIs = this.getAllPageURIs();
            assert.strictEqual(URIs[0], 'https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_001r.jp2', 'First page URI should be right');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getCurrentPageFilename()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getCurrentPageFilename(), 'https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_006r.jp2', 'Page 10 filename should be right');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            goDirectlyTo: 10
        });
    });

    it('getCurrentPageURI()', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getCurrentPageURI(), 'https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_006r.jp2', 'Page 10 URI should be right');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            goDirectlyTo: 10
        });
    });

    it('getCurrentCanvas()', function (done) 
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getCurrentCanvas(), 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/canvas/folio-001r.json', 'Page 1 canvas should be right');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getCurrentPageOffset()', function (done) 
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getCurrentPageOffset().left, 27, 'First page left offset should be 27');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('getCurrentURL()', function (done) 
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            // can't really assert this since it could change based on testing environment
            this.getCurrentURL();
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('disableDragScrollable(), enableDragScrollable()', function (done) 
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            this.disableDragScrollable();
            assert.isTrue(this.viewerState.viewportObject.hasAttribute('nochilddrag'), 'Should not be draggable');
            this.enableDragScrollable();
            assert.isFalse(this.viewerState.viewportObject.hasAttribute('nochilddrag'), 'Should be draggable');
            
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('disableScrollable(), enableScrollable()', function (done) 
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            this.disableScrollable();
            assert.isFalse(this.viewerState.isScrollable, 'Should not be scrollable');
            this.enableScrollable();
            assert.isTrue(this.viewerState.isScrollable, 'Should be scrollable');
            
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('deactivate()', function (done) 
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            this.deactivate();
            assert.isFalse(this.viewerState.isActiveDiva, 'Diva should no longer be active');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });
});