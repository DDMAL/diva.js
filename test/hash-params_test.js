import Diva from '../source/js/diva';

// jQuery mimic
let el = document.getElementById.bind(document);

describe('Hash Params', function ()
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

    let testHashParams = function (testName, hashParams, onReadyCallback, config)
    {
        it(testName, function (done)
        {
            window.location.hash = Object.keys(hashParams).map(function (param)
            {
                return param + '=' + hashParams[param];
            }).join('&');

            let diva = new Diva('diva-wrapper', { // jshint ignore:line
                objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
                hashParamSuffix: config && config.hashParamSuffix ? config.hashParamSuffix : '',
                enableFilename: config && config.enableFilename ? config.enableFilename : ''
            });

            Diva.Events.subscribe('ViewerDidLoad', function (settings)
            {
                let scroll = {
                    left: settings.viewportElement.scrollLeft,
                    top: settings.viewportElement.scrollTop
                };

                onReadyCallback.call(this, settings, scroll);
                done();
            });
        });
    };

    testHashParams('works with hashParamSuffix', {vxyz: 'g', f: 'true'}, function (settings)
    {
        assert.isOk(settings.inGrid, 'Should read properties with the specified suffix');
        assert.isOk(!settings.inFullscreen, 'Should not read properties without it');
    }, {hashParamSuffix: 'xyz'});

    testHashParams("grid view (v)", {v: "g"}, function (settings)
    {
        assert.isOk(settings.inGrid, "inGrid setting should be true");
        assert.strictEqual(el(settings.selector + 'view-menu').children[0].classList[0], 'diva-grid-icon', "Current toolbar view icon should be the grid icon");
    });

    testHashParams("book view (v)", {v: "b"}, function (settings)
    {
        assert.isOk(settings.inBookLayout, "inBookLayout setting should be true");
        assert.strictEqual(el(settings.selector + 'view-menu').children[0].classList[0], 'diva-book-icon', "Current toolbar view icon should be the book icon");
        assert.isOk(this.isPageInViewport(0), 'There should be some book pages');
    });

    testHashParams("invalid view parameter (v) ", {v: "a"}, function (settings)
    {
        assert.isFalse(settings.inBookLayout, 'Should not be in book layout');
        assert.isFalse(settings.inGrid, 'Should also not be in grid layout');
    });

    testHashParams("fullscreen (f)", {f: "true"}, function (settings)
    {
        assert.isOk(settings.inFullscreen, "inFullscreen setting should be true");
        assert.isOk(document.body.classList.contains('diva-hide-scrollbar'), "The body element should have the hide-scrollbar class");
    });

    testHashParams("view (v) = 'g' and fullscreen (f)", {v: "g", f: "true"}, function (settings)
    {
        assert.isOk(settings.inFullscreen, "inFullscreen setting should be true");
        assert.isOk(settings.inGrid, "inGrid setting should be true");
    });

    testHashParams("zoom level (z) - valid value", {z: "3", f: "false"}, function (settings)
    {
        assert.strictEqual(settings.zoomLevel, 3, "Initial zoom level should be 3");
    });

    testHashParams("zoom level (z) - invalid value", {z: "6"}, function (settings)
    {
        assert.strictEqual(settings.zoomLevel, 0, "Initial zoom was invalid but >= 0, should be set to the min (0)");
    });

    testHashParams("zoom level (z) and view (v) = 'g' ", {z: "1", v: "g"}, function (settings)
    {
        assert.strictEqual(settings.zoomLevel, 1, "Initial zoom level should be 1");
        assert.isOk(settings.inGrid, "Should be in grid initially");

        // Now let's switch into document view and see if the zoom level is preserved
        document.getElementsByClassName('diva-document-icon')[0].click();
        assert.strictEqual(settings.zoomLevel, 1, "Zoom level setting should still be 1");
        // zoom level is 0 indexed internally, so setting to 1 should display 2.00
        assert.strictEqual(el(settings.selector + 'zoom-label').textContent, "Zoom level: 2", "Zoom buttons label should show a zoom level of 2");
    });

    testHashParams("zoom level (z) and fullscreen (f)", {z: "1", f: "true"}, function (settings)
    {
        assert.strictEqual(settings.zoomLevel, 1, "Initial zoom level should be 1");
        assert.isOk(settings.inFullscreen, "Should be in fullscreen initially");

        // Check that we're actually in fullscreen mode
        assert.isOk(document.body.classList.contains('diva-hide-scrollbar'), "The body element should have the hide-scrollbar class");

        // Check that the zoom level is actually 1 (second zoom)
        assert.strictEqual(el(settings.selector + 'zoom-label').textContent, "Zoom level: 2", "Zoom buttons label should show a zoom level of 2");
    });

    testHashParams("pagesPerRow (n) - valid value", {n: "3"}, function (settings)
    {
        assert.strictEqual(settings.pagesPerRow, 3, "Pages per row should be 3 initially");
    });

    testHashParams("pagesPerRow (n) - invalid value", {n: "1"}, function (settings)
    {
        assert.strictEqual(settings.pagesPerRow, 8, "Pages per row should default to the maximum");
    });

    testHashParams("pagesPerRow (n) and view (v) = 'g'", {n: "3", v: "g"}, function (settings)
    {
        assert.strictEqual(settings.pagesPerRow, 3, "Pages per row should be 3 initially");
        assert.isOk(settings.inGrid, "Should be in grid initially");

        // Check that the pages per row setting is actually 3
        assert.strictEqual(el(settings.selector + 'grid-label').textContent, "Pages per row: 3", "Grid buttons label should show 3 pages per row");
    });

    testHashParams("page filename (i) - valid value", {i: "https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_003r.jp2"}, function (settings)
    {
        assert.strictEqual(settings.activePageIndex, 4, "The initial page should be page 5 (index of 4)");
    }, {enableFilename: true});

    testHashParams("page filename (i) - invalid value", {i: "https://images.simssa.ca/iiif/image/cdn-hsmu-m2149l4/cdn-hsmu-m2149l4_000r.jp2"}, function (settings)
    {
        assert.strictEqual(settings.activePageIndex, 0, "The initial page should just be the first page");
    }, {enableFilename: true});

    testHashParams("page number (p) - valid value", {p: "6"}, function (settings)
    {
        assert.strictEqual(settings.activePageIndex, 5, "The initial page should be page 6 (index of 5)");
    }, {enableFilename: false});

    testHashParams("page number (p) - invalid value", {p: "600"}, function (settings)
    {
        assert.strictEqual(settings.activePageIndex, 0, "The initial page should just be the first page");
    }, {enableFilename: false});

    testHashParams("page number (p), view = 'g'", {p: "100", v: "g"}, function (settings)
    {
        assert.strictEqual(settings.activePageIndex, 99, "The initial page should be 100 (index of 99)");
        assert.ok(settings.inGrid, "Should be in grid");
    }, {enableFilename: false});

    testHashParams("horizontal and vertical offsets (x, y) without page specified", {x: 100, y: 200}, function (settings, scroll)
    {
        assert.strictEqual(scroll.top, 0, 'y position should not change');
    });

    testHashParams("vertical offset (y) on first page - positive value", {y: "600", p: "1"}, function (settings, scroll)
    {
        assert.strictEqual(scroll.top, 353, "Should have scrolled 353 (600 = top of page - viewport y-center) vertically");
    });

    testHashParams("vertical offset (y) on first page - negative value", {y: "-600", p: "1"}, function (settings, scroll)
    {
        assert.strictEqual(scroll.top, 0, "Should not have scrolled negatively because, well, you can't");
    });
    testHashParams("vertical offset (y) and page number (p)", {y: 500, p: "50"}, function (settings, scroll)
    {
        let expectedTopScroll = 44994;
        assert.strictEqual(settings.activePageIndex, 49, "Current page should be 50 (index of 49)");
        assert.strictEqual(scroll.top, expectedTopScroll, "Should be heightAbovePages + 500 pixels of scroll from the top + page y-center");

        // Check that the horizontal scroll hasn't been weirdly affected
        let expectedLeftScroll = 0; // no scrollbar at this zoom level
        assert.strictEqual(scroll.left, expectedLeftScroll, "Horizontal scroll should just center it");
    }, {enableFilename: false, zoomLevel: 2});

    testHashParams("horizontal offset (x) on first page - positive value", {x: "100", p: "1"}, function (settings, scroll)
    {
        // FIXME: https://github.com/DDMAL/diva.js/issues/331
        assert.strictEqual(scroll.left, 0, "Horizontal scroll should center it + 100 pixels to the right");
    });

    testHashParams("horizontal offset (x) on first page - negative value", {x: "-100", p: "1"}, function (settings, scroll)
    {
        // FIXME: https://github.com/DDMAL/diva.js/issues/331
        assert.strictEqual(scroll.left, 0, "Horizontal scroll should center it + 100 pixels to the left");
    });

    testHashParams("horizontal offset (x) and page number (p)", {x: 100, p: "50"}, function (settings, scroll)
    {
        // FIXME: https://github.com/DDMAL/diva.js/issues/331
        let expectedTopScroll = 44741;
        assert.strictEqual(scroll.top, expectedTopScroll, "vertical scroll should be just to page 50");
        assert.strictEqual(scroll.left, 0, "Horizontal scroll should center it + 100 pixels to the right");
    }, {enableFilename: false});

    testHashParams("horizontal offset (x), vertical offset (y), page number (p)", {x: 100, y: 200, p: "50"}, function (settings, scroll)
    {
        // FIXME: https://github.com/DDMAL/diva.js/issues/331
        let expectedTopScroll = 44694;
        assert.strictEqual(scroll.top, expectedTopScroll, "vertical scroll should be to page 50 + 200 + page y-center");
        assert.strictEqual(scroll.left, 0, "Horizontal scroll should center it + 100 pixels to the right");
    }, {enableFilename: false});
});