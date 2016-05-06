/*
Copyright (C) 2011-2016 by Wendy Liu, Evan Magoni, Andrew Hankinson, Andrew Horwitz, Laurent Pugin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var jQuery = require('jquery');

require('./utils/jquery-extensions');

var elt = require('./utils/elt');
var generateId = require('./utils/generate-id');
var getScrollbarWidth = require('./utils/get-scrollbar-width');
var HashParams = require('./utils/hash-params');
var Transition = require('./utils/transition');

var ActiveDivaController = require('./active-diva-controller');
var diva = require('./diva-global');
var GridRendering = require('./grid-rendering');
var SequenceRendering = require('./sequence-rendering');
var ImageManifest = require('./image-manifest');
var createToolbar = require('./toolbar');
var ValidationRunner = require('./validation-runner');
var Viewport = require('./viewport');

// Start the active Diva tracker
// FIXME(wabain): Could defer this, if the logic isn't just getting removed
var activeDiva = new ActiveDivaController(); // jshint ignore: line

module.exports = diva;

// Expose the Diva variable globally (needed for plugins, possibly even in CommonJS environments)
window.diva = diva;
window.divaPlugins = [];

// Define validations

var DivaSettingsValidator = new ValidationRunner({
    whitelistedKeys: ['manifest'],

    validations: [
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
    ]
});

// this pattern was taken from http://www.virgentech.com/blog/2009/10/building-object-oriented-jquery-plugin.html
(function ($)
{
    var Diva = function (element, options)
    {
        var parentObject = $(element);

        // These are elements that can be overridden upon instantiation
        // See https://github.com/DDMAL/diva.js/wiki/Settings for more details
        var settings = {
            adaptivePadding: 0.05,      // The ratio of padding to the page dimension
            arrowScrollAmount: 40,      // The amount (in pixels) to scroll by when using arrow keys
            blockMobileMove: false,     // Prevent moving or scrolling the page on mobile devices
            objectData: '',             // A IIIF Manifest or a JSON file generated by process.py that provides the object dimension data, or a URL pointing to such data - *REQUIRED*
            enableAutoTitle: true,      // Shows the title within a div of id diva-title
            enableFilename: true,       // Uses filenames and not page numbers for links (i=bm_001.tif, not p=1)
            enableFullscreen: true,     // Enable or disable fullscreen icon (mode still available)
            enableGotoPage: true,       // A "go to page" jump box
            enableGridIcon: true,       // A grid view of all the pages
            enableGridControls: 'buttons',  // Specify control of pages per grid row in Grid view. Possible values: 'buttons' (+/-), 'slider'. Any other value disables the controls.
            enableImageTitles: true,    // Adds "Page {n}" title to page images if true
            enableKeyScroll: true,      // Captures scrolling using the arrow and page up/down keys regardless of page focus. When off, defers to default browser scrolling behavior.
            enableLinkIcon: true,       // Controls the visibility of the link icon
            enableSpaceScroll: false,   // Scrolling down by pressing the space key
            enableToolbar: true,        // Enables the toolbar. Note that disabling this means you have to handle all controls yourself.
            enableZoomControls: 'buttons', // Specify controls for zooming in and out. Possible values: 'buttons' (+/-), 'slider'. Any other value disables the controls.
            fixedPadding: 10,           // Fallback if adaptive padding is set to 0
            fixedHeightGrid: true,      // So each page in grid view has the same height (only widths differ)
            goDirectlyTo: 0,            // Default initial page to show (0-indexed)
            iipServerURL: '',           // The URL to the IIPImage installation, including the `?FIF=` - *REQUIRED*, unless using IIIF
            inFullscreen: false,        // Set to true to load fullscreen mode initially
            inBookLayout: false,       // Set to true to view the document with facing pages in document mode
            inGrid: false,              // Set to true to load grid view initially
            imageDir: '',               // Image directory, either absolute path or relative to IIP's FILESYSTEM_PREFIX - *REQUIRED*, unless using IIIF
            maxPagesPerRow: 8,          // Maximum number of pages per row in grid view
            maxZoomLevel: -1,           // Optional; defaults to the max zoom returned in the JSON response
            minPagesPerRow: 2,          // Minimum pages per row in grid view. Recommended default.
            minZoomLevel: 0,            // Defaults to 0 (the minimum zoom)
            pageLoadTimeout: 200,       // Number of milliseconds to wait before loading pages
            pagesPerRow: 5,             // The default number of pages per row in grid view
            rowLoadTimeout: 50,         // Number of milliseconds to wait before loading a row
            throbberTimeout: 100,       // Number of milliseconds to wait before showing throbber
            tileHeight: 256,            // The height of each tile, in pixels; usually 256
            tileWidth: 256,             // The width of each tile, in pixels; usually 256
            toolbarParentObject: parentObject, // The toolbar parent object.
            verticallyOriented: true,   // Determines vertical vs. horizontal orientation
            viewportMargin: 200,        // Pretend tiles +/- 200px away from viewport are in
            zoomLevel: 2                // The initial zoom level (used to store the current zoom level)
        };

        // Override the defaults with passed-in options
        $.extend(settings, options);

        // Things that cannot be changed because of the way they are used by the script
        // Many of these are declared with arbitrary values that are changed later on
        $.extend(settings, {
            currentPageIndex: 0,        // The current page in the viewport (center-most page)
            unclampedVerticalPadding: 0, // Used to keep track of initial padding size before enforcing the minimum size needed to accommodate plugin icons
            hashParamSuffix: '',        // Used when there are multiple document viewers on a page
            horizontalOffset: 0,        // Distance from the center of the diva element to the top of the current page
            horizontalPadding: 0,       // Either the fixed padding or adaptive padding
            ID: null,                   // The prefix of the IDs of the elements (usually 1-diva-)
            initialKeyScroll: false,    // Holds the initial state of enableKeyScroll
            initialSpaceScroll: false,  // Holds the initial state of enableSpaceScroll
            innerObject: {},            // $(settings.ID + 'inner'), for selecting the .diva-inner element
            innerElement: null,         // The native .diva-outer DOM object
            isActiveDiva: true,         // In the case that multiple diva panes exist on the same page, this should have events funneled to it.
            isScrollable: true,         // Used in enable/disableScrollable public methods
            isIIIF: false,              // Specifies whether objectData is in Diva native or IIIF Manifest format
            isZooming: false,           // Flag to keep track of whether zooming is still in progress, for handleZoom
            loaded: false,              // A flag for when everything is loaded and ready to go.
            mobileWebkit: false,        // Checks if the user is on a touch device (iPad/iPod/iPhone/Android)
            numPages: 0,                // Number of pages in the array
            oldZoomLevel: -1,           // Holds the previous zoom level after zooming in or out
            outerObject: {},            // $(settings.ID + 'outer'), for selecting the .diva-outer element
            outerElement: null,         // The native .diva-outer DOM object
            pages: [],                  // An array containing the data for all the pages
            pageLeftOffsets: [],        // Distance from the left side of each page to the left side of the diva-inner object
            viewRendering: null,
            pageTopOffsets: [],         // Distance from the top side of each page to the top side of the diva-inner object
            pageTools: '',              // The string for page tools
            parentObject: parentObject, // JQuery object referencing the parent element
            plugins: [],                // Filled with the enabled plugins from window.divaPlugins
            previousLeftScroll: 0,      // Used to determine horizontal scroll direction
            previousTopScroll: 0,       // Used to determine vertical scroll direction
            resizeTimer: -1,            // Holds the ID of the timeout used when resizing the window (for clearing)
            previousZoomRatio: 1,             // Used to keep track of the previous zoom ratio for scale transforming diva-inner
            scaleWait: false,           // For preventing double-zoom on touch devices (iPad, etc)
            scrollbarWidth: 0,          // Set to the actual scrollbar width in init()
            selector: '',               // Uses the generated ID prefix to easily select elements
            singleClick: false,         // Used for catching ctrl+double-click events in Firefox in Mac OS
            singleTap: false,           // Used for caching double-tap events on mobile browsers
            throbberTimeoutID: -1,      // Holds the ID of the throbber loading timeout
            toolbar: null,              // Holds an object with some toolbar-related functions
            totalHeight: 0,             // The total height for the current zoom level (including padding)
            totalWidth: 0,              // The total height for the current zoom level (including padding)
            verticalOffset: 0,          // Distance from the center of the diva element to the left side of the current page
            verticalPadding: 0,         // Either the fixed padding or adaptive padding
            viewport: null              // Object caching the viewport dimensions
        });

        // Aliases for compatibilty
        // TODO(wabain): Get rid of usages of these
        Object.defineProperties(settings, {
            // Height of the document viewer pane
            panelHeight: {
                get: function ()
                {
                    return settings.viewport.height;
                }
            },
            // Width of the document viewer pane
            panelWidth: {
                get: function ()
                {
                    return settings.viewport.width;
                }
            }
        });

        var self = this;

        var isValidSetting = function (key, value)
        {
            return DivaSettingsValidator.isValid(key, value, settings);
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

        // Returns the page index associated with the given filename; must called after setting settings.manifest
        var getPageIndex = function (filename)
        {
            var i,
                np = settings.numPages;

            for (i = 0; i < np; i++)
            {
                if (settings.manifest.pages[i].f === filename)
                {
                    return i;
                }
            }

            return -1;
        };

        // Check if a page index is valid
        var isPageValid = function (pageIndex)
        {
            return settings.manifest.isPageValid(pageIndex);
        };

        // Reset some settings and empty the viewport
        var clearViewer = function ()
        {
            settings.viewport.top = 0;

            settings.previousTopScroll = 0;
            settings.previousLeftScroll = 0;

            // Clear all the timeouts to prevent undesired pages from loading
            clearTimeout(settings.resizeTimer);
        };

        /**
         * Update settings to match the specified options. Load the viewer,
         * fire appropriate events for changed options.
         */
        var reloadViewer = function (options)
        {
            var queuedEvents = [];

            options = DivaSettingsValidator.getValidatedOptions(settings, options);

            // Set the zoom level if valid and fire a ZoomLevelDidChange event
            if (hasChangedOption(options, 'zoomLevel'))
            {
                settings.oldZoomLevel = settings.zoomLevel;
                settings.zoomLevel = options.zoomLevel;
                queuedEvents.push(["ZoomLevelDidChange", [options.zoomLevel]]);
            }

            // Set the pages per row if valid and fire an event
            if (hasChangedOption(options, 'pagesPerRow'))
            {
                settings.pagesPerRow = options.pagesPerRow;
                queuedEvents.push(["GridRowNumberDidChange", [options.pagesPerRow]]);
            }

            // Update verticallyOriented (no event fired)
            if (hasChangedOption(options, 'verticallyOriented'))
                settings.verticallyOriented = options.verticallyOriented;

            // Update page position (no event fired here)
            if ('goDirectlyTo' in options)
            {
                settings.goDirectlyTo = options.goDirectlyTo;

                if ('verticalOffset' in options)
                    settings.verticalOffset = options.verticalOffset;

                if ('horizontalOffset' in options)
                    settings.horizontalOffset = options.horizontalOffset;
            }
            else
            {
                // Otherwise the default is to remain on the current page
                settings.goDirectlyTo = settings.currentPageIndex;
            }

            if (hasChangedOption(options, 'inGrid') || hasChangedOption(options, 'inBookLayout'))
            {
                if ('inGrid' in options)
                    settings.inGrid = options.inGrid;

                if ('inBookLayout' in options)
                    settings.inBookLayout = options.inBookLayout;

                queuedEvents.push(["ViewDidSwitch", [settings.inGrid]]);
            }

            // Note: prepareModeChange() depends on inGrid and the vertical/horizontalOffset (for now)
            if (hasChangedOption(options, 'inFullscreen'))
            {
                settings.inFullscreen = options.inFullscreen;
                prepareModeChange(options);
                queuedEvents.push(["ModeDidSwitch", [settings.inFullscreen]]);
            }

            clearViewer();

            // re-attach scroll event to outer div (necessary if we just zoomed)
            settings.outerObject.off('scroll');
            settings.outerObject.scroll(scrollFunction);

            var Rendering = settings.inGrid ? GridRendering : SequenceRendering;

            if (!(settings.viewRendering instanceof Rendering))
            {
                var compatErrors = Rendering.getCompatibilityErrors(self);

                if (compatErrors)
                {
                    showError(compatErrors);
                }
                else
                {
                    if (settings.viewRendering)
                        settings.viewRendering.destroy();

                    settings.viewRendering = new Rendering(self);
                }
            }

            if (settings.viewRendering)
                settings.viewRendering.load();

            queuedEvents.forEach(function (args)
            {
                diva.Events.publish.apply(diva.Events, args.concat([self]));
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
            settings.outerObject[changeClass]('diva-fullscreen');
            $('body')[changeClass]('diva-hide-scrollbar');
            settings.parentObject[changeClass]('diva-full-width');

            // Adjust Diva's internal panel size, keeping the old values
            var storedHeight = settings.panelHeight;
            var storedWidth = settings.panelWidth;
            settings.viewport.invalidate();

            // If this isn't the original load, the offsets matter, and the position isn't being changed...
            if (!settings.loaded && !settings.inGrid && !('verticalOffset' in options))
            {
                //get the updated panel size
                var newHeight = settings.panelHeight;
                var newWidth = settings.panelWidth;

                //and re-center the new panel on the same point
                settings.verticalOffset += ((storedHeight - newHeight) / 2);
                settings.horizontalOffset += ((storedWidth - newWidth) / 2);
            }

            //turn on/off escape key listener
            if (options.inFullscreen)
                $(document).on('keyup', escapeListener);
            else
                $(document).off('keyup', escapeListener);
        };

        //Shortcut for closing fullscreen with the escape key
        var escapeListener = function (e)
        {
            if (e.keyCode == 27)
                toggleFullscreen();
        };

        // Called when the fullscreen icon is clicked
        var toggleFullscreen = function ()
        {
            reloadViewer({
                inFullscreen: !settings.inFullscreen
            });
        };

        // Called when the change view icon is clicked
        var changeView = function (destinationView)
        {
            switch (destinationView)
            {
                case 'document':
                    return reloadViewer({
                        inGrid: false,
                        inBookLayout: false
                    });

                case 'book':
                    return reloadViewer({
                        inGrid: false,
                        inBookLayout: true
                    });

                case 'grid':
                    return reloadViewer({
                        inGrid: true
                    });

                default:
                    return false;
            }
        };

        //toggles between orientations
        var toggleOrientation = function ()
        {
            var verticallyOriented = !settings.verticallyOriented;

            //if in grid, switch out of grid
            reloadViewer({
                inGrid: false,
                verticallyOriented: verticallyOriented,
                goDirectlyTo: settings.currentPageIndex,
                verticalOffset: getYOffset(),
                horizontalOffset: getXOffset()
            });

            return verticallyOriented;
        };

        // Called after double-click or ctrl+double-click events on pages in document view
        var handleDocumentDoubleClick = function (event)
        {
            // Hold control to zoom out, otherwise, zoom in
            var newZoomLevel = (event.ctrlKey) ? settings.zoomLevel - 1 : settings.zoomLevel + 1;

            var focalPoint = getFocalPoint(this, event);

            // compensate for interpage padding
            // FIXME: Still a few pixels unaccounted for. This really needs to be accounted for with post-zoom values.
            if (settings.verticallyOriented)
                focalPoint.pageRelative.y += settings.verticalPadding;

            if (!settings.verticallyOriented || settings.inBookLayout)
                focalPoint.pageRelative.x += settings.horizontalPadding;

            handleZoom(newZoomLevel, focalPoint);
        };

        var getFocalPoint = function (pageElement, event)
        {
            var outerPosition = settings.outerElement.getBoundingClientRect();
            var pagePosition = pageElement.getBoundingClientRect();

            // This argument format is awkward and redundant, but it's easiest to
            // compute all these values at once here
            return {
                pageIndex: parseInt(pageElement.getAttribute('data-index'), 10),
                viewportRelative: {
                    x: event.pageX - outerPosition.left,
                    y: event.pageY - outerPosition.top
                },
                pageRelative: {
                    x: event.pageX - pagePosition.left,
                    y: event.pageY - pagePosition.top
                }
            };
        };

        // Called after double-clicking on a page in grid view
        var handleGridDoubleClick = function (event)
        {
            var pageIndex = parseInt($(this).attr('data-index'), 10);
            var pageOffset = $(this).offset();
            var zoomProportion = getPageData(pageIndex, "w") / $(this).width();

            // Leave grid view, jump directly to the desired page
            reloadViewer({
                inGrid: false,
                goDirectlyTo: pageIndex,
                horizontalOffset: (event.pageX - pageOffset.left) * zoomProportion,
                verticalOffset: (event.pageY - pageOffset.top) * zoomProportion
            });
        };

        // Handles pinch-zooming for mobile devices
        var handlePinchZoom = function (zoomDelta, event)
        {
            var newZoomLevel = settings.zoomLevel;

            // First figure out the new zoom level:
            if (zoomDelta > 100 && newZoomLevel < settings.maxZoomLevel)
                newZoomLevel++;
            else if (zoomDelta < -100 && newZoomLevel > settings.minZoomLevel)
                newZoomLevel--;
            else
                return;

            var focalPoint = getFocalPoint(this, event);

            // Set scaleWait to true so that we wait for this scale event to finish
            settings.scaleWait = true;

            handleZoom(newZoomLevel, focalPoint);
        };

        // Called to handle any zoom level
        var handleZoom = function (newZoomLevel, focalPoint)
        {
            var originX;
            var originY;

            // If the zoom level provided is invalid, return false
            if (!isValidSetting('zoomLevel', newZoomLevel))
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
                focalPoint = {
                    pageIndex: settings.currentPageIndex,
                    viewportRelative: {
                        x: settings.panelWidth / 2,
                        y: settings.panelHeight / 2
                    },
                    pageRelative: {
                        x: settings.horizontalOffset,
                        y: settings.verticalOffset
                    }
                };
            }

            var zoomRatio = Math.pow(2, newZoomLevel - settings.zoomLevel);

            // Scale padding with zoom
            settings.unclampedVerticalPadding *= zoomRatio;
            settings.horizontalPadding *= zoomRatio;

            // Make sure the vertical padding is at least 40, if plugin icons are enabled
            settings.verticalPadding = (settings.pageTools.length) ? Math.max(settings.unclampedVerticalPadding, 40) : settings.unclampedVerticalPadding;

            settings.goDirectlyTo = focalPoint.pageIndex;

            // calculate distance from cursor coordinates to center of viewport
            var focalXToCenter = focalPoint.viewportRelative.x - (settings.panelWidth / 2);
            var focalYToCenter = focalPoint.viewportRelative.y - (settings.panelHeight / 2);

            // calculate horizontal/verticalOffset: distance from viewport center to page upper left corner
            settings.horizontalOffset = (focalPoint.pageRelative.x * zoomRatio) - focalXToCenter;
            settings.verticalOffset = (focalPoint.pageRelative.y * zoomRatio) - focalYToCenter;

            // Set up the origin for the transform
            originX = focalPoint.viewportRelative.x + settings.viewport.left;
            originY = focalPoint.viewportRelative.y + settings.viewport.top;
            settings.innerElement.style.transformOrigin = originX + 'px ' + originY + 'px';

            // Update the zoom level
            settings.oldZoomLevel = settings.zoomLevel;
            settings.zoomLevel = newZoomLevel;

            // If first zoom, set transition parameters TODO css class
            if (!settings.isZooming)
            {
                initiateZoomAnimation();
            }

            // If still zooming, zoomRatio needs to be multiplied by the previous zoomRatio and is reset on transitionend
            zoomRatio *= settings.previousZoomRatio;
            settings.previousZoomRatio = zoomRatio;

            // Transition to new zoom level
            settings.innerElement.style.transform = 'scale(' + zoomRatio + ')';

            // Set flag to indicate zooming is in progress until loadDocument is called by transitionend
            settings.isZooming = true;

            // Starts preloading pages for the new zoom level
            settings.viewRendering.preload();

            // Update the slider
            diva.Events.publish("ZoomLevelDidChange", [newZoomLevel], self);

            // While zooming, don't update scroll offsets based on the scaled version of diva-inner
            settings.outerObject.off('scroll');

            return true;
        };

        var initiateZoomAnimation = function ()
        {
            var fallbackMs = 300;

            var endCallback = function ()
            {
                settings.isZooming = false;

                settings.previousZoomRatio = 1;

                // Now render with the previously set zoomLevel
                reloadViewer({});

                settings.innerElement.removeEventListener(Transition.endEvent, endCallback, false);
                clearTimeout(fallbackTimeoutId);
            };

            // Ensure the callback is run even if the end event doesn't fire
            settings.innerElement.addEventListener(Transition.endEvent, endCallback, false);
            var fallbackTimeoutId = setTimeout(endCallback, fallbackMs);

            settings.innerElement.style[Transition.property] = 'transform .3s cubic-bezier(0.000, 0.990, 1.000, 0.995)';
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

        var getState = function ()
        {
            var view;

            if (settings.inGrid)
            {
                view = 'g';
            }
            else if (settings.inBookLayout)
            {
                view = 'b';
            }
            else
            {
                view = 'd';
            }

            var pageOffset = settings.viewRendering.getPageToViewportOffset();

            var state = {
                'f': settings.inFullscreen,
                'v': view,
                'z': settings.zoomLevel,
                'n': settings.pagesPerRow,
                'i': (settings.enableFilename) ? settings.manifest.pages[settings.currentPageIndex].f : false,
                'p': (settings.enableFilename) ? false : settings.currentPageIndex + 1,
                'y': pageOffset ? pageOffset.y : false,
                'x': pageOffset ? pageOffset.x : false
            };

            return state;
        };

        var getLoadOptionsForState = function (state)
        {
            var options = ('v' in state) ? getViewState(state.v) : {};

            if ('f' in state)
                options.inFullscreen = state.f;

            if ('z' in state)
                options.zoomLevel = state.z;

            if ('n' in state)
                options.pagesPerRow = state.n;

            // Only change specify the page if state.i or state.p is valid
            var pageIndex = getPageIndex(state.i);

            if (!isPageValid(pageIndex))
            {
                if (isPageValid(state.p - 1))
                    pageIndex = state.p - 1;
                else
                    pageIndex = null;
            }

            if (pageIndex !== null)
            {
                var horizontalOffset = parseInt(state.x, 10);
                var verticalOffset = parseInt(state.y, 10);

                options.goDirectlyTo = pageIndex;
                options.horizontalOffset = horizontalOffset;
                options.verticalOffset = verticalOffset;
            }

            return options;
        };

        var getURLHash = function ()
        {
            var hashParams = getState();
            var hashStringBuilder = [];
            var param;

            for (param in hashParams)
            {
                if (hashParams[param] !== false)
                    hashStringBuilder.push(param + settings.hashParamSuffix + '=' + encodeURIComponent(hashParams[param]));
            }

            return hashStringBuilder.join('&');
        };

        // Returns the URL to the current state of the document viewer (so it should be an exact replica)
        var getCurrentURL = function ()
        {
            return location.protocol + '//' + location.host + location.pathname + location.search + '#' + getURLHash();
        };

        // updates panelHeight/panelWidth on resize
        var updatePanelSize = function ()
        {
            settings.viewport.invalidate();

            // FIXME(wabain): This should really only be called after initial load
            if (settings.viewRendering)
            {
                updateOffsets();
                settings.viewRendering.goto(settings.currentPageIndex, settings.verticalOffset, settings.horizontalOffset);
            }

            return true;
        };

        var updateOffsets = function ()
        {
            var pageOffset = settings.viewRendering.getPageToViewportOffset();

            if (pageOffset)
            {
                settings.horizontalOffset = pageOffset.x;
                settings.verticalOffset = pageOffset.y;
            }
        };

        // Bind mouse events (drag to scroll, double-click)
        var bindMouseEvents = function()
        {
            // Set drag scroll on first descendant of class dragger on both selected elements
            settings.outerObject.dragscrollable({dragSelector: '.diva-dragger', acceptPropagatedEvent: true});
            settings.innerObject.dragscrollable({dragSelector: '.diva-dragger', acceptPropagatedEvent: true});

            // Double-click to zoom
            settings.outerObject.on('dblclick', '.diva-document-page', function (event)
            {
                if (!event.ctrlKey)
                {
                    handleDocumentDoubleClick.call(this, event);
                }
            });

            // Handle the control key for macs (in conjunction with double-clicking)
            settings.outerObject.on('contextmenu', '.diva-document-page', function (event)
            {
                if (event.ctrlKey)
                {
                    // In Firefox, this doesn't trigger a double-click, so we apply one manually
                    clearTimeout(settings.singleClickTimeout);

                    if (settings.singleClick)
                    {
                        handleDocumentDoubleClick.call(this, event);
                        settings.singleClick = false;
                    }
                    else
                    {
                        settings.singleClick = true;

                        // Set it to false again after 500 milliseconds (standard double-click timeout)
                        settings.singleClickTimeout = setTimeout(function ()
                        {
                            settings.singleClick = false;
                        }, 500);
                    }
                }

                return false;
            });

            settings.outerObject.on('dblclick', '.diva-row', function (event)
            {
                handleGridDoubleClick.call($(event.target).parent(), event);
            });

        };

        var onResize = function()
        {
            updatePanelSize();
            // Cancel any previously-set resize timeouts
            clearTimeout(settings.resizeTimer);

            settings.resizeTimer = setTimeout(function ()
            {
                var pageOffset = settings.viewRendering.getPageToViewportOffset();

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
            settings.outerObject.kinetic({
                triggerHardware: true
            });

            // Bind events for pinch-zooming
            var start = [],
                move = [],
                startDistance = 0;

            settings.outerObject.on('touchstart', '.diva-document-page', function(event)
            {
                // Prevent mouse event from firing
                event.preventDefault();

                if (event.originalEvent.touches.length === 2)
                {
                    start = [event.originalEvent.touches[0].clientX,
                             event.originalEvent.touches[0].clientY,
                             event.originalEvent.touches[1].clientX,
                             event.originalEvent.touches[1].clientY];

                    startDistance = distance(start[2], start[0], start[3], start[1]);
                }
            });

            settings.outerObject.on('touchmove', '.diva-document-page', function(event)
            {
                // Prevent mouse event from firing
                event.preventDefault();

                if (event.originalEvent.touches.length === 2)
                {
                    move = [event.originalEvent.touches[0].clientX,
                            event.originalEvent.touches[0].clientY,
                            event.originalEvent.touches[1].clientX,
                            event.originalEvent.touches[1].clientY];

                    var moveDistance = distance(move[2], move[0], move[3], move[1]);
                    var zoomDelta = moveDistance - startDistance;

                    if (!settings.scaleWait)
                    {
                        if (settings.inGrid)
                        {
                            reloadViewer({
                                inGrid: false
                            });
                        }
                        else
                        {
                            handlePinchZoom.call(this, zoomDelta, event);
                        }
                    }
                }
            });

            var firstTapCoordinates = {},
                tapDistance = 0;

            var onDoubleTap = function(event)
            {
                // Prevent mouse event from firing
                event.preventDefault();

                if (settings.singleTap)
                {
                    // Doubletap has occurred
                    var touchEvent = {
                        pageX: event.originalEvent.changedTouches[0].clientX,
                        pageY: event.originalEvent.changedTouches[0].clientY
                    };

                    // If first tap is close to second tap (prevents interference with scale event)
                    tapDistance = distance(firstTapCoordinates.pageX, touchEvent.pageX, firstTapCoordinates.pageY, touchEvent.pageY);
                    if (tapDistance < 50 && settings.zoomLevel < settings.maxZoomLevel)
                        if (settings.inGrid)
                            handleGridDoubleClick.call($(event.target).parent(), touchEvent);
                        else
                            handleDocumentDoubleClick.call(this, touchEvent);

                    settings.singleTap = false;
                    firstTapCoordinates = {};
                }
                else
                {
                    settings.singleTap = true;
                    firstTapCoordinates.pageX = event.originalEvent.changedTouches[0].clientX;
                    firstTapCoordinates.pageY = event.originalEvent.changedTouches[0].clientY;

                    // Cancel doubletap after 250 milliseconds
                    settings.singleTapTimeout = setTimeout(function()
                    {
                        settings.singleTap = false;
                        firstTapCoordinates = {};
                    }, 250);
                }
            };

            // Document view: Double-tap to zoom in
            // Grid view: Double-tap to jump to current page in document view
            settings.outerObject.on('touchend', '.diva-page', onDoubleTap);

        };

        // Pythagorean theorem to get the distance between two points (used for calculating finger distance for double-tap and pinch-zoom)
        var distance = function(x2, x1, y2, y1)
        {
            return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        };

        // Handle the scroll
        var scrollFunction = function ()
        {
            var direction;

            settings.viewport.invalidate();

            var newScrollTop = settings.viewport.top;
            var newScrollLeft = settings.viewport.left;

            if (settings.verticallyOriented || settings.inGrid)
                direction = newScrollTop - settings.previousTopScroll;
            else
                direction = newScrollLeft - settings.previousLeftScroll;

            //give adjust the direction we care about
            settings.viewRendering.adjust(direction);

            settings.previousTopScroll = newScrollTop;
            settings.previousLeftScroll = newScrollLeft;

            updateOffsets();
        };

        // Binds most of the event handlers (some more in createToolbar)
        var handleEvents = function ()
        {
            // Change the cursor for dragging
            settings.innerObject.mousedown(function ()
            {
                $(this).addClass('diva-grabbing');
            });

            settings.innerObject.mouseup(function ()
            {
                $(this).removeClass('diva-grabbing');
            });

            bindMouseEvents();

            settings.outerObject.scroll(scrollFunction);

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
                if (!settings.isActiveDiva)
                    return true;

                // Space or page down - go to the next page
                if ((settings.enableSpaceScroll && !event.shiftKey && event.keyCode === spaceKey) || (settings.enableKeyScroll && event.keyCode === pageDownKey))
                {
                    settings.viewport.top += settings.panelHeight;
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
                            settings.viewport.top -= settings.panelHeight;
                            return false;

                        case upArrowKey:
                            // Up arrow - scroll up
                            settings.viewport.top -= settings.arrowScrollAmount;
                            return false;

                        case downArrowKey:
                            // Down arrow - scroll down
                            settings.viewport.top += settings.arrowScrollAmount;
                            return false;

                        case leftArrowKey:
                            // Left arrow - scroll left
                            settings.viewport.left -= settings.arrowScrollAmount;
                            return false;

                        case rightArrowKey:
                            // Right arrow - scroll right
                            settings.viewport.left += settings.arrowScrollAmount;
                            return false;

                        case homeKey:
                            // Home key - go to the beginning of the document
                            settings.viewport.top = 0;
                            return false;

                        case endKey:
                            // End key - go to the end of the document
                            settings.viewport.top = settings.totalHeight;
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
                if (settings.viewRendering)
                    settings.viewRendering.destroy();

                clearTimeout(settings.resizeTimer);
            }, settings.ID);
        };

        var initPlugins = function ()
        {
            if (window.divaPlugins)
            {
                var pageTools = [];

                // Add all the plugins that have not been explicitly disabled to settings.plugins
                $.each(window.divaPlugins, function (index, plugin)
                {
                    var pluginProperName = plugin.pluginName[0].toUpperCase() + plugin.pluginName.substring(1);

                    if (settings['enable' + pluginProperName])
                    {
                        // Call the init function and check return value
                        var enablePlugin = plugin.init(settings, self);

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

                            settings.outerObject.on('click', pluginButtonElement, function (event)
                            {
                                plugin.handleClick.call(this, event, settings, self);
                            });

                            settings.outerObject.on('touchend', pluginButtonElement, function (event)
                            {
                                // Prevent firing of emulated mouse events
                                event.preventDefault();

                                plugin.handleClick.call(this, event, settings, self);
                            });
                        }

                        // Add it to settings.plugins so it can be used later
                        settings.plugins.push(plugin);
                    }
                });

                // Save the page tools bar so it can be added for each page
                if (pageTools.length)
                    settings.pageTools = '<div class="diva-page-tools">' + pageTools.join('') + '</div>';
            }
        };

        var hideThrobber = function ()
        {
            // Clear the timeout, if it hasn't executed yet
            clearTimeout(settings.throbberTimeoutID);

            // Hide the throbber if it has already executed
            $(settings.selector + 'throbber').hide();
        };

        var getViewState = function(view)
        {
            switch (view)
            {
                case 'd':
                    return {
                        inGrid: false,
                        inBookLayout: false
                    };

                case 'b':
                    return {
                        inGrid: false,
                        inBookLayout: true
                    };

                case 'g':
                    return {
                        inGrid: true,
                        inBookLayout: false
                    };

                default:
                    return null;
            }
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

            settings.outerObject.append(errorElement);

            //bind dialog close button
            $(settings.selector + 'error-close').on('click', function()
            {
                errorElement.parentNode.removeChild(errorElement);
            });
        };

        var ajaxError = function(jqxhr, status, error)
        {
            // Show a basic error message within the document viewer pane
            // FIXME: Make this more end-user friendly. What about 404's etc?

            hideThrobber();
            var errorMessage = ['Invalid objectData setting. Error code: ' + jqxhr.status + ' ' + error];

            // Detect and handle CORS errors
            var dataHasAbsolutePath = settings.objectData.lastIndexOf('http', 0) === 0;

            if (dataHasAbsolutePath && error === '')
            {
                var jsonHost = settings.objectData.replace(/https?:\/\//i, "").split(/[/?#]/)[0];

                if (location.hostname !== jsonHost)
                {
                    errorMessage.push(
                        elt('p', 'Attempted to access cross-origin data without CORS.'),
                        elt('p',
                            'You may need to update your server configuration to support CORS. For help, see the ',
                            elt('a', {
                                href: 'https://github.com/DDMAL/diva.js/wiki/Installation#a-note-about-cross-site-requests',
                                target: '_blank'
                            }, 'cross-site request documentation.')
                        )
                    );
                }
            }

            showError(errorMessage);
        };

        var loadObjectData = function (data)
        {
            // store object data in settings
            parseObjectData(data);

            // Plugin setup hooks should be bound to the ObjectDidLoad event
            diva.Events.publish('ObjectDidLoad', [settings], self);

            // Adjust the document panel dimensions
            updatePanelSize();

            var hashState = getHashParamState();
            var loadOptions = getLoadOptionsForState(hashState);

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
                    loadOptions.horizontalOffset = settings.horizontalPadding;
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
                settings.innerElement.style.minWidth = settings.panelWidth + 'px';
            else
                settings.innerElement.style.minHeight = settings.panelHeight + 'px';

            // FIXME: If the page was supposed to be positioned relative to the viewport we need to
            // recalculate it to take into account the scrollbars
            if (anchoredVertically || anchoredHorizontally)
            {
                if (anchoredVertically)
                    settings.verticalOffset = getYOffset(settings.currentPageIndex, "top");

                if (anchoredHorizontally)
                    settings.horizontalOffset = getXOffset(settings.currentPageIndex, "center");

                settings.viewRendering.goto(settings.currentPageIndex, settings.verticalOffset, settings.horizontalOffset);
            }

            // signal that everything should be set up and ready to go.
            settings.loaded = true;

            diva.Events.publish("ViewerDidLoad", [settings], self);
        };

        var parseObjectData = function(responseData)
        {
            // parse IIIF manifest if it is an IIIF manifest. TODO improve IIIF detection method
            if (responseData.hasOwnProperty('@context') && (responseData['@context'].indexOf('iiif') !== -1 ||
                responseData['@context'].indexOf('shared-canvas') !== -1))
            {
                settings.isIIIF = true;

                // trigger ManifestDidLoad event
                // FIXME: Why is this triggered before the manifest is parsed?
                diva.Events.publish('ManifestDidLoad', [responseData], self);

                settings.manifest = ImageManifest.fromIIIF(responseData);
            }
            else
            {
                settings.manifest = ImageManifest.fromLegacyManifest(responseData, {
                    iipServerURL: settings.iipServerURL,
                    imageDir: settings.imageDir
                });
            }

            hideThrobber();

            // Convenience value
            settings.numPages = settings.manifest.pages.length;

            DivaSettingsValidator.validate(settings);

            diva.Events.publish('NumberOfPagesDidChange', [settings.numPages], self);

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
                settings.horizontalPadding = parseInt(settings.manifest.getAverageWidth(z) * settings.adaptivePadding, 10);
                settings.verticalPadding = parseInt(settings.manifest.getAverageHeight(z) * settings.adaptivePadding, 10);
            }
            else
            {
                // It's less than or equal to 0; use fixedPadding instead
                settings.horizontalPadding = settings.fixedPadding;
                settings.verticalPadding = settings.fixedPadding;
            }

            settings.unclampedVerticalPadding = settings.verticalPadding;

            // Make sure the vertical padding is at least 40, if plugin icons are enabled
            if (settings.pageTools.length)
            {
                settings.verticalPadding = Math.max(40, settings.verticalPadding);
            }

            // If we detect a viewingHint of 'paged' in the manifest or sequence, enable book view by default
            if (settings.manifest.paged)
            {
                settings.inBookLayout = true;
            }
        };

        /** Parse the hash parameters into the format used by getState and setState */
        var getHashParamState = function ()
        {
            var state = {};

            ['f', 'v', 'z', 'n', 'i', 'p', 'y', 'x'].forEach(function (param)
            {
                var value = HashParams.get(param + settings.hashParamSuffix);

                // `false` is returned if the value is missing
                if (value !== false)
                    state[param] = value;
            });

            // Do some awkward special-casing, since this format is kind of weird.

            // For inFullscreen (f), true and false strings should be interpreted
            // as booleans.
            if (state.f === 'true')
                state.f = true;
            else if (state.f === 'false')
                state.f = false;

            // Convert numerical values to integers, if provided
            ['z', 'n', 'p', 'x', 'y'].forEach(function (param)
            {
                if (param in state)
                    state[param] = parseInt(state[param], 10);
            });

            return state;
        };

        var setupViewer = function ()
        {
            if (typeof settings.objectData === 'object')
            {
                // Defer execution until initialization has completed
                setTimeout(function ()
                {
                    loadObjectData(settings.objectData);
                }, 0);

                return;
            }

            // If the request hasn't completed after a specified time, show it
            settings.throbberTimeoutID = setTimeout(function ()
            {
                $(settings.selector + 'throbber').show();
            }, settings.throbberTimeout);

            $.ajax({
                url: settings.objectData,
                cache: true,
                dataType: 'json',
                error: ajaxError,
                success: loadObjectData
            });
        };

        var checkLoaded = function()
        {
            if (!settings.loaded)
            {
                console.warn("The viewer is not completely initialized. This is likely because it is still downloading data. To fix this, only call this function if the isReady() method returns true.");
                return false;
            }
            return true;
        };

        var init = function ()
        {
            // First figure out the width of the scrollbar in this browser
            // TODO(wabain): Cache this somewhere else
            // Only some of the plugins rely on this now
            settings.scrollbarWidth = getScrollbarWidth();

            // If window.orientation is defined, then it's probably mobileWebkit
            settings.mobileWebkit = window.orientation !== undefined;

            // Generate an ID that can be used as a prefix for all the other IDs
            settings.ID = generateId('diva-');
            settings.selector = '#' + settings.ID;

            // Figure out the hashParamSuffix from the ID
            var divaNumber = parseInt(settings.ID, 10);

            if (divaNumber > 1)
            {
                // If this is document viewer #1, don't use a suffix; otherwise, use the document viewer number
                settings.hashParamSuffix = divaNumber;
            }

            // Create the inner and outer panels
            settings.innerElement = elt('div', elemAttrs('inner', { class: 'diva-inner diva-dragger' }));
            settings.outerElement = elt('div', elemAttrs('outer'),
                settings.innerElement,
                elt('div', elemAttrs('throbber')));

            settings.innerObject = $(settings.innerElement);
            settings.outerObject = $(settings.outerElement);

            settings.parentObject.append(settings.outerElement);

            settings.viewport = new Viewport(settings.outerElement, {
                intersectionTolerance: settings.viewportMargin
            });

            // Create the toolbar and display the title + total number of pages
            if (settings.enableToolbar)
            {
                settings.toolbar = createToolbar(self);
            }

            // Do the initial AJAX request and viewer loading
            setupViewer();

            // Do all the plugin initialisation
            initPlugins();

            handleEvents();
        };

        /* PUBLIC FUNCTIONS
        ===============================================
        */

        // Returns the title of the document, based on the directory name
        this.getItemTitle = function ()
        {
            return settings.manifest.itemTitle;
        };

        // Go to a particular page by its page number (with indexing starting at 1)
            //xAnchor may either be "left", "right", or default "center"; the (xAnchor) side of the page will be anchored to the (xAnchor) side of the diva-outer element
            //yAnchor may either be "top", "bottom", or default "center"; same process as xAnchor.
        // returns True if the page number passed is valid; false if it is not.
        this.gotoPageByNumber = function (pageNumber, xAnchor, yAnchor)
        {
            var pageIndex = parseInt(pageNumber, 10) - 1;
            return this.gotoPageByIndex(pageIndex, xAnchor, yAnchor);
        };

        // Go to a particular page (with indexing starting at 0)
            //xAnchor may either be "left", "right", or default "center"; the (xAnchor) side of the page will be anchored to the (xAnchor) side of the diva-outer element
            //yAnchor may either be "top", "bottom", or default "center"; same process as xAnchor.
        // returns True if the page index is valid; false if it is not.
        this.gotoPageByIndex = function (pageIndex, xAnchor, yAnchor)
        {
            pageIndex = parseInt(pageIndex, 10);
            if (isPageValid(pageIndex))
            {
                settings.viewRendering.goto(pageIndex, getYOffset(pageIndex, yAnchor), getXOffset(pageIndex, xAnchor));
                return true;
            }
            return false;
        };

        this.getNumberOfPages = function ()
        {
            if (!checkLoaded())
                return false;

            return settings.numPages;
        };

        // Returns the dimensions of a given page index at a given zoom level
        this.getPageDimensionsAtZoomLevel = function (pageIdx, zoomLevel)
        {
            if (!checkLoaded())
                return false;

            if (zoomLevel > settings.maxZoomLevel)
                zoomLevel = settings.maxZoomLevel;

            var pg = settings.manifest.pages[parseInt(pageIdx, 10)];
            var pgAtZoom = pg.d[parseInt(zoomLevel, 10)];
            return {'width': pgAtZoom.w, 'height': pgAtZoom.h};
        };

        // Returns the dimensions of the current page at the current zoom level
        this.getCurrentPageDimensionsAtCurrentZoomLevel = function ()
        {
            return this.getPageDimensionsAtZoomLevel(settings.currentPageIndex, settings.zoomLevel);
        };

        this.isReady = function ()
        {
            return settings.loaded;
        };

        this.getCurrentPageIndex = function ()
        {
            return settings.currentPageIndex;
        };

        this.getCurrentPageFilename = function ()
        {
            return settings.manifest.pages[settings.currentPageIndex].f;
        };

        this.getCurrentPageNumber = function ()
        {
            return settings.currentPageIndex + 1;
        };

        // Returns an array of all filenames in the document
        this.getFilenames = function ()
        {
            var filenames = [];

            for (var i = 0; i < settings.numPages; i++)
            {
                filenames[i] = settings.manifest.pages[i].f;
            }

            return filenames;
        };

        // Returns the current zoom level
        this.getZoomLevel = function ()
        {
            return settings.zoomLevel;
        };

        // gets the maximum zoom level for the entire document
        this.getMaxZoomLevel = function ()
        {
            return settings.maxZoomLevel;
        };

        // gets the max zoom level for a given page
        this.getMaxZoomLevelForPage = function (pageIdx)
        {
            if (!checkLoaded)
                return false;

            return settings.manifest.pages[pageIdx].m;
        };

        this.getMinZoomLevel = function ()
        {
            return settings.minZoomLevel;
        };

        // Use the provided zoom level (will check for validity first)
        // Returns false if the zoom level is invalid, true otherwise
        this.setZoomLevel = function (zoomLevel)
        {
            if (settings.inGrid)
            {
                reloadViewer({
                    inGrid: false
                });
            }

            return handleZoom(zoomLevel);
        };

        this.getGridPagesPerRow = function ()
        {
            // TODO(wabain): Add test case
            return this.pagesPerRow;
        };

        this.setGridPagesPerRow = function (newValue)
        {
            // TODO(wabain): Add test case
            if (!isValidSetting('pagesPerRow', newValue))
                return false;

            return reloadViewer({
                inGrid: true,
                pagesPerRow: newValue
            });
        };

        // Zoom in. Will return false if it's at the maximum zoom
        this.zoomIn = function ()
        {
            return this.setZoomLevel(settings.zoomLevel + 1);
        };

        // Zoom out. Will return false if it's at the minimum zoom
        this.zoomOut = function ()
        {
            return this.setZoomLevel(settings.zoomLevel - 1);
        };

        // Check if something (e.g. a highlight box on a particular page) is visible
        this.inViewport = function (pageNumber, leftOffset, topOffset, width, height)
        {
            var pageIndex = pageNumber - 1;
            var top = settings.pageTopOffsets[pageIndex] + topOffset;
            var bottom = top + height;
            var left = settings.pageLeftOffsets[pageIndex] + leftOffset;
            var right = left + width;

            return settings.viewport.intersectsRegion({
                top: top,
                bottom: bottom,
                left: left,
                right: right
            });
        };

        //Public wrapper for isPageVisible
        //Determines if a page is currently in the viewport
        this.isPageInViewport = function (pageIndex)
        {
            return settings.viewRendering.isPageVisible(pageIndex);
        };

        //Public wrapper for isPageLoaded
        //Determines if a page is currently in the DOM
        this.isPageLoaded = function (pageIndex)
        {
            if (!settings.viewRendering)
                return false;

            return settings.viewRendering.isPageLoaded(pageIndex);
        };

        // Toggle fullscreen mode
        this.toggleFullscreenMode = function ()
        {
            toggleFullscreen();
        };

        // Close toolbar popups
        this.closePopups = function ()
        {
            settings.toolbar.closePopups();
        };

        // Enter fullscreen mode if currently not in fullscreen mode
        // Returns false if in fullscreen mode initially, true otherwise
        // This function will work even if enableFullscreen is set to false
        this.enterFullscreenMode = function ()
        {
            if (!settings.inFullscreen)
            {
                toggleFullscreen();
                return true;
            }

            return false;
        };

        // Leave fullscreen mode if currently in fullscreen mode
        // Returns true if in fullscreen mode intitially, false otherwise
        this.leaveFullscreenMode = function ()
        {
            if (settings.inFullscreen)
            {
                toggleFullscreen();
                return true;
            }

            return false;
        };

        // Change views. Takes 'document', 'book', or 'grid' to specify which view to switch into
        this.changeView = function(destinationView)
        {
            return changeView(destinationView);
        };

        // Enter grid view if currently not in grid view
        // Returns false if in grid view initially, true otherwise
        this.enterGridView = function ()
        {
            if (!settings.inGrid)
            {
                changeView('grid');
                return true;
            }

            return false;
        };

        // Leave grid view if currently in grid view
        // Returns true if in grid view initially, false otherwise
        this.leaveGridView = function ()
        {
            if (settings.inGrid)
            {
                reloadViewer({ inGrid: false });
                return true;
            }

            return false;
        };

        // Jump to a page based on its filename
        // Returns true if successful and false if the filename is invalid
        this.gotoPageByName = function (filename, xAnchor, yAnchor)
        {
            var pageIndex = getPageIndex(filename);
            return this.gotoPageByIndex(pageIndex, xAnchor, yAnchor);
        };

        // Get the page index (0-based) corresponding to a given filename
        // If the page index doesn't exist, this will return -1
        this.getPageIndex = function (filename)
        {
            return getPageIndex(filename);
        };

        // Get the current URL (exposes the private method)
        this.getCurrentURL = function ()
        {
            return getCurrentURL();
        };

        // Get the hash part only of the current URL (without the leading #)
        this.getURLHash = function ()
        {
            return getURLHash();
        };

        // Get an object representing the state of this diva instance (for setState)
        this.getState = function ()
        {
            return getState();
        };

        // Align this diva instance with a state object (as returned by getState)
        this.setState = function (state)
        {
            reloadViewer(getLoadOptionsForState(state));
        };

        // Get the instance selector for this instance, since it's auto-generated.
        this.getInstanceSelector = function ()
        {
            return settings.selector;
        };

        // Get the instance ID -- essentially the selector without the leading '#'.
        this.getInstanceId = function ()
        {
            return settings.ID;
        };

        this.getSettings = function ()
        {
            return settings;
        };

        /*
            Translates a measurement from the zoom level on the largest size
            to one on the current zoom level.

            For example, a point 1000 on an image that is on zoom level 2 of 5
            translates to a position of 111.111... (1000 / (5 - 2)^2).

            Works for a single pixel co-ordinate or a dimension (e.g., translates a box
            that is 1000 pixels wide on the original to one that is 111.111 pixels wide
            on the current zoom level).
        */
        this.translateFromMaxZoomLevel = function (position)
        {
            var zoomDifference = settings.maxZoomLevel - settings.zoomLevel;
            return position / Math.pow(2, zoomDifference);
        };

        /*
            Translates a measurement from the current zoom level to the position on the
            largest zoom level.

            Works for a single pixel co-ordinate or a dimension (e.g., translates a box
            that is 111.111 pixels wide on the current image to one that is 1000 pixels wide
            on the current zoom level).
        */
        this.translateToMaxZoomLevel = function (position)
        {
            var zoomDifference = settings.maxZoomLevel - settings.zoomLevel;

            // if there is no difference, it's a box on the max zoom level and
            // we can just return the position.
            if (zoomDifference === 0)
                return position;

            return position * Math.pow(2, zoomDifference);
        };

        // Re-enables document dragging, scrolling (by keyboard if set), and zooming by double-clicking
        this.enableScrollable = function()
        {
            if (!settings.isScrollable)
            {
                bindMouseEvents();
                settings.enableKeyScroll = settings.initialKeyScroll;
                settings.enableSpaceScroll = settings.initialSpaceScroll;
                settings.outerElement.style.overflow = 'auto';
                settings.isScrollable = true;
            }
        };

        // Disables document dragging, scrolling (by keyboard if set), and zooming by double-clicking
        this.disableScrollable = function ()
        {
            if (settings.isScrollable)
            {
                // block dragging/double-click zooming
                if (settings.innerObject.hasClass('diva-dragger'))
                    settings.innerObject.unbind('mousedown');
                settings.outerObject.unbind('dblclick');
                settings.outerObject.unbind('contextmenu');

                // disable all other scrolling actions
                settings.outerElement.style.overflow = 'hidden';

                // block scrolling keys behavior, respecting initial scroll settings
                settings.initialKeyScroll = settings.enableKeyScroll;
                settings.initialSpaceScroll = settings.enableSpaceScroll;
                settings.enableKeyScroll = false;
                settings.enableSpaceScroll = false;

                settings.isScrollable = false;
            }
        };

        //Changes between horizontal layout and vertical layout. Returns true if document is now vertically oriented, false otherwise.
        this.toggleOrientation = function ()
        {
            return toggleOrientation();
        };

        //Returns distance between the northwest corners of diva-inner and page index
        this.getPageOffset = function(pageIndex)
        {
            return {
                'top': parseInt(settings.pageTopOffsets[pageIndex]),
                'left': parseInt(settings.pageLeftOffsets[pageIndex])
            };
        };

        //shortcut to getPageOffset for current page
        this.getCurrentPageOffset = function()
        {
            return this.getPageOffset(settings.currentPageIndex);
        };

        //Returns the page position and size (ulx, uly, h, w properties) of page pageIndex when there are pagesPerRow pages per row
        //TODO: calculate all grid height levels and store them so this can be AtGridLevel(pageIndex, pagesPerRow) ?
        this.getPageDimensionsAtCurrentGridLevel = function(pageIndex)
        {
            // FIXME(wabain): This is a breaking change from 4.x to 5. Is this change desirable
            // behaviour?
            if (!settings.inGrid)
                throw new Error('Cannot get grid-based dimensions when not in grid view');

            pageIndex = isPageValid(pageIndex) ? pageIndex : settings.currentPageIndex;

            return settings.viewRendering.getPageDimensions(pageIndex);
        };

        /*
            Given a pageX and pageY value (as could be retreived from a jQuery event object),
                returns either the page visible at that (x,y) position or "false" if no page is.
        */
        this.getPageIndexForPageXYValues = function(pageX, pageY)
        {
            //get the four edges of the outer element
            var outerOffset = settings.outerElement.getBoundingClientRect();
            var outerTop = outerOffset.top;
            var outerLeft = outerOffset.left;
            var outerBottom = outerOffset.bottom;
            var outerRight = outerOffset.right;

            //if the clicked position was outside the diva-outer object, it was not on a visible portion of a page
            if (pageX < outerLeft || pageX > outerRight)
                return false;

            if (pageY < outerTop || pageY > outerBottom)
                return false;

            //navigate through all diva page objects
            var pages = document.getElementsByClassName('diva-page');
            var curPageIdx = pages.length;
            while (curPageIdx--)
            {
                //get the offset for each page
                var curPage = pages[curPageIdx];
                var curOffset = curPage.getBoundingClientRect();

                //if this point is outside the horizontal boundaries of the page, continue
                if (pageX < curOffset.left || pageX > curOffset.right)
                    continue;

                //same with vertical boundaries
                if (pageY < curOffset.top || pageY > curOffset.bottom)
                    continue;

                //if we made it through the above two, we found the page we're looking for
                return curPage.getAttribute('data-index');
            }

            //if we made it through that entire while loop, we didn't click on a page
            return false;
        };

        /**
         * Returns a URL for the image of the page at the given index. The
         * optional size parameter supports setting the image width or height
         * (default is full-sized).
         */
        this.getPageImageURL = function (pageIndex, size)
        {
            return settings.manifest.getPageImageURL(pageIndex, size);
        };

        //Pretty self-explanatory.
        this.isVerticallyOriented = function()
        {
            return settings.verticallyOriented;
        };

        this.changeObject = function(objectData)
        {
            settings.loaded = false;
            clearViewer();

            if (settings.viewRendering)
                settings.viewRendering.destroy();

            settings.objectData = objectData;

            if (typeof objectData === 'object')
            {
                setTimeout(function ()
                {
                    parseObjectData(objectData);
                    reloadViewer({});
                    settings.loaded = true;
                });

                return;
            }

            settings.throbberTimeoutID = setTimeout(function ()
            {
                $(settings.selector + 'throbber').show();
            }, settings.throbberTimeout);

            $.ajax({
                url: settings.objectData,
                cache: true,
                dataType: 'json',
                error: ajaxError,
                success: function (responseData)
                {
                    parseObjectData(responseData);
                    hideThrobber();
                    reloadViewer({});
                    settings.loaded = true;
                }
            });
        };

        this.activate = function ()
        {
            settings.isActiveDiva = true;
        };

        this.deactivate = function ()
        {
            settings.isActiveDiva = false;
        };

        // Destroys this instance, tells plugins to do the same (for testing)
        this.destroy = function ()
        {
            // Removes the hide-scrollbar class from the body
            $('body').removeClass('diva-hide-scrollbar');

            // Empty the parent container and remove any diva-related data
            settings.parentObject.empty().removeData('diva');

            diva.Events.publish('ViewerDidTerminate', [settings], self);

            // Remove any additional styling on the parent element
            settings.parentObject.removeAttr('style').removeAttr('class');

            // Clear the Events cache
            diva.Events.unsubscribeAll(settings.ID);
        };

        // Call the init function when this object is created.
        init();
    };

    $.fn.diva = function (options)
    {
        return this.each(function ()
        {
            var divaParent = $(this);

            // Return early if this element already has a plugin instance
            if (divaParent.data('diva'))
                return;

            // Otherwise, instantiate the document viewer
            var diva = new Diva(this, options);
            divaParent.data('diva', diva);
        });
    };
})(jQuery);
