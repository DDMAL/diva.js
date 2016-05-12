var extend = require('jquery').extend;
var elt = require('./utils/elt');
var Transition = require('./utils/transition');

module.exports = DocumentRendering;

/**
 * Low-level interface for managing the rendering of pages to the document.
 *
 * At the moment this does very little!
 */
function DocumentRendering(options)
{
    this._element = options.element;
    this._viewerID = options.ID;

    this._pageTimeouts = [];
}

DocumentRendering.prototype.setDocumentSize = function (dimensions)
{
    // Ensure values are reset if not specified
    dimensions = extend({
        width: null,
        minWidth: null,
        height: null,
        minHeight: null
    }, dimensions);

    elt.setAttributes(this._element, {
        style: dimensions
    });
};

DocumentRendering.prototype.getPageElement = function (pageIndex)
{
    return document.getElementById(this._viewerID + 'page-' + pageIndex);
};

DocumentRendering.prototype.isPageLoaded = function (pageIndex)
{
    return !!this.getPageElement(pageIndex);
};

DocumentRendering.prototype.setPageTimeout = function (callback, waitMs, args)
{
    var timeoutId = setTimeout(function ()
    {
        callback.apply(null, args);

        // Remove the timeout ID from the list
        var idIndex = this._pageTimeouts.indexOf(timeoutId);

        if (idIndex >= 0)
            this._pageTimeouts.splice(idIndex, 1);
    }.bind(this), waitMs);

    this._pageTimeouts.push(timeoutId);
};

DocumentRendering.prototype.destroy = function ()
{
    var elem = this._element;

    // Post-zoom: clear scaling
    elem.style[Transition.property] = '';
    elem.style.transform = '';
    elem.style.transformOrigin = '';

    while (elem.firstChild)
    {
        elem.removeChild(elem.firstChild);
    }

    while (this._pageTimeouts.length)
    {
        clearTimeout(this._pageTimeouts.pop());
    }
};
