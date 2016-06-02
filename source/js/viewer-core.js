var $ = require('jquery');

require('./utils/jquery-extensions');

var elt = require('./utils/elt');
var generateId = require('./utils/generate-id');
var getScrollbarWidth = require('./utils/get-scrollbar-width');
var Transition = require('./utils/transition');

var gestureEvents = require('./gesture-events');
var diva = require('./diva-global');
var DocumentHandler = require('./document-handler');
var GridHandler = require('./grid-handler');
var PluginRegistry = require('./plugin-registry');
var Renderer = require('./renderer');
var getPageLayouts = require('./page-layouts');
var createSettingsView = require('./settings-view');
var ValidationRunner = require('./validation-runner');
var Viewport = require('./viewport');

var debug = require('debug')('diva:ViewerCore');

module.exports = ViewerCore;

// Define validations
var optionsValidations = [
    {
        key: 'goDirectlyTo',
        validate: function (value, settings)
        {
            if (value < 0 || value >= settings.manifest.pages.length)
                return 0;
        }
    },
    {
        key: 'minPagesPerRow',
        validate: function (value)
        {
            return Math.max(2, value);
        }
    },
    {
        key: 'maxPagesPerRow',
        validate: function (value, settings)
        {
            return Math.max(value, settings.minPagesPerRow);
        }
    },
    {
        key: 'pagesPerRow',
        validate: function (value, settings)
        {
            // Default to the maximum
            if (value < settings.minPagesPerRow || value > settings.maxPagesPerRow)
                return settings.maxPagesPerRow;
        }
    },
    {
        key: 'maxZoomLevel',
        validate: function (value, settings, config)
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
        validate: function (value, settings, config)
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
        validate: function (value, settings, config)
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

function ViewerCore(element, options, publicInstance)
{
    var self = this;
    var parentObject = $(element);

    // Things that cannot be changed because of the way they are used by the script
    // Many of these are declared with arbitrary values that are changed later on
    var viewerState = {
        currentPageIndex: 0,        // The current page in the viewport (center-most page)
        hashParamSuffix: '',        // Used when there are multiple document viewers on a page
        horizontalOffset: 0,        // Distance from the center of the diva element to the top of the current page
        horizontalPadding: 0,       // Either the fixed padding or adaptive padding
        ID: null,                   // The prefix of the IDs of the elements (usually 1-diva-)
        initialKeyScroll: false,    // Holds the initial state of enableKeyScroll
        initialSpaceScroll: false,  // Holds the initial state of enableSpaceScroll
        innerElement: null,         // The native .diva-outer DOM object
        innerObject: {},            // $(settings.ID + 'inner'), for selecting the .diva-inner element
        isActiveDiva: true,         // In the case that multiple diva panes exist on the same page, this should have events funneled to it.
        isIIIF: false,              // Specifies whether objectData is in Diva native or IIIF Manifest format
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
        pageTools: '',              // The string for page tools
        parentObject: parentObject, // JQuery object referencing the parent element
        plugins: [],                // Filled with the enabled plugins from the registry
        previousZoomRatio: 1,             // Used to keep track of the previous zoom ratio for scale transforming diva-inner
        renderer: null,
        resizeTimer: -1,            // Holds the ID of the timeout used when resizing the window (for clearing)
        scaleWait: false,           // For preventing double-zoom on touch devices (iPad, etc)
        scrollbarWidth: 0,          // Set to the actual scrollbar width in init()
        selector: '',               // Uses the generated ID prefix to easily select elements
        throbberTimeoutID: -1,      // Holds the ID of the throbber loading timeout
        toolbar: null,              // Holds an object with some toolbar-related functions
        unclampedVerticalPadding: 0, // Used to keep track of initial padding size before enforcing the minimum size needed to accommodate plugin icons
        verticalOffset: 0,          // Distance from the center of the diva element to the left side of the current page
        verticalPadding: 0,         // Either the fixed padding or adaptive padding
        viewHandler: null,
        viewport: null,             // Object caching the viewport dimensions
        viewportElement: null,
        viewportObject: null
    };

    var settings = createSettingsView([options, viewerState]);

    // Aliases for compatibilty
    Object.defineProperties(settings, {
        // Height of the document viewer pane
        panelHeight: {
            get: function ()
            {
                return viewerState.viewport.height;
            }
        },
        // Width of the document viewer pane
        panelWidth: {
            get: function ()
            {
                return viewerState.viewport.width;
            }
        }
    });

    var optionsValidator = new ValidationRunner({
        additionalProperties: [
            {
                key: 'manifest',
                get: function ()
                {
                    return viewerState.manifest;
                }
            }
        ],

        validations: optionsValidations
    });

    var isValidOption = function (key, value)
    {
        return optionsValidator.isValid(key, value, viewerState.options);
    };

    var elemAttrs = function (ident, base)
    {
        var attrs = {
            id: settings.ID + ident,
            class: 'diva-' + ident
        };

        if (base)
            return $.extend(attrs, base);
        else
            return attrs;
    };

    var getPageData = function (pageIndex, attribute)
    {
        return settings.manifest.pages[pageIndex].d[settings.zoomLevel][attribute];
    };

    // Reset some settings and empty the viewport
    var clearViewer = function ()
    {
        viewerState.viewport.top = 0;

        // Clear all the timeouts to prevent undesired pages from loading
        clearTimeout(viewerState.resizeTimer);
    };

    /**
     * Update settings to match the specified options. Load the viewer,
     * fire appropriate events for changed options.
     */
    var reloadViewer = function (newOptions)
    {
        var queuedEvents = [];

        newOptions = optionsValidator.getValidatedOptions(settings, newOptions);

        // Set the zoom level if valid and fire a ZoomLevelDidChange event
        if (hasChangedOption(newOptions, 'zoomLevel'))
        {
            viewerState.oldZoomLevel = settings.zoomLevel;
            viewerState.options.zoomLevel = newOptions.zoomLevel;
            queuedEvents.push(["ZoomLevelDidChange", newOptions.zoomLevel]);
        }

        // Set the pages per row if valid and fire an event
        if (hasChangedOption(newOptions, 'pagesPerRow'))
        {
            viewerState.options.pagesPerRow = newOptions.pagesPerRow;
            queuedEvents.push(["GridRowNumberDidChange", newOptions.pagesPerRow]);
        }

        // Update verticallyOriented (no event fired)
        if (hasChangedOption(newOptions, 'verticallyOriented'))
            viewerState.options.verticallyOriented = newOptions.verticallyOriented;

        // Update page position (no event fired here)
        if ('goDirectlyTo' in newOptions)
        {
            viewerState.options.goDirectlyTo = newOptions.goDirectlyTo;

            if ('verticalOffset' in newOptions)
                viewerState.verticalOffset = newOptions.verticalOffset;

            if ('horizontalOffset' in newOptions)
                viewerState.horizontalOffset = newOptions.horizontalOffset;
        }
        else
        {
            // Otherwise the default is to remain on the current page
            viewerState.options.goDirectlyTo = settings.currentPageIndex;
        }

        if (hasChangedOption(newOptions, 'inGrid') || hasChangedOption(newOptions, 'inBookLayout'))
        {
            if ('inGrid' in newOptions)
                viewerState.options.inGrid = newOptions.inGrid;

            if ('inBookLayout' in newOptions)
                viewerState.options.inBookLayout = newOptions.inBookLayout;

            queuedEvents.push(["ViewDidSwitch", settings.inGrid]);
        }

        // Note: prepareModeChange() depends on inGrid and the vertical/horizontalOffset (for now)
        if (hasChangedOption(newOptions, 'inFullscreen'))
        {
            viewerState.options.inFullscreen = newOptions.inFullscreen;
            prepareModeChange(newOptions);
            queuedEvents.push(["ModeDidSwitch", settings.inFullscreen]);
        }

        clearViewer();

        // re-attach scroll event to outer div (necessary if we just zoomed)
        viewerState.viewportObject.off('scroll');
        viewerState.viewportObject.scroll(scrollFunction);

        updateViewHandlerAndRendering();

        var getImageSourcesForPage;

        if (settings.inGrid)
        {
            getImageSourcesForPage = function (page) {
                var url = settings.manifest.getPageImageURL(page.index, {
                    width: page.dimensions.width
                });

                return [{
                    url: url,
                    scaleRatio: 1,
                    dimensions: page.dimensions,
                    offset: {
                        top: 0,
                        left: 0
                    }
                }];
            };
        }
        else
        {
            getImageSourcesForPage = function (page)
            {
                return settings.manifest.getPageImageTiles(page.index, settings.zoomLevel, {
                    width: settings.tileWidth,
                    height: settings.tileHeight
                });
            };
        }

        if (viewerState.renderer)
            viewerState.renderer.load(getRendererState(), getImageSourcesForPage);

        // For the iPad - wait until this request finishes before accepting others
        if (viewerState.scaleWait)
            viewerState.scaleWait = false;

        queuedEvents.forEach(function (params)
        {
            publish.apply(null, params);
        });

        return true;
    };

    var hasChangedOption = function (options, key)
    {
        return key in options && options[key] !== settings[key];
    };

    // Handles switching in and out of fullscreen mode
    var prepareModeChange = function (options)
    {
        // Toggle the classes
        var changeClass = options.inFullscreen ? 'addClass' : 'removeClass';
        viewerState.outerObject[changeClass]('diva-fullscreen');
        $('body')[changeClass]('diva-hide-scrollbar');
        settings.parentObject[changeClass]('diva-full-width');

        // Adjust Diva's internal panel size, keeping the old values
        var storedHeight = settings.panelHeight;
        var storedWidth = settings.panelWidth;
        viewerState.viewport.invalidate();

        // If this isn't the original load, the offsets matter, and the position isn't being changed...
        if (!viewerState.loaded && !settings.inGrid && !('verticalOffset' in options))
        {
            //get the updated panel size
            var newHeight = settings.panelHeight;
            var newWidth = settings.panelWidth;

            //and re-center the new panel on the same point
            viewerState.verticalOffset += ((storedHeight - newHeight) / 2);
            viewerState.horizontalOffset += ((storedWidth - newWidth) / 2);
        }

        //turn on/off escape key listener
        if (options.inFullscreen)
            $(document).on('keyup', escapeListener);
        else
            $(document).off('keyup', escapeListener);
    };

    // Update the view handler and the view rendering for the current view
    var updateViewHandlerAndRendering = function ()
    {
        var Handler = settings.inGrid ? GridHandler : DocumentHandler;

        if (viewerState.viewHandler && !(viewerState.viewHandler instanceof Handler))
        {
            // TODO: May need to destroy handler in future
            viewerState.viewHandler = null;
        }

        if (!viewerState.viewHandler)
            viewerState.viewHandler = new Handler(self);

        if (!viewerState.renderer)
            initializeRenderer();
    };

    var initializeRenderer = function ()
    {
        var compatErrors = Renderer.getCompatibilityErrors();

        if (compatErrors)
        {
            showError(compatErrors);
        }
        else
        {
            var options = {
                viewport: viewerState.viewport,
                outerElement: viewerState.outerElement,
                innerElement: viewerState.innerElement
            };

            var hooks = {
                onViewWillLoad: function ()
                {
                    viewerState.viewHandler.onViewWillLoad();
                },
                onViewDidLoad: function ()
                {
                    viewerState.viewHandler.onViewDidLoad();
                },
                onViewDidUpdate: function (pages, targetPage)
                {
                    viewerState.viewHandler.onViewDidUpdate(pages, targetPage);
                }
            };

            viewerState.renderer = new Renderer(options, hooks);
        }
    };

    // TODO: The usage of padding variables is still really
    // messy and inconsistent
    var getRendererState = function ()
    {
        var pageLayouts = getPageLayouts(settings);
        var padding = getPadding();

        return {
            pageLayouts: pageLayouts,
            padding: padding,
            zoomLevel: settings.zoomLevel,
            verticallyOriented: settings.verticallyOriented || settings.inGrid,
            position: {
                anchorPage: settings.goDirectlyTo,
                verticalOffset: viewerState.verticalOffset,
                horizontalOffset: viewerState.horizontalOffset
            }
        };
    };

    var getPadding = function ()
    {
        var topPadding, leftPadding;
        var docVPadding, docHPadding;

        if (settings.inGrid)
        {
            docVPadding = settings.fixedPadding;
            topPadding = leftPadding = docHPadding = 0;
        }
        else
        {
            topPadding = settings.verticallyOriented ? viewerState.verticalPadding : 0;
            leftPadding = settings.verticallyOriented ? 0 : viewerState.horizontalPadding;

            docVPadding = settings.verticallyOriented ? 0 : viewerState.verticalPadding;
            docHPadding = settings.verticallyOriented ? viewerState.horizontalPadding : 0;
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
    };

    //Shortcut for closing fullscreen with the escape key
    var escapeListener = function (e)
    {
        if (e.keyCode == 27)
        {
            reloadViewer({
                inFullscreen: !settings.inFullscreen
            });
        }
    };

    // Called to handle any zoom level
    var handleZoom = function (newZoomLevel, focalPoint)
    {
        var originX;
        var originY;

        // If the zoom level provided is invalid, return false
        if (!isValidOption('zoomLevel', newZoomLevel))
            return false;

        if (!Transition.supported)
        {
            return reloadViewer({
                zoomLevel: newZoomLevel
            });
        }

        // If no focal point was given, zoom on the center of the viewport
        if (focalPoint == null)
        {
            var viewport = viewerState.viewport;
            var currentRegion = viewerState.renderer.getPageRegion(settings.currentPageIndex);

            focalPoint = {
                anchorPage: settings.currentPageIndex,
                offset: {
                    left: (viewport.width / 2) - (currentRegion.left - viewport.left),
                    top: (viewport.height / 2) - (currentRegion.top - viewport.top)
                }
            };
        }

        var zoomRatio = Math.pow(2, newZoomLevel - settings.zoomLevel);

        // Scale padding with zoom
        viewerState.unclampedVerticalPadding *= zoomRatio;
        viewerState.horizontalPadding *= zoomRatio;

        // Make sure the vertical padding is at least 40, if plugin icons are enabled
        viewerState.verticalPadding = (viewerState.pageTools.length) ? Math.max(viewerState.unclampedVerticalPadding, 40) : viewerState.unclampedVerticalPadding;

        viewerState.options.goDirectlyTo = focalPoint.anchorPage;

        var pageRegion = viewerState.renderer.getPageRegion(focalPoint.anchorPage);

        // calculate distance from cursor coordinates to center of viewport
        var focalXToCenter = (settings.viewport.left + (settings.viewport.width / 2)) -
            (pageRegion.left + focalPoint.offset.left);
        var focalYToCenter = (settings.viewport.top + (settings.viewport.height / 2)) -
            (pageRegion.top + focalPoint.offset.top);

        // calculate horizontal/verticalOffset: distance from viewport center to page upper left corner
        viewerState.horizontalOffset = (focalPoint.offset.left * zoomRatio) - focalXToCenter;
        viewerState.verticalOffset = (focalPoint.offset.top * zoomRatio) - focalYToCenter;

        // Set up the origin for the transform
        originX = pageRegion.left + focalPoint.offset.left;
        originY = pageRegion.top + focalPoint.offset.top;
        viewerState.innerElement.style.transformOrigin = originX + 'px ' + originY + 'px';

        // Update the zoom level
        viewerState.oldZoomLevel = settings.zoomLevel;
        viewerState.options.zoomLevel = newZoomLevel;

        // If first zoom, set transition parameters TODO css class
        if (!viewerState.isZooming)
        {
            initiateZoomAnimation();
        }

        // If still zooming, zoomRatio needs to be multiplied by the previous zoomRatio and is reset on transitionend
        zoomRatio *= viewerState.previousZoomRatio;
        viewerState.previousZoomRatio = zoomRatio;

        // Transition to new zoom level
        viewerState.innerElement.style.transform = 'scale(' + zoomRatio + ')';

        // Set flag to indicate zooming is in progress until loadDocument is called by transitionend
        viewerState.isZooming = true;

        // Starts preloading pages for the new zoom level
        viewerState.renderer.preload();

        // Update the slider
        publish("ZoomLevelDidChange", newZoomLevel);

        // While zooming, don't update scroll offsets based on the scaled version of diva-inner
        viewerState.viewportObject.off('scroll');

        return true;
    };

    var initiateZoomAnimation = function ()
    {
        var fallbackMs = 300;

        var endCallback = function ()
        {
            viewerState.isZooming = false;

            viewerState.previousZoomRatio = 1;

            // Now render with the previously set zoomLevel
            reloadViewer({});

            viewerState.innerElement.removeEventListener(Transition.endEvent, endCallback, false);
            clearTimeout(fallbackTimeoutId);
        };

        // Ensure the callback is run even if the end event doesn't fire
        viewerState.innerElement.addEventListener(Transition.endEvent, endCallback, false);
        var fallbackTimeoutId = setTimeout(endCallback, fallbackMs);

        viewerState.innerElement.style[Transition.property] = 'transform .3s cubic-bezier(0.000, 0.990, 1.000, 0.995)';
    };

    /*
     Gets the Y-offset for a specific point on a specific page
     Acceptable values for "anchor":
     "top" (default) - will anchor top of the page to the top of the diva-outer element
     "bottom" - top, s/top/bottom
     "center" - will center the page on the diva element
     Returned value will be the distance from the center of the diva-outer element to the top of the current page for the specified anchor
     */
    var getYOffset = function (pageIndex, anchor)
    {
        pageIndex = (typeof(pageIndex) === "undefined" ? settings.currentPageIndex : pageIndex);

        if (anchor === "center" || anchor === "centre") //how you can tell an American coded this
        {
            return parseInt(getPageData(pageIndex, "h") / 2, 10);
        }
        else if (anchor === "bottom")
        {
            return parseInt(getPageData(pageIndex, "h") - settings.panelHeight / 2, 10);
        }
        else
        {
            return parseInt(settings.panelHeight / 2, 10);
        }
    };

    //Same as getYOffset with "left" and "right" as acceptable values instead of "top" and "bottom"
    var getXOffset = function (pageIndex, anchor)
    {
        pageIndex = (typeof(pageIndex) === "undefined" ? settings.currentPageIndex : pageIndex);

        if (anchor === "left")
        {
            return parseInt(settings.panelWidth / 2, 10);
        }
        else if (anchor === "right")
        {
            return parseInt(getPageData(pageIndex, "w") - settings.panelWidth / 2, 10);
        }
        else
        {
            return parseInt(getPageData(pageIndex, "w") / 2, 10);
        }
    };

    // updates panelHeight/panelWidth on resize
    var updatePanelSize = function ()
    {
        viewerState.viewport.invalidate();

        // FIXME(wabain): This should really only be called after initial load
        if (viewerState.renderer)
        {
            updateOffsets();
            viewerState.renderer.goto(settings.currentPageIndex, viewerState.verticalOffset, viewerState.horizontalOffset);
        }

        return true;
    };

    var updateOffsets = function ()
    {
        var pageOffset = viewerState.renderer.getPageToViewportCenterOffset(settings.currentPageIndex);

        if (pageOffset)
        {
            viewerState.horizontalOffset = pageOffset.x;
            viewerState.verticalOffset = pageOffset.y;
        }
    };

    // Bind mouse events (drag to scroll, double-click)
    var bindMouseEvents = function()
    {
        // Set drag scroll on first descendant of class dragger on both selected elements
        viewerState.viewportObject.dragscrollable({dragSelector: '.diva-dragger', acceptPropagatedEvent: true});
        viewerState.innerObject.dragscrollable({dragSelector: '.diva-dragger', acceptPropagatedEvent: true});

        gestureEvents.onDoubleClick(viewerState.viewportObject, function (event, coords)
        {
            debug('Double click at %s, %s', coords.left, coords.top);
            viewerState.viewHandler.onDoubleClick(event, coords);
        });
    };

    var onResize = function()
    {
        updatePanelSize();
        // Cancel any previously-set resize timeouts
        clearTimeout(viewerState.resizeTimer);

        viewerState.resizeTimer = setTimeout(function ()
        {
            var pageOffset = viewerState.renderer.getPageToViewportCenterOffset(settings.currentPageIndex);

            if (pageOffset)
            {
                reloadViewer({
                    goDirectlyTo: settings.currentPageIndex,
                    verticalOffset: pageOffset.y,
                    horizontalOffset: pageOffset.x
                });
            }
            else
            {
                reloadViewer({
                    goDirectlyTo: settings.currentPageIndex
                });
            }
        }, 200);
    };

    // Bind touch and orientation change events
    var bindTouchEvents = function()
    {
        // Block the user from moving the window only if it's not integrated
        if (settings.blockMobileMove)
        {
            $('body').bind('touchmove', function (event)
            {
                var e = event.originalEvent;
                e.preventDefault();

                return false;
            });
        }

        // Touch events for swiping in the viewport to scroll pages
        viewerState.viewportObject.kinetic({
            triggerHardware: true
        });

        gestureEvents.onPinch(viewerState.viewportObject, function (event, coords, zoomDelta)
        {
            debug('Pinch %s at %s, %s', zoomDelta, coords.left, coords.top);
            viewerState.viewHandler.onPinch(event, coords, zoomDelta);
        });

        gestureEvents.onDoubleTap(viewerState.viewportObject, function (event, coords)
        {
            debug('Double tap at %s, %s', coords.left, coords.top);
            viewerState.viewHandler.onDoubleClick(event, coords);
        });
    };

    // Handle the scroll
    var scrollFunction = function ()
    {
        var previousTopScroll = viewerState.viewport.top;
        var previousLeftScroll = viewerState.viewport.left;

        var direction;

        viewerState.viewport.invalidate();

        var newScrollTop = viewerState.viewport.top;
        var newScrollLeft = viewerState.viewport.left;

        if (settings.verticallyOriented || settings.inGrid)
            direction = newScrollTop - previousTopScroll;
        else
            direction = newScrollLeft - previousLeftScroll;

        //give adjust the direction we care about
        viewerState.renderer.adjust(direction);

        var primaryScroll = (settings.verticallyOriented || settings.inGrid) ? newScrollTop : newScrollLeft;

        publish("ViewerDidScroll", primaryScroll);

        if (direction > 0)
        {
            publish("ViewerDidScrollDown", primaryScroll);
        }
        else if (direction < 0)
        {
            publish("ViewerDidScrollUp", primaryScroll);
        }

        updateOffsets();
    };

    // Binds most of the event handlers (some more in createToolbar)
    var handleEvents = function ()
    {
        // Change the cursor for dragging
        viewerState.innerObject.mousedown(function ()
        {
            $(this).addClass('diva-grabbing');
        });

        viewerState.innerObject.mouseup(function ()
        {
            $(this).removeClass('diva-grabbing');
        });

        bindMouseEvents();

        viewerState.viewportObject.scroll(scrollFunction);

        var upArrowKey = 38,
            downArrowKey = 40,
            leftArrowKey = 37,
            rightArrowKey = 39,
            spaceKey = 32,
            pageUpKey = 33,
            pageDownKey = 34,
            homeKey = 36,
            endKey = 35;

        // Catch the key presses in document
        $(document).on('keydown.diva', function (event)
        {
            if (!viewerState.isActiveDiva)
                return true;

            // Space or page down - go to the next page
            if ((settings.enableSpaceScroll && !event.shiftKey && event.keyCode === spaceKey) || (settings.enableKeyScroll && event.keyCode === pageDownKey))
            {
                viewerState.viewport.top += settings.panelHeight;
                return false;
            }
            else if (!settings.enableSpaceScroll && event.keyCode === spaceKey)
            {
                event.preventDefault();
            }

            if (settings.enableKeyScroll)
            {
                // Don't steal keyboard shortcuts (metaKey = command [OS X], super [Win/Linux])
                if (event.shiftKey || event.ctrlKey || event.metaKey)
                    return true;

                switch (event.keyCode)
                {
                    case pageUpKey:
                        // Page up - go to the previous page
                        viewerState.viewport.top -= settings.panelHeight;
                        return false;

                    case upArrowKey:
                        // Up arrow - scroll up
                        viewerState.viewport.top -= settings.arrowScrollAmount;
                        return false;

                    case downArrowKey:
                        // Down arrow - scroll down
                        viewerState.viewport.top += settings.arrowScrollAmount;
                        return false;

                    case leftArrowKey:
                        // Left arrow - scroll left
                        viewerState.viewport.left -= settings.arrowScrollAmount;
                        return false;

                    case rightArrowKey:
                        // Right arrow - scroll right
                        viewerState.viewport.left += settings.arrowScrollAmount;
                        return false;

                    case homeKey:
                        // Home key - go to the beginning of the document
                        viewerState.viewport.top = 0;
                        return false;

                    case endKey:
                        // FIXME(wabain): What should this do in horizontal orientation?
                        // End key - go to the end of the document

                        // FIXME(wabain): Hack to get innerElement dimensions
                        var innerStyle = getComputedStyle(viewerState.innerElement);
                        viewerState.viewport.top = Math.max(0, parseFloat(innerStyle.height) - settings.panelHeight);

                        return false;

                    default:
                        return true;
                }
            }
            return true;
        });

        diva.Events.subscribe('ViewerDidTerminate', function()
        {
            $(document).off('keydown.diva');
        }, settings.ID);

        bindTouchEvents();

        // Handle window resizing events
        window.addEventListener('resize', onResize, false);

        diva.Events.subscribe('ViewerDidTerminate', function()
        {
            window.removeEventListener('resize', onResize, false);
        }, settings.ID);

        // Handle orientation change separately
        if ('onorientationchange' in window)
        {
            window.addEventListener('orientationchange', onResize, false);

            diva.Events.subscribe('ViewerDidTerminate', function()
            {
                window.removeEventListener('orientationchange', onResize, false);
            }, settings.ID);
        }

        diva.Events.subscribe('PanelSizeDidChange', updatePanelSize, settings.ID);

        // Clear page and resize timeouts when the viewer is destroyed
        diva.Events.subscribe('ViewerDidTerminate', function ()
        {
            if (viewerState.renderer)
                viewerState.renderer.destroy();

            clearTimeout(viewerState.resizeTimer);
        }, settings.ID);
    };

    var initPlugins = function ()
    {
        var pageTools = [];

        // Add all the plugins that have not been explicitly disabled to
        // settings.plugins
        PluginRegistry.getAll().forEach(function (plugin)
        {
            var pluginProperName = plugin.pluginName[0].toUpperCase() + plugin.pluginName.substring(1);

            if (settings['enable' + pluginProperName])
            {
                // Call the init function and check return value
                var enablePlugin = plugin.init(settings, publicInstance);

                // If int returns false, consider the plugin disabled
                if (!enablePlugin)
                    return;

                // If the title text is undefined, use the name of the plugin
                var titleText = plugin.titleText || pluginProperName + " plugin";

                // Create the pageTools bar if handleClick is set to a function
                if (typeof plugin.handleClick === 'function')
                {
                    pageTools.push('<div class="diva-' + plugin.pluginName + '-icon" title="' + titleText + '"></div>');

                    // Delegate the click event - pass it the settings
                    var pluginButtonElement = '.diva-' + plugin.pluginName + '-icon';

                    viewerState.outerObject.on('click', pluginButtonElement, function (event)
                    {
                        plugin.handleClick.call(this, event, settings, publicInstance);
                    });

                    viewerState.outerObject.on('touchend', pluginButtonElement, function (event)
                    {
                        // Prevent firing of emulated mouse events
                        event.preventDefault();

                        plugin.handleClick.call(this, event, settings, publicInstance);
                    });
                }

                // Add it to settings.plugins so it can be used later
                settings.plugins.push(plugin);
            }
        });

        // Save the page tools bar so it can be added for each page
        if (pageTools.length)
            viewerState.pageTools = '<div class="diva-page-tools">' + pageTools.join('') + '</div>';
    };

    var showThrobber = function ()
    {
        hideThrobber();

        viewerState.throbberTimeoutID = setTimeout(function ()
        {
            $(settings.selector + 'throbber').show();
        }, settings.throbberTimeout);
    };

    var hideThrobber = function ()
    {
        // Clear the timeout, if it hasn't executed yet
        clearTimeout(viewerState.throbberTimeoutID);

        // Hide the throbber if it has already executed
        $(settings.selector + 'throbber').hide();
    };

    var showError = function(message)
    {
        var errorElement = elt('div', elemAttrs('error'), [
            elt('button', elemAttrs('error-close', {'aria-label': 'Close dialog'})),
            elt('p',
                elt('strong', 'Error')
            ),
            elt('div', message)
        ]);

        viewerState.outerObject.append(errorElement);

        //bind dialog close button
        $(settings.selector + 'error-close').on('click', function()
        {
            errorElement.parentNode.removeChild(errorElement);
        });
    };

    var setManifest = function (manifest, isIIIF, loadOptions)
    {
        viewerState.manifest = manifest;

        // FIXME: is isIIIF even needed?
        viewerState.isIIIF = isIIIF;

        hideThrobber();

        // Convenience value
        viewerState.numPages = settings.manifest.pages.length;

        optionsValidator.validate(viewerState.options);

        publish('NumberOfPagesDidChange', settings.numPages);

        if (settings.enableAutoTitle)
        {
            if ($(settings.selector + 'title').length)
                $(settings.selector + 'title').html(settings.manifest.itemTitle);
            else
                settings.parentObject.prepend(elt('div', elemAttrs('title'), [settings.manifest.itemTitle]));
        }

        // Calculate the horizontal and vertical inter-page padding based on the dimensions of the average zoom level
        if (settings.adaptivePadding > 0)
        {
            var z = Math.floor((settings.minZoomLevel + settings.maxZoomLevel) / 2);
            viewerState.horizontalPadding = parseInt(settings.manifest.getAverageWidth(z) * settings.adaptivePadding, 10);
            viewerState.verticalPadding = parseInt(settings.manifest.getAverageHeight(z) * settings.adaptivePadding, 10);
        }
        else
        {
            // It's less than or equal to 0; use fixedPadding instead
            viewerState.horizontalPadding = settings.fixedPadding;
            viewerState.verticalPadding = settings.fixedPadding;
        }

        viewerState.unclampedVerticalPadding = viewerState.verticalPadding;

        // Make sure the vertical padding is at least 40, if plugin icons are enabled
        if (viewerState.pageTools.length)
        {
            viewerState.verticalPadding = Math.max(40, viewerState.verticalPadding);
        }

        // If we detect a viewingHint of 'paged' in the manifest or sequence, enable book view by default
        if (settings.manifest.paged)
        {
            viewerState.options.inBookLayout = true;
        }

        // Plugin setup hooks should be bound to the ObjectDidLoad event
        publish('ObjectDidLoad', settings);

        // Adjust the document panel dimensions
        updatePanelSize();

        var needsXCoord, needsYCoord;

        var anchoredVertically = false;
        var anchoredHorizontally = false;

        if (loadOptions.goDirectlyTo == null)
        {
            loadOptions.goDirectlyTo = settings.goDirectlyTo;
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
            if (loadOptions.goDirectlyTo === 0 && settings.inBookLayout && settings.verticallyOriented)
            {
                // if in book layout, center the first opening by default
                loadOptions.horizontalOffset = viewerState.horizontalPadding;
            }
            else
            {
                anchoredHorizontally = true;
                loadOptions.horizontalOffset = getXOffset(loadOptions.goDirectlyTo, "center");
            }
        }

        if (needsYCoord)
        {
            anchoredVertically = true;
            loadOptions.verticalOffset = getYOffset(loadOptions.goDirectlyTo, "top");
        }

        reloadViewer(loadOptions);

        //prep dimensions one last time now that pages have loaded
        updatePanelSize();

        // FIXME: This is a hack to ensure that the outerElement scrollbars are taken into account
        if (settings.verticallyOriented)
            viewerState.innerElement.style.minWidth = settings.panelWidth + 'px';
        else
            viewerState.innerElement.style.minHeight = settings.panelHeight + 'px';

        // FIXME: If the page was supposed to be positioned relative to the viewport we need to
        // recalculate it to take into account the scrollbars
        if (anchoredVertically || anchoredHorizontally)
        {
            if (anchoredVertically)
                viewerState.verticalOffset = getYOffset(settings.currentPageIndex, "top");

            if (anchoredHorizontally)
                viewerState.horizontalOffset = getXOffset(settings.currentPageIndex, "center");

            viewerState.renderer.goto(settings.currentPageIndex, viewerState.verticalOffset, viewerState.horizontalOffset);
        }

        // signal that everything should be set up and ready to go.
        viewerState.loaded = true;

        publish("ViewerDidLoad", settings);
    };

    var publish = function (event)
    {
        var args = Array.prototype.slice.call(arguments, 1);
        diva.Events.publish(event, args, publicInstance);
    };

    var init = function ()
    {
        // First figure out the width of the scrollbar in this browser
        // TODO(wabain): Cache this somewhere else
        // Only some of the plugins rely on this now
        viewerState.scrollbarWidth = getScrollbarWidth();

        // If window.orientation is defined, then it's probably mobileWebkit
        viewerState.mobileWebkit = window.orientation !== undefined;

        // Generate an ID that can be used as a prefix for all the other IDs
        viewerState.ID = generateId('diva-');
        viewerState.selector = '#' + settings.ID;

        // Figure out the hashParamSuffix from the ID
        var divaNumber = parseInt(settings.ID, 10);

        if (divaNumber > 1)
        {
            // If this is document viewer #1, don't use a suffix; otherwise, use the document viewer number
            viewerState.hashParamSuffix = divaNumber;
        }

        // Create the inner and outer panels
        var innerElem = elt('div', elemAttrs('inner', { class: 'diva-inner diva-dragger' }));
        var viewportElem = elt('div', elemAttrs('viewport'), innerElem);
        var outerElem = elt('div', elemAttrs('outer'),
            viewportElem,
            elt('div', elemAttrs('throbber')));

        viewerState.innerElement = innerElem;
        viewerState.viewportElement = viewportElem;
        viewerState.outerElement = outerElem;

        viewerState.innerObject = $(innerElem);
        viewerState.viewportObject = $(viewportElem);
        viewerState.outerObject = $(outerElem);

        settings.parentObject.append(outerElem);

        viewerState.viewport = new Viewport(viewerState.viewportElement, {
            intersectionTolerance: settings.viewportMargin
        });

        // Do all the plugin initialisation
        initPlugins();

        handleEvents();

        // Show the throbber while waiting for the manifest to load
        showThrobber();
    };

    this.getSettings = function ()
    {
        return settings;
    };

    // Temporary accessor for the state of the viewer core
    // TODO: Replace this with a more restricted view of whatever needs
    // be exposed through settings for backwards compat
    this.getInternalState = function ()
    {
        return viewerState;
    };

    this.getPagePositionAtViewportOffset = function (coords)
    {
        var docCoords = {
            left: coords.left + viewerState.viewport.left,
            top: coords.top + viewerState.viewport.top
        };

        var renderedPages = viewerState.renderer.getRenderedPages();
        var pageCount = renderedPages.length;

        // Find the page on which the coords occur
        for (var i=0; i < pageCount; i++)
        {
            var pageIndex = renderedPages[i];
            var region = viewerState.renderer.getPageRegion(pageIndex);

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
        var currentRegion = viewerState.renderer.getPageRegion(settings.currentPageIndex);

        return {
            anchorPage: settings.currentPageIndex,
            offset: {
                left: docCoords.left - currentRegion.left,
                top: docCoords.top - currentRegion.top
            }
        };
    };

    this.setManifest = function (manifest, isIIIF, loadOptions)
    {
        setManifest(manifest, isIIIF, loadOptions || {});
    };

    this.reload = function (newOptions)
    {
        reloadViewer(newOptions);
    };

    this.zoom = function (zoomLevel, focalPoint)
    {
        return handleZoom(zoomLevel, focalPoint);
    };

    this.enableScrollable = function ()
    {
        if (!viewerState.isScrollable)
        {
            bindMouseEvents();
            viewerState.options.enableKeyScroll = viewerState.initialKeyScroll;
            viewerState.options.enableSpaceScroll = viewerState.initialSpaceScroll;
            viewerState.viewportElement.style.overflow = 'auto';
            viewerState.isScrollable = true;
        }
    };

    this.disableScrollable = function ()
    {
        if (viewerState.isScrollable)
        {
            // block dragging/double-click zooming
            if (viewerState.innerObject.hasClass('diva-dragger'))
                viewerState.innerObject.unbind('mousedown');
            viewerState.outerObject.unbind('dblclick');
            viewerState.outerObject.unbind('contextmenu');

            // disable all other scrolling actions
            viewerState.viewportElement.style.overflow = 'hidden';

            // block scrolling keys behavior, respecting initial scroll settings
            viewerState.initialKeyScroll = settings.enableKeyScroll;
            viewerState.initialSpaceScroll = settings.enableSpaceScroll;
            viewerState.options.enableKeyScroll = false;
            viewerState.options.enableSpaceScroll = false;

            viewerState.isScrollable = false;
        }
    };

    this.isValidOption = function (key, value)
    {
        return isValidOption(key, value);
    };

    this.showError = function (message)
    {
        // FIXME: Not totally sure it makes sense to always do that here
        hideThrobber();

        var errorElement = elt('div', elemAttrs('error'), [
            elt('button', elemAttrs('error-close', {'aria-label': 'Close dialog'})),
            elt('p',
                elt('strong', 'Error')
            ),
            elt('div', message)
        ]);

        viewerState.outerObject.append(errorElement);

        //bind dialog close button
        $(settings.selector + 'error-close').on('click', function()
        {
            errorElement.parentNode.removeChild(errorElement);
        });
    };

    this.getXOffset = function (pageIndex, xAnchor)
    {
        return getXOffset(pageIndex, xAnchor);
    };

    this.getYOffset = function (pageIndex, yAnchor)
    {
        return getYOffset(pageIndex, yAnchor);
    };

    this.publish = publish;

    this.clear = function ()
    {
        clearViewer();
    };

    // Destroys this instance, tells plugins to do the same (for testing)
    this.destroy = function ()
    {

        // Removes the hide-scrollbar class from the body
        $('body').removeClass('diva-hide-scrollbar');

        // Empty the parent container and remove any diva-related data
        settings.parentObject.empty().removeData('diva');

        publish('ViewerDidTerminate', [settings]);

        // Remove any additional styling on the parent element
        settings.parentObject.removeAttr('style').removeAttr('class');

        // Clear the Events cache
        diva.Events.unsubscribeAll(settings.ID);
    };

    // Call the init function when this object is created.
    init();
}
