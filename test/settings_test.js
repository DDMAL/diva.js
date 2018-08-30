import Diva from '../source/js/diva';

// jQuery mimic
let el = document.getElementById.bind(document);

describe('Settings', function ()
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


    it("adaptivePadding enabled", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings) {
            assert.notStrictEqual(settings.verticalPadding, 10, "Adaptive padding should be used, overrides vertical/horizontal");
            assert.notStrictEqual(settings.horizontalPadding, 10, "Horizontal padding should be overridden by adaptive");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            adaptivePadding: 0.10
        });
    });

    it("adaptivePadding disabled, fixedPadding set", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.verticalPadding, 11, "Vertical padding should be 11 (no plugins enabled)");
            assert.strictEqual(settings.horizontalPadding, 11, "Horizontal padding should be 11 (fixedPadding)");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            adaptivePadding: 0,
            fixedPadding: 11,
        });
    });

    it("enableFullscreen false", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            // Make sure the fullscreen icon is not there
            assert.isNull(el(settings.selector + 'fullscreen-icon'), "Fullscreen icon should not be present");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            enableFullscreen: false
        });
    });

    it("enableFullscreen true", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            // Make sure the fullscreen icon is there
            assert.isNotNull(el(settings.selector + 'fullscreen-icon'), "Fullscreen icon should be present");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            enableFullscreen: true
        });
    });

    it("enableGotoPage false", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isNull(el(settings.selector + 'goto-page'), "Go-to-page box should not be present");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            enableGotoPage: false
        });
    });

    it("enableGotoPage true", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isNotNull(el(settings.selector + 'goto-page'), "Go-to-page box should be present");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            enableGotoPage: true
        });
    });

    it("fixedHeightGrid false", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function()
        {
            this.enterGridView();

            assert.isOk(pagesHaveEqualDimension(this, 'width'), 'All page widths should be equal');
            assert.isNotOk(pagesHaveEqualDimension(this, 'height'), 'All page heights should NOT be equal');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            fixedHeightGrid: false
        });
    });

    it("fixedHeightGrid true", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function()
        {
            this.enterGridView();

            assert.isNotOk(pagesHaveEqualDimension(this, 'width'), 'All page widths should NOT be equal');
            assert.isOk(pagesHaveEqualDimension(this, 'height'), 'All page heights should be equal');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            fixedHeightGrid: true
        });
    });

    function pagesHaveEqualDimension(viewer, dimension)
    {
        var dimensions = [];

        var numPages = viewer.getNumberOfPages();

        for (var i = 0; i < numPages; i++)
            dimensions.push(viewer.getPageDimensionsAtCurrentZoomLevel(i)[dimension]);

        var first = dimensions[0];

        return dimensions.every(function (dim)
        {
            // FIXME: Should floating point numbers happen here?
            return Math.abs(dim - first) < 0.5;
        });
    }

    it("goDirectlyTo, valid", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.activePageIndex, 10, "The initial page index should be 10");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            goDirectlyTo: 10
        });
    });

    it("goDirectlyTo, invalid", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.activePageIndex, 0, "The initial page index should be 0 (the fallback)");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            goDirectlyTo: -10
        });
    });

    it('hashParamSuffix, omitted', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(typeof settings.hashParamSuffix, 'string', "If omitted, hashParamSuffix should default to... some string");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json'
        });
    });

    it('hashParamSuffix, provided', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.hashParamSuffix, '!!!!!!!', 'User hashParamSuffix should be honoured');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            hashParamSuffix: '!!!!!!!'
        });
    });

    it("inBookLayout true", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.ok(settings.inBookLayout, 'inBookLayout should remain true after initialization');
            assert.ok(this.getPageOffset(1).left < this.getPageOffset(2).left, 'Page 1 should be to the left of page 2');
            assert.ok(this.getPageOffset(2).left > this.getPageOffset(3).left, 'Page 2 should be to the right of page 3');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            inBookLayout: true
        });
    });

    it("manifest.paged triggers inBookLayout", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isOk(settings.manifest.paged, 'settings.manifest.paged should be true when manifest has viewingHint: paged');
            assert.isOk(settings.inBookLayout, 'settings.inBookLayout should be true when manifest.paged is true');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://ddmal.github.io/diva.js/try/demo/beromunster-iiif.json'
        });
    });

    it("inGrid false", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isOk(!settings.inGrid, "inGrid setting should still be false");
            assert.strictEqual(el(settings.selector + 'view-menu').children[0].classList[0], 'diva-document-icon', "Current toolbar view icon should be the document icon");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            inGrid: false
        });
    });

    it("inGrid true", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.isOk(settings.inGrid, "inGrid setting should be preserved");
            assert.strictEqual(el(settings.selector + 'view-menu').children[0].classList[0], 'diva-grid-icon', "Current toolbar view icon should be the grid icon");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            inGrid: true
        });
    });

    // // imageDir cannot really be tested either

    it("valid max/minPagesPerRow, valid pagesPerRow", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.minPagesPerRow, 3, "minPagesPerRow should be 3");
            assert.strictEqual(settings.maxPagesPerRow, 5, "maxPagesPerRow should be 5");
            assert.strictEqual(settings.pagesPerRow, 5, "pagesPerRow is valid");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            minPagesPerRow: 3,
            maxPagesPerRow: 5,
            pagesPerRow: 5
        });
    });

    it("invalid max/minPagesPerRow, invalid pagesPerRow", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.minPagesPerRow, 2, "minPagesPerRow is invalid, set to 2");
            assert.strictEqual(settings.maxPagesPerRow, 2, "maxPagesPerRow should be set to min");
            assert.strictEqual(settings.pagesPerRow, 2, "invalid pages per row should be set to min");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            minPagesPerRow: 1,
            maxPagesPerRow: 0,
            pagesPerRow: 4
        });
    });

    it("max/minZoomLevel, invalid values", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.minZoomLevel, 0, "minZoomLevel should be set to 0");
            assert.strictEqual(settings.maxZoomLevel, 5, "maxZoomLevel should be set to 5");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            minZoomLevel: -2,
            maxZoomLevel: 6,
        });
    });

    it("max/minZoomLevel, valid values, valid zoomLevel", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.minZoomLevel, 1, "minZoomLevel should be set to 1");
            assert.strictEqual(settings.maxZoomLevel, 3, "maxZoomLevel should be set to 3");
            assert.strictEqual(settings.zoomLevel, 2, "zoomLevel should be 2");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            minZoomLevel: 1,
            maxZoomLevel: 3,
            zoomLevel: 2
        });
    });

    it("max/minZoomLevel, valid values, invalid zoomLevel", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.zoomLevel, 1, "Zoom level should be the minZoomLevel (1)");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            minZoomLevel: 1,
            maxZoomLevel: 3,
            zoomLevel: 0
        });
    });

    it("max/minZoomLevel, invalid/valid values, invalid zoomLevel", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function (settings)
        {
            assert.strictEqual(settings.minZoomLevel, 2, "minZoomLevel should be set to 2 (valid)");
            assert.strictEqual(settings.maxZoomLevel, 5, "maxZoomLevel should be set to 5 (invalid)");
            assert.strictEqual(settings.zoomLevel, 2, "zoomLevel should be 2 (the minimum)");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            minZoomLevel: 2,
            maxZoomLevel: -2,
            zoomLevel: -2
        });
    });

    it("object for objectData", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            assert.strictEqual(this.getItemTitle(), "First page of Beromunster", "Should process an object for objectData like a normal manifest");
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: {
              "@context": "http://iiif.io/api/presentation/2/context.json",
              "@id": "https://images.simssa.ca/iiif/image/beromunster/manifest.json",
              "@type": "sc:Manifest",
              "label": "First page of Beromunster",
              "viewingHint": "paged",
              "sequences": [
                {
                  "@type": "sc:Sequence",
                  "canvases": [
                    {
                      "@id": "https://images.simssa.ca/iiif/image/beromunster/canvas/bm_001.json",
                      "@type": "sc:Canvas",
                      "label": "Bm 001",
                      "height": 4445,
                      "width": 2846,
                      "images": [
                        {
                          "@type": "oa:Annotation",
                          "motivation": "sc:painting",
                          "resource": {
                            "@id": "https://images.simssa.ca/iiif/image/beromunster/bm_001.tif/full/full/0/default.jpg",
                            "@type": "dctypes:Image",
                            "format": "image/jpeg",
                            "height": 4445,
                            "width": 2846,
                            "service": {
                              "@context": "http://iiif.io/api/image/2/context.json",
                              "@id": "https://images.simssa.ca/iiif/image/beromunster/bm_001.tif",
                              "profile": "http://iiif.io/api/image/2/level2.json"
                            }
                          },
                          "on": "https://images.simssa.ca/iiif/image/beromunster/canvas/bm_001.json"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
        });
    });

    // // pageLoadTimeout is a bit weird to test, but the code is simple so it should be fine

    // // pagesPerRow is tested above, along with max/minPagesPerRow

    // // No real point testing tileHeight/Width as we don't have images of different tile sizes

    it("viewportMargin, value of 0", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            var dv = this;

            setTimeout(function ()
            {
                assert.isOk(dv.isPageInViewport(0), "The first page should be loaded");
                assert.isNotOk(dv.isPageInViewport(1), "The second page should not be loaded");
                done();
            }, 100);
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            viewportMargin: 0
        });
    });

    it("viewportMargin, value of 1000", function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            var dv = this;

            // The second page should be visible after a timeout
            setTimeout(function () {
                assert.isOk(dv.isPageInViewport(0), "The first page should be loaded");
                assert.isOk(dv.isPageInViewport(1), "The second page should be loaded");
                done();
            }, 100);
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            viewportMargin: 1000
        });
    });
});