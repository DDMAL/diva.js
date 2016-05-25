var diva = require('./diva-global');

module.exports = DocumentHandler;

function DocumentHandler(viewer)
{
    this._viewer = viewer;
}

DocumentHandler.prototype.onViewWillLoad = function ()
{
    var settings = this._viewer.getSettings();

    diva.Events.publish('DocumentWillLoad', [settings], this._viewer);
};

DocumentHandler.prototype.onViewDidLoad = function ()
{
    var settings = this._viewer.getSettings();

    // If this is not the initial load, trigger the zoom events
    if (settings.oldZoomLevel >= 0)
    {
        var zoomLevel = settings.zoomLevel;

        if (settings.oldZoomLevel < settings.zoomLevel)
        {
            diva.Events.publish("ViewerDidZoomIn", [zoomLevel], this._viewer);
        }
        else
        {
            diva.Events.publish("ViewerDidZoomOut", [zoomLevel], this._viewer);
        }

        diva.Events.publish("ViewerDidZoom", [zoomLevel], this._viewer);
    }
    else
    {
        settings.oldZoomLevel = settings.zoomLevel;
    }

    var fileName = settings.manifest.pages[settings.currentPageIndex].f;
    diva.Events.publish("DocumentDidLoad", [settings.currentPageIndex, fileName], this._viewer);
};

DocumentHandler.prototype.onPageDidChange = function (pageIndex)
{
    var settings = this._viewer.getSettings();
    settings.currentPageIndex = pageIndex;
    diva.Events.publish("VisiblePageDidChange", [pageIndex, settings.manifest.pages[pageIndex].f], this._viewer);
};

DocumentHandler.prototype.onViewerDidJump = function (pageIndex)
{
    diva.Events.publish("ViewerDidJump", [pageIndex], this._viewer);
};

