var extend = require('jquery').extend;
var maxBy = require('lodash.maxby');
var elt = require('./utils/elt');
var diva = require('./diva-global');
var DocumentRendering = require('./document-rendering');

module.exports = SequenceRendering;

function SequenceRendering(viewer)
{
    var self = this;
    var settings = viewer.getSettings();

    self.documentRendering = null;
    self.allTilesLoaded = [];
    self.loadedTiles = [];
    self.pageGroups = null;
    self.renderedPages = null;
    self.pagePreloadCanvases = [];
    self.previousZoomLevelCanvases = null;

    // FIXME(wabain): Temporarily copied from the Diva core
    var getPageData = function (pageIndex, attribute)
    {
        return settings.manifest.pages[pageIndex].d[settings.zoomLevel][attribute];
    };

    var isPageValid = function (pageIndex)
    {
        return settings.manifest.isPageValid(pageIndex);
    };

    // Check if a tile is near the specified viewport and thus should be loaded (performance-sensitive)
    var isTileVisible = function (pageIndex, tile)
    {
        // Viewport-relative coordinates
        var tileTop, tileLeft;

        if (settings.verticallyOriented)
        {
            tileTop = settings.pageTopOffsets[pageIndex] + tile.top + settings.verticalPadding;
            tileLeft = settings.pageLeftOffsets[pageIndex] + tile.left;
        }
        else
        {
            tileTop = settings.pageTopOffsets[pageIndex] + tile.top;
            tileLeft = settings.pageLeftOffsets[pageIndex] + tile.left + settings.horizontalPadding;
        }

        return settings.viewport.intersectsRegion({
            top: tileTop,
            bottom: tileTop + settings.tileHeight,
            left: tileLeft,
            right: tileLeft + settings.tileWidth
        });
    };

    // Check if a tile has been loaded (note: performance-sensitive function)
    var isTileLoaded = function (pageIndex, tileIndex)
    {
        var tiles = self.loadedTiles[pageIndex];

        for (var i = tiles.length; i >= 0; i--)
        {
            if (tiles[i] === tileIndex)
            {
                return true;
            }
        }

        return false;
    };

    // Check if a page is in or near the viewport and thus should be loaded
    var isPageVisible = function (pageIndex)
    {
        var topOfPage = settings.pageTopOffsets[pageIndex];
        var bottomOfPage = topOfPage + getPageData(pageIndex, 'h') + settings.verticalPadding;

        var leftOfPage = settings.pageLeftOffsets[pageIndex];
        var rightOfPage = leftOfPage + getPageData(pageIndex, 'w') + settings.horizontalPadding;

        return settings.viewport.intersectsRegion({
            top: topOfPage,
            bottom: bottomOfPage,
            left: leftOfPage,
            right: rightOfPage
        });
    };

    // Loads page tiles into the supplied canvas.
    var loadTiles = function(pageIndex, filename, width, height, canvasElement)
    {
        var context = canvasElement.getContext('2d');

        function getDrawTileFunction(pageIndex, tileIndex, currentTile, left, top)
        {
            return function()
            {
                self.loadedTiles[pageIndex].push(tileIndex);
                context.drawImage(currentTile, left, top);
            };
        }

        var dims = getPageDimensions(pageIndex);

        // Resize canvas context to new zoom level if necessary before drawing tiles
        if (canvasElement.width !== dims.width)
        {
            canvasElement.width = dims.width;
            canvasElement.height = dims.height;
        }

        var allTilesLoaded = true;

        var tileDimens = {
            height: settings.tileHeight,
            width: settings.tileWidth
        };

        settings.manifest.getPageImageTiles(pageIndex, settings.zoomLevel, tileDimens).forEach(function (tile, tileIndex)
        {
            // this check looks to see if the tile is already loaded, and then if
            // it isn't, if it should be visible.
            if (isTileLoaded(pageIndex, tileIndex, context, tile.left, tile.top))
                return;

            if (!isTileVisible(pageIndex, tile))
            {
                allTilesLoaded = false;
                return;
            }

            var tileImage = new Image();
            tileImage.crossOrigin = "anonymous";

            tileImage.onload = getDrawTileFunction(pageIndex, tileIndex, tileImage, tile.left, tile.top);
            tileImage.src = tile.url;
        });

        self.allTilesLoaded[pageIndex] = allTilesLoaded;
    };

    // There are still tiles to load, so try to load those (after the delay specified in loadPage)
    var loadPageTiles = function (pageIndex, filename, width, height, pageSelector)
    {
        var pageElement = document.getElementById(settings.ID + 'page-' + pageIndex);

        // If the page is no longer in the viewport or loaded, don't load any tiles
        if (pageElement === null || !isPageVisible(pageIndex))
            return;

        var canvasElement = document.getElementById(settings.ID + 'canvas-' + pageIndex);

        loadTiles(pageIndex, filename, width, height, canvasElement);

        diva.Events.publish("PageDidLoad", [pageIndex, filename, pageSelector], viewer);
    };

    // Appends the page directly into the document body, or loads the relevant tiles
    var loadPage = function (pageIndex)
    {
        // If the page and all of its tiles have been loaded, or if we are in book layout and the canvas is non-paged, exit
        if ((self.documentRendering.isPageLoaded(pageIndex) && self.allTilesLoaded[pageIndex]) ||
            (settings.inBookLayout && settings.manifest.paged && !settings.manifest.pages[pageIndex].paged))
            return;

        var isPreloaded = typeof self.pagePreloadCanvases[pageIndex] !== 'undefined';

        // Load some data for this page
        var filename = settings.manifest.pages[pageIndex].f;
        var dims = getPageDimensions(pageIndex);
        var width = dims.width;
        var height = dims.height;
        var pageSelector = settings.selector + 'page-' + pageIndex;

        // If the page has not been loaded yet, append the div to the DOM
        if (!self.documentRendering.isPageLoaded(pageIndex))
        {
            var pageElement = elt('div', {
                id: settings.ID + 'page-' + pageIndex,
                class: 'diva-page diva-document-page',
                style: {
                    width: width + 'px',
                    height: height + 'px'
                },
                'data-index': pageIndex,
                'data-filename': filename
            });

            if (settings.enableImageTitles) pageElement.title = "Page " + (pageIndex + 1);

            // Append page tools
            pageElement.innerHTML = settings.pageTools;

            var canvasElement;

            // Append canvas element
            if (isPreloaded)
            {
                canvasElement = self.pagePreloadCanvases[pageIndex];

                self.pagePreloadCanvases[pageIndex] = undefined;
            }
            else
            {
                canvasElement = elt('canvas', {
                    width: width,
                    height: height
                });
            }

            // FIXME(wabain): Why is this declared after the fact?
            elt.setAttributes(canvasElement, {
                id: settings.ID + 'canvas-' + pageIndex,
                class: 'diva-canvas',
                style: {
                    width: width + 'px',
                    height: height + 'px'
                }
            });

            pageElement.appendChild(canvasElement);

            if (settings.verticallyOriented)
            {
                var heightFromTop = settings.pageTopOffsets[pageIndex] + settings.verticalPadding;
                pageElement.style.top = heightFromTop + 'px';

                if (settings.inBookLayout)
                {
                    pageElement.style.left = settings.pageLeftOffsets[pageIndex] + 'px';
                    if (pageIndex % 2)
                    {
                        pageElement.classList.add('diva-page-book-left');
                    }
                    else
                    {
                        if (pageIndex === 0)
                        {
                            // create a placeholder div for the left side of the first opening
                            var placeholderElement = elt('div', {
                                id: settings.ID + 'page-placeholder',
                                class: 'diva-page diva-document-page',
                                style: {
                                    width: width + 'px',
                                    height: height + 'px',
                                    top: 0,
                                    left: 0 - width + 'px',
                                    border: '1px solid #ccc',
                                    background: '#fdfdfd',
                                    mozBoxSizing: 'border-box',
                                    webkitBoxSizing: 'border-box',
                                    boxSizing: 'border-box'
                                }
                            });

                            // append the placeholder element to page as first child
                            pageElement.appendChild(placeholderElement);
                        }
                        pageElement.classList.add('diva-page-book');
                    }
                }
                else
                {
                    pageElement.classList.add('diva-page-vertical');
                }
            }
            else
            {
                var widthFromLeft = settings.pageLeftOffsets[pageIndex] + settings.horizontalPadding;
                pageElement.style.left = widthFromLeft + 'px';
                pageElement.classList.add('diva-page-horizontal');
            }

            settings.innerElement.appendChild(pageElement);
            diva.Events.publish("PageWillLoad", [pageIndex, filename, pageSelector], viewer);
        }

        if (!isPreloaded)
        {
            self.documentRendering.setPageTimeout(loadPageTiles, settings.pageLoadTimeout, [pageIndex, filename, width, height]);
        }
    };

    var preloadPage = function(pageIndex)
    {
        // Exit if we've already started preloading this page and we're not still zooming
        if (typeof self.pagePreloadCanvases[pageIndex] !== 'undefined' && !settings.isZooming)
            return;

        var filename = settings.manifest.pages[pageIndex].f;
        var dims = getPageDimensions(pageIndex);
        var pageSelector = settings.selector + 'page-' + pageIndex;

        // New off-screen canvas
        var pageCanvas = elt('canvas', dims);

        // If corresponding page is in previousZoomLevelCanvases, copy existing image from previous zoom level, scaled, to canvas
        if (self.previousZoomLevelCanvases && self.previousZoomLevelCanvases[pageIndex])
        {
            var oldCanvas = self.previousZoomLevelCanvases[pageIndex];
            var newCanvasContext = pageCanvas.getContext('2d');
            newCanvasContext.drawImage(oldCanvas, 0, 0, dims.width, dims.height);
        }

        // Load visible page tiles into canvas
        loadTiles(pageIndex, filename, dims.width, dims.height, pageCanvas);

        diva.Events.publish("PageDidLoad", [pageIndex, filename, pageSelector], viewer);

        return pageCanvas;
    };

    // Delete a page from the DOM; will occur when a page is scrolled out of the viewport
    var deletePage = function (pageIndex)
    {
        var theNode = document.getElementById(settings.ID + 'page-' + pageIndex);

        if (theNode === null)
            return;

        while (theNode.firstChild)
        {
            theNode.removeChild(theNode.firstChild);
        }

        //delete loaded tiles
        self.loadedTiles[pageIndex] = [];

        theNode.parentNode.removeChild(theNode);
    };

    // Handles showing and hiding pages when the user scrolls
    // FIXME(wabain): Remove the direction argument if it doesn't end up being needed.
    var adjustPages = function (direction) // jshint ignore:line
    {
        var newRenderedPages = [];

        self.pageGroups.forEach(function (group)
        {
            if (!group.layout.rendered || !settings.viewport.intersectsRegion(group.region))
                return;

            group.layout.pageOffsets.forEach(function (pageOffset)
            {
                var index = pageOffset.index;

                if (isPageVisible(index))
                {
                    loadPage(index);
                    newRenderedPages.push(index);
                }
            });
        });

        if (self.renderedPages)
        {
            self.renderedPages.forEach(function (pageIndex)
            {
                if (newRenderedPages.indexOf(pageIndex) === -1)
                    deletePage(pageIndex);
            });
        }

        self.renderedPages = newRenderedPages;

        updateCurrentPage();
    };

    var updateCurrentPage = function ()
    {
        // FIXME(wabain): Should this happen?
        if (!self.renderedPages || self.renderedPages.length === 0)
            return;

        var centerY = settings.viewport.top + (settings.viewport.height / 2);
        var centerX = settings.viewport.left + (settings.viewport.width / 2);

        // Find the minimum distance from the viewport center to a page.
        // Compute minus the squared distance from viewport center to the page's border.
        // http://gamedev.stackexchange.com/questions/44483/how-do-i-calculate-distance-between-a-point-and-an-axis-aligned-rectangle
        var closestPage = maxBy(self.renderedPages, function (index)
        {
            var dims = getPageDimensions(index);

            var top, left;

            if (settings.verticallyOriented)
            {
                top = settings.pageTopOffsets[index] + settings.verticalPadding;
                left = settings.pageLeftOffsets[index];
            }
            else
            {
                top = settings.pageTopOffsets[index];
                left = settings.pageLeftOffsets[index] + settings.horizontalPadding;
            }

            var midX = left + (dims.height / 2);
            var midY = top + (dims.width / 2);

            var dx = Math.max(Math.abs(centerX - midX) - (dims.width / 2), 0);
            var dy = Math.max(Math.abs(centerY - midY) - (dims.height / 2), 0);

            return -(dx * dx + dy * dy);
        });

        if (closestPage !== settings.currentPageIndex)
        {
            settings.currentPageIndex = closestPage;
            diva.Events.publish("VisiblePageDidChange", [closestPage, settings.manifest.pages[closestPage].f], viewer);
        }
    };

    var calculateDesiredScroll = function(pageIndex, verticalOffset, horizontalOffset)
    {
        // convert offsets to 0 if undefined
        horizontalOffset = (typeof horizontalOffset !== 'undefined') ? horizontalOffset : 0;
        verticalOffset = (typeof verticalOffset !== 'undefined') ? verticalOffset : 0;

        var desiredVerticalCenter = settings.pageTopOffsets[pageIndex] + verticalOffset;
        var desiredTop = desiredVerticalCenter - parseInt(settings.panelHeight / 2, 10);

        var desiredHorizontalCenter = settings.pageLeftOffsets[pageIndex] + horizontalOffset;
        var desiredLeft = desiredHorizontalCenter - parseInt(settings.panelWidth / 2, 10);

        return {
            top: desiredTop,
            left: desiredLeft
        };
    };

    // Helper function for going to a particular page
    // Vertical offset: from center of diva element to top of current page
    // Horizontal offset: from the center of the page; can be negative if to the left
    var gotoPage = function (pageIndex, verticalOffset, horizontalOffset)
    {
        var desiredScroll = calculateDesiredScroll(pageIndex, verticalOffset, horizontalOffset);

        settings.viewport.top = desiredScroll.top;
        settings.viewport.left = desiredScroll.left;

        // Pretend that this is the current page
        if (pageIndex !== settings.currentPageIndex)
        {
            settings.currentPageIndex = pageIndex;
            var filename = settings.manifest.pages[pageIndex].f;

            diva.Events.publish("VisiblePageDidChange", [pageIndex, filename], viewer);
        }

        diva.Events.publish("ViewerDidJump", [pageIndex], viewer);
    };

    var calculateDocumentLayout = function()
    {
        var docLayout = getDocumentLayout();

        self.documentDimensions = docLayout.dimensions;
        self.pageGroups = docLayout.pageGroups;

        var offsets = getPageOffsets(docLayout.pageGroups);

        settings.pageTopOffsets = offsets.map(function (offset)
        {
            return offset.top;
        });

        settings.pageLeftOffsets = offsets.map(function (offset)
        {
            return offset.left;
        });
    };

    var getPageOffsets = function(pageGroups)
    {
        var offsets = [];

        pageGroups.forEach(function (group)
        {
            // Handle non-paged entries in book layout
            // FIXME(wabain): Handle this better
            if (!group.layout.rendered)
            {
                group.layout.pageOffsets.forEach(function ()
                {
                    offsets.push({
                        top: -1,
                        left: -1
                    });
                });

                return;
            }

            group.layout.pageOffsets.forEach(function (pageOffset)
            {
                offsets.push({
                    top: group.region.top + pageOffset.top,
                    left: group.region.left + pageOffset.left
                });
            });
        });

        return offsets;
    };

    var getDocumentLayout = function ()
    {
        // Get layout groups for the current view
        var layouts;

        if (settings.inBookLayout)
            layouts = getBookLayoutGroups();
        else
            layouts = getSinglesLayoutGroups();

        // Now turn layouts into concrete regions

        var documentSecondaryExtent = getExtentAlongSecondaryAxis(layouts);

        // The current position in the document along the primary axis
        var primaryDocPosition = 0;

        var pageGroups = [];

        layouts.forEach(function (layout)
        {
            if (!layout.rendered)
            {
                pageGroups.push({
                    region: {
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0
                    },
                    layout: layout
                });

                return;
            }

            var region;

            if (settings.verticallyOriented)
            {
                var left = (documentSecondaryExtent - layout.width) / 2;

                region = {
                    top: primaryDocPosition,
                    bottom: primaryDocPosition + layout.height + settings.verticalPadding,
                    left: left,
                    right: left + layout.width
                };

                primaryDocPosition = region.bottom;
            }
            else
            {
                var top = (documentSecondaryExtent - layout.height) / 2;

                region = {
                    top: top,
                    bottom: top + layout.height,
                    left: primaryDocPosition,
                    right: primaryDocPosition + layout.width + settings.horizontalPadding
                };

                primaryDocPosition = region.right;
            }

            pageGroups.push({
                layout: layout,
                region: region
            });
        });

        var height, width;

        if (settings.verticallyOriented)
        {
            height = primaryDocPosition + settings.verticalPadding;
            width = documentSecondaryExtent;
        }
        else
        {
            height = documentSecondaryExtent;
            width = primaryDocPosition + settings.horizontalPadding;
        }

        return {
            dimensions: {
                height: height,
                width: width
            },
            pageGroups: pageGroups
        };
    };

    var getSinglesLayoutGroups = function ()
    {
        // Render each page alone in a group
        return settings.manifest.pages.map(function (_, i)
        {
            var pageDims = getPageDimensions(i);

            return extend({
                rendered: true,
                pageOffsets: [
                    {index: i, top: 0, left: 0}
                ]
            }, pageDims);
        });
    };

    var getBookLayoutGroups = function ()
    {
        var groups = [];
        var leftPage = null;

        settings.manifest.pages.forEach(function (page, index)
        {
            // Skip non-paged canvases in a paged manifest.
            // NB: If there is currently a pending left page, then it will form
            // an opening with the following page. This seems to be desired behaviour.
            if (settings.manifest.paged && !page.paged)
            {
                groups.push({
                    rendered: false,
                    width: 0,
                    height: 0,
                    pageOffsets: [{
                        index: index,
                        top: 0,
                        left: 0
                    }]
                });

                return;
            }

            var pageDims = getPageDimensions(index, { round: false });

            if (settings.verticallyOriented && index === 0)
            {
                // The first page is placed on its own to the right
                groups.push({
                    rendered: true,
                    height: pageDims.height,
                    width: pageDims.width * 2,
                    pageOffsets: [{
                        index: 0,
                        top: 0,
                        left: pageDims.width
                    }]
                });

                return;
            }

            if (leftPage === null)
            {
                leftPage = extend({
                    index: index
                }, pageDims);

                return;
            }

            groups.push(getFacingPageGroup(leftPage, extend({
                index: index
            }, pageDims)));

            leftPage = null;
        });

        // Flush a final left page
        if (leftPage !== null)
        {
            groups.push({
                rendered: true,
                height: leftPage.height,
                width: leftPage.width * 2,
                pageOffsets: [{
                    index: leftPage.index,
                    top: 0,
                    left: 0
                }]
            });
        }

        return groups;
    };

    var getFacingPageGroup = function (leftPage, rightPage)
    {
        var height = Math.max(leftPage.height, rightPage.height);

        var width, firstLeftOffset, secondLeftOffset;

        if (settings.verticallyOriented)
        {
            var midWidth = Math.max(leftPage.width, rightPage.width);

            width = midWidth * 2;

            firstLeftOffset = midWidth - leftPage.width;
            secondLeftOffset = midWidth;
        }
        else
        {
            width = leftPage.width + rightPage.width;
            firstLeftOffset = 0;
            secondLeftOffset = leftPage.width;
        }

        return {
            rendered: true,
            height: height,
            width: width,
            pageOffsets: [
                {
                    index: leftPage.index,
                    top: 0,
                    left: firstLeftOffset
                },
                {
                    index: rightPage.index,
                    top: 0,
                    left: secondLeftOffset
                }
            ]
        };
    };

    var getExtentAlongSecondaryAxis = function (layouts)
    {
        // Get the extent of the document along the secondary axis
        var secondaryDim, secondaryPadding;

        if (settings.verticallyOriented)
        {
            secondaryDim = 'width';
            secondaryPadding = settings.horizontalPadding;
        }
        else
        {
            secondaryDim = 'width';
            secondaryPadding = settings.verticalPadding;
        }

        return (2 * secondaryPadding) + layouts.reduce(function (maxDim, layout)
        {
            return Math.max(layout[secondaryDim], maxDim);
        }, 0);
    };

    // Called every time we need to load document view (after zooming, fullscreen, etc)
    var loadDocument = function ()
    {
        diva.Events.publish('DocumentWillLoad', [settings], viewer);

        self.previousZoomLevelCanvases = null;

        if (self.documentRendering)
            self.documentRendering.destroy();

        self.documentRendering = new DocumentRendering({
            element: settings.innerElement,
            ID: settings.ID
        });

        resetTilesLoaded();

        // FIXME(wabain): Optimize case where this was computed in preloadCanvases
        // Calculate page layout (self.documentDimensions, self.pageGroups, settings.pageTopOffsets, settings.pageLeftOffsets)
        calculateDocumentLayout();

        var dims = self.documentDimensions;

        var documentSize = {
            height: Math.round(dims.height) + 'px',
            width: Math.round(dims.width) + 'px'
        };

        if (settings.verticallyOriented)
            documentSize.minWidth = settings.panelWidth + 'px';
        else
            documentSize.minHeight = settings.panelHeight + 'px';

        self.documentRendering.setDocumentSize(documentSize);

        // In book view, determine the total height/width based on the last opening's height/width and offset
        var lastPageIndex = settings.numPages - 1;

        // FIXME: This block should be folded into the preceding one so that dimensions are only calculated once
        if (settings.inBookLayout)
        {
            if (settings.verticallyOriented)
            {
                // Last opening height is the max height of the last two pages if they are an opening, else the height of the last page since it's on its own on the left
                // If the last page is page 0, then it's on its own on the right
                var lastOpeningHeight = (lastPageIndex % 2 || lastPageIndex === 0) ? getPageData(lastPageIndex, 'h') : Math.max(getPageData(lastPageIndex, 'h'), getPageData(lastPageIndex - 1, 'h'));
                settings.innerElement.style.height = settings.pageTopOffsets[lastPageIndex] + lastOpeningHeight + (settings.verticalPadding * 2) + 'px';
            }
            else
            {
                settings.innerElement.style.width = settings.pageLeftOffsets[lastPageIndex] + getPageData(lastPageIndex, 'w') + (settings.horizontalPadding * 2) + 'px';
            }
        }

        // Make sure the value for settings.goDirectlyTo is valid
        if (!isPageValid(settings.goDirectlyTo))
        {
            settings.goDirectlyTo = 0;
        }

        // Scroll to the proper place using stored y/x offsets (relative to the center of the page)
        gotoPage(settings.goDirectlyTo, settings.verticalOffset, settings.horizontalOffset);

        // Load the visible pages
        adjustPages(0);

        // If this is not the initial load, trigger the zoom events
        if (settings.oldZoomLevel >= 0)
        {
            var zoomLevel = settings.zoomLevel;

            if (settings.oldZoomLevel < settings.zoomLevel)
            {
                diva.Events.publish("ViewerDidZoomIn", [zoomLevel], viewer);
            }
            else
            {
                diva.Events.publish("ViewerDidZoomOut", [zoomLevel], viewer);
            }

            diva.Events.publish("ViewerDidZoom", [zoomLevel], viewer);
        }
        else
        {
            settings.oldZoomLevel = settings.zoomLevel;
        }

        // For the iPad - wait until this request finishes before accepting others
        if (settings.scaleWait)
            settings.scaleWait = false;

        var fileName = settings.manifest.pages[settings.currentPageIndex].f;
        diva.Events.publish("DocumentDidLoad", [settings.currentPageIndex, fileName], viewer);
    };

    var resetTilesLoaded = function ()
    {
        self.loadedTiles = new Array(settings.numPages);
        var i = settings.numPages;

        while (i--)
        {
            self.loadedTiles[i] = [];
        }
    };

    var preloadPages = function()
    {
        var pageBlockFound;

        // Before the first zoom, save currently visible canvases in previousZoomLevelCanvases so preloadPages can start drawing overtop the existing page data
        if (!self.previousZoomLevelCanvases)
        {
            self.previousZoomLevelCanvases = {};
            pageBlockFound = false;

            for (var pageIndex = 0; pageIndex < settings.numPages; pageIndex++)
            {
                if (settings.viewRendering.isPageVisible(pageIndex))
                {
                    self.previousZoomLevelCanvases[pageIndex] = document.getElementById(settings.ID + 'canvas-' + pageIndex);
                    pageBlockFound = true;
                }
                else if (pageBlockFound)
                {
                    break;
                }
            }
        }

        //1. determine visible pages at new zoom level
        //    a. recalculate page layout at new zoom level
        calculateDocumentLayout();

        //    b. for all pages (see loadDocument)
        //        i) if page coords fall within visible coords, add to visible page block
        pageBlockFound = false;

        for (var i = 0; i < settings.numPages; i++)
        {
            // FIXME(wabain): This doesn't fully account for viewport changes
            if (isPageVisible(i))
            {
                // it will be visible, start loading it at the new zoom level into an offscreen canvas
                self.pagePreloadCanvases[i] = preloadPage(i);
                pageBlockFound = true;
            }
            else if (pageBlockFound) // There will only be one consecutive block of pages to load; once we find a page that's invisible, we can terminate this loop.
            {
                break;
            }
        }
    };

    var isPageLoaded = function (pageIndex)
    {
        return self.documentRendering.isPageLoaded(pageIndex);
    };

    var getPageDimensions = function (pageIndex, options)
    {
        var width = Math.floor(getPageData(pageIndex, 'w'));
        var height = Math.floor(getPageData(pageIndex, 'h'));

        var round = !options || options.round;

        if (round)
        {
            return {
                width: Math.floor(width),
                height: Math.floor(height)
            };
        }

        return {
            width: width,
            height: height
        };
    };

    var getPageToViewportOffset = function ()
    {
        var scrollLeft = settings.viewport.left;
        var elementWidth = settings.panelWidth;

        var x = scrollLeft - settings.pageLeftOffsets[settings.currentPageIndex] + parseInt(elementWidth / 2, 10);

        var scrollTop = settings.viewport.top;
        var elementHeight = settings.panelHeight;

        var y = scrollTop - settings.pageTopOffsets[settings.currentPageIndex] + parseInt(elementHeight / 2, 10);

        return {
            x: x,
            y: y
        };
    };

    var destroy = function ()
    {
        self.documentRendering.destroy();
    };

    this.load = loadDocument;
    this.adjust = adjustPages;
    this.goto = gotoPage;
    this.preload = preloadPages;
    this.isPageVisible = isPageVisible;
    this.isPageLoaded = isPageLoaded;
    this.getPageDimensions = getPageDimensions;
    this.getPageToViewportOffset = getPageToViewportOffset;
    this.destroy = destroy;
}

SequenceRendering.getCompatibilityErrors = function ()
{
    if (supportsCanvas())
        return null;

    return ['Your browser lacks support for the ', elt('pre', 'canvas'), ' element. Please upgrade your browser.'];
};

var supportsCanvas = (function ()
{
    var isSupported = null;

    function getSupport()
    {
        var canvas = elt('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
    }

    return function ()
    {
        if (isSupported === null)
            isSupported = getSupport();

        return isSupported;
    };
})();
