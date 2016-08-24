var maxBy = require('lodash.maxby');

module.exports = GridHandler;

function GridHandler(viewerCore)
{
    this._viewerCore = viewerCore;
}

// USER EVENTS
GridHandler.prototype.onDoubleClick = function (event, coords)
{
    var position = this._viewerCore.getPagePositionAtViewportOffset(coords);

    var layout = this._viewerCore.getCurrentLayout();
    var viewport = this._viewerCore.getViewport();
    var pageToViewportCenterOffset = layout.getPageToViewportCenterOffset(position.anchorPage, viewport);

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

GridHandler.prototype.onViewDidUpdate = function (renderedPages, targetPage)
{
    if (targetPage !== null)
    {
        this._viewerCore.setCurrentPage(targetPage);
        return;
    }

    // Select the current page from the first row if it is fully visible, or from
    // the second row if it is fully visible, or from the centermost row otherwise.
    // If the current page is in that group then don't change it. Otherwise, set
    // the current page to the group's first page.

    var layout = this._viewerCore.getCurrentLayout();
    var groups = [];
    renderedPages.forEach(function (pageIndex)
    {
        var group = layout.getPageInfo(pageIndex).group;
        if (groups.length === 0 || group !== groups[groups.length - 1])
            groups.push(group);
    });

    var viewport = this._viewerCore.getViewport();
    var chosenGroup;

    if (groups.length === 1 || groups[0].region.top >= viewport.top)
        chosenGroup = groups[0];
    else if (groups[1].region.bottom <= viewport.bottom)
        chosenGroup = groups[1];
    else
        chosenGroup = getCentermostGroup(groups, viewport);

    var currentPage = this._viewerCore.getSettings().currentPageIndex;

    var hasCurrentPage = chosenGroup.pages.some(function (page)
    {
        return page.index === currentPage;
    });

    if (!hasCurrentPage)
        this._viewerCore.setCurrentPage(chosenGroup.pages[0].index);
};

GridHandler.prototype.destroy = function ()
{
    // No-op
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
