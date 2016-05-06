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
    self.firstPageLoaded = -1;
    self.lastPageLoaded = -1;
    self.pagePreloadCanvases = [];

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

        //resize canvas context to new zoom level if necessary before drawing tiles
        // if context width is wrong, set it to h and w.
        if (canvasElement.width !== Math.floor(getPageData(pageIndex, 'w')))
        {
            canvasElement.width = Math.floor(getPageData(pageIndex, 'w'));
            canvasElement.height = Math.floor(getPageData(pageIndex, 'h'));
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
        var width = Math.floor(getPageData(pageIndex, 'w'));
        var height = Math.floor(getPageData(pageIndex, 'h'));
        var heightFromTop = settings.pageTopOffsets[pageIndex] + settings.verticalPadding;
        var widthFromLeft = settings.pageLeftOffsets[pageIndex] + settings.horizontalPadding;
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
                pageElement.style.top = heightFromTop + 'px';

                if (settings.inBookLayout)
                {
                    pageElement.style.left = widthFromLeft + 'px';
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
        var width = Math.floor(getPageData(pageIndex, 'w'));
        var height = Math.floor(getPageData(pageIndex, 'h'));
        var pageSelector = settings.selector + 'page-' + pageIndex;

        // New off-screen canvas
        var pageCanvas = elt('canvas', {
            width: width,
            height: height
        });

        // If corresponding page is in previousZoomLevelCanvases, copy existing image from previous zoom level, scaled, to canvas
        if (settings.previousZoomLevelCanvases[pageIndex])
        {
            var oldCanvas = settings.previousZoomLevelCanvases[pageIndex];
            var newCanvasContext = pageCanvas.getContext('2d');
            newCanvasContext.drawImage(oldCanvas, 0, 0, width, height);
        }

        // Load visible page tiles into canvas
        loadTiles(pageIndex, filename, width, height, pageCanvas);

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

    // Check if the bottom of a page is above the top of a viewport (scrolling down)
    // For when you want to keep looping but don't want to load a specific page
    var pageAboveViewport = function (pageIndex)
    {
        var bottomOfPage = settings.pageTopOffsets[pageIndex] + getPageData(pageIndex, 'h') + settings.verticalPadding;
        return bottomOfPage < settings.viewport.top;
    };

    // Check if the top of a page is below the bottom of a viewport (scrolling up)
    var pageBelowViewport = function (pageIndex)
    {
        var topOfPage = settings.pageTopOffsets[pageIndex];
        return topOfPage > settings.viewport.bottom;
    };

    // Check if the left side of a page is to the left of a viewport (scrolling right)
    // For when you want to keep looping but don't want to load a specific page
    var pageLeftOfViewport = function (pageIndex)
    {
        var rightOfPage = settings.pageLeftOffsets[pageIndex] + getPageData(pageIndex, 'w') + settings.horizontalPadding;
        return rightOfPage < settings.viewport.left;
    };

    // Check if the right side of a page is to the right of a viewport (scrolling left)
    var pageRightOfViewport = function (pageIndex)
    {
        var leftOfPage = settings.pageLeftOffsets[pageIndex];
        return leftOfPage > settings.viewport.right;
    };

    //shorthand functions to determine which is the right "before" viewport function to use
    var pageBeforeViewport = function (pageIndex)
    {
        return (settings.verticallyOriented ? pageAboveViewport(pageIndex) : pageLeftOfViewport(pageIndex));
    };

    //shorthand functions to determine which is the right "after" viewport function to use
    var pageAfterViewport = function (pageIndex)
    {
        return (settings.verticallyOriented ? pageBelowViewport(pageIndex) : pageRightOfViewport(pageIndex));
    };

    // Called by adjust pages - determine what pages should be visible, and show them
    var attemptPageShow = function (pageIndex, direction)
    {
        if (isPageValid(pageIndex))
        {
            if (direction > 0)
            {
                // Direction is positive - we're scrolling down
                // If the page should be visible, then yes, add it
                if (isPageVisible(pageIndex))
                {
                    loadPage(pageIndex);
                    self.lastPageLoaded = pageIndex;

                    // Recursively call this function until there's nothing to add
                    attemptPageShow(self.lastPageLoaded + 1, direction);
                }
                else if (isPageValid(pageIndex + 1) && isPageVisible(pageIndex + 1))
                {
                    loadPage(pageIndex + 1);
                    self.lastPageLoaded = pageIndex + 1;

                    // Recursively call this function until there's nothing to add
                    attemptPageShow(self.lastPageLoaded + 1, direction);
                }
                else if (pageBeforeViewport(pageIndex))
                {
                    // If the page is below the viewport. try to load the next one
                    attemptPageShow(pageIndex + 1, direction);
                }
            }
            else
            {
                // Direction is negative - we're scrolling up
                // If it's near the viewport, yes, add it
                if (isPageVisible(pageIndex))
                {
                    loadPage(pageIndex);

                    // Reset the first page loaded to this one
                    self.firstPageLoaded = pageIndex;

                    // Recursively call this function until there's nothing to add
                    attemptPageShow(self.firstPageLoaded - 1, direction);
                }
                else if (isPageValid(pageIndex - 1) && isPageVisible(pageIndex - 1))
                {
                    loadPage(pageIndex - 1);
                    self.firstPageLoaded = pageIndex - 1;

                    // Recursively call this function until there's nothing to add
                    attemptPageShow(self.firstPageLoaded - 1, direction);
                }
                else if (pageAfterViewport(pageIndex))
                {
                    // Attempt to call this on the next page, do not increment anything
                    attemptPageShow(pageIndex - 1, direction);
                }
            }
        }
    };

    // Called by adjustPages - see what pages need to be hidden, and hide them
    var attemptPageHide = function (pageIndex, direction)
    {
        if (direction > 0)
        {
            // Scrolling down - see if this page needs to be deleted from the DOM
            if (isPageValid(pageIndex) && pageBeforeViewport(pageIndex))
            {
                // Yes, delete it, reset the first page loaded
                deletePage(pageIndex);
                self.firstPageLoaded = pageIndex + 1;

                // Try to call this function recursively until there's nothing to delete
                attemptPageHide(self.firstPageLoaded, direction);
            }
        }
        else
        {
            // Direction must be negative (not 0 - see adjustPages), we're scrolling up
            if (isPageValid(pageIndex) && pageAfterViewport(pageIndex))
            {
                // Yes, delete it, reset the last page loaded
                deletePage(pageIndex);
                self.lastPageLoaded = pageIndex - 1;

                // Try to call this function recursively until there's nothing to delete
                attemptPageHide(self.lastPageLoaded, direction);
            }
        }
    };

    // Handles showing and hiding pages when the user scrolls
    var adjustPages = function (direction)
    {
        var i;

        if (direction < 0)
        {
            // Direction is negative, so we're scrolling up/left (doesn't matter for these calls)
            // Attempt showing pages in ascending order starting from the last visible page in the viewport
            attemptPageShow(self.lastPageLoaded, direction);
            setCurrentPage(-1);
            attemptPageHide(self.lastPageLoaded, direction);
        }
        else if (direction > 0)
        {
            // Direction is positive so we're scrolling down/right (doesn't matter for these calls)
            // Attempt showing pages in descending order starting from the first visible page in the viewport
            attemptPageShow(self.firstPageLoaded, direction);
            setCurrentPage(1);
            attemptPageHide(self.firstPageLoaded, direction);
        }
        else
        {
            if (settings.inBookLayout)
            {
                setCurrentPage(0);
            }

            // Non-primary scroll, check if we need to reveal any tiles
            var lpl = self.lastPageLoaded;
            for (i = Math.max(self.firstPageLoaded, 0); i <= lpl; i++)
            {
                if (isPageVisible(i))
                    loadPage(i);
            }
        }

        var scrollSoFar = (settings.verticallyOriented ? settings.viewport.top : settings.viewport.left);

        diva.Events.publish("ViewerDidScroll", [scrollSoFar], viewer);

        if (direction > 0)
        {
            // scrolling forwards
            diva.Events.publish("ViewerDidScrollDown", [scrollSoFar], viewer);
        }
        else if (direction < 0)
        {
            // scrolling backwards
            diva.Events.publish("ViewerDidScrollUp", [scrollSoFar], viewer);
        }
    };

    // Clamp pages to those with 'viewingHint: paged' === true (applicable only when document viewingHint === 'paged', see IIIF Presentation API 2.0)
    // Traverses pages in the specified direction looking for the closest visible page
    var getClosestVisiblePage = function(pageIndex, direction)
    {
        var totalPages = settings.numPages;

        if (settings.manifest.paged && settings.inBookLayout)
        {
            while (pageIndex > 0 && pageIndex < totalPages)
            {
                if (settings.manifest.pages[pageIndex].paged)
                {
                    return pageIndex;
                }

                pageIndex += direction;
            }
        }

        return pageIndex;
    };

    // Determines and sets the "current page" (settings.currentPageIndex); called within adjustPages
    // The "direction" is either 1 (downward scroll) or -1 (upward scroll)
    var setCurrentPage = function (direction)
    {
        var currentPage = settings.currentPageIndex;
        var pageToConsider = currentPage + direction;
        var viewport = settings.viewport;

        pageToConsider = getClosestVisiblePage(pageToConsider, direction);

        if (!isPageValid(pageToConsider))
            return false;

        var middleOfViewport = (settings.verticallyOriented ? viewport.top + (settings.panelHeight / 2) : viewport.left + (settings.panelWidth / 2));
        var verticalMiddleOfViewport = viewport.left + (settings.panelWidth / 2);
        var changeCurrentPage = false;

        if (direction < 0)
        {
            // When scrolling forwards:
            // If the previous page > middle of viewport
            if (settings.verticallyOriented)
            {
                if (pageToConsider >= 0 && (settings.pageTopOffsets[pageToConsider] + getPageData(pageToConsider, 'h') + (settings.verticalPadding) >= middleOfViewport))
                {
                    changeCurrentPage = true;
                }
            }
            else
            {
                if (pageToConsider >= 0 && (settings.pageLeftOffsets[pageToConsider] + getPageData(pageToConsider, 'w') + (settings.horizontalPadding) >= middleOfViewport))
                {
                    changeCurrentPage = true;
                }
            }
        }
        else if (direction > 0)
        {
            // When scrolling backwards:
            // If this page < middle of viewport
            if (settings.verticallyOriented)
            {
                if (settings.pageTopOffsets[currentPage] + getPageData(currentPage, 'h') + settings.verticalPadding < middleOfViewport)
                {
                    changeCurrentPage = true;
                }
            }
            else
            {
                if (settings.pageLeftOffsets[currentPage] + getPageData(currentPage, 'w') + settings.horizontalPadding < middleOfViewport)
                {
                    changeCurrentPage = true;
                }
            }
        }

        if (settings.inBookLayout && settings.verticallyOriented)
        {
            // if the viewer is scrolled to the rightmost side, switch the current page to that on the right. if less, choose the page on the left.
            var isScrolledToRight = verticalMiddleOfViewport > settings.manifest.getMaxWidth(settings.zoomLevel);
            var bookDirection = (isScrolledToRight) ? 1 : -1;
            var bookPageToConsider = currentPage + bookDirection;
            var isValidPagePosition;

            bookPageToConsider = getClosestVisiblePage(bookPageToConsider, bookDirection);

            if (isScrolledToRight)
            {
                // the viewer is scrolled to the rightmost page, switch to next page if it's on the right
                isValidPagePosition = settings.pageLeftOffsets[bookPageToConsider] >= (settings.manifest.getMaxWidth(settings.zoomLevel) / 2);
            }
            else
            {
                // the viewer is scrolled to the leftmost page, switch to previous page if it's on the left
                isValidPagePosition = settings.pageLeftOffsets[bookPageToConsider] < (settings.manifest.getMaxWidth(settings.zoomLevel) / 2);
            }

            if (isValidPagePosition && bookPageToConsider !== settings.currentPageIndex)
            {
                settings.currentPageIndex = bookPageToConsider;
                diva.Events.publish("VisiblePageDidChange", [bookPageToConsider, settings.manifest.pages[bookPageToConsider].f], viewer);
            }
        }

        if (changeCurrentPage)
        {
            // Set this to the current page
            settings.currentPageIndex = pageToConsider;
            // Now try to change the next page, given that we're not going to a specific page
            // Calls itself recursively - this way we accurately obtain the current page
            if (direction !== 0)
            {
                if (!setCurrentPage(direction))
                {
                    var filename = settings.manifest.pages[pageToConsider].f;
                    diva.Events.publish("VisiblePageDidChange", [pageToConsider, filename], viewer);
                }
            }
            return true;
        }

        return false;
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

    var calculatePageOffsets = function(widthToSet, heightToSet)
    {
        // Set settings.pageTopOffsets/pageLeftOffsets to determine where we're going to need to scroll, reset them in case they were used for grid before
        var heightSoFar = 0;
        var widthSoFar = 0;
        var i;

        settings.pageTopOffsets = [];
        settings.pageLeftOffsets = [];

        if (settings.inBookLayout)
        {
            var isLeft = false;

            if (settings.verticallyOriented)
            {
                for (i = 0; i < settings.numPages; i++)
                {
                    //set the height above that page counting only every other page and excluding non-paged canvases
                    //height of this 'row' = max(height of the pages in this row)

                    settings.pageTopOffsets[i] = heightSoFar;

                    if (isLeft)
                    {
                        //page on the left
                        settings.pageLeftOffsets[i] = (widthToSet / 2) - getPageData(i, 'w') - settings.horizontalPadding;
                    }
                    else
                    {
                        //page on the right
                        settings.pageLeftOffsets[i] = (widthToSet / 2) - settings.horizontalPadding;

                        //increment the height
                        if (!settings.manifest.paged || settings.manifest.pages[i].paged)
                        {
                            var pageHeight = (isPageValid(i - 1)) ? Math.max(getPageData(i, 'h'), getPageData(i - 1, 'h')) : getPageData(i, 'h');
                            heightSoFar = settings.pageTopOffsets[i] + pageHeight + settings.verticalPadding;
                        }
                    }

                    //don't include non-paged canvases in layout calculation
                    if (!settings.manifest.paged || settings.manifest.pages[i].paged)
                        isLeft = !isLeft;
                }
            }
            else
            {
                // book, horizontally oriented
                for (i = 0; i < settings.numPages; i++)
                {
                    settings.pageTopOffsets[i] = parseInt((heightToSet - getPageData(i, 'h')) / 2, 10);
                    settings.pageLeftOffsets[i] = widthSoFar;

                    var pageWidth = getPageData(i, 'w');
                    var padding = (isLeft) ? 0 : settings.horizontalPadding;
                    widthSoFar = settings.pageLeftOffsets[i] + pageWidth + padding;

                    if (!settings.manifest.paged || settings.manifest.pages[i].paged)
                        isLeft = !isLeft;
                }
            }
        }
        else
        {
            for (i = 0; i < settings.numPages; i++)
            {
                // First set the height above that page by adding this height to the previous total
                // A page includes the padding above it
                settings.pageTopOffsets[i] = parseInt(settings.verticallyOriented ? heightSoFar : (heightToSet - getPageData(i, 'h')) / 2, 10);
                settings.pageLeftOffsets[i] = parseInt(settings.verticallyOriented ? (widthToSet - getPageData(i, 'w')) / 2 : widthSoFar, 10);

                // Has to be done this way otherwise you get the height of the page included too
                heightSoFar = settings.pageTopOffsets[i] + getPageData(i, 'h') + settings.verticalPadding;
                widthSoFar = settings.pageLeftOffsets[i] + getPageData(i, 'w') + settings.horizontalPadding;
            }
        }
    };

    var calculateDocumentDimensions = function(zoomLevel)
    {
        var widthToSet;

        if (settings.inBookLayout)
            widthToSet = (settings.manifest.getMaxWidth(zoomLevel) + settings.horizontalPadding) * 2;
        else
            widthToSet = settings.manifest.getMaxWidth(zoomLevel) + settings.horizontalPadding * 2;

        var heightToSet = settings.manifest.getMaxHeight(zoomLevel) + settings.verticalPadding * 2;

        return {
            widthToSet: widthToSet,
            heightToSet: heightToSet
        };
    };

    // Called every time we need to load document view (after zooming, fullscreen, etc)
    var loadDocument = function ()
    {
        diva.Events.publish('DocumentWillLoad', [settings], viewer);

        if (self.documentRendering)
            self.documentRendering.destroy();

        self.documentRendering = new DocumentRendering({
            element: settings.innerElement,
            ID: settings.ID
        });

        this.firstPageLoaded = 0;
        resetTilesLoaded();

        var z = settings.zoomLevel;

        //TODO skip this if we just zoomed (happens in preloadPages)
        // Determine the length of the non-primary dimension of the inner element
        var documentDimensions = calculateDocumentDimensions(z);

        settings.totalHeight = settings.manifest.getTotalHeight(z) + settings.verticalPadding * (settings.numPages + 1);
        settings.totalWidth = settings.manifest.getTotalWidth(z) + settings.horizontalPadding * (settings.numPages + 1);

        // Calculate page layout (settings.pageTopOffsets, settings.pageLeftOffsets)
        calculatePageOffsets(documentDimensions.widthToSet, documentDimensions.heightToSet);

        if (settings.verticallyOriented)
        {
            self.documentRendering.setDocumentSize({
                height: Math.round(settings.totalHeight) + 'px',
                width: Math.round(documentDimensions.widthToSet) + 'px',
                minWidth: settings.panelWidth + 'px'
            });
        }
        else
        {
            self.documentRendering.setDocumentSize({
                height: Math.round(documentDimensions.heightToSet) + 'px',
                minHeight: settings.panelHeight + 'px',
                width: Math.round(settings.totalWidth) + 'px'
            });
        }

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

        // Once the viewport is aligned, we can determine which pages will be visible and load them
        var pageBlockFound = false;

        for (var i = 0; i < settings.numPages; i++)
        {
            if (isPageVisible(i))
            {
                loadPage(i);

                self.lastPageLoaded = i;
                pageBlockFound = true;
            }
            else if (pageBlockFound) // There will only be one consecutive block of pages to load; once we find a page that's invisible, we can terminate this loop.
            {
                break;
            }
        }

        // If this is not the initial load, trigger the zoom events
        if (settings.oldZoomLevel >= 0)
        {
            if (settings.oldZoomLevel < settings.zoomLevel)
            {
                diva.Events.publish("ViewerDidZoomIn", [z], viewer);
            }
            else
            {
                diva.Events.publish("ViewerDidZoomOut", [z], viewer);
            }

            diva.Events.publish("ViewerDidZoom", [z], viewer);
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
        //1. determine visible pages at new zoom level
        //    a. recalculate page layout at new zoom level
        var documentDimensions = calculateDocumentDimensions(settings.zoomLevel);
        calculatePageOffsets(documentDimensions.widthToSet, documentDimensions.heightToSet);

        //    b. for all pages (see loadDocument)
        //        i) if page coords fall within visible coords, add to visible page block
        var pageBlockFound = false;

        for (var i = 0; i < settings.numPages; i++)
        {
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

    var getPageDimensions = function (pageIndex)
    {
        return {
            width: Math.floor(getPageData(pageIndex, 'w')),
            height: Math.floor(getPageData(pageIndex, 'h'))
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
