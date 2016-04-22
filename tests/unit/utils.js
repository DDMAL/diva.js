/*
Test coverage: pretty much complete
Can't really (or don't need to) test any of the others
*/

var $ = require('jquery');
var elt = require('../../source/js/utils').elt;

QUnit.module("Utility methods");

QUnit.test("getHashParam()", function (assert)
{
    // First try it with no hash params - should return false
    assert.ok(!$.getHashParam('anything'), "No hash params, should return false");

    // Now set the current URL to something
    var baseUrl = window.location.href;
    window.location.hash = '#p=149&z=2';
    var nonexistentParam = $.getHashParam('lol');
    var firstParam = $.getHashParam('p');
    var secondParam = $.getHashParam('z');
    assert.ok(!nonexistentParam, "The nonexistent param should return false");
    assert.strictEqual(firstParam, '149', "The 'p' param should be 149 (string)");
    assert.strictEqual(secondParam, '2', "The 'z' param should be 2 (string)");

    // Now let there be only one element in the URL
    window.location.hash = '#p=149';
    var soleParam = $.getHashParam('p');
    assert.strictEqual(soleParam, '149', "The 'p' param should be 149 when it is the sole param");

    // Now let there be other elements in the URL
    window.location.hash = '#z=2&p=100&lol=lol';
    var anotherFirstParam = $.getHashParam('z');
    var anotherSecondParam = $.getHashParam('p');
    var thirdParam = $.getHashParam('lol');
    assert.strictEqual(anotherFirstParam, '2', "The 'z' param should be '2' when it is the first param");
    assert.strictEqual(anotherSecondParam, '100', "The 'p' param should be '100' when it is the middle param");
    assert.strictEqual(thirdParam, 'lol', "The last param should be 'lol'");
    window.location.hash = '';
});

QUnit.test("updateHashParam()", function (assert)
{
    window.location.hash = '';
    // First try it with no hash params in the URL
    $.updateHashParam('p', '1');
    assert.strictEqual(window.location.hash, '#p=1');

    // The key is present but there is no value
    window.location.hash = '#p=';
    $.updateHashParam('p', '2');
    assert.strictEqual(window.location.hash, '#p=2');

    // Then, with a bunch of irrelevant ones
    window.location.hash = '#key=2&another=3';
    $.updateHashParam('p', '3');
    assert.strictEqual(window.location.hash, '#key=2&another=3&p=3');

    // One irrelevant one
    window.location.hash = '#a=b';
    $.updateHashParam('p', '4');
    assert.strictEqual(window.location.hash, '#a=b&p=4');

    // Only one hash param, and it's the one we want to update
    window.location.hash = '#p=1';
    $.updateHashParam('p', '9001');
    assert.strictEqual(window.location.hash, '#p=9001');

    // Two hash params, one of which is the one we want to update
    window.location.hash = '#p=4&h=1';
    $.updateHashParam('p', '1');
    assert.strictEqual(window.location.hash, '#p=1&h=1');
    $.updateHashParam('h', '100');
    assert.strictEqual(window.location.hash, '#p=1&h=100');

    // Two hash params, both are which are right (choose one)
    // Should never happen unless the user is being malicious
    window.location.hash = '#p=4&p=2';
    $.updateHashParam('p', '5');
    assert.strictEqual(window.location.hash, '#p=4&p=5');
    // Not actually sure why it chooses the first one to update

    // Restore the URL
    window.location.hash = '';
});

// Disabled until variable access is worked out
QUnit.test("elt()", function (assert)
{
    // Serialize node type and text content (not attributes, because those are more complicated)
    var serialize = function (node)
    {
        if (node.nodeName === '#text')
            return node.textContent;

        return {
            name: node.nodeName.toLowerCase(),
            childNodes: Array.prototype.map.call(node.childNodes, serialize)
        };
    };

    var simple = elt('span');
    var expectedSimple = { name: 'span', childNodes: [] };
    assert.deepEqual(serialize(simple), expectedSimple, 'It should create nodes with the given tag');

    var withNull = elt('span', null, undefined);
    var expectedWithNull = { name: 'span', childNodes: [] };
    assert.deepEqual(serialize(withNull), expectedWithNull, 'It should ignore null and undefined values');

    var withText = elt('span', 'A', 'B');
    var expectedWithText = { name: 'span', childNodes: ['A', 'B'] };
    assert.deepEqual(serialize(withText), expectedWithText, 'It should add additional string arguments as text');

    var withArray = elt('ol', [
        elt('li', 'first'),
        elt('li', 'second'),
        [
            elt('li', 'more'),
            elt('li', 'and more')
        ]
    ]);
    var expectedWithArray = {
        name: 'ol',
        childNodes: [
            { name: 'li', childNodes: ['first'] },
            { name: 'li', childNodes: ['second'] },
            { name: 'li', childNodes: ['more'] },
            { name: 'li', childNodes: ['and more'] }
        ]
    };
    assert.deepEqual(serialize(withArray), expectedWithArray, 'It should recurse on nested arrays');

    var withOther = elt('span', 2, false);
    var expectedWithOther = { name: 'span', childNodes: ['2', 'false'] };
    assert.deepEqual(serialize(withOther), expectedWithOther, 'It should coerce other arguments to strings');

    var link = elt('a',
        { href: 'http://example.org/', title: 'overridden' },
        'Hello world!',
        { title: 'additional argument' }
    );
    var expectedLink = {
        name: 'a',
        childNodes: ['Hello world!']
    };
    assert.strictEqual(link.href, 'http://example.org/', 'It should set attributes from object arguments');
    assert.strictEqual(link.title, 'additional argument', 'It should handle multiple attribute arguments');
    assert.deepEqual(serialize(link), expectedLink, 'It should handle children along with attribute arguments');

    var fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode(', very'));

    var compound = elt('span',
        'This is ', elt('em', 'very'), fragment, document.createTextNode(' exciting')
    );
    var expectedCompound = {
        name: 'span',
        childNodes: [
            'This is ',
            {
                name: 'em',
                childNodes: ['very']
            },
            ', very',
            ' exciting'
        ]
    };
    assert.deepEqual(serialize(compound), expectedCompound, 'It should append DOM node arguments');

    var hidden = elt('span', {
        style: { display: 'none' }
    });
    assert.strictEqual(hidden.style.display, 'none', 'It should handle objects for the style attribute');

    var hiddenAsText = elt('span', {
        style: 'display: none;'
    });
    assert.strictEqual(hiddenAsText.style.display, 'none', 'It should handle strings for the style attribute');

    var nullStyle = elt('span', {
        style: null
    });
    assert.strictEqual(nullStyle.style.cssText, '', 'It should ignore a null style');
});
