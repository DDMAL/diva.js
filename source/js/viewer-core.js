import { elt } from './utils/elt';
import getScrollbarWidth from './utils/get-scrollbar-width';
import gestureEvents from './gesture-events';
import diva from './diva-global';
import DocumentHandler from './document-handler';
import GridHandler from './grid-handler';
import PageOverlayManager from './page-overlay-manager';
import Renderer from './renderer';
import getPageLayouts from './page-layouts';
import createSettingsView from './settings-view';
import ValidationRunner from './validation-runner';
import Viewport from './viewport';

const debug = require('debug')('diva:ViewerCore');

function generateId() {
    return generateId.counter++;
}
generateId.counter = 1;


// Define validations
const optionsValidations = [
    {
        key: 'goDirectlyTo',
        validate: (value, settings) =>
        {
            if (value < 0 || value >= settings.manifest.pages.length)
                return 0;
        }
    },
    {
        key: 'minPagesPerRow',
        validate: (value) =>
        {
            return Math.max(2, value);
        }
    },
    {
        key: 'maxPagesPerRow',
        validate: (value, settings) =>
        {
            return Math.max(value, settings.minPagesPerRow);
        }
    },
    {
        key: 'pagesPerRow',
        validate: (value, settings) =>
        {
            // Default to the maximum
            if (value < settings.minPagesPerRow || value > settings.maxPagesPerRow)
                return settings.maxPagesPerRow;
        }
    },
    {
        key: 'maxZoomLevel',
        validate: (value, settings, config) =>
        {
            // Changing this value isn't really an error, it just depends on the
            // source manifest
            config.suppressWarning();

            if (value < 0 || value > settings.manifest.maxZoom)
                return settings.manifest.maxZoom;
        }
    },
    {
        key: 'minZoomLevel',
        validate: (value, settings, config) =>
        {
            // Changes based on the manifest value shouldn't trigger a
            // warning
            if (value > settings.manifest.maxZoom)
            {
                config.suppressWarning();
                return 0;
            }

            if (value < 0 || value > settings.maxZoomLevel)
                return 0;
        }
    },
    {
        key: 'zoomLevel',
        validate: (value, settings, config) =>
        {
            if (value > settings.manifest.maxZoom)
            {
                config.suppressWarning();
                return 0;
            }

            if (value < settings.minZoomLevel || value > settings.maxZoomLevel)
                return settings.minZoomLevel;
        }
    }
];

export default class ViewerCore
{
    constructor (element, options, publicInstance)
    {
        this.parentObject = element;
        this.publicInstance = publicInstance;

        // Things that cannot be changed because of the way they are used by the script
        // Many of these are declared with arbitrary values that are changed later on
        this.viewerState = {
            currentPageIndex: 0,        // The current page in the viewport (center-most page)
            horizontalOffset: 0,        // Distance from the center of the diva element to the top of the current page
            horizontalPadding: 0,       // Either the fixed padding or adaptive padding
            ID: null,                   // The prefix of the IDs of the elements (usually 1-diva-)
            initialKeyScroll: false,    // Holds the initial state of enableKeyScroll
            initialSpaceScroll: false,  // Holds the initial state of enableSpaceScroll
            innerElement: null,         // The native .diva-outer DOM object
            innerObject: {},            // $(settings.ID + 'inner'), for selecting the .diva-inner element
            isActiveDiva: true,         // In the case that multiple diva panes exist on the same page, this should have events funneled to it.
            isScrollable: true,         // Used in enable/disableScrollable public methods
            isZooming: false,           // Flag to keep track of whether zooming is still in progress, for handleZoom
            loaded: false,              // A flag for when everything is loaded and ready to go.
            manifest: null,
            mobileWebkit: false,        // Checks if the user is on a touch device (iPad/iPod/iPhone/Android)
            numPages: 0,                // Number of pages in the array
            oldZoomLevel: -1,           // Holds the previous zoom level after zooming in or out
            options: options,
            outerElement: null,         // The native .diva-outer DOM object
            outerObject: {},            // $(settings.ID + 'outer'), for selecting the .diva-outer element
            pageOverlays: new PageOverlayManager(),
            pageTools: [],              // The plugins which are enabled as page tools
            parentObject: this.parentObject, // JQuery object referencing the parent element
            pendingManifestRequest: null, // Reference to the xhr request retrieving the manifest. Used to cancel the request on destroy()
            pluginInstances: [],                // Filled with the enabled plugins from the registry
            renderer: null,
            resizeTimer: -1,            // Holds the ID of the timeout used when resizing the window (for clearing)
            scrollbarWidth: 0,          // Set to the actual scrollbar width in init()
            selector: '',               // Uses the generated ID prefix to easily select elements
            throbberTimeoutID: -1,      // Holds the ID of the throbber loading timeout
            toolbar: null,              // Holds an object with some toolbar-related functions
            verticalOffset: 0,          // Distance from the center of the diva element to the left side of the current page
            verticalPadding: 0,         // Either the fixed padding or adaptive padding
            viewHandler: null,
            viewport: null,             // Object caching the viewport dimensions
            viewportElement: null,
            viewportObject: null,
            zoomDuration: 600
        };

        this.settings = createSettingsView([options, this.viewerState]);

        // Generate an ID that can be used as a prefix for all the other IDs
        const idNumber = generateId();
        this.viewerState.ID = 'diva-' + idNumber + '-';
        this.viewerState.selector = this.settings.ID;

        // Aliases for compatibility
        Object.defineProperties(this.settings, {
            // Height of the document viewer pane
            panelHeight: {
                get: () =>
                {
                    return this.viewerState.viewport.height;
                }
            },
            // Width of the document viewer pane
            panelWidth: {
                get: () =>
                {
                    return this.viewerState.viewport.width;
                }
            }
        });

        this.optionsValidator = new ValidationRunner({
            additionalProperties: [
                {
                    key: 'manifest',
                    get: () =>
                    {
                        return this.viewerState.manifest;
                    }
                }
            ],

            validations: optionsValidations
        });

        this.viewerState.scrollbarWidth = getScrollbarWidth();

        // If window.orientation is defined, then it's probably mobileWebkit
        this.viewerState.mobileWebkit = window.orientation !== undefined;

        if (options.hashParamSuffix === null)
        {
            // Omit the suffix from the first instance
            if (idNumber === 1)
                options.hashParamSuffix = '';
            else
                options.hashParamSuffix = idNumber + '';
        }

        // Create the inner and outer panels
        const innerElem = elt('div', this.elemAttrs('inner', { class: 'diva-inner' }));
        const viewportElem = elt('div', this.elemAttrs('viewport'), innerElem);
        const outerElem = elt('div', this.elemAttrs('outer'),
            viewportElem,
            elt('div', this.elemAttrs('throbber'),
                [
                    elt('div', { class: 'cube cube1' }),
                    elt('div', { class: 'cube cube2' }),
                    elt('div', { class: 'cube cube3' }),
                    elt('div', { class: 'cube cube4' }),
                    elt('div', { class: 'cube cube5' }),
                    elt('div', { class: 'cube cube6' }),
                    elt('div', { class: 'cube cube7' }),
                    elt('div', { class: 'cube cube8' }),
                    elt('div', { class: 'cube cube9' }),
                ]
            ));

        this.viewerState.innerElement = innerElem;
        this.viewerState.viewportElement = viewportElem;
        this.viewerState.outerElement = outerElem;

        this.viewerState.innerObject = innerElem;
        this.viewerState.viewportObject = viewportElem;
        this.viewerState.outerObject = outerElem;

        this.settings.parentObject.append(outerElem);

        this.viewerState.viewport = new Viewport(this.viewerState.viewportElement, {
            intersectionTolerance: this.settings.viewportMargin
        });

        this.boundScrollFunction = this.scrollFunction.bind(this);
        this.boundEscapeListener = this.escapeListener.bind(this);

        // Do all the plugin initialisation
        this.initPlugins();
        this.handleEvents();

        // Show the throbber while waiting for the manifest to load
        this.showThrobber();
    }

    isValidOption (key, value)
    {
        return this.optionsValidator.isValid(key, value, this.viewerState.options);
    }

    elemAttrs (ident, base)
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

    getPageData (pageIndex, attribute)
    {
        return this.settings.manifest.pages[pageIndex].d[this.settings.zoomLevel][attribute];
    }

    // Reset some settings and empty the viewport
    clearViewer ()
    {
        this.viewerState.viewport.top = 0;

        // Clear all the timeouts to prevent undesired pages from loading
        clearTimeout(this.viewerState.resizeTimer);
    }

    hasChangedOption (options, key)
    {
        return key in options && options[key] !== this.settings[key];
    }

    //Shortcut for closing fullscreen with the escape key
    escapeListener (e)
    {
        if (e.keyCode === 27)
        {
            this.reloadViewer({
                inFullscreen: !this.settings.inFullscreen
            });
        }
    }

    /**
     * Update settings to match the specified options. Load the viewer,
     * fire appropriate events for changed options.
     */
    reloadViewer (newOptions)
    {
        const queuedEvents = [];

        newOptions = this.optionsValidator.getValidatedOptions(this.settings, newOptions);

        // Set the zoom level if valid and fire a ZoomLevelDidChange event
        if (this.hasChangedOption(newOptions, 'zoomLevel'))
        {
            this.viewerState.oldZoomLevel = this.settings.zoomLevel;
            this.viewerState.options.zoomLevel = newOptions.zoomLevel;
            queuedEvents.push(["ZoomLevelDidChange", newOptions.zoomLevel]);
        }

        // Set the pages per row if valid and fire an event
        if (this.hasChangedOption(newOptions, 'pagesPerRow'))
        {
            this.viewerState.options.pagesPerRow = newOptions.pagesPerRow;
            queuedEvents.push(["GridRowNumberDidChange", newOptions.pagesPerRow]);
        }

        // Update verticallyOriented (no event fired)
        if (this.hasChangedOption(newOptions, 'verticallyOriented'))
            this.viewerState.options.verticallyOriented = newOptions.verticallyOriented;

        // Show/Hide non-paged pages
        if (this.hasChangedOption(newOptions, 'showNonPagedPages'))
        {
            this.viewerState.options.showNonPagedPages = newOptions.showNonPagedPages;
        }

        // Update page position (no event fired here)
        if ('goDirectlyTo' in newOptions)
        {
            this.viewerState.options.goDirectlyTo = newOptions.goDirectlyTo;

            if ('verticalOffset' in newOptions)
                this.viewerState.verticalOffset = newOptions.verticalOffset;

            if ('horizontalOffset' in newOptions)
                this.viewerState.horizontalOffset = newOptions.horizontalOffset;
        }
        else
        {
            // Otherwise the default is to remain on the current page
            this.viewerState.options.goDirectlyTo = this.settings.currentPageIndex;
        }

        if (this.hasChangedOption(newOptions, 'inGrid') || this.hasChangedOption(newOptions, 'inBookLayout'))
        {
            if ('inGrid' in newOptions)
                this.viewerState.options.inGrid = newOptions.inGrid;

            if ('inBookLayout' in newOptions)
                this.viewerState.options.inBookLayout = newOptions.inBookLayout;

            queuedEvents.push(["ViewDidSwitch", this.settings.inGrid]);
        }

        // Note: prepareModeChange() depends on inGrid and the vertical/horizontalOffset (for now)
        if (this.hasChangedOption(newOptions, 'inFullscreen'))
        {
            this.viewerState.options.inFullscreen = newOptions.inFullscreen;
            this.prepareModeChange(newOptions);
            queuedEvents.push(["ModeDidSwitch", this.settings.inFullscreen]);
        }

        this.clearViewer();
        this.updateViewHandlerAndRendering();

        if (this.viewerState.renderer)
        {
            // TODO: The usage of padding variables is still really
            // messy and inconsistent
            const rendererConfig = {
                pageLayouts: getPageLayouts(this.settings),
                padding: this.getPadding(),
                maxZoomLevel: this.settings.inGrid ? null : this.viewerState.manifest.maxZoom,
                verticallyOriented: this.settings.verticallyOriented || this.settings.inGrid,
            };

            const viewportPosition = {
                zoomLevel: this.settings.inGrid ? null : this.settings.zoomLevel,
                anchorPage: this.settings.goDirectlyTo,
                verticalOffset: this.viewerState.verticalOffset,
                horizontalOffset: this.viewerState.horizontalOffset
            };

            const sourceProvider = this.getCurrentSourceProvider();

            if (debug.enabled)
            {
                const serialized = Object.keys(rendererConfig)
                    .filter(function (key)
                    {
                        // Too long
                        return key !== 'pageLayouts' && key !== 'padding';
                    })
                    .map(function (key)
                    {
                        const value = rendererConfig[key];
                        return key + ': ' + JSON.stringify(value);
                    })
                    .join(', ');

                debug('reload with %s', serialized);
            }

            this.viewerState.renderer.load(rendererConfig, viewportPosition, sourceProvider);
        }

        queuedEvents.forEach( (params) =>
        {
            this.publish.apply(this, params);
        });

        return true;
    }

    // Handles switching in and out of fullscreen mode
    prepareModeChange (options)
    {
        // Toggle the classes
        const changeClass = options.inFullscreen ? 'add' : 'remove';
        this.viewerState.outerObject.classList[changeClass]('diva-fullscreen');
        document.body.classList[changeClass]('diva-hide-scrollbar');
        this.settings.parentObject.classList[changeClass]('diva-full-width');

        // Adjust Diva's internal panel size, keeping the old values
        const storedHeight = this.settings.panelHeight;
        const storedWidth = this.settings.panelWidth;
        this.viewerState.viewport.invalidate();

        // If this isn't the original load, the offsets matter, and the position isn't being changed...
        if (!this.viewerState.loaded && !this.settings.inGrid && !('verticalOffset' in options))
        {
            //get the updated panel size
            const newHeight = this.settings.panelHeight;
            const newWidth = this.settings.panelWidth;

            //and re-center the new panel on the same point
            this.viewerState.verticalOffset += ((storedHeight - newHeight) / 2);
            this.viewerState.horizontalOffset += ((storedWidth - newWidth) / 2);
        }

        //turn on/off escape key listener
        if (options.inFullscreen)
            document.addEventListener('keyup', this.boundEscapeListener);
        else
            document.removeEventListener('keyup', this.boundEscapeListener);
    }

    // Update the view handler and the view rendering for the current view
    updateViewHandlerAndRendering ()
    {
        const Handler = this.settings.inGrid ? GridHandler : DocumentHandler;

        if (this.viewerState.viewHandler && !(this.viewerState.viewHandler instanceof Handler))
        {
            this.viewerState.viewHandler.destroy();
            this.viewerState.viewHandler = null;
        }

        if (!this.viewerState.viewHandler)
            this.viewerState.viewHandler = new Handler(this);

        if (!this.viewerState.renderer)
            this.initializeRenderer();
    }

    // TODO: This could probably be done upon ViewerCore initialization
    initializeRenderer ()
    {
        const compatErrors = Renderer.getCompatibilityErrors();

        if (compatErrors)
        {
            this.showError(compatErrors);
        }
        else
        {
            const options = {
                viewport: this.viewerState.viewport,
                outerElement: this.viewerState.outerElement,
                innerElement: this.viewerState.innerElement
            };

            const hooks = {
                onViewWillLoad: () =>
                {
                    this.viewerState.viewHandler.onViewWillLoad();
                },
                onViewDidLoad: () =>
                {
                    this.updatePageOverlays();
                    this.viewerState.viewHandler.onViewDidLoad();
                },
                onViewDidUpdate: (pages, targetPage) =>
                {
                    this.updatePageOverlays();
                    this.viewerState.viewHandler.onViewDidUpdate(pages, targetPage);
                },
                onViewDidTransition: () =>
                {
                    this.updatePageOverlays();
                },
                onPageWillLoad: (pageIndex) =>
                {
                    this.publish('PageWillLoad', pageIndex);
                },
                onVisibleTilesDidLoad: (pageIndex, zoomLevel) =>
                {
                    this.publish('VisibleTilesDidLoad', [pageIndex, zoomLevel]);
                }
            };

            this.viewerState.renderer = new Renderer(options, hooks);
        }
    }

    getCurrentSourceProvider ()
    {
        if (this.settings.inGrid)
        {
            const gridSourceProvider = {
                getAllZoomLevelsForPage: (page) =>
                {
                    return [gridSourceProvider.getBestZoomLevelForPage(page)];
                },
                getBestZoomLevelForPage: (page) =>
                {
                    const url = this.settings.manifest.getPageImageURL(page.index, {
                        width: page.dimensions.width
                    });

                    return {
                        zoomLevel: 1, // FIXME
                        rows: 1,
                        cols: 1,
                        tiles: [{
                            url: url,
                            zoomLevel: 1, // FIXME
                            row: 0,
                            col: 0,
                            dimensions: page.dimensions,
                            offset: {
                                top: 0,
                                left: 0
                            }
                        }]
                    };
                }
            };

            return gridSourceProvider;
        }

        const tileDimensions = {
            width: this.settings.tileWidth,
            height: this.settings.tileHeight
        };

        return {
            getBestZoomLevelForPage: (page) =>
            {
                return this.settings.manifest.getPageImageTiles(page.index, Math.ceil(this.settings.zoomLevel), tileDimensions);
            },
            getAllZoomLevelsForPage: (page) =>
            {
                const levels = [];
                const levelCount = this.viewerState.manifest.maxZoom;

                for (let level=0; level <= levelCount; level++)
                {
                    levels.push(this.settings.manifest.getPageImageTiles(page.index, level, tileDimensions));
                }

                levels.reverse();

                return levels;
            }
        };
    }

    getPadding ()
    {
        let topPadding, leftPadding;
        let docVPadding, docHPadding;

        if (this.settings.inGrid)
        {
            docVPadding = this.settings.fixedPadding;
            topPadding = leftPadding = docHPadding = 0;
        }
        else
        {
            topPadding = this.settings.verticallyOriented ? this.viewerState.verticalPadding : 0;
            leftPadding = this.settings.verticallyOriented ? 0 : this.viewerState.horizontalPadding;

            docVPadding = this.settings.verticallyOriented ? 0 : this.viewerState.verticalPadding;
            docHPadding = this.settings.verticallyOriented ? this.viewerState.horizontalPadding : 0;
        }

        return {
            document: {
                top: docVPadding,
                bottom: docVPadding,
                left: docHPadding,
                right: docHPadding
            },
            page: {
                top: topPadding,
                bottom: 0,
                left: leftPadding,
                right: 0
            }
        };
    }

    updatePageOverlays ()
    {
        this.viewerState.pageOverlays.updateOverlays(
            this.viewerState.renderer.getRenderedPages()
        );
    }

    // Called to handle any zoom level
    handleZoom (newZoomLevel, focalPoint)
    {
        // If the zoom level provided is invalid, return false
        if (!this.isValidOption('zoomLevel', newZoomLevel))
            return false;

        // While zooming, don't update scroll offsets based on the scaled version of diva-inner
        this.viewerState.viewportObject.removeEventListener('scroll', this.boundScrollFunction);

        // If no focal point was given, zoom on the center of the viewport
        if (!focalPoint)
        {
            const viewport = this.viewerState.viewport;
            const currentRegion = this.viewerState.renderer.layout.getPageRegion(this.settings.currentPageIndex);

            focalPoint = {
                anchorPage: this.settings.currentPageIndex,
                offset: {
                    left: (viewport.width / 2) - (currentRegion.left - viewport.left),
                    top: (viewport.height / 2) - (currentRegion.top - viewport.top)
                }
            };
        }

        const pageRegion = this.viewerState.renderer.layout.getPageRegion(focalPoint.anchorPage);

        // calculate distance from cursor coordinates to center of viewport
        const focalXToCenter = (pageRegion.left + focalPoint.offset.left) -
            (this.settings.viewport.left + (this.settings.viewport.width / 2));
        const focalYToCenter = (pageRegion.top + focalPoint.offset.top) -
            (this.settings.viewport.top + (this.settings.viewport.height / 2));

        const getPositionForZoomLevel = function (zoomLevel, initZoom)
        {
            const zoomRatio = Math.pow(2, zoomLevel - initZoom);

            //TODO(jeromepl): Calculate position from page top left to viewport top left
            // calculate horizontal/verticalOffset: distance from viewport center to page upper left corner
            const horizontalOffset = (focalPoint.offset.left * zoomRatio) - focalXToCenter;
            const verticalOffset = (focalPoint.offset.top * zoomRatio) - focalYToCenter;

            return {
                zoomLevel: zoomLevel,
                anchorPage: focalPoint.anchorPage,
                verticalOffset: verticalOffset,
                horizontalOffset: horizontalOffset
            };
        };

        this.viewerState.options.zoomLevel = newZoomLevel;
        let initialZoomLevel = this.viewerState.oldZoomLevel;
        this.viewerState.oldZoomLevel = this.settings.zoomLevel;
        const endPosition = getPositionForZoomLevel(newZoomLevel, initialZoomLevel);
        this.viewerState.options.goDirectlyTo = endPosition.anchorPage;
        this.viewerState.verticalOffset = endPosition.verticalOffset;
        this.viewerState.horizontalOffset = endPosition.horizontalOffset;

        this.viewerState.renderer.transitionViewportPosition({
            duration: this.settings.zoomDuration,
            parameters: {
                zoomLevel: {
                    from: initialZoomLevel,
                    to: newZoomLevel
                }
            },
            getPosition: (parameters) =>
            {
                return getPositionForZoomLevel(parameters.zoomLevel, initialZoomLevel)
            },
            onEnd: (info) =>
            {
                this.viewerState.viewportObject.addEventListener('scroll', this.boundScrollFunction);

                if (info.interrupted)
                    this.viewerState.oldZoomLevel = newZoomLevel;
            }
        });

        // Send off the zoom level did change event.
        this.publish("ZoomLevelDidChange", newZoomLevel);

        return true;
    }

    /*
     Gets the Y-offset for a specific point on a specific page
     Acceptable values for "anchor":
     "top" (default) - will anchor top of the page to the top of the diva-outer element
     "bottom" - top, s/top/bottom
     "center" - will center the page on the diva element
     Returned value will be the distance from the center of the diva-outer element to the top of the current page for the specified anchor
     */
    getYOffset (pageIndex, anchor)
    {
        let pidx = (typeof(pageIndex) === "undefined" ? this.settings.currentPageIndex : pageIndex);

        if (anchor === "center" || anchor === "centre") //how you can tell an American coded this
        {
            return parseInt(this.getPageData(pidx, "h") / 2, 10);
        }
        else if (anchor === "bottom")
        {
            return parseInt(this.getPageData(pidx, "h") - this.settings.panelHeight / 2, 10);
        }
        else
        {
            return parseInt(this.settings.panelHeight / 2, 10);
        }
    }

    //Same as getYOffset with "left" and "right" as acceptable values instead of "top" and "bottom"
    getXOffset (pageIndex, anchor)
    {
        let pidx = (typeof(pageIndex) === "undefined" ? this.settings.currentPageIndex : pageIndex);

        if (anchor === "left")
        {
            return parseInt(this.settings.panelWidth / 2, 10);
        }
        else if (anchor === "right")
        {
            return parseInt(this.getPageData(pidx, "w") - this.settings.panelWidth / 2, 10);
        }
        else
        {
            return parseInt(this.getPageData(pidx, "w") / 2, 10);
        }
    }

    // updates panelHeight/panelWidth on resize
    updatePanelSize ()
    {
        this.viewerState.viewport.invalidate();

        // FIXME(wabain): This should really only be called after initial load
        if (this.viewerState.renderer)
        {
            this.updateOffsets();
            this.viewerState.renderer.goto(this.settings.currentPageIndex, this.viewerState.verticalOffset, this.viewerState.horizontalOffset);
        }

        return true;
    }

    updateOffsets ()
    {
        const pageOffset = this.viewerState.renderer.layout.getPageToViewportCenterOffset(this.settings.currentPageIndex, this.viewerState.viewport);

        if (pageOffset)
        {
            this.viewerState.horizontalOffset = pageOffset.x;
            this.viewerState.verticalOffset = pageOffset.y;
        }
    }

    // Bind mouse events (drag to scroll, double-click)
    bindMouseEvents ()
    {
        // Set drag scroll on the viewport object
        this.viewerState.viewportObject.classList.add('dragscroll');

        gestureEvents.onDoubleClick(this.viewerState.viewportObject, (event, coords) =>
        {
            debug('Double click at %s, %s', coords.left, coords.top);
            this.viewerState.viewHandler.onDoubleClick(event, coords);
        });
    }

    onResize ()
    {
        this.updatePanelSize();
        // Cancel any previously-set resize timeouts
        clearTimeout(this.viewerState.resizeTimer);

        this.viewerState.resizeTimer = setTimeout( () =>
        {
            const pageOffset = this.viewerState.renderer.layout.getPageToViewportCenterOffset(this.settings.currentPageIndex, this.viewerState.viewport);

            if (pageOffset)
            {
                this.reloadViewer({
                    goDirectlyTo: this.settings.currentPageIndex,
                    verticalOffset: pageOffset.y,
                    horizontalOffset: pageOffset.x
                });
            }
            else
            {
                this.reloadViewer({
                    goDirectlyTo: this.settings.currentPageIndex
                });
            }
        }, 200);
    }

    // Bind touch and orientation change events
    bindTouchEvents ()
    {
        // Block the user from moving the window only if it's not integrated
        if (this.settings.blockMobileMove)
        {
            document.body.addEventListener('touchmove', (event) =>
            {
                const e = event.originalEvent;
                e.preventDefault();

                return false;
            });
        }

        // Touch events for swiping in the viewport to scroll pages
        // this.viewerState.viewportObject.addEventListener('scroll', this.scrollFunction.bind(this));

        gestureEvents.onPinch(this.viewerState.viewportObject, function (event, coords, start, end)
        {
            debug('Pinch %s at %s, %s', end - start, coords.left, coords.top);
            this.viewerState.viewHandler.onPinch(event, coords, start, end);
        });

        gestureEvents.onDoubleTap(this.viewerState.viewportObject, function (event, coords)
        {
            debug('Double tap at %s, %s', coords.left, coords.top);
            this.viewerState.viewHandler.onDoubleClick(event, coords);
        });
    }

    // Handle the scroll
    scrollFunction ()
    {
        const previousTopScroll = this.viewerState.viewport.top;
        const previousLeftScroll = this.viewerState.viewport.left;

        let direction;

        this.viewerState.viewport.invalidate();

        const newScrollTop = this.viewerState.viewport.top;
        const newScrollLeft = this.viewerState.viewport.left;

        if (this.settings.verticallyOriented || this.settings.inGrid)
            direction = newScrollTop - previousTopScroll;
        else
            direction = newScrollLeft - previousLeftScroll;

        //give adjust the direction we care about
        this.viewerState.renderer.adjust(direction);

        const primaryScroll = (this.settings.verticallyOriented || this.settings.inGrid) ? newScrollTop : newScrollLeft;

        this.publish("ViewerDidScroll", primaryScroll);

        if (direction > 0)
        {
            this.publish("ViewerDidScrollDown", primaryScroll);
        }
        else if (direction < 0)
        {
            this.publish("ViewerDidScrollUp", primaryScroll);
        }

        this.updateOffsets();
    }

    // Binds most of the event handlers (some more in createToolbar)
    handleEvents ()
    {
        // Change the cursor for dragging
        this.viewerState.innerObject.addEventListener('mousedown', () =>
        {
            this.viewerState.innerObject.classList.add('diva-grabbing');
        });

        this.viewerState.innerObject.addEventListener('mouseup', () =>
        {
            this.viewerState.innerObject.classList.remove('diva-grabbing');
        });

        this.bindMouseEvents();
        this.viewerState.viewportObject.addEventListener('scroll', this.boundScrollFunction);

        const upArrowKey = 38, downArrowKey = 40, leftArrowKey = 37, rightArrowKey = 39, spaceKey = 32, pageUpKey = 33, pageDownKey = 34, homeKey = 36, endKey = 35;

        // Catch the key presses in document
        document.addEventListener('keydown.diva', (event) =>
        {
            if (!this.viewerState.isActiveDiva)
                return true;

            // Space or page down - go to the next page
            if ((this.settings.enableSpaceScroll && !event.shiftKey && event.keyCode === spaceKey) || (this.settings.enableKeyScroll && event.keyCode === pageDownKey))
            {
                this.viewerState.viewport.top += this.settings.panelHeight;
                return false;
            }
            else if (!this.settings.enableSpaceScroll && event.keyCode === spaceKey)
            {
                event.preventDefault();
            }

            if (this.settings.enableKeyScroll)
            {
                // Don't steal keyboard shortcuts (metaKey = command [OS X], super [Win/Linux])
                if (event.shiftKey || event.ctrlKey || event.metaKey)
                    return true;

                switch (event.keyCode)
                {
                    case pageUpKey:
                        // Page up - go to the previous page
                        this.viewerState.viewport.top -= this.settings.panelHeight;
                        return false;

                    case upArrowKey:
                        // Up arrow - scroll up
                        this.viewerState.viewport.top -= this.settings.arrowScrollAmount;
                        return false;

                    case downArrowKey:
                        // Down arrow - scroll down
                        this.viewerState.viewport.top += this.settings.arrowScrollAmount;
                        return false;

                    case leftArrowKey:
                        // Left arrow - scroll left
                        this.viewerState.viewport.left -= this.settings.arrowScrollAmount;
                        return false;

                    case rightArrowKey:
                        // Right arrow - scroll right
                        this.viewerState.viewport.left += this.settings.arrowScrollAmount;
                        return false;

                    case homeKey:
                        // Home key - go to the beginning of the document
                        this.viewerState.viewport.top = 0;
                        return false;

                    case endKey:
                        // End key - go to the end of the document
                        // Count on the viewport coordinate value being normalized
                        if (this.settings.verticallyOriented)
                            this.viewerState.viewport.top = Infinity;
                        else
                            this.viewerState.viewport.left = Infinity;

                        return false;

                    default:
                        return true;
                }
            }
            return true;
        });

        diva.Events.subscribe('ViewerDidTerminate', function()
        {
            document.removeEventListener('keydown.diva');
        }, this.settings.ID);

        // this.bindTouchEvents();

        // Handle window resizing events
        window.addEventListener('resize', this.onResize.bind(this), false);

        diva.Events.subscribe('ViewerDidTerminate', function()
        {
            window.removeEventListener('resize', this.onResize, false);
        }, this.settings.ID);

        // Handle orientation change separately
        if ('onorientationchange' in window)
        {
            window.addEventListener('orientationchange', this.onResize, false);

            diva.Events.subscribe('ViewerDidTerminate', function()
            {
                window.removeEventListener('orientationchange', this.onResize, false);
            }, this.settings.ID);
        }

        diva.Events.subscribe('PanelSizeDidChange', this.updatePanelSize, this.settings.ID);

        // Clear page and resize timeouts when the viewer is destroyed
        diva.Events.subscribe('ViewerDidTerminate', () =>
        {
            if (this.viewerState.renderer)
                this.viewerState.renderer.destroy();

            clearTimeout(this.viewerState.resizeTimer);
        }, this.settings.ID);
    }

    initPlugins ()
    {
        if (!this.settings.hasOwnProperty('plugins'))
            return null;

        this.viewerState.pluginInstances = this.settings.plugins.map( (plugin) =>
        {
            const p = new plugin(this);

            if (p.isPageTool)
                this.viewerState.pageTools.push(p);

            return p;
        });
    }

    showThrobber ()
    {
        this.hideThrobber();

        this.viewerState.throbberTimeoutID = setTimeout( () =>
        {
            let thb = document.getElementById(this.settings.selector + 'throbber');
            if (thb) thb.style.display = 'block';
        }, this.settings.throbberTimeout);
    }

    hideThrobber ()
    {
        // Clear the timeout, if it hasn't executed yet
        clearTimeout(this.viewerState.throbberTimeoutID);

        let thb = document.getElementById(this.settings.selector + 'throbber');
        // Hide the throbber if it has already executed
        if (thb) thb.style.display = 'none';
    }

    showError (message)
    {
        const errorElement = elt('div', this.elemAttrs('error'), [
            elt('button', this.elemAttrs('error-close', {'aria-label': 'Close dialog'})),
            elt('p',
                elt('strong', 'Error')
            ),
            elt('div', message)
        ]);

        this.viewerState.outerObject.appendChild(errorElement);

        //bind dialog close button
        document.querySelector(this.settings.selector + 'error-close').addEventListener('click', () =>
        {
            errorElement.parentNode.removeChild(errorElement);
        });
    }

    setManifest (manifest, loadOptions)
    {
        this.viewerState.manifest = manifest;

        this.hideThrobber();

        // Convenience value
        this.viewerState.numPages = this.settings.manifest.pages.length;

        this.optionsValidator.validate(this.viewerState.options);

        this.publish('NumberOfPagesDidChange', this.settings.numPages);

        if (this.settings.enableAutoTitle)
        {
            let title = document.getElementById(this.settings.selector + 'title');

            if (title)
            {
                title.innerHTML(this.settings.manifest.itemTitle);
            }
            else
            {
                this.settings.parentObject.insertBefore(
                    elt('div', this.elemAttrs('title'), [this.settings.manifest.itemTitle]),
                    this.settings.parentObject.firstChild
                );
            }
        }

        // Calculate the horizontal and vertical inter-page padding based on the dimensions of the average zoom level
        if (this.settings.adaptivePadding > 0)
        {
            const z = Math.floor((this.settings.minZoomLevel + this.settings.maxZoomLevel) / 2);
            this.viewerState.horizontalPadding = parseInt(this.settings.manifest.getAverageWidth(z) * this.settings.adaptivePadding, 10);
            this.viewerState.verticalPadding = parseInt(this.settings.manifest.getAverageHeight(z) * this.settings.adaptivePadding, 10);
        }
        else
        {
            // It's less than or equal to 0; use fixedPadding instead
            this.viewerState.horizontalPadding = this.settings.fixedPadding;
            this.viewerState.verticalPadding = this.settings.fixedPadding;
        }

        // Make sure the vertical padding is at least 40, if plugin icons are enabled
        if (this.viewerState.pageTools.length)
        {
            this.viewerState.verticalPadding = Math.max(40, this.viewerState.verticalPadding);
        }

        // If we detect a viewingHint of 'paged' in the manifest or sequence, enable book view by default
        if (this.settings.manifest.paged)
        {
            this.viewerState.options.inBookLayout = true;
        }

        // Plugin setup hooks should be bound to the ObjectDidLoad event
        this.publish('ObjectDidLoad', this.settings);

        // Adjust the document panel dimensions
        this.updatePanelSize();

        let needsXCoord, needsYCoord;

        let anchoredVertically = false;
        let anchoredHorizontally = false;

        // NB: `==` here will check both null and undefined
        if (loadOptions.goDirectlyTo == null)
        {
            loadOptions.goDirectlyTo = this.settings.goDirectlyTo;
            needsXCoord = needsYCoord = true;
        }
        else
        {
            needsXCoord = loadOptions.horizontalOffset == null || isNaN(loadOptions.horizontalOffset);
            needsYCoord = loadOptions.verticalOffset == null || isNaN(loadOptions.verticalOffset);
        }

        // Set default values for the horizontal and vertical offsets
        if (needsXCoord)
        {
            // FIXME: What if inBookLayout/verticallyOriented is changed by loadOptions?
            if (loadOptions.goDirectlyTo === 0 && this.settings.inBookLayout && this.settings.verticallyOriented)
            {
                // if in book layout, center the first opening by default
                loadOptions.horizontalOffset = this.viewerState.horizontalPadding;
            }
            else
            {
                anchoredHorizontally = true;
                loadOptions.horizontalOffset = this.getXOffset(loadOptions.goDirectlyTo, "center");
            }
        }

        if (needsYCoord)
        {
            anchoredVertically = true;
            loadOptions.verticalOffset = this.getYOffset(loadOptions.goDirectlyTo, "top");
        }

        this.reloadViewer(loadOptions);

        //prep dimensions one last time now that pages have loaded
        this.updatePanelSize();

        // FIXME: This is a hack to ensure that the outerElement scrollbars are taken into account
        if (this.settings.verticallyOriented)
            this.viewerState.innerElement.style.minWidth = this.settings.panelWidth + 'px';
        else
            this.viewerState.innerElement.style.minHeight = this.settings.panelHeight + 'px';

        // FIXME: If the page was supposed to be positioned relative to the viewport we need to
        // recalculate it to take into account the scrollbars
        if (anchoredVertically || anchoredHorizontally)
        {
            if (anchoredVertically)
                this.viewerState.verticalOffset = this.getYOffset(this.settings.currentPageIndex, "top");

            if (anchoredHorizontally)
                this.viewerState.horizontalOffset = this.getXOffset(this.settings.currentPageIndex, "center");

            this.viewerState.renderer.goto(this.settings.currentPageIndex, this.viewerState.verticalOffset, this.viewerState.horizontalOffset);
        }

        // signal that everything should be set up and ready to go.
        this.viewerState.loaded = true;

        this.publish("ViewerDidLoad", this.settings);
    }

    publish (event)
    {
        const args = Array.prototype.slice.call(arguments, 1);
        diva.Events.publish(event, args, this.publicInstance);
    }

    getSettings ()
    {
        return this.settings;
    }

    // Temporary accessor for the state of the viewer core
    // TODO: Replace this with a more restricted view of whatever needs
    // be exposed through settings for backwards compat
    getInternalState ()
    {
        return this.viewerState;
    }

    getPublicInstance ()
    {
        return this.publicInstance;
    }

    getPageTools ()
    {
        return this.viewerState.pageTools;
    }

    getCurrentLayout ()
    {
        return this.viewerState.renderer ? this.viewerState.renderer.layout : null;
    }

    /** Get a copy of the current viewport dimensions */
    getViewport ()
    {
        const viewport = this.viewerState.viewport;

        return {
            top: viewport.top,
            left: viewport.left,
            bottom: viewport.bottom,
            right: viewport.right,

            width: viewport.width,
            height: viewport.height
        };
    }

    addPageOverlay (overlay)
    {
        this.viewerState.pageOverlays.addOverlay(overlay);
    }

    removePageOverlay (overlay)
    {
        this.viewerState.pageOverlays.removeOverlay(overlay);
    }

    getPageRegion (pageIndex, options)
    {
        const layout = this.viewerState.renderer.layout;
        const region = layout.getPageRegion(pageIndex, options);

        if (options && options.incorporateViewport)
        {
            const secondaryDim = this.settings.verticallyOriented ? 'width' : 'height';

            if (this.viewerState.viewport[secondaryDim] > layout.dimensions[secondaryDim])
            {
                const docOffset = (this.viewerState.viewport[secondaryDim] - layout.dimensions[secondaryDim]) / 2;

                if (this.settings.verticallyOriented)
                {
                    return {
                        top: region.top,
                        bottom: region.bottom,

                        left: region.left + docOffset,
                        right: region.right + docOffset
                    };
                }
                else
                {
                    return {
                        top: region.top + docOffset,
                        bottom: region.bottom + docOffset,

                        left: region.left,
                        right: region.right
                    };
                }
            }
        }

        return region;
    }

    getPagePositionAtViewportOffset (coords)
    {
        const docCoords = {
            left: coords.left + this.viewerState.viewport.left,
            top: coords.top + this.viewerState.viewport.top
        };

        const renderedPages = this.viewerState.renderer.getRenderedPages();
        const pageCount = renderedPages.length;

        // Find the page on which the coords occur
        for (let i=0; i < pageCount; i++)
        {
            const pageIndex = renderedPages[i];
            const region = this.viewerState.renderer.layout.getPageRegion(pageIndex);

            if (region.left <= docCoords.left && region.right >= docCoords.left &&
                region.top <= docCoords.top && region.bottom >= docCoords.top)
            {
                return {
                    anchorPage: pageIndex,
                    offset: {
                        left: docCoords.left - region.left,
                        top: docCoords.top - region.top
                    }
                };
            }
        }

        // Fall back to current page
        // FIXME: Would be better to use the closest page or something
        const currentRegion = this.viewerState.renderer.layout.getPageRegion(this.settings.currentPageIndex);

        return {
            anchorPage: this.settings.currentPageIndex,
            offset: {
                left: docCoords.left - currentRegion.left,
                top: docCoords.top - currentRegion.top
            }
        };
    }

    // setManifest (manifest, loadOptions)
    // {
    //     setManifest(manifest, loadOptions || {});
    // }

    /**
     * Set the current page to the given index, firing VisiblePageDidChange
     *
     * @param pageIndex
     */
    setCurrentPage (pageIndex)
    {
        if (this.viewerState.currentPageIndex !== pageIndex)
        {
            this.viewerState.currentPageIndex = pageIndex;
            this.publish("VisiblePageDidChange", pageIndex, this.getPageName(pageIndex));

            // Publish an event if the page we're switching to has other images.
            if (this.viewerState.manifest.pages[pageIndex].otherImages.length > 0)
                this.publish('VisiblePageHasAlternateViews', pageIndex);
        }
    }

    getPageName (pageIndex)
    {
        return this.viewerState.manifest.pages[pageIndex].f;
    }

    reload (newOptions)
    {
        this.reloadViewer(newOptions);
    }

    zoom (zoomLevel, focalPoint)
    {
        return this.handleZoom(zoomLevel, focalPoint);
    }

    enableScrollable ()
    {
        if (!this.viewerState.isScrollable)
        {
            this.bindMouseEvents();
            this.viewerState.options.enableKeyScroll = this.viewerState.initialKeyScroll;
            this.viewerState.options.enableSpaceScroll = this.viewerState.initialSpaceScroll;
            this.viewerState.viewportElement.style.overflow = 'auto';
            this.viewerState.isScrollable = true;
        }
    }

    disableScrollable ()
    {
        if (this.viewerState.isScrollable)
        {
            // block dragging/double-click zooming
            if (this.viewerState.innerObject.hasClass('diva-dragger'))
                this.viewerState.innerObject.mousedown = null;

            this.viewerState.outerObject.dblclick = null;
            this.viewerState.outerObject.contextmenu = null;

            // disable all other scrolling actions
            this.viewerState.viewportElement.style.overflow = 'hidden';

            // block scrolling keys behavior, respecting initial scroll settings
            this.viewerState.initialKeyScroll = this.settings.enableKeyScroll;
            this.viewerState.initialSpaceScroll = this.settings.enableSpaceScroll;
            this.viewerState.options.enableKeyScroll = false;
            this.viewerState.options.enableSpaceScroll = false;

            this.viewerState.isScrollable = false;
        }
    }

    // isValidOption (key, value)
    // {
    //     return isValidOption(key, value);
    // }

    // getXOffset (pageIndex, xAnchor)
    // {
    //     return getXOffset(pageIndex, xAnchor);
    // }

    // getYOffset (pageIndex, yAnchor)
    // {
    //     return getYOffset(pageIndex, yAnchor);
    // }

    // this.publish = publish;

    clear ()
    {
        this.clearViewer();
    }

    setPendingManifestRequest (pendingManifestRequest)
    {
        this.viewerState.pendingManifestRequest = pendingManifestRequest;
    }

    destroy ()
    {
        // Useful event to access elements in diva before they get destroyed. Used by the highlight plugin.
        this.publish('ViewerWillTerminate', this.settings);

        // Cancel any pending request retrieving a manifest
        if (this.settings.pendingManifestRequest)
            this.settings.pendingManifestRequest.abort();

        // Removes the hide-scrollbar class from the body
        document.body.removeClass('diva-hide-scrollbar');

        // Empty the parent container and remove any diva-related data
        this.settings.parentObject.parent().empty().removeData('diva');

        // Remove any additional styling on the parent element
        this.settings.parentObject.parent().removeAttr('style').removeAttr('class');

        this.publish('ViewerDidTerminate', this.settings);

        // Clear the Events cache
        diva.Events.unsubscribeAll(this.settings.ID);
    }
}
