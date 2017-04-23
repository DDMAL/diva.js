import maxBy from 'lodash.maxby';
import PageToolsOverlay from './page-tools-overlay';


export default class DocumentHandler
{
    constructor (viewerCore)
    {
        this._viewerCore = viewerCore;
        this._viewerState = viewerCore.getInternalState();
        this._overlays = [];

        if (this._viewerCore.getPageTools().length)
        {
            const numPages = viewerCore.getSettings().numPages;

            for (let i = 0; i < numPages; i++)
            {
                const overlay = new PageToolsOverlay(i, viewerCore);
                this._overlays.push(overlay);
                this._viewerCore.addPageOverlay(overlay);
            }
        }
    }

    // USER EVENTS
    onDoubleClick (event, coords)
    {
        const settings = this._viewerCore.getSettings();
        const newZoomLevel = event.ctrlKey ? settings.zoomLevel - 1 : settings.zoomLevel + 1;

        const position = this._viewerCore.getPagePositionAtViewportOffset(coords);
        this._viewerCore.zoom(newZoomLevel, position);
    }

    onPinch (event, coords, startDistance, endDistance)
    {
        // FIXME: Do this check in a way which is less spaghetti code-y
        const viewerState = this._viewerCore.getInternalState();
        const settings = this._viewerCore.getSettings();

        let newZoomLevel = Math.log(Math.pow(2, settings.zoomLevel) * endDistance / (startDistance * Math.log(2))) / Math.log(2);
        newZoomLevel = Math.max(settings.minZoomLevel, newZoomLevel);
        newZoomLevel = Math.min(settings.maxZoomLevel, newZoomLevel);

        if (newZoomLevel === settings.zoomLevel)
        {
            return;
        }

        const position = this._viewerCore.getPagePositionAtViewportOffset(coords);

        const layout = this._viewerCore.getCurrentLayout();
        const centerOffset = layout.getPageToViewportCenterOffset(position.anchorPage, viewerState.viewport);
        const scaleRatio = 1 / Math.pow(2, settings.zoomLevel - newZoomLevel);

        this._viewerCore.reload({
            zoomLevel: newZoomLevel,
            goDirectlyTo: position.anchorPage,
            horizontalOffset: (centerOffset.x - position.offset.left) + position.offset.left * scaleRatio,
            verticalOffset: (centerOffset.y - position.offset.top) + position.offset.top * scaleRatio
        });
    }

    // VIEW EVENTS
    onViewWillLoad ()
    {
        this._viewerCore.publish('DocumentWillLoad', this._viewerCore.getSettings());
    }

    onViewDidLoad ()
    {
        // TODO: Should only be necessary to handle changes on view update, not
        // initial load
        this._handleZoomLevelChange();

        const currentPageIndex = this._viewerCore.getSettings().currentPageIndex;
        const fileName = this._viewerCore.getPageName(currentPageIndex);
        this._viewerCore.publish("DocumentDidLoad", currentPageIndex, fileName);
    }

    onViewDidUpdate (renderedPages, targetPage)
    {
        const currentPage = (targetPage !== null) ?
            targetPage :
            getCentermostPage(renderedPages, this._viewerCore.getCurrentLayout(), this._viewerCore.getViewport());

        // Don't change the current page if there is no page in the viewport
        // FIXME: Would be better to fall back to the page closest to the viewport
        if (currentPage !== null)
        {
            this._viewerCore.setCurrentPage(currentPage);
        }

        if (targetPage !== null)
        {
            this._viewerCore.publish("ViewerDidJump", targetPage);
        }

        this._handleZoomLevelChange();
    }

    _handleZoomLevelChange ()
    {
        const viewerState = this._viewerState;
        const zoomLevel = viewerState.options.zoomLevel;

        // If this is not the initial load, trigger the zoom events
        if (viewerState.oldZoomLevel !== zoomLevel && viewerState.oldZoomLevel >= 0)
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

        viewerState.oldZoomLevel = zoomLevel;
    }

    destroy ()
    {
        this._overlays.forEach((overlay) =>
        {
            this._viewerCore.removePageOverlay(overlay);
        }, this);
    }
}

function getCentermostPage (renderedPages, layout, viewport)
{
    const centerY = viewport.top + (viewport.height / 2);
    const centerX = viewport.left + (viewport.width / 2);

    // Find the minimum distance from the viewport center to a page.
    // Compute minus the squared distance from viewport center to the page's border.
    // http://gamedev.stackexchange.com/questions/44483/how-do-i-calculate-distance-between-a-point-and-an-axis-aligned-rectangle
    const centerPage = maxBy(renderedPages, pageIndex =>
    {
        const dims = layout.getPageDimensions(pageIndex);
        const imageOffset = layout.getPageOffset(pageIndex, {excludePadding: false});

        const midX = imageOffset.left + (dims.height / 2);
        const midY = imageOffset.top + (dims.width / 2);

        const dx = Math.max(Math.abs(centerX - midX) - (dims.width / 2), 0);
        const dy = Math.max(Math.abs(centerY - midY) - (dims.height / 2), 0);

        return -(dx * dx + dy * dy);
    });

    return centerPage != null ? centerPage : null;
}
