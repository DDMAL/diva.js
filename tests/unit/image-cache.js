'use strict';

var ImageCache = require('../../source/js/image-cache');

QUnit.module('ImageCache');

QUnit.test('Default max entries is 100', function (assert)
{
    var cache = new ImageCache();
    assert.strictEqual(cache.maxKeys, 100);
});

QUnit.test('Evicts the least recently used entry', function (assert)
{
    var cache = new ImageCache({ maxKeys: 2 });

    var imgA = new Image();
    var imgB = new Image();
    var imgC = new Image();

    cache.put('A', imgA);
    cache.put('B', imgB);
    cache.put('C', imgC);

    assert.strictEqual(cache.has('A'), false, 'A evicted [has]');
    assert.strictEqual(cache.has('B'), true, 'B remains [has]');
    assert.strictEqual(cache.has('C'), true, 'C remains [has]');

    assert.strictEqual(cache.get('A'), null, 'A evicted [get]');
    assert.strictEqual(cache.get('B'), imgB, 'B remains [get]');
    assert.strictEqual(cache.get('C'), imgC, 'C remains [get]');

    cache.put('A', imgA);
    assert.strictEqual(cache.has('A'), true, 'A restored [has v2]');
    assert.strictEqual(cache.has('B'), false, 'B evicted [has v2]');
    assert.strictEqual(cache.has('C'), true, 'C remains [has v2]');
});

QUnit.test('Put overwrites existing entries and bumps their LRU position', function (assert)
{
    var cache = new ImageCache({ maxKeys: 2 });

    var imgA = new Image();
    var imgA2 = new Image();
    var imgB = new Image();
    var imgC = new Image();

    cache.put('A', imgA);
    cache.put('B', imgB);
    cache.put('A', imgA2);
    cache.put('C', imgC);

    assert.strictEqual(cache.get('A'), imgA2, 'A overwritten, still in cache');
    assert.strictEqual(cache.get('B'), null, 'B evicted');
    assert.strictEqual(cache.get('C'), imgC, 'C still in cache');
});
