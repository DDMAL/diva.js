module.exports.elt = elt;
module.exports.setDOMAttributes = setDOMAttributes;

/**
 * Convenience function to create a DOM element, set attributes on it, and
 * append children. All arguments which are not of primitive type, are not
 * arrays, and are not DOM nodes are treated as attribute hashes and are
 * handled as described for setDOMAttributes. Children can either be a DOM
 * node or a primitive value, which is converted to a text node. Arrays are
 * handled recursively. Null and undefined values are ignored.
 *
 * Inspired by the ProseMirror helper of the same name.
 */
function elt(tag)
{
    var el = document.createElement(tag);
    var args = Array.prototype.slice.call(arguments, 1);

    while (args.length)
    {
        var arg = args.shift();
        handleEltConstructorArg(el, arg);
    }

    return el;
}

function handleEltConstructorArg(el, arg)
{
    if (arg == null)
        return;

    if (typeof arg !== 'object' && typeof arg !== 'function')
    {
        // Coerce to string
        el.appendChild(document.createTextNode(arg));
    }
    else if (arg instanceof window.Node)
    {
        el.appendChild(arg);
    }
    else if (arg instanceof Array)
    {
        var childCount = arg.length;
        for (var i = 0; i < childCount; i++)
            handleEltConstructorArg(el, arg[i]);
    }
    else
    {
        setDOMAttributes(el, arg);
    }
}

/**
 * Set attributes of a DOM element. The `style` property is special-cased to
 * accept either a string or an object whose own attributes are assigned to
 * el.style.
 */
function setDOMAttributes(el, attributes)
{
    for (var prop in attributes)
    {
        if (!attributes.hasOwnProperty(prop))
            continue;

        if (prop === 'style')
        {
            setStyle(el, attributes.style);
        }
        else
        {
            el.setAttribute(prop, attributes[prop]);
        }
    }
}

function setStyle(el, style)
{
    if (!style)
        return;

    if (typeof style !== 'object')
    {
        el.style.cssText = style;
        return;
    }

    for (var cssProp in style)
    {
        if (!style.hasOwnProperty(cssProp))
            continue;

        el.style[cssProp] = style[cssProp];
    }
}
