var maxBy = require('lodash.maxby');

module.exports = GridHandler;

function GridHandler(viewerCore)
{
    this._viewerCore = viewerCore;
    this._viewerState = viewerCore.getInternalState();
    this._viewport = this._viewerState.viewport;
}

// USER EVENTS
GridHandler.prototype.onDoubleClick = function (event, coords)
{
    var position = this._viewerCore.getPagePositionAtViewportOffset(coords);

    // FIXME: Get this in a nicer way
    var pageToViewportCenterOffset = this._viewerCore.getSettings()
        .renderer.getPageToViewportCenterOffset(position.anchorPage);

    this._viewerCore.reload({
        inGrid: false,
        goDirectlyTo: position.anchorPage,
        horizontalOffset: pageToViewportCenterOffset.x + position.offset.left,
        verticalOffset: pageToViewportCenterOffset.y + position.offset.top
    });
};

GridHandler.prototype.onPinch = function ()
{
    this._viewerCore.reload({ inGrid: false });
};

// VIEW EVENTS
GridHandler.prototype.onViewWillLoad = function ()
{
    // FIXME(wabain): Should something happen here?
    /* No-op */
};

GridHandler.prototype.onViewDidLoad = function ()
{
    // FIXME(wabain): Should something happen here?
    /* No-op */
};

GridHandler.prototype.onViewDidUpdate = function (pages, targetPage)
{
    if (targetPage !== null)
    {
        this._setCurrentPage(targetPage);
        return;
    }

    // Select the current page from the first row if it is fully visible, or from
    // the second row if it is fully visible, or from the centermost row otherwise.
    // If the current page is in that group then don't change it. Otherwise, set
    // the current page to the group's first page.

    var groups = [];

    pages.forEach(function (page)
    {
        if (groups.length === 0 || page.group !== groups[groups.length - 1])
            groups.push(page.group);
    });

    var chosenGroup;

    if (groups.length === 1 || groups[0].region.top >= this._viewport.top)
        chosenGroup = groups[0];
    else if (groups[1].region.bottom <= this._viewport.bottom)
        chosenGroup = groups[1];
    else
        chosenGroup = getCentermostGroup(groups, this._viewport);

    var currentPage = this._viewerState.currentPageIndex;

    var hasCurrentPage = chosenGroup.pages.some(function (page)
    {
        return page.index === currentPage;
    });

    if (!hasCurrentPage)
        this._setCurrentPage(chosenGroup.pages[0].index);
};

GridHandler.prototype._setCurrentPage = function (pageIndex)
{
    this._viewerState.currentPageIndex = pageIndex;

    var filename = this._viewerState.manifest.pages[pageIndex].f;
    this._viewerCore.publish("VisiblePageDidChange", pageIndex, filename);
};

function getCentermostGroup(groups, viewport)
{
    var viewportMiddle = viewport.top + viewport.height / 2;

    return maxBy(groups, function (group)
    {
        var groupMiddle = group.region.top + group.dimensions.height / 2;
        return -Math.abs(viewportMiddle - groupMiddle);
    });
}
