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
        
        this.windowWidth = window.innerWidth;
        this.wider = false;
    }

    mount ()
    {
        if (this._pageToolsElem === null)
        {
            this._buttons = this._initializePageToolButtons();

            this._pageToolsElem = elt('div', { class: 'diva-page-tools-wrapper' },
                elt('div', { class: 'diva-page-tools' }, this._buttons)
            );

            this._pageLabelsElem = elt('div', { class: 'diva-page-labels-wrapper'},
                elt('div', { class: 'diva-page-labels' }, this._viewerCore.settings.manifest.pages[this.page].l)
            );
        }

        this.refresh();
        this._innerElement.appendChild(this._pageToolsElem);
        this._innerElement.appendChild(this._pageLabelsElem);
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
        this._innerElement.removeChild(this._pageLabelsElem);
    }

    refresh ()
    {
        const pos = this._viewerCore.getPageRegion(this.page, {
            includePadding: true,
            incorporateViewport: true
        });

        const setLefts = () =>
        {
            if (this._viewerCore.settings.inBookLayout)
            {
                this._pageToolsElem.style.left = this.bookIconLeft;
                this._pageLabelsElem.style.left = this.bookLabelLeft;
            }
            else
            {
                this._pageToolsElem.style.left = this.docIconLeft;
                this._pageLabelsElem.style.left = this.docLabelLeft;
            }
        }

        // get the left positions for document and book view
        Diva.Events.subscribe('ViewerDidLoad', () => { this.getViewsLefts(pos); });
        // handle view switch
        Diva.Events.subscribe('ViewDidSwitch', setLefts);
        Diva.Events.subscribe('ViewerDidScroll', setLefts)

        if (!this.wider)
        {
            this._pageToolsElem.style.top = pos.top + 'px';
            this._pageToolsElem.style.left = pos.left + 'px';

            this._pageLabelsElem.style.top = pos.top + 'px';
            this._pageLabelsElem.style.left = pos.right - this._pageLabelsElem.clientWidth - 5 + 'px';
        }

        window.addEventListener('resize', () =>
        {
            // if resizing larger, fix left styles
            if (window.innerWidth > this.windowWidth)
            {
                setLefts();
                this.wider = true;
            } else
            {
                this.wider = false;
            }
        });
    }

    getViewsLefts (pos)
    {
        if (this._viewerCore.settings.inBookLayout)
        {
            // get book view left styles
            this.bookIconLeft = pos.left + 'px';
            this.bookLabelLeft = pos.right - this._pageLabelsElem.clientWidth - 5 + 'px';

            // switch to document and get lefts
            this._viewerCore.publicInstance.changeView('document');
            pos = this._viewerCore.getPageRegion(this.page, {
                includePadding: true,
                incorporateViewport: true
            });
            this.docIconLeft = pos.left + 'px';
            this.docLabelLeft = pos.right - this._pageLabelsElem.clientWidth - 5 + 'px';

            // switch back
            this._viewerCore.publicInstance.changeView('book');
        } 
        else
        {
            // get doc view left styles
            this.docIconLeft = pos.left + 'px';
            this.docLabelLeft = pos.right - this._pageLabelsElem.clientWidth - 5 + 'px';

            // switch to document and get lefts
            this._viewerCore.publicInstance.changeView('book');
            pos = this._viewerCore.getPageRegion(this.page, {
                includePadding: true,
                incorporateViewport: true
            });
            this.bookIconLeft = pos.left + 'px';
            this.bookLabelLeft = pos.right - this._pageLabelsElem.clientWidth - 5 + 'px';

            // switch back
            this._viewerCore.publicInstance.changeView('document');
        }
    }
}
