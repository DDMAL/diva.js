import HashParams from '../../source/js/utils/hash-params';

describe('HashParams', function ()
{
    it("HashParams.get", function ()
    {
        // First try it with no hash params - should return false
        assert.ok(!HashParams.get('anything'), "No hash params, should return false");

        // Now set the current URL to something
        window.location.hash = '#p=149&z=2';
        var nonexistentParam = HashParams.get('lol');
        var firstParam = HashParams.get('p');
        var secondParam = HashParams.get('z');
        assert.ok(!nonexistentParam, "The nonexistent param should return false");
        assert.strictEqual(firstParam, '149', "The 'p' param should be 149 (string)");
        assert.strictEqual(secondParam, '2', "The 'z' param should be 2 (string)");

        // Now let there be only one element in the URL
        window.location.hash = '#p=149';
        var soleParam = HashParams.get('p');
        assert.strictEqual(soleParam, '149', "The 'p' param should be 149 when it is the sole param");

        // Now let there be other elements in the URL
        window.location.hash = '#z=2&p=100&lol=lol';
        var anotherFirstParam = HashParams.get('z');
        var anotherSecondParam = HashParams.get('p');
        var thirdParam = HashParams.get('lol');
        assert.strictEqual(anotherFirstParam, '2', "The 'z' param should be '2' when it is the first param");
        assert.strictEqual(anotherSecondParam, '100', "The 'p' param should be '100' when it is the middle param");
        assert.strictEqual(thirdParam, 'lol', "The last param should be 'lol'");
        window.location.hash = '';
    });

    it("HashParams.update", function ()
    {
        window.location.hash = '';
        // First try it with no hash params in the URL
        HashParams.update('p', '1');
        assert.strictEqual(window.location.hash, '#p=1');

        // The key is present but there is no value
        window.location.hash = '#p=';
        HashParams.update('p', '2');
        assert.strictEqual(window.location.hash, '#p=2');

        // Then, with a bunch of irrelevant ones
        window.location.hash = '#key=2&another=3';
        HashParams.update('p', '3');
        assert.strictEqual(window.location.hash, '#key=2&another=3&p=3');

        // One irrelevant one
        window.location.hash = '#a=b';
        HashParams.update('p', '4');
        assert.strictEqual(window.location.hash, '#a=b&p=4');

        // Only one hash param, and it's the one we want to update
        window.location.hash = '#p=1';
        HashParams.update('p', '9001');
        assert.strictEqual(window.location.hash, '#p=9001');

        // Two hash params, one of which is the one we want to update
        window.location.hash = '#p=4&h=1';
        HashParams.update('p', '1');
        assert.strictEqual(window.location.hash, '#p=1&h=1');
        HashParams.update('h', '100');
        assert.strictEqual(window.location.hash, '#p=1&h=100');

        // Two hash params, both are which are right (choose one)
        // Should never happen unless the user is being malicious
        window.location.hash = '#p=4&p=2';
        HashParams.update('p', '5');
        assert.strictEqual(window.location.hash, '#p=4&p=5');
        // Not actually sure why it chooses the first one to update

        // Restore the URL
        window.location.hash = '';
    });
});