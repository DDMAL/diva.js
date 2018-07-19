import maxBy from 'lodash.maxby';

export default class GridHandler
{
    constructor (viewerCore)
    {
        this._viewerCore = viewerCore;
    }

    // USER EVENTS
    onDoubleClick (event, coords)
    {
        const position = this._viewerCore.getPagePositionAtViewportOffset(coords);

        const layout = this._viewerCore.getCurrentLayout();
        const viewport = this._viewerCore.getViewport();
        const pageToViewportCenterOffset = layout.getPageToViewportCenterOffset(position.anchorPage, viewport);

        this._viewerCore.reload({
            inGrid: false,
            goDirectlyTo: position.anchorPage,
            horizontalOffset: pageToViewportCenterOffset.x + position.offset.left,
            verticalOffset: pageToViewportCenterOffset.y + position.offset.top
        });
    }

    onPinch ()
    {
        this._viewerCore.reload({inGrid: false});
    }

    // VIEW EVENTS
    onViewWillLoad ()
    {
        // FIXME(wabain): Should something happen here?
        /* No-op */
    }

    onViewDidLoad ()
    {
        // FIXME(wabain): Should something happen here?
        /* No-op */
    }

    onViewDidUpdate (renderedPages, targetPage)
    {
        // return early if there are no rendered pages in view.
        if (renderedPages.length === 0) return;

        if (targetPage !== null)
        {
            this._viewerCore.setCurrentPage(targetPage);
            return;
        }

        // Select the current page from the first row if it is fully visible, or from
        // the second row if it is fully visible, or from the centermost row otherwise.
        // If the current page is in that group then don't change it. Otherwise, set
        // the current page to the group's first page.

        const layout = this._viewerCore.getCurrentLayout();
        const groups = [];

        renderedPages.forEach(pageIndex =>
        {
            const group = layout.getPageInfo(pageIndex).group;
            if (groups.length === 0 || group !== groups[groups.length - 1])
            {
                groups.push(group);
            }
        });

        const viewport = this._viewerCore.getViewport();
        let chosenGroup;

        if (groups.length === 1 || groups[0].region.top >= viewport.top)
        {
            chosenGroup = groups[0];
        }
        else if (groups[1].region.bottom <= viewport.bottom)
        {
            chosenGroup = groups[1];
        }
        else
        {
            chosenGroup = getCentermostGroup(groups, viewport);
        }

        const currentPage = this._viewerCore.getSettings().currentPageIndex;

        const hasCurrentPage = chosenGroup.pages.some(page => page.index === currentPage);

        if (!hasCurrentPage)
        {
            this._viewerCore.setCurrentPage(chosenGroup.pages[0].index);
        }
    }

    destroy ()
    {
        // No-op
    }
}

function getCentermostGroup (groups, viewport)
{
    const viewportMiddle = viewport.top + viewport.height / 2;

    return maxBy(groups, group =>
    {
        const groupMiddle = group.region.top + group.dimensions.height / 2;
        return -Math.abs(viewportMiddle - groupMiddle);
    });
}
