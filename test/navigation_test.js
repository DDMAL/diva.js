import Diva from '../source/js/diva';

// jQuery mimic
let el = document.getElementById.bind(document);

describe('Navigation', function () 
{   
    beforeEach(function ()
    {
        // reset event subscription so only current test is subscribed
        Diva.Events.unsubscribeAll();

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
    }); 

    // FIXME: This test pattern is pretty iffy. There should be more robust ways to do this than
    // with a timeout, and the toolbar and page index are kind of separate concerns.
    var assertPageAfterScroll = function (scroll, index, divaInst, done, label)
    {
        var viewportObject = divaInst.getSettings().viewportObject;

        if ('left' in scroll)
            viewportObject.scrollLeft = scroll.left; // does this trigger a scroll event?

        viewportObject.addEventListener('scroll', function handleScroll ()
        {
            setTimeout(function ()
            {
                var rendered = label;

                var actualIndex = divaInst.getActivePageIndex();
                assert.strictEqual(actualIndex, index, "The page should now be " + rendered + " (index of " + index + ")");

                var actualRendered = el(divaInst.getSettings().selector + 'current-page').innerText;
                assert.strictEqual(actualRendered, rendered, "The toolbar should have been updated");

                viewportObject.removeEventListener('scroll', handleScroll);

                done();
            }, 10);
        });

        viewportObject.scrollTop = scroll.top;
    };

    var assertZoomIs = function (level, divaInst, controlName)
    {
        var actualLevel = divaInst.getZoomLevel();
        var renderedLevel = el(divaInst.getSettings().selector + 'zoom-level').innerText;

        assert.strictEqual(actualLevel, level, "Zoom level should now be " + level);
        assert.strictEqual(renderedLevel, (level + 1).toFixed(), "The " + controlName + " label should have been updated");
    };

    it("Scrolling in document view", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assertPageAfterScroll({ top: 10000 }, 40, this, done, 'Folio 020r - Folio 021r');
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            zoomLevel: 0,
            adaptivePadding: 0,
            fixedPadding: 40
        });
    });

    it("Scrolling in grid view", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assertPageAfterScroll({ top: 10000 }, 26, this, done, 'Folio 014r - Folio 014v');
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            inGrid: true,
            pagesPerRow: 2,
            fixedHeightGrid: false
        });
    });

    it("Scrolling in book view", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assertPageAfterScroll({ left: 200, top: 10000 }, 18, this, done, 'Bm 019 - Bm 020');
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://ddmal.github.io/diva.js/try/demo/beromunster-iiif.json'
        });
    });

    // Try to verify that zoom animation can be gracefully interrupted
    it('View change during zoom animation', function (done)
    {
        var gridViewSeen = false;

        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            Diva.Events.subscribe('ZoomLevelDidChange', function ()
            {
                this.enterGridView();
            }, this.getInstanceId());

            Diva.Events.subscribe('ViewDidSwitch', function (inGrid)
            {
                // debugger
                if (inGrid)
                {
                    gridViewSeen = true;
                    assert.strictEqual(this.getZoomLevel(), 3, 'Updated zoom level should be set');

                    defer(this.leaveGridView, this);
                }
                else
                {
                    assert.isOk(gridViewSeen, 'Grid view should have been entered');
                    assert.strictEqual(this.getZoomLevel(), 3, 'Zoom level should still be 3');

                    done();
                }
            }, this.getInstanceId());

            // debugger
            this.zoomIn();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://ddmal.github.io/diva.js/try/demo/beromunster-iiif.json',
            zoomLevel: 2
        });

        function defer(callback, ctx)
        {
            setTimeout(callback.bind(ctx), 10);
        }
    });

    it("Zooming using +/- buttons", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            el(settings.selector + 'zoom-out-button').click();
            assertZoomIs(4, this, 'zoom buttons');

            setTimeout(() =>
            {
                el(settings.selector + 'zoom-in-button').click();
                assertZoomIs(5, this, 'zoom buttons');

                done();
            }, 600);
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            zoomLevel: 5
        });
    });

    it("Scrolling and subsequently zooming in Grid view", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function(settings)
        {
            settings.viewportObject.scrollTop = 10050;

            setTimeout(() =>
            {
                assert.strictEqual(this.getActivePageIndex(), 165, "The current page should be 165 (10050px down, 1871px viewport)");

                el(settings.selector + 'grid-out-button').click();
                el(settings.selector + 'grid-out-button').click();
                assert.strictEqual(this.getActivePageIndex(), 165, "The current page should still be 85");

                for (var i = 0; i < 5; i++) 
                {
                    el(settings.selector + 'grid-in-button').click();
                }
                assert.strictEqual(this.getActivePageIndex(), 165, "The current page should still be 85");

                done();
            }, 10);
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            inGrid: true,
            pagesPerRow: 5,
            fixedHeightGrid: false
        });
    });

    it("Changing pages per row in Grid view using +/- buttons", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            this.enterGridView();
            for (var i = 0; i < 6; i++)
            {
                el(settings.selector + 'grid-in-button').click();
            }
            assert.strictEqual(this.getState().n, 8, "Pages per row should now be 8");
            assert.strictEqual(el(settings.selector + 'pages-per-row').innerText, '8', "The grid buttons label should have been updated");

            for (i = 0; i < 6; i++)
            {
                el(settings.selector + 'grid-out-button').click();
            }
            assert.strictEqual(this.getState().n, 2, "Pages per row should now be 2");
            assert.strictEqual(el(settings.selector + 'pages-per-row').innerText, '2', "The grid buttons label should have been updated");

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            pagesPerRow: 2
        });
    });

    it("Zooming by double-clicking", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            var dblClick = new MouseEvent('dblclick', {
                'view': window,
                'bubbles': true,
                'cancelable': true
            });

            setTimeout(function ()
            {
                diva.settings.innerElement.dispatchEvent(dblClick);
                setTimeout(function ()
                {
                    assert.strictEqual(settings.zoomLevel, 2, "Zoom level should now be 2");
                    assert.strictEqual(settings.activePageIndex, 100, "Should still be on page 100");
                    done();
                }, 10);
            }, 10);
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            zoomLevel: 1,
            goDirectlyTo: 100
        });
    });

    it("Switching between document and grid view", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.ok(!settings.inGrid, "Not in grid initially");
            el(settings.selector + 'grid-icon').click();

            // Click the grid icon, then wait a bit for the event to be triggered
            setTimeout(function ()
            {
                assert.isOk(settings.inGrid, "Should now be in grid");
                assert.isDefined(el(settings.selector + 'grid-out-button'), "Grid buttons should be visible (-)");
                assert.isDefined(el(settings.selector + 'grid-in-button'), "Grid buttons should be visible (+)");
                assert.isNull(el(settings.selector + 'zoom-out-buttons'), "Zoom buttons should not be visible (-)");
                assert.isNull(el(settings.selector + 'zoom-in-buttons'), "Zoom buttons should not be visible (+)");
                done();
            }, 10);
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("Switching between regular and fullscreen mode", function (done)
    {
        var initialX = null;
        var initialY = null;

        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isOk(!settings.inFullscreen, "Not in fullscreen initially");

            var state = this.getState();
            initialX = state.x;
            initialY = state.y;

            this.enterFullscreenMode();
        });

        Diva.Events.subscribe('ModeDidSwitch', function (inFullscreen)
        {
            if (inFullscreen)
            {
                assert.isOk(this.getSettings().inFullscreen, "Should now be in fullscreen");
                assert.isOk(document.body.classList.contains('diva-hide-scrollbar'), "Body should have the hide-scrollbar class");

                this.leaveFullscreenMode();
            }
            else
            {
                var state = this.getState();

                assert.isOk(!this.getSettings().inFullscreen, "Should now not be in fullscreen");
                assert.strictEqual(state.x, initialX, 'Entering and leaving fullscreen mode should not change the x position');
                assert.strictEqual(state.y, initialY, 'Entering and leaving fullscreen mode should not change the y position');

                done();
            }
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it("Jumping to page in Book view", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            this.gotoPageByIndex(5);

            assert.isOk(settings.inBookLayout, "Should be in book layout");
            assert.strictEqual(el(settings.selector + 'current-page').innerText, 'Folio 003r - Folio 004r', "Toolbar should indicate label for page 6");

            setTimeout(() =>
            {
                assert.isOk(this.isPageInViewport(5), "Page 6 (index 5) should be loaded");

                this.gotoPageByIndex(6);
                assert.strictEqual(el(settings.selector + 'current-page').innerText, 'Folio 003r - Folio 004r', "Toolbar should stay the same");
                assert.isOk(this.isPageInViewport(6), "Page 7 (index 6) should be loaded");

                done();
            }, 10);
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            inBookLayout: true
        });
    });
});