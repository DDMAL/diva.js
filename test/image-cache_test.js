'use strict';

import ImageCache from '../source/js/image-cache';

describe('Image Cache', function () 
{
    it('Default max entries is 100', function ()
    {
        let cache = new ImageCache();
        assert.strictEqual(cache.maxKeys, 100);
    });

    it('Evicts the least recently used entry', function ()
    {
        let cache = new ImageCache({ maxKeys: 2 });

        let imgA = new Image();
        let imgB = new Image();
        let imgC = new Image();

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

    it('Put overwrites existing entries and bumps their LRU position', function ()
    {
        let cache = new ImageCache({ maxKeys: 2 });

        let imgA = new Image();
        let imgA2 = new Image();
        let imgB = new Image();
        let imgC = new Image();

        cache.put('A', imgA);
        cache.put('B', imgB);
        cache.put('A', imgA2);
        cache.put('C', imgC);

        assert.strictEqual(cache.get('A'), imgA2, 'A overwritten, still in cache');
        assert.strictEqual(cache.get('B'), null, 'B evicted');
        assert.strictEqual(cache.get('C'), imgC, 'C still in cache');
    });

    it("Entries which have been acquire()'d are promoted", function ()
    {
        let cache = new ImageCache({ maxKeys: 2 });

        let imgA = new Image();
        let imgB = new Image();
        let imgC = new Image();

        cache.put('A', imgA);
        cache.put('B', imgB);

        cache.acquire('A');
        cache.release('A');

        cache.put('C', imgC); // A would be evicted here if not promoted

        assert.strictEqual(cache.has('A'), true, 'A remains');
        assert.strictEqual(cache.has('B'), false, 'B evicted');
        assert.strictEqual(cache.has('C'), true, 'C remains');
    });

    it("Entries which have been acquire()'d are not evicted until released", function ()
    {
        let cache = new ImageCache({ maxKeys: 2 });

        let imgA = new Image();
        let imgB = new Image();
        let imgC = new Image();

        cache.put('A', imgA);
        cache.acquire('A');

        cache.put('B', imgB);
        cache.acquire('B');

        cache.put('C', imgC); // A would be evicted here if not held

        assert.strictEqual(cache.has('A'), true, 'A remains');
        assert.strictEqual(cache.has('B'), true, 'B remains');
        assert.strictEqual(cache.has('C'), true, 'C still entered');

        cache.release('B'); // B will be evicted even though it still has priority over A

        assert.strictEqual(cache.has('A'), true, 'A still remains (held)');
        assert.strictEqual(cache.has('B'), false, 'B evicted');
        assert.strictEqual(cache.has('C'), true, 'C still remains (by LRU policy)');
    });

});