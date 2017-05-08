import { elt } from './utils/elt';
/**
*
*
**/
export default class PageToolsOverlay
{
    constructor (pageIndex, viewerCore)
    {
        this.page = pageIndex;

        this._viewerCore = viewerCore;

        this._innerElement = this._viewerCore.getSettings().innerElement;
        this._pageToolsElem = null;
        //
        // this._buttons = null;
    }

    mount ()
    {
        if (this._pageToolsElem === null)
        {
            this._buttons = this._initializePageToolButtons();

            this._pageToolsElem = elt('div', { class: 'diva-page-tools-wrapper' },
                elt('div', { class: 'diva-page-tools' }, this._buttons)
            );
        }

        this.refresh();
        this._innerElement.appendChild(this._pageToolsElem);
    }

    _initializePageToolButtons ()
    {
        // Callback parameters
        const settings = this._viewerCore.getSettings();
        const publicInstance = this._viewerCore.getPublicInstance();
        const pageIndex = this.page;

        return this._viewerCore.getPageTools().map( (plugin) =>
        {
            // !!! The node needs to be cloned otherwise it is detached from
            //  one and reattached to the other.
            const button = plugin.pageToolsIcon.cloneNode(true);

            // ensure the plugin instance is handed as the first argument to call;
            // this will set the context (i.e., `this`) of the handleClick call to the plugin instance
            // itself.
            button.addEventListener('click', (event) =>
            {
                plugin.handleClick.call(plugin, event, settings, publicInstance, pageIndex);
            }, false);

            button.addEventListener('touchend', (event) =>
            {
                // Prevent firing of emulated mouse events
                event.preventDefault();

                plugin.handleClick.call(plugin, event, settings, publicInstance, pageIndex);
            }, false);

            return button;

        });
    }

    unmount ()
    {
        this._innerElement.removeChild(this._pageToolsElem);
    }

    refresh ()
    {
        const pos = this._viewerCore.getPageRegion(this.page, {
            excludePadding: true,
            incorporateViewport: true
        });

        this._pageToolsElem.style.top = pos.top + 'px';
        this._pageToolsElem.style.left = pos.left + 'px';
    }
}
