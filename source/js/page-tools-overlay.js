var elt = require('./utils/elt');

module.exports = PageToolsOverlay;

function PageToolsOverlay(pageIndex, viewerCore)
{
    this.page = pageIndex;

    this._viewerCore = viewerCore;

    this._innerElement = viewerCore.getSettings().innerElement;
    this._pageToolsElem = null;
}

PageToolsOverlay.prototype.mount = function ()
{
    if (this._pageToolsElem === null)
    {
        var buttons = this._initializePageToolButtons();

        this._pageToolsElem = elt('div', {class: 'diva-page-tools-wrapper'},
            elt('div', {class: 'diva-page-tools'}, buttons)
        );
    }

    this.refresh();
    this._innerElement.appendChild(this._pageToolsElem);
};

PageToolsOverlay.prototype._initializePageToolButtons = function ()
{
    // Callback parameters
    var settings = this._viewerCore.getSettings();
    var publicInstance = this._viewerCore.getPublicInstance();
    var pageIndex = this.page;

    return this._viewerCore.getPageTools().map(function (plugin)
    {
        // If the title text is undefined, use the name of the plugin
        var titleText = plugin.titleText || plugin.pluginName[0].toUpperCase() + plugin.pluginName.substring(1) + " plugin";

        var button = elt('div', {
            class: 'diva-' + plugin.pluginName + '-icon',
            title: titleText
        });

        button.addEventListener('click', function (event)
        {
            plugin.handleClick.call(this, event, settings, publicInstance, pageIndex);
        }, false);

        button.addEventListener('touchend', function (event)
        {
            // Prevent firing of emulated mouse events
            event.preventDefault();

            plugin.handleClick.call(this, event, settings, publicInstance, pageIndex);
        }, false);

        return button;
    }, this);
};

PageToolsOverlay.prototype.unmount = function ()
{
    this._innerElement.removeChild(this._pageToolsElem);
};

PageToolsOverlay.prototype.refresh = function ()
{
    var pos = this._viewerCore.getPageRegion(this.page, {
        excludePadding: true,
        incorporateViewport: true
    });

    this._pageToolsElem.style.top = pos.top + 'px';
    this._pageToolsElem.style.left = pos.left + 'px';
};
