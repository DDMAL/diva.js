import {elt} from '../../source/js/utils/elt';

describe('elt util', function () 
{
    it("elt() function works", function ()
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
});