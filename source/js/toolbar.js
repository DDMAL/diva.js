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

    createPageLabel ()
    {
        // Current page
        const currentPage = elt('span', {
            id: this.settings.ID + 'current-page'
        });

        const updateCurrentPage = () => 
        {
            // get labels for index range
            let indices = this.viewer.getCurrentPageIndices();
            let startIndex = indices[0];
            let endIndex = indices[indices.length - 1];
            let startLabel = this.settings.manifest.pages[startIndex].l;
            let endLabel = this.settings.manifest.pages[endIndex].l;

            if (startIndex !== endIndex) 
            {
            	if (this.settings.enableIndexAsLabel)
                	currentPage.textContent = startIndex + " - " + endIndex;
            	else
            		currentPage.textContent = startLabel + " - " + endLabel;
            }
            else
        	{
            	if (this.settings.enableIndexAsLabel)
            		currentPage.textContent = startIndex;
            	else
            		currentPage.textContent = startLabel;
        	}
        };

        this._subscribe('VisiblePageDidChange', updateCurrentPage);
        this._subscribe('ViewerDidLoad', updateCurrentPage);
        this._subscribe('ViewDidSwitch', updateCurrentPage);

        return elt('span', {
                class: 'diva-page-label diva-label'
            },
            currentPage
        );
    }

    createGotoPageForm ()  
    {
        const gotoPageInput = elt('input', {
            id: this.settings.ID + 'goto-page-input',
            class: 'diva-input diva-goto-page-input',
            autocomplete: 'off',
            type: 'text'
        });

        const gotoPageSubmit = elt('input', {
            id: this.settings.ID + 'goto-page-submit',
            class: 'diva-button diva-button-text',
            type: 'submit',
            value: 'Go'
        });

        const inputSuggestions = elt('div', {
                id: this.settings.ID + 'input-suggestions',
                class: 'diva-input-suggestions'
            }
        );

        const gotoForm = elt('form', {
                id: this.settings.ID + 'goto-page',
                class: 'diva-goto-form'
            },
            gotoPageInput,
            gotoPageSubmit,
            inputSuggestions
        );

        gotoForm.addEventListener('submit', (e) => 
        {
            e.preventDefault();

            const desiredPageLabel = gotoPageInput.value;

            if (this.settings.onGotoSubmit && typeof this.settings.onGotoSubmit === "function")
            {
                const pageIndex = this.settings.onGotoSubmit(desiredPageLabel);
                if (!this.viewer.gotoPageByIndex(pageIndex))
                    window.alert("No page could be found with that label or page number");

            }
            else // Default if no function is specified in the settings
            {
                if (!this.viewer.gotoPageByLabel(desiredPageLabel))
                    window.alert("No page could be found with that label or page number");
            }

            // Hide the suggestions
            inputSuggestions.style.display = 'none';

            // Prevent the default action of reloading the page
            return false;
        });

        ['input', 'focus'].forEach(event => 
        {
            gotoPageInput.addEventListener(event, () => {
                inputSuggestions.innerHTML = ''; // Remove all previous suggestions

                const value = gotoPageInput.value;
                let numSuggestions = 0;
                if (this.settings.enableGotoSuggestions && value)
                {
                    const pages = this.settings.manifest.pages;
                    for (let i = 0, len = pages.length; i < len && numSuggestions < 10; i++)
                    {
                        if (pages[i].l.toLowerCase().indexOf(value.toLowerCase()) > -1)
                        {
                            const newInputSuggestion = elt('div', {
                                    class: 'diva-input-suggestion'
                                },
                                pages[i].l
                            );

                            inputSuggestions.appendChild(newInputSuggestion);

                            numSuggestions++;
                        }
                    }

                    // Show label suggestions
                    if (numSuggestions > 0)
                        inputSuggestions.style.display = 'block';
                }
                else
                    inputSuggestions.style.display = 'none';
            });
        });

        gotoPageInput.addEventListener('keydown', e => {
            let el;
            if (e.keyCode === 13) // 'Enter' key
            {
                const active = document.getElementsByClassName('active')[0];
                if (typeof active !== 'undefined')
                    gotoPageInput.value = active.innerText;
            }
            if (e.keyCode === 38) // Up arrow key
            {
                el = document.getElementsByClassName('active')[0];
                const prevEl = el ? el.previousSibling : undefined;
                if (typeof prevEl !== 'undefined')
                {
                    el.classList.remove('active');
                    if (prevEl !== null)
                        prevEl.classList.add('active');
                }
                else
                {
                    let last = document.getElementsByClassName('diva-input-suggestion').length - 1;
                    document.getElementsByClassName('diva-input-suggestion')[last].classList.add('active');
                }
            }
            else if (e.keyCode === 40) // Down arrow key
            {
                el = document.getElementsByClassName('active')[0];
                const nextEl = el ? el.nextSibling : undefined;
                if (typeof nextEl !== 'undefined')
                {
                    el.classList.remove('active');
                    if (nextEl !== null)
                        nextEl.classList.add('active');
                }
                else
                {
                    document.getElementsByClassName('diva-input-suggestion')[0].classList.add('active');
                }
            }
        });

        onEvent(inputSuggestions, 'mousedown', '.diva-input-suggestion', function ()
        {
            gotoPageInput.value = this.textContent;
            inputSuggestions.style.display = 'none';
            let submitEvent = new Event('submit', {
                cancelable: true
            });
            gotoForm.dispatchEvent(submitEvent);
        });

        // javascript equivalent to jquery .on(event, selector, function)
        function onEvent (elem, evt, sel, handler) 
        {
            elem.addEventListener(evt, function (event) 
            {
                var t = event.target;
                while (t && t !== this) 
                {
                    if (t.matches(sel)) 
                        handler.call(t, event);
                    t = t.parentNode;
                }
            });
        }

        gotoPageInput.addEventListener('blur', () => {
            // Hide label suggestions
            inputSuggestions.style.display = 'none';
        });

        return gotoForm;
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
            this.createPageLabel(),
            this.createViewMenu()
        ];
        if (this.settings.enableFullscreen)
            rightTools.push(this.createFullscreenButton());
        if (this.settings.enableGotoPage)
            rightTools.splice(1, 0, this.createGotoPageForm());

        // assign toolbar plugins to proper side
        let plugins = this.viewer.viewerState.pluginInstances;
        for (let i = 0, len = plugins.length; i < len; i++)
        {
            let plugin = plugins[i];

            if (!plugin.toolbarSide) // not a toolbar tool
                continue;

            plugin.toolbarIcon = plugin.createIcon(); 
            if (!plugin.toolbarIcon) // icon couldn't be created
                continue;

            // add plugin tools after the go-to-page and page-label tools
            if (plugin.toolbarSide === 'right') 
                rightTools.splice(2, 0, plugin.toolbarIcon);
            else if (plugin.toolbarSide === 'left') 
                leftTools.splice(2, 0, plugin.toolbarIcon);

            plugin.toolbarIcon.addEventListener('click', handlePluginClick.bind(this, plugin));
        }

        function handlePluginClick (plugin) 
        {
            plugin.handleClick(this.viewer);
        }

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
