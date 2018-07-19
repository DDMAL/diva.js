import diva from './diva-global';
import { elt } from './utils/elt';

export default class Toolbar
{
    constructor (viewer)
    {
        this.viewer = viewer;
        this.settings = viewer.settings;
    }

    _elemAttrs (ident, base)
    {
        const attrs = {
            id: this.settings.ID + ident,
            class: 'diva-' + ident
        };

        if (base)
            return Object.assign(attrs, base);
        else
            return attrs;
    }


    /** Convenience function to subscribe to a Diva event */
    _subscribe (event, callback)
    {
        diva.Events.subscribe(event, callback, this.settings.ID);
    }


    createButton (name, label, callback, icon)
    {
        const button = elt('button', {
            type: 'button',
            id: this.settings.ID + name,
            class: 'diva-' + name + ' diva-button',
            title: label
        });

        if (icon)
            button.appendChild(icon);

        if (callback)
            button.addEventListener('click', callback);

        return button;
    }

    createLabel (name, id, label, innerName, innerValue)
    {
        return elt('div', { id: this.settings.ID + id, class: name + ' diva-label'},
                    [ label, elt('span', { id: this.settings.ID + innerName }, innerValue)
                    ]);
    }

    createZoomButtons ()
    {
        let zoomOutIcon = this._createZoomOutIcon();
        let zoomInIcon = this._createZoomInIcon();

        let zoomButtons = [
            this.createButton('zoom-out-button', 'Zoom Out', () => {
                this.viewer.setZoomLevel(this.settings.zoomLevel - 1);
            }, zoomOutIcon),
            this.createButton('zoom-in-button', 'Zoom In', () => {
                this.viewer.setZoomLevel(this.settings.zoomLevel + 1);
            }, zoomInIcon),
            this.createLabel('diva-zoom-label', 'zoom-label', 'Zoom level: ', 'zoom-level', this.settings.zoomLevel + 1)
        ];

        let zoomHandler = function ()
        {
            let labelEl = document.getElementById(this.settings.ID + 'zoom-level');
            labelEl.textContent = this.settings.zoomLevel + 1;
        };

        this._subscribe('ZoomLevelDidChange', zoomHandler);
        this._subscribe('ViewerDidLoad', zoomHandler);

        return elt('div', { id: this.settings.ID + "zoom-controls", style: "display: none"}, zoomButtons);
    }

    createGridControls ()
    {
        let gridMoreIcon = this._createGridMoreIcon();
        let gridFewerIcon = this._createGridFewerIcon();

        let gridButtons = [
            this.createButton('grid-out-button', 'Fewer', () => {
                this.viewer.setGridPagesPerRow(this.settings.pagesPerRow - 1);
            }, gridFewerIcon),
            this.createButton('grid-in-button', 'More', () => {
                this.viewer.setGridPagesPerRow(this.settings.pagesPerRow + 1);
            }, gridMoreIcon),
            this.createLabel('diva-grid-label', 'grid-label', 'Pages per row: ', 'pages-per-row', this.settings.pagesPerRow)
        ];

        let gridChangeHandler = function ()
        {
            let labelEl = document.getElementById(this.settings.ID + 'pages-per-row');
            labelEl.textContent = this.settings.pagesPerRow;
        };

        this._subscribe('GridRowNumberDidChange', gridChangeHandler);

        return elt('div', {id: this.settings.ID + "grid-controls", style: "display:none" }, gridButtons);
    }

    createViewMenu ()
    {
        const viewOptionsList = elt('div', this._elemAttrs('view-options'));
        const gridViewIcon = this._createGridViewIcon();
        const bookViewIcon = this._createBookViewIcon();
        const pageViewIcon = this._createPageViewIcon();

        const viewOptionsToggle = () =>
        {
            viewOptionsList.style.display = viewOptionsList.style.display === "none" ? "block" : "none";
        };

        const changeViewButton = this.createButton('view-icon', 'Change view', viewOptionsToggle);

        const selectView = (view) =>
        {
            this.viewer.changeView(view);

            //hide view menu
            viewOptionsList.style.display = "none";
        };

        const updateViewMenu = () =>
        {
            const viewIconClasses = ' diva-view-icon diva-button';


            // display the icon of the mode we're currently in (?)
            if (this.settings.inGrid)
            {
                changeViewButton.appendChild(gridViewIcon);
                changeViewButton.className = 'diva-grid-icon' + viewIconClasses;
            }
            else if (this.settings.inBookLayout)
            {
                changeViewButton.appendChild(bookViewIcon);
                changeViewButton.className = 'diva-book-icon' + viewIconClasses;
            }
            else
            {
                changeViewButton.appendChild(pageViewIcon);
                changeViewButton.className = 'diva-document-icon' + viewIconClasses;
            }

            const viewOptions = document.createDocumentFragment();

            // then display document, book, and grid buttons in that order, excluding the current view
            if (this.settings.inGrid || this.settings.inBookLayout)
                viewOptions.appendChild(this.createButton('document-icon', 'Document View', selectView.bind(null, 'document'), pageViewIcon));

            if (this.settings.inGrid || !this.settings.inBookLayout)
                viewOptions.appendChild(this.createButton('book-icon', 'Book View', selectView.bind(null, 'book'), bookViewIcon));

            if (!this.settings.inGrid)
                viewOptions.appendChild(this.createButton('grid-icon', 'Grid View', selectView.bind(null, 'grid'), gridViewIcon));

            // remove old menu
            while (viewOptionsList.firstChild)
            {
                viewOptionsList.removeChild(viewOptionsList.firstChild);
            }

            // insert new menu
            viewOptionsList.appendChild(viewOptions);
        };

        document.addEventListener('mouseup', event =>
        {
            if (viewOptionsList !== event.target)
            {
                viewOptionsList.style.display = 'none';
            }
        });

        this._subscribe('ViewDidSwitch', updateViewMenu);
        this._subscribe('ObjectDidLoad', updateViewMenu);

        return elt('div', this._elemAttrs('view-menu'),
            changeViewButton,
            viewOptionsList
        );
    }

    createFullscreenButton ()
    {
        let fullscreenIcon = this._createFullscreenIcon();

        return this.createButton('fullscreen-icon', 'Toggle fullscreen mode', () => {
            this.viewer.toggleFullscreenMode();
        }, fullscreenIcon);
    }

    toggleZoomGridControls ()
    {
        if (!this.settings.inGrid)
        {
            document.getElementById(this.settings.ID + "zoom-controls").style.display = "block";
            document.getElementById(this.settings.ID + "grid-controls").style.display = "none";
        }
        else
        {
            document.getElementById(this.settings.ID + "zoom-controls").style.display = "none";
            document.getElementById(this.settings.ID + "grid-controls").style.display = "block";
        }

    }

    render ()
    {
        this._subscribe("ViewDidSwitch", this.toggleZoomGridControls);
        this._subscribe("ObjectDidLoad", this.toggleZoomGridControls);

        let leftTools = [
            this.createZoomButtons(),
            this.createGridControls()
        ];
        let rightTools = [
            this.createViewMenu(),
            this.createFullscreenButton()
        ];

        const tools = elt('div', this._elemAttrs('tools'),
                    elt('div', this._elemAttrs('tools-left'), leftTools),
                    elt('div', this._elemAttrs('tools-right'), rightTools)
                );

        this.settings.toolbarParentObject.insertBefore(
            tools,
            this.settings.toolbarParentObject.firstChild
        );
    }

    _createToolbarIcon (paths)
    {
        let icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttributeNS(null, 'viewBox', "0 0 25 25");
        icon.setAttributeNS(null, 'x', '0px');
        icon.setAttributeNS(null, 'y', '0px');
        icon.setAttributeNS(null, 'style', "enable-background:new 0 0 48 48;");

        let glyph = document.createElementNS("http://www.w3.org/2000/svg", "g");
        glyph.setAttributeNS(null, "transform", "matrix(1, 0, 0, 1, -12, -12)");

        paths.forEach( (path) =>
        {
            let pEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pEl.setAttributeNS(null, "d", path);
            glyph.appendChild(pEl);
        });

        icon.appendChild(glyph);
        return icon;
    }

    _createZoomOutIcon ()
    {
        let paths = [
            "M19.5,23c-0.275,0-0.5-0.225-0.5-0.5v-1c0-0.275,0.225-0.5,0.5-0.5h7c0.275,0,0.5,0.225,0.5,0.5v1c0,0.275-0.225,0.5-0.5,0.5H19.5z",
            "M37.219,34.257l-2.213,2.212c-0.202,0.202-0.534,0.202-0.736,0l-6.098-6.099c-1.537,0.993-3.362,1.577-5.323,1.577c-5.431,0-9.849-4.418-9.849-9.849c0-5.431,4.418-9.849,9.849-9.849c5.431,0,9.849,4.418,9.849,9.849c0,1.961-0.584,3.786-1.576,5.323l6.098,6.098C37.422,33.722,37.422,34.054,37.219,34.257z M29.568,22.099c0-3.706-3.014-6.72-6.72-6.72c-3.706,0-6.72,3.014-6.72,6.72c0,3.706,3.014,6.72,6.72,6.72C26.555,28.818,29.568,25.805,29.568,22.099z"
        ];

        return this._createToolbarIcon(paths);
    }

    _createZoomInIcon ()
    {
        let paths = [
            "M37.469,34.257l-2.213,2.212c-0.202,0.202-0.534,0.202-0.736,0l-6.098-6.099c-1.537,0.993-3.362,1.577-5.323,1.577c-5.431,0-9.849-4.418-9.849-9.849c0-5.431,4.418-9.849,9.849-9.849c5.431,0,9.849,4.418,9.849,9.849c0,1.961-0.584,3.786-1.576,5.323l6.098,6.098C37.672,33.722,37.672,34.054,37.469,34.257z M29.818,22.099c0-3.706-3.014-6.72-6.72-6.72c-3.706,0-6.72,3.014-6.72,6.72c0,3.706,3.014,6.72,6.72,6.72C26.805,28.818,29.818,25.805,29.818,22.099z M26.5,21H24v-2.5c0-0.275-0.225-0.5-0.5-0.5h-1c-0.275,0-0.5,0.225-0.5,0.5V21h-2.5c-0.275,0-0.5,0.225-0.5,0.5v1c0,0.275,0.225,0.5,0.5,0.5H22v2.5c0,0.275,0.225,0.5,0.5,0.5h1c0.275,0,0.5-0.225,0.5-0.5V23h2.5c0.275,0,0.5-0.225,0.5-0.5v-1C27,21.225,26.775,21,26.5,21z"
        ];
        return this._createToolbarIcon(paths);
    }

    _createGridMoreIcon ()
    {
        let paths = [
            "M29.5,35c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H29.5z M21.5,35c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H21.5z M13.5,35c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H13.5z M29.5,27c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H29.5z M21.5,27c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H21.5z M13.5,27c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H13.5z M29.5,19c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H29.5z M21.5,19c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H21.5z M13.5,19c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H13.5z"
        ];
        return this._createToolbarIcon(paths);
    }

    _createGridFewerIcon ()
    {
        let paths = [
            "M25.5,35c-0.275,0-0.5-0.225-0.5-0.5v-9c0-0.275,0.225-0.5,0.5-0.5h9c0.275,0,0.5,0.225,0.5,0.5v9c0,0.275-0.225,0.5-0.5,0.5H25.5z M22.5,35c0.275,0,0.5-0.225,0.5-0.5v-9c0-0.275-0.225-0.5-0.5-0.5h-9c-0.275,0-0.5,0.225-0.5,0.5v9c0,0.275,0.225,0.5,0.5,0.5H22.5z M34.5,23c0.275,0,0.5-0.225,0.5-0.5v-9c0-0.275-0.225-0.5-0.5-0.5h-9c-0.275,0-0.5,0.225-0.5,0.5v9c0,0.275,0.225,0.5,0.5,0.5H34.5z M22.5,23c0.275,0,0.5-0.225,0.5-0.5v-9c0-0.275-0.225-0.5-0.5-0.5h-9c-0.275,0-0.5,0.225-0.5,0.5v9c0,0.275,0.225,0.5,0.5,0.5H22.5z"
        ];
        return this._createToolbarIcon(paths);
    }

    _createGridViewIcon ()
    {
        let paths = [
            "M29.5,35c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H29.5z M21.5,35c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H21.5z M13.5,35c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H13.5z M29.5,27c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H29.5z M21.5,27c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H21.5z M13.5,27c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H13.5z M29.5,19c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H29.5z M21.5,19c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H21.5z M13.5,19c-0.275,0-0.5-0.225-0.5-0.5v-5c0-0.275,0.225-0.5,0.5-0.5h5c0.275,0,0.5,0.225,0.5,0.5v5c0,0.275-0.225,0.5-0.5,0.5H13.5z"
        ];
        return this._createToolbarIcon(paths);
    }

    _createBookViewIcon ()
    {
        let paths = [
            "M35,16.8v-1.323c0,0-2.292-1.328-5.74-1.328c-3.448,0-5.26,1.25-5.26,1.25s-1.813-1.25-5.26-1.25c-3.448,0-5.74,1.328-5.74,1.328V16.8l-1,0.531v0.021v15.687c0,0,4.531-1.578,6.999-1.578c2.468,0,5.001,0.885,5.001,0.885s2.532-0.885,5-0.885c0.306,0,0.643,0.024,1,0.066v4.325l1.531-2.016L33,35.852v-3.72c2,0.43,3,0.906,3,0.906V17.352v-0.021L35,16.8z M23,29.03c-1-0.292-2.584-0.679-3.981-0.679c-2.246,0-3.019,0.404-4.019,0.699V16.634c0,0,1.125-0.699,4.019-0.699c1.694,0,2.981,0.417,3.981,1.126V29.03z M33,29.051c-1-0.295-1.773-0.699-4.02-0.699c-1.396,0-2.981,0.387-3.98,0.679V17.06c1-0.709,2.286-1.126,3.98-1.126c2.895,0,4.02,0.699,4.02,0.699V29.051z"
        ];
        return this._createToolbarIcon(paths);
    }

    _createPageViewIcon ()
    {
        let paths = [
            "M29.425,29h4.47L29,33.934v-4.47C29,29.19,29.151,29,29.425,29z M34,14.563V28h-5.569C28.157,28,28,28.196,28,28.47V34H14.497C14.223,34,14,33.71,14,33.437V14.563C14,14.29,14.223,14,14.497,14h18.9C33.672,14,34,14.29,34,14.563z M25.497,26.497C25.497,26.223,25.275,26,25,26h-7c-0.275,0-0.497,0.223-0.497,0.497v1.006C17.503,27.777,17.725,28,18,28h7c0.275,0,0.497-0.223,0.497-0.497V26.497z M30.497,22.497C30.497,22.223,30.275,22,30,22H18c-0.275,0-0.497,0.223-0.497,0.497v1.006C17.503,23.777,17.725,24,18,24h12c0.275,0,0.497-0.223,0.497-0.497V22.497z M30.497,18.497C30.497,18.223,30.275,18,30,18H18c-0.275,0-0.497,0.223-0.497,0.497v1.006C17.503,19.777,17.725,20,18,20h12c0.275,0,0.497-0.223,0.497-0.497V18.497z"
        ];

        return this._createToolbarIcon(paths);
    }

    _createFullscreenIcon ()
    {
        let paths = [
            "M35,12H13c-0.55,0-1,0.45-1,1v22c0,0.55,0.45,1,1,1h22c0.55,0,1-0.45,1-1V13C36,12.45,35.55,12,35,12z M34,34H14V14h20V34z",
            "M17,21.75v-4.5c0-0.138,0.112-0.25,0.25-0.25h4.5c0.138,0,0.17,0.08,0.073,0.177l-1.616,1.616l1.823,1.823c0.097,0.097,0.097,0.256,0,0.354l-1.061,1.06c-0.097,0.097-0.256,0.097-0.354,0l-1.823-1.823l-1.616,1.616C17.08,21.92,17,21.888,17,21.75z M20.97,25.97c-0.097-0.097-0.256-0.097-0.354,0l-1.823,1.823l-1.616-1.616C17.08,26.08,17,26.112,17,26.25v4.5c0,0.138,0.112,0.25,0.25,0.25h4.5c0.138,0,0.17-0.08,0.073-0.177l-1.616-1.616l1.823-1.823c0.097-0.097,0.097-0.256,0-0.354L20.97,25.97z M30.75,17h-4.5c-0.138,0-0.17,0.08-0.073,0.177l1.616,1.616l-1.823,1.823c-0.097,0.097-0.097,0.256,0,0.354l1.061,1.06c0.097,0.097,0.256,0.097,0.354,0l1.823-1.823l1.616,1.616C30.92,21.92,31,21.888,31,21.75v-4.5C31,17.112,30.888,17,30.75,17z M30.823,26.177l-1.616,1.616l-1.823-1.823c-0.097-0.097-0.256-0.097-0.354,0l-1.061,1.06c-0.097,0.097-0.097,0.256,0,0.354l1.823,1.823l-1.616,1.616C26.08,30.92,26.112,31,26.25,31h4.5c0.138,0,0.25-0.112,0.25-0.25v-4.5C31,26.112,30.92,26.08,30.823,26.177z M26,22.5c0-0.275-0.225-0.5-0.5-0.5h-3c-0.275,0-0.5,0.225-0.5,0.5v3c0,0.275,0.225,0.5,0.5,0.5h3c0.275,0,0.5-0.225,0.5-0.5V22.5z"
        ];

        return this._createToolbarIcon(paths);
    }


}


// export default function createToolbar (viewer)
// {
//     const settings = viewer.getSettings();
//
//     // FIXME(wabain): Temporarily copied from within Diva
//     const elemAttrs = (ident, base) => {
//         const attrs = {
//             id: settings.ID + ident,
//             class: 'diva-' + ident
//         };
//
//         if (base)
//             return Object.assign(attrs, base);
//         else
//             return attrs;
//     };
//
//     /** Convenience function to subscribe to a Diva event */
//     const subscribe = (event, callback) => {
//         diva.Events.subscribe(event, callback, settings.ID);
//     };
//
//     // Creates a toolbar button
//     const createButtonElement = (name, label, callback) => {
//         const button = elt('button', {
//             type: 'button',
//             id: settings.ID + name,
//             class: 'diva-' + name + ' diva-button',
//             title: label
//         });
//
//         if (callback)
//             button.addEventListener('click', callback, false);
//
//         return button;
//     };
//
//     // Higher-level function for creators of zoom and grid controls
//     const getResolutionControlCreator = config => () => {
//         let controls;
//
//         switch (settings[config.controllerSetting])
//         {
//             case 'slider':
//                 controls = config.createSlider();
//                 break;
//
//             case 'buttons':
//                 controls = config.createButtons();
//                 break;
//
//             default:
//                 // Don't display anything
//                 return null;
//         }
//
//         const wrapper = elt('span',
//             controls,
//             config.createLabel()
//         );
//
//         const updateWrapper = () => {
//             if (settings.inGrid === config.showInGrid)
//                 wrapper.style.display = 'inline';
//             else
//                 wrapper.style.display = 'none';
//         };
//
//         subscribe('ViewDidSwitch', updateWrapper);
//         subscribe('ObjectDidLoad', updateWrapper);
//
//         // Set initial value
//         updateWrapper();
//
//         return wrapper;
//     };
//
//     // Zoom controls
//     const createZoomControls = getResolutionControlCreator({
//         controllerSetting: 'enableZoomControls',
//         showInGrid: false,
//
//         createSlider: function ()
//         {
//             const elem = createSlider('zoom-slider', {
//                 step: 0.1,
//                 value: settings.zoomLevel,
//                 min: settings.minZoomLevel,
//                 max: settings.maxZoomLevel
//             });
//
//             elem.addEventListener('input', () =>
//             {
//                 const floatValue = parseFloat(this.value);
//                 viewer.setZoomLevel(floatValue);
//             });
//
//             elem.addEventListener('change', () =>
//             {
//                 const floatValue = parseFloat(this.value);
//                 if (floatValue !== settings.zoomLevel)
//                     viewer.setZoomLevel(floatValue);
//             });
//
//             const updateSlider = () => {
//                 if (settings.zoomLevel !== $elem.val())
//                     $elem.val(settings.zoomLevel);
//             };
//
//             subscribe('ZoomLevelDidChange', updateSlider);
//             subscribe('ViewerDidLoad', () => {
//                 elt.setAttributes(elem, {
//                     min: settings.minZoomLevel,
//                     max: settings.maxZoomLevel
//                 });
//
//                 updateSlider();
//             });
//
//             return elem;
//         },
//
//         createButtons: function ()
//         {
//             return elt('span',
//                 createButtonElement('zoom-out-button', 'Zoom Out', () => {
//                     viewer.setZoomLevel(settings.zoomLevel - 1);
//                 }),
//                 createButtonElement('zoom-in-button', 'Zoom In', () => {
//                     viewer.setZoomLevel(settings.zoomLevel + 1);
//                 })
//             );
//         },
//
//         createLabel: function ()
//         {
//             const elem = createLabel('diva-zoom-label', 'zoom-label', 'Zoom level: ', 'zoom-level', settings.zoomLevel);
//             const textSpan = $(elem).find(settings.selector + 'zoom-level')[0];
//
//             const updateText = () => {
//                 textSpan.textContent = settings.zoomLevel.toFixed(2);
//             };
//
//             subscribe('ZoomLevelDidChange', updateText);
//             subscribe('ViewerDidLoad', updateText);
//
//             return elem;
//         }
//     });
//
//     // Grid controls
//     const createGridControls = getResolutionControlCreator({
//         controllerSetting: 'enableGridControls',
//         showInGrid: true,
//
//         createSlider: function ()
//         {
//             const elem = createSlider('grid-slider', {
//                 value: settings.pagesPerRow,
//                 min: settings.minPagesPerRow,
//                 max: settings.maxPagesPerRow
//             });
//
//             elem.addEventListener('input', () => {
//                 const intValue = parseInt(elem.value, 10);
//                 viewer.setGridPagesPerRow(intValue);
//             });
//
//             elem.addEventListener('change', () => {
//                 const intValue = parseInt(elem.value, 10);
//                 if (intValue !== settings.pagesPerRow)
//                     viewer.setGridPagesPerRow(intValue);
//             });
//
//             subscribe('GridRowNumberDidChange', () => {
//                 // Update the position of the handle within the slider
//                 if (settings.pagesPerRow !== $elem.val())
//                     $elem.val(settings.pagesPerRow);
//             });
//
//             return elem;
//         },
//
//         createButtons: function ()
//         {
//             return elt('span',
//                 createButtonElement('grid-out-button', 'Zoom Out', () => {
//                     viewer.setGridPagesPerRow(settings.pagesPerRow - 1);
//                 }),
//                 createButtonElement('grid-in-button', 'Zoom In', () => {
//                     viewer.setGridPagesPerRow(settings.pagesPerRow + 1);
//                 })
//             );
//         },
//
//         createLabel: function ()
//         {
//             const elem = createLabel('diva-grid-label', 'grid-label', 'Pages per row: ', 'pages-per-row', settings.pagesPerRow);
//             const textSpan = $(elem).find(settings.selector + 'pages-per-row')[0];
//
//             subscribe('GridRowNumberDidChange', () => {
//                 textSpan.textContent = settings.pagesPerRow;
//             });
//
//             return elem;
//         }
//     });
//
//     const createViewMenu = () => {
//         const viewOptionsList = elt('div', elemAttrs('view-options'));
//
//         const changeViewButton = createButtonElement('view-icon', 'Change view', () => {
//             $(viewOptionsList).toggle();
//         });
//
//         document.addEventListener('mouseup', event => {
//             const container = $(viewOptionsList);
//
//             if (!container.is(event.target) && container.has(event.target).length === 0 && event.target.id !== settings.ID + 'view-icon')
//             {
//                 container.hide();
//             }
//         });
//
//         const selectView = view => {
//             viewer.changeView(view);
//
//             //hide view menu
//             $(viewOptionsList).hide();
//         };
//
//         const updateViewMenu = () => {
//             const viewIconClasses = ' diva-view-icon diva-button';
//
//             // display the icon of the mode we're currently in (?)
//             if (settings.inGrid)
//             {
//                 changeViewButton.className = 'diva-grid-icon' + viewIconClasses;
//             }
//             else if (settings.inBookLayout)
//             {
//                 changeViewButton.className = 'diva-book-icon' + viewIconClasses;
//             }
//             else
//             {
//                 changeViewButton.className = 'diva-document-icon' + viewIconClasses;
//             }
//
//             const viewOptions = document.createDocumentFragment();
//
//             // then display document, book, and grid buttons in that order, excluding the current view
//             if (settings.inGrid || settings.inBookLayout)
//                 viewOptions.appendChild(createButtonElement('document-icon', 'Document View', selectView.bind(null, 'document')));
//
//             if (settings.inGrid || !settings.inBookLayout)
//                 viewOptions.appendChild(createButtonElement('book-icon', 'Book View', selectView.bind(null, 'book')));
//
//             if (!settings.inGrid)
//                 viewOptions.appendChild(createButtonElement('grid-icon', 'Grid View', selectView.bind(null, 'grid')));
//
//             // remove old menu
//             while (viewOptionsList.firstChild)
//             {
//                 viewOptionsList.removeChild(viewOptionsList.firstChild);
//             }
//
//             // insert new menu
//             viewOptionsList.appendChild(viewOptions);
//         };
//
//         subscribe('ViewDidSwitch', updateViewMenu);
//         subscribe('ObjectDidLoad', updateViewMenu);
//
//         return elt('div', elemAttrs('view-menu'),
//             changeViewButton,
//             viewOptionsList
//         );
//     };
//
//     const createSlider = (name, options) => elt('input', options, {
//         id: settings.ID + name,
//         class: 'diva-' + name + ' diva-slider',
//         type: 'range'
//     });
//
//     const createLabel = (name, id, label, innerName, innerValue) => elt('div', {
//             id: settings.ID + id,
//             class: name + ' diva-label'
//         },
//         [
//             label,
//             elt('span', {
//                 id: settings.ID + innerName
//             }, innerValue)
//         ]);
//
//     const createPageNavigationControls = () => {
//         // Go to page form
//         const gotoForm = settings.enableGotoPage ? createGotoPageForm() : null;
//
//         return elt('span', elemAttrs('page-nav'),
//             createPageLabel(), // 'Page x of y' label
//             gotoForm
//         );
//     };
//
//     const createGotoPageForm = () => {
//         const gotoPageInput = elt('input', {
//             id: settings.ID + 'goto-page-input',
//             class: 'diva-input diva-goto-page-input',
//             autocomplete: 'off',
//             type: 'text'
//         });
//
//         const gotoPageSubmit = elt('input', {
//             id: settings.ID + 'goto-page-submit',
//             class: 'diva-button diva-button-text',
//             type: 'submit',
//             value: 'Go'
//         });
//
//         const inputSuggestions = elt('div', {
//                 id: settings.ID + 'input-suggestions',
//                 class: 'diva-input-suggestions'
//             }
//         );
//
//         const gotoForm = elt('form', {
//                 id: settings.ID + 'goto-page',
//                 class: 'diva-goto-form'
//             },
//             gotoPageInput,
//             gotoPageSubmit,
//             inputSuggestions
//         );
//
//         $(gotoForm).on('submit', () => {
//             const desiredPageLabel = gotoPageInput.value;
//
//             if (settings.onGotoSubmit && typeof settings.onGotoSubmit === "function")
//             {
//                 const pageIndex = settings.onGotoSubmit(desiredPageLabel);
//                 if (!viewer.gotoPageByIndex(pageIndex))
//                     alert("No page could be found with that label or page number");
//
//             }
//             else // Default if no function is specified in the settings
//             {
//                 if (!viewer.gotoPageByLabel(desiredPageLabel))
//                     alert("No page could be found with that label or page number");
//             }
//
//             // Hide the suggestions
//             inputSuggestions.style.display = 'none';
//
//             // Prevent the default action of reloading the page
//             return false;
//         });
//
//         $(gotoPageInput).on('input focus', () => {
//             inputSuggestions.innerHTML = ''; // Remove all previous suggestions
//
//             const value = gotoPageInput.value;
//             let numSuggestions = 0;
//             if (settings.enableGotoSuggestions && value)
//             {
//                 const pages = settings.manifest.pages;
//                 for (let i = 0, len = pages.length; i < len && numSuggestions < 10; i++)
//                 {
//                     if (pages[i].l.toLowerCase().indexOf(value.toLowerCase()) > -1)
//                     {
//                         const newInputSuggestion = elt('div', {
//                                 class: 'diva-input-suggestion'
//                             },
//                             pages[i].l
//                         );
//
//                         inputSuggestions.appendChild(newInputSuggestion);
//
//                         numSuggestions++;
//                     }
//                 }
//
//                 // Show label suggestions
//                 if (numSuggestions > 0)
//                     inputSuggestions.style.display = 'block';
//             }
//             else
//                 inputSuggestions.style.display = 'none';
//         });
//
//         $(gotoPageInput).on('keydown', e => {
//             let el;
//             if (e.keyCode === 13) // 'Enter' key
//             {
//                 const active = $('.active', inputSuggestions);
//                 if (active.length)
//                     gotoPageInput.value = active.text();
//
//             }
//             if (e.keyCode === 38) // Up arrow key
//             {
//                 el = $('.active', inputSuggestions);
//                 const prevEl = el.prev();
//                 if (prevEl.length)
//                 {
//                     el.removeClass('active');
//                     prevEl.addClass('active');
//                 }
//                 else
//                 {
//                     el.removeClass('active');
//                     $('.diva-input-suggestion:last', inputSuggestions).addClass('active');
//                 }
//             }
//             else if (e.keyCode === 40) // Down arrow key
//             {
//                 el = $('.active', inputSuggestions);
//                 const nextEl = el.next();
//                 if (nextEl.length)
//                 {
//                     el.removeClass('active');
//                     nextEl.addClass('active');
//                 }
//                 else
//                 {
//                     el.removeClass('active');
//                     $('.diva-input-suggestion:first', inputSuggestions).addClass('active');
//                 }
//             }
//         });
//
//         $(inputSuggestions).on('mousedown', '.diva-input-suggestion', function()
//         {
//             gotoPageInput.value = this.textContent;
//             inputSuggestions.style.display = 'none';
//             $(gotoPageInput).trigger('submit');
//         });
//
//         $(gotoPageInput).on('blur', () => {
//             // Hide label suggestions
//             inputSuggestions.style.display = 'none';
//         });
//
//         return gotoForm;
//     };
//
//     const createPageLabel = () => {
//         // Current page
//         const currentPage = elt('span', {
//             id: settings.ID + 'current-page'
//         });
//
//         const updateCurrentPage = () => {
//             currentPage.textContent = viewer.getCurrentAliasedPageIndex();
//         };
//
//         subscribe('VisiblePageDidChange', updateCurrentPage);
//         subscribe('ViewerDidLoad', updateCurrentPage);
//
//         // Number of pages
//         const numPages = elt('span', {
//             id: settings.ID + 'num-pages'
//         });
//
//         const updateNumPages = () => {
//             numPages.textContent = settings.numPages;
//         };
//
//         subscribe('NumberOfPagesDidChange', updateNumPages);
//         subscribe('ObjectDidLoad', updateNumPages);
//
//         return elt('span', {
//                 class: 'diva-page-label diva-label'
//             },
//             'Page ', currentPage, ' of ', numPages
//         );
//     };
//
//     const createToolbarButtonGroup = () => {
//         const buttons = [createViewMenu()];
//
//         if (settings.enableLinkIcon)
//             buttons.push(createLinkIcon());
//
//         if (settings.enableNonPagedVisibilityIcon)
//             buttons.push(createToggleNonPagedButton());
//
//         if (settings.enableFullscreen)
//             buttons.push(createFullscreenButton());
//
//         return elt('span', elemAttrs('toolbar-button-group'), buttons);
//     };
//
//     const createLinkIcon = () => {
//         const elem = createButtonElement('link-icon', 'Link to this page');
//         const linkIcon = $(elem);
//
//         linkIcon.on('click', () => {
//             $('body').prepend(
//                 elt('div', {
//                     id: settings.ID + 'link-popup',
//                     class: 'diva-popup diva-link-popup'
//                 }, [
//                     elt('input', {
//                         id: settings.ID + 'link-popup-input',
//                         class: 'diva-input',
//                         type: 'text',
//                         value: viewer.getCurrentURL()
//                     })
//                 ])
//             );
//
//             if (settings.inFullscreen)
//             {
//                 $(settings.selector + 'link-popup').addClass('in-fullscreen');
//             }
//             else
//             {
//                 // Calculate the left and top offsets
//                 const leftOffset = linkIcon.offset().left - 222 + linkIcon.outerWidth();
//                 const topOffset = linkIcon.offset().top + linkIcon.outerHeight() - 1;
//
//                 $(settings.selector + 'link-popup').css({
//                     'top': topOffset + 'px',
//                     'left': leftOffset + 'px'
//                 });
//             }
//
//             // Catch onmouseup events outside of this div
//             $('body').mouseup(event => {
//                 const targetID = event.target.id;
//
//                 if (targetID !== settings.ID + 'link-popup' && targetID !== settings.ID + 'link-popup-input')
//                     $(settings.selector + 'link-popup').remove();
//             });
//
//             // Also delete it upon scroll and page up/down key events
//             // FIXME(wabain): This is aggressive
//             settings.viewportObject.scroll(() => {
//                 $(settings.selector + 'link-popup').remove();
//             });
//             $(settings.selector + 'link-popup input').click(function ()
//             {
//                 $(this).focus().select();
//             });
//
//             return false;
//         });
//
//         return elem;
//     };
//
//     var createFullscreenButton = () => createButtonElement('fullscreen-icon', 'Toggle fullscreen mode', () => {
//         viewer.toggleFullscreenMode();
//     });
//
//     var createToggleNonPagedButton = () => {
//         const getClassName = () => 'toggle-nonpaged-icon' + (viewer.getSettings().showNonPagedPages ? '-active' : '');
//
//         const toggleNonPagedButton = createButtonElement(getClassName(), 'Toggle visibility of non-paged pages', function()
//         {
//             viewer.toggleNonPagedPagesVisibility();
//             const newClassName = 'diva-' + getClassName();
//             this.className = this.className.replace(/diva-toggle-nonpaged-icon(-active)?/, newClassName);
//         });
//
//         const updateNonPagedButtonVisibility = () => {
//             const pages = settings.manifest.pages;
//             for (let i = 0; i < pages.length; i++)
//             {
//                 if (settings.manifest.paged && !pages[i].paged)
//                 {
//                     // Show the button, there is at least one non-paged page
//                     toggleNonPagedButton.style.display = 'inline-block';
//                     return;
//                 }
//             }
//
//             // No non-paged pages were found, hide the button
//             toggleNonPagedButton.style.display = 'none';
//         };
//         subscribe('ObjectDidLoad', updateNonPagedButtonVisibility);
//
//         return toggleNonPagedButton;
//     };
//
//     // Handles all status updating etc (both fullscreen and not)
//     const init = () => {
//         const leftTools = [createZoomControls(), createGridControls()];
//         const rightTools = [createPageNavigationControls(), createToolbarButtonGroup()];
//
//         const tools = elt('div', elemAttrs('tools'),
//             elt('div', elemAttrs('tools-left'), leftTools),
//             elt('div', elemAttrs('tools-right'), rightTools)
//         );
//
//         settings.toolbarParentObject.prepend(tools);
//
//         // Handle entry to and exit from fullscreen mode
//         const switchMode = () => {
//             const toolsRightElement = document.getElementById(settings.ID + 'tools-right');
//             const pageNavElement = document.getElementById(settings.ID + 'page-nav');
//
//             if (!settings.inFullscreen)
//             {
//                 // Leaving fullscreen
//                 $(tools).removeClass('diva-fullscreen-tools');
//
//                 //move ID-page-nav to beginning of tools right
//                 toolsRightElement.removeChild(pageNavElement);
//                 toolsRightElement.insertBefore(pageNavElement, toolsRightElement.firstChild);
//             }
//             else
//             {
//                 // Entering fullscreen
//                 $(tools).addClass('diva-fullscreen-tools');
//
//                 //move ID-page-nav to end of tools right
//                 toolsRightElement.removeChild(pageNavElement);
//                 toolsRightElement.appendChild(pageNavElement);
//             }
//         };
//
//         subscribe('ModeDidSwitch', switchMode);
//         subscribe('ViewerDidLoad', switchMode);
//
//         const toolbar = {
//             element: tools,
//             closePopups: function ()
//             {
//                 $('.diva-popup').css('display', 'none');
//             }
//         };
//
//         return toolbar;
//     };
//
//     return init();
// }
