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

export default class PageOverlayManager
{
    constructor ()
    {
        this._pages = {};
        this._renderedPages = [];
        this._renderedPageMap = {};
    }

    addOverlay (overlay)
    {
        const overlaysByPage = this._pages[overlay.page] || (this._pages[overlay.page] = []);

        overlaysByPage.push(overlay);

        if (this._renderedPageMap[overlay.page])
            overlay.mount();
    }

    removeOverlay (overlay)
    {
        const page = overlay.page;
        const overlaysByPage = this._pages[page];

        if (!overlaysByPage)
            return;

        const overlayIndex = overlaysByPage.indexOf(overlay);

        if (overlayIndex === -1)
            return;

        if (this._renderedPageMap[page])
            overlaysByPage[overlayIndex].unmount();

        overlaysByPage.splice(overlayIndex, 1);

        if (overlaysByPage.length === 0)
            delete this._pages[page];
    }

    updateOverlays (renderedPages)
    {
        const previouslyRendered = this._renderedPages;
        const newRenderedMap = {};

        renderedPages.map( (pageIndex) =>
        {
            newRenderedMap[pageIndex] = true;

            if (!this._renderedPageMap[pageIndex])
            {
                this._renderedPageMap[pageIndex] = true;

                this._invokeOnOverlays(pageIndex, overlay =>
                {
                    overlay.mount();
                });
            }
        });

        previouslyRendered.map( (pageIndex) =>
        {
            if (newRenderedMap[pageIndex])
            {
                this._invokeOnOverlays(pageIndex, (overlay) =>
                {
                    overlay.refresh();
                });
            }
            else
            {
                delete this._renderedPageMap[pageIndex];
                this._invokeOnOverlays(pageIndex, overlay =>
                {
                    overlay.unmount();
                });
            }
        });

        this._renderedPages = renderedPages;
    }

    _invokeOnOverlays (pageIndex, func)
    {
        const overlays = this._pages[pageIndex];
        if (overlays)
            overlays.map( (o) => func(o) );
    }
}
