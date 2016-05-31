var diva = require('./diva-global');
var maxBy = require('lodash.maxby');

module.exports = DocumentHandler;

function DocumentHandler(viewer, viewerState)
{
    this._viewer = viewer;
    this._viewerState = viewerState;
    this._viewport = viewerState.viewport;
}

DocumentHandler.prototype.onViewWillLoad = function ()
{
    diva.Events.publish('DocumentWillLoad', [this._viewer.getSettings()], this._viewer);
};

DocumentHandler.prototype.onViewDidLoad = function ()
{
    var viewerState = this._viewerState;
    var zoomLevel = viewerState.options.zoomLevel;

    // If this is not the initial load, trigger the zoom events
    if (viewerState.oldZoomLevel >= 0)
    {
        if (viewerState.oldZoomLevel < zoomLevel)
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
        viewerState.oldZoomLevel = zoomLevel;
    }

    var fileName = viewerState.manifest.pages[viewerState.currentPageIndex].f;
    diva.Events.publish("DocumentDidLoad", [viewerState.currentPageIndex, fileName], this._viewer);
};

DocumentHandler.prototype.onViewDidUpdate = function (renderedPages, targetPage)
{
    var currentPage = (targetPage !== null) ?
        targetPage :
        getCentermostPage(renderedPages, this._viewport);

    if (currentPage !== this._viewerState.currentPageIndex)
    {
        this._viewerState.currentPageIndex = currentPage;

        diva.Events.publish("VisiblePageDidChange",
            [currentPage, this._viewerState.manifest.pages[currentPage].f],
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
