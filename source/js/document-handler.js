var maxBy = require('lodash.maxby');

module.exports = DocumentHandler;

function DocumentHandler(viewerCore)
{
    this._viewerCore = viewerCore;
    this._viewerState = viewerCore.getInternalState();
    this._viewport = this._viewerState.viewport;
}

// USER EVENTS
DocumentHandler.prototype.onDoubleClick = function (event, coords)
{
    var settings = this._viewerCore.getSettings();
    var newZoomLevel = event.ctrlKey ? settings.zoomLevel - 1 : settings.zoomLevel + 1;

    var position = this._viewerCore.getPagePositionAtViewportOffset(coords);

    this._viewerCore.zoom(newZoomLevel, position);
};

DocumentHandler.prototype.onPinch = function (event, coords, startDistance, endDistance)
{
    // FIXME: Do this check in a way which is less spaghetti code-y
    var viewerState = this._viewerCore.getInternalState();
    if (viewerState.scaleWait)
        return;

    var settings = this._viewerCore.getSettings();

    var newZoomLevel = Math.log(Math.pow(2, settings.zoomLevel) * endDistance / (startDistance * Math.log(2))) / Math.log(2);
    newZoomLevel = Math.max(settings.minZoomLevel, newZoomLevel);
    newZoomLevel = Math.min(settings.maxZoomLevel, newZoomLevel);

    if (newZoomLevel === settings.zoomLevel)
        return;

    var position = this._viewerCore.getPagePositionAtViewportOffset(coords);

    // Set scaleWait to true so that we wait for this scale event to finish
    viewerState.scaleWait = true;

    var centerOffset = viewerState.renderer.getPageToViewportCenterOffset(position.anchorPage);
    var scaleRatio = 1 / Math.pow(2, settings.zoomLevel - newZoomLevel);

    this._viewerCore.reload({
        zoomLevel: newZoomLevel,
        goDirectlyTo: position.anchorPage,
        horizontalOffset: (centerOffset.x - position.offset.left) + position.offset.left * scaleRatio,
        verticalOffset: (centerOffset.y - position.offset.top) + position.offset.top * scaleRatio
    });
};

// VIEW EVENTS
DocumentHandler.prototype.onViewWillLoad = function ()
{
    this._viewerCore.publish('DocumentWillLoad', this._viewerCore.getSettings());
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
            this._viewerCore.publish("ViewerDidZoomIn", zoomLevel);
        }
        else
        {
            this._viewerCore.publish("ViewerDidZoomOut", zoomLevel);
        }

        this._viewerCore.publish("ViewerDidZoom", zoomLevel);
    }
    else
    {
        viewerState.oldZoomLevel = zoomLevel;
    }

    var fileName = viewerState.manifest.pages[viewerState.currentPageIndex].f;
    this._viewerCore.publish("DocumentDidLoad", viewerState.currentPageIndex, fileName);
};

DocumentHandler.prototype.onViewDidUpdate = function (renderedPages, targetPage)
{
    var currentPage = (targetPage !== null) ?
        targetPage :
        getCentermostPage(renderedPages, this._viewport);

    // Don't change the current page if there is no page in the viewport
    // FIXME: Would be better to fall back to the page closest to the viewport
    if (currentPage !== null && currentPage !== this._viewerState.currentPageIndex)
    {
        this._viewerState.currentPageIndex = currentPage;

        var filename = this._viewerState.manifest.pages[currentPage].f;
        this._viewerCore.publish("VisiblePageDidChange", currentPage, filename);
    }

    if (targetPage !== null)
    {
        this._viewerCore.publish("ViewerDidJump", targetPage);
    }
};

function getCentermostPage(pages, viewport)
{
    var centerY = viewport.top + (viewport.height / 2);
    var centerX = viewport.left + (viewport.width / 2);

    // Find the minimum distance from the viewport center to a page.
    // Compute minus the squared distance from viewport center to the page's border.
    // http://gamedev.stackexchange.com/questions/44483/how-do-i-calculate-distance-between-a-point-and-an-axis-aligned-rectangle
    var centerPage = maxBy(pages, function (page)
    {
        var dims = page.dimensions;
        var imageOffset = page.imageOffset;

        var midX = imageOffset.left + (dims.height / 2);
        var midY = imageOffset.top + (dims.width / 2);

        var dx = Math.max(Math.abs(centerX - midX) - (dims.width / 2), 0);
        var dy = Math.max(Math.abs(centerY - midY) - (dims.height / 2), 0);

        return -(dx * dx + dy * dy);
    });

    return centerPage ? centerPage.index : null;
}
