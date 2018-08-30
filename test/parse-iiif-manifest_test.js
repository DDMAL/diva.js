import Diva from '../source/js/diva';
let v2Manifest = require('./manifests/iiifv2.json');
let v3Manifest = require('./manifests/iiifv3.json');

describe('IIIF Manifest Parsing', function ()
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

    it('can parse an IIIF v2 Manifest', function (done)
    {
        Diva.Events.subscribe('ObjectDidLoad', function (settings)
        {
            let m = settings.manifest;
            assert.isOk(m, 'Manifest should exist');

            assert.strictEqual(m.pages.length, 479, 'Manifest should have 479 pages');
            assert.strictEqual(m.maxZoom, 5, 'Manifest should have maxZoom of 5');
            assert.strictEqual(m.maxRatio, 1.584277299501586, 'Max ratio should be 1.5842...');
            assert.strictEqual(m.minRatio, 1.4961486180335297, 'Min ratio should be 1.4961...');
            assert.strictEqual(m.itemTitle, 'Salzinnes, CDN-Hsmu M2149.L4', 'Item title should be right');
            assert.isFalse(m.paged, 'Should not be paged');
            assert.strictEqual(m.pages[0].l, 'Folio 001r', 'First page should be Folio 001r');

            done();
        });

        let diva = new Diva('diva-wrapper', {  // jshint ignore:line
            objectData: v2Manifest
        });
    });

    it('can parse an IIIF v3 Manifest', function (done)
    {
        Diva.Events.subscribe('ObjectDidLoad', function (settings)
        {
            let m = settings.manifest;
            assert.isOk(m, 'Manifest should exist');

            assert.strictEqual(m.pages.length, 299, 'Manifest should have 299 pages');
            assert.strictEqual(m.maxZoom, 5, 'Manifest should have maxZoom of 5');
            assert.strictEqual(m.maxRatio, 1.495655771617708, 'Max ratio should be 1.4956...');
            assert.strictEqual(m.minRatio, 1.187177597641857, 'Min ratio should be 1.1871...');
            assert.strictEqual(m.itemTitle, 'Bodleian Library: MS. Canon. Misc. 213', 'Item title should be right');
            assert.isTrue(m.paged, 'Should be paged');
            assert.strictEqual(m.pages[0].l, 'Upper board', 'First page should be Upper board');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: v3Manifest
        });
    });
});
