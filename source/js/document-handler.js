var diva = require('./diva-global');
var maxBy = require('lodash.maxby');

module.exports = DocumentHandler;

function DocumentHandler(viewer)
{
    this._viewer = viewer;
    this._viewport = viewer.getSettings().viewport;
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

DocumentHandler.prototype.onViewDidUpdate = function (renderedPages, targetPage)
{
    var currentPage = (targetPage !== null) ?
        targetPage :
        getCentermostPage(renderedPages, this._viewport);

    var settings = this._viewer.getSettings();

    if (currentPage !== settings.currentPageIndex)
    {
        settings.currentPageIndex = currentPage;

        diva.Events.publish("VisiblePageDidChange",
            [currentPage, settings.manifest.pages[currentPage].f],
            this._viewer);
    }

    if (targetPage !== null)
    {
        diva.Events.publish("ViewerDidJump", [targetPage], this._viewer);
    }
};

function getCentermostPage(pages, viewport)
{
    var centerY = viewport.top + (viewport.height / 2);
    var centerX = viewport.left + (viewport.width / 2);

    // Find the minimum distance from the viewport center to a page.
    // Compute minus the squared distance from viewport center to the page's border.
    // http://gamedev.stackexchange.com/questions/44483/how-do-i-calculate-distance-between-a-point-and-an-axis-aligned-rectangle
    return maxBy(pages, function (page)
    {
        var dims = page.dimensions;
        var imageOffset = page.imageOffset;

        var midX = imageOffset.left + (dims.height / 2);
        var midY = imageOffset.top + (dims.width / 2);

        var dx = Math.max(Math.abs(centerX - midX) - (dims.width / 2), 0);
        var dy = Math.max(Math.abs(centerY - midY) - (dims.height / 2), 0);

        return -(dx * dx + dy * dy);
    }).index;
}
