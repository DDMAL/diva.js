var $ = require('jquery');
var elt = require('./utils/elt');

module.exports = PageToolsOverlay;

function PageToolsOverlay(pageIndex, innerElement, pageTools, getLayout, getViewport)
{
    this.page = pageIndex;
    this._innerElement = innerElement;
    this._pageTools = pageTools;
    this._pageToolsElem = null;
    this._getLayout = getLayout;
    this._getViewport = getViewport;
}

PageToolsOverlay.prototype.mount = function ()
{
    if (this._pageToolsElem === null)
    {
        this._pageToolsElem = elt('div', {class: 'diva-page-tools-wrapper'});
        this._pageToolsElem.appendChild($(this._pageTools)[0]);
    }

    this.refresh();
    this._innerElement.appendChild(this._pageToolsElem);
};

PageToolsOverlay.prototype.unmount = function ()
{
    this._innerElement.removeChild(this._pageToolsElem);
};

PageToolsOverlay.prototype.refresh = function ()
{
    var layout = this._getLayout();
    var viewport = this._getViewport();

    var pos = layout.getPageRegion(this.page, {excludePadding: true});
    var docXOffset = viewport.width < layout.dimensions.width ?
        0 :
        (viewport.width - layout.dimensions.width) / 2;

    this._pageToolsElem.style.top = pos.top + 'px';
    this._pageToolsElem.style.left = (pos.left + docXOffset) + 'px';
};
