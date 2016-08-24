module.exports = PageOverlayManager;

/**
 * Manages a collection of page overlays, which implement a low-level
 * API for synchronizing HTML pages to the canvas. Each overlay needs
 * to implement the following protocol:
 *
 *   mount(): Called when a page is first rendered
 *   refresh(): Called when a page is moved
 *   unmount(): Called when a previously rendered page has stopped being rendered
 *
 * @class
 */

function PageOverlayManager()
{
    this._pages = {};
    this._renderedPages = [];
    this._renderedPageMap = {};
}

PageOverlayManager.prototype.addOverlay = function (overlay)
{
    var overlaysByPage = this._pages[overlay.page] || (this._pages[overlay.page] = []);

    overlaysByPage.push(overlay);

    if (this._renderedPageMap[overlay.page])
        overlay.mount();
};

PageOverlayManager.prototype.removeOverlay = function (overlay)
{
    var page = overlay.page;
    var overlaysByPage = this._pages[page];

    if (!overlaysByPage)
        return;

    var overlayIndex = overlaysByPage.indexOf(overlay);

    if (overlayIndex === -1)
        return;

    if (this._renderedPageMap[page])
        overlaysByPage[overlayIndex].unmount();

    overlaysByPage.splice(overlayIndex, 1);

    if (overlaysByPage.length === 0)
        delete this._pages[page];
};

PageOverlayManager.prototype.updateOverlays = function (renderedPages)
{
    var previouslyRendered = this._renderedPages;
    var newRenderedMap = {};

    renderedPages.forEach(function (pageIndex)
    {
        newRenderedMap[pageIndex] = true;

        if (!this._renderedPageMap[pageIndex])
        {
            this._renderedPageMap[pageIndex] = true;

            this._invokeOnOverlays(pageIndex, function (overlay)
            {
                overlay.mount();
            });
        }
    }, this);

    previouslyRendered.forEach(function (pageIndex)
    {
        if (newRenderedMap[pageIndex])
        {
            this._invokeOnOverlays(pageIndex, function (overlay)
            {
                overlay.refresh();
            });
        }
        else
        {
            delete this._renderedPageMap[pageIndex];

            this._invokeOnOverlays(pageIndex, function (overlay)
            {
                overlay.unmount();
            });
        }
    }, this);

    this._renderedPages = renderedPages;
};

PageOverlayManager.prototype._invokeOnOverlays = function (pageIndex, func)
{
    var overlays = this._pages[pageIndex];
    if (overlays)
        overlays.forEach(func, this);
};
