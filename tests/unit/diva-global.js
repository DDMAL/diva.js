var $ = require('jquery');
var TestUtils = require('../utils');
var diva = require('../../source/js/diva');

QUnit.module("diva global", { beforeEach: TestUtils.clearTempDiva });

QUnit.test('diva.create(elem, options) -> Diva', function (assert)
{
    var wrapper = TestUtils.getWrapper()[0];
    var options = {
        objectData: '../demo/beromunster-iiif.json'
    };

    var inst = diva.create(wrapper, options);

    assert.strictEqual(inst, $(wrapper).data('diva'), 'Should instantiate and return a Diva viewer');

    assert.throws(function ()
    {
        diva.create(wrapper, options);
    }, new Error("Diva is already initialized on #diva-temp"), 'Should throw if element is already initialized');

    // FIXME: Needed because the destroying a viewer before load won't work
    var done = assert.async();
    diva.Events.subscribe('ViewerDidLoad', function ()
    {
        done();
    });
});

QUnit.test('diva.find(elem) -> ?Diva', function (assert)
{
    var dv = $.tempDiva({});

    var parent = TestUtils.getWrapper()[0];

    assert.strictEqual(diva.find(document.body), null, 'Should return null if the element is not a Diva wrapper');
    assert.strictEqual(diva.find(parent), dv, 'Should return existing instances');

    var done = assert.async();
    diva.Events.subscribe('ViewerDidLoad', function ()
    {
        dv.destroy();
        assert.strictEqual(diva.find(parent), null, 'Should return null after instance destruction');
        done();
    });
});
