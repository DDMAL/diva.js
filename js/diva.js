/*
Copyright (C) 2011 by Wendy Liu, Andrew Hankinson, Laurent Pugin

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

// this pattern was taken from http://www.virgentech.com/blog/2009/10/building-object-oriented-jquery-plugin.html
(function( $ ) {
    var Diva = function(element, options) {
        // These are elements that can be overridden upon instantiation
        var defaults =  {
            adaptivePadding: 0.05,      // The ratio of padding to the page dimension
            backendServer: '',          // The URL to the script returning the JSON data; mandatory
            enableAutoTitle: true,      // Shows the title within a div of id diva-title
            enableFullscreen: true,     // Enable or disable fullscreen mode
            enableGotoPage: true,       // A "go to page" jump box
            enableGrid: true,           // A grid view of all the pages
            enableGridSlider: true,     // Slider to control the pages per grid row
            enableKeyScroll: true,      // Scrolling using the page up/down keys
            enableSpaceScroll: false,   // Scrolling down by pressing the space key
            enableZoomSlider: true,     // Enable or disable the zoom slider (for zooming in and out)
            fixedPadding: 10,           // Fallback if adaptive padding is set to 0
            iipServerBaseUrl: '',       // The URL to the IIPImage installation, including the ?FIF=
            maxPagesPerRow: 8,          // Maximum number of pages per row, grid view
            maxZoomLevel: 0,            // Optional; defaults to the max zoom returned in the JSON response
            minPagesPerRow: 2,          // 2 for the spread view. Recommended to leave it
            minZoomLevel: 0,            // Defaults to 0 (the minimum zoom)
            onFullscreen: null,         // Callback for toggling fullscreen
            onFullscreenEnter: null,    // Callback for entering fullscreen mode
            onFullscreenExit: null,     // Callback for exiting fullscreen mode
            onJump: null,               // Callback function for jumping to a specific page (using the gotoPage feature)
            onReady: null,              // Callback function for initial load
            onScroll: null,             // Callback function for scrolling
            onScrollDown: null,         // Callback function for scrolling down, only
            onScrollUp: null,           // Callback function for scrolling up only
            onZoom: null,               // Callback function for zooming in general
            onZoomIn: null,             // Callback function for zooming in only
            onZoomOut: null,            // Callback function for zooming out only
            pagesPerRow: 5,         // The default number of pages per row in grid view
            tileFadeSpeed: 300,         // The tile fade-in speed in ms. Set to 0 to disable tile fading. May also be "fast" or "slow".
            tileHeight: 256,            // The height of each tile, in pixels; usually 256
            tileWidth: 256,             // The width of each tile, in pixels; usually 256
            viewportMargin: 200,        // Pretend tiles +/- 200px away from viewport are in
            zoomLevel: 2                // The initial zoom level (used to store the current zoom level)
        };
        
        // Apply the defaults, or override them with passed-in options.
        var settings = $.extend({}, defaults, options);

        // Things that cannot be changed because of the way they are used by the script
        // Many of these are declared with arbitrary values that are changed later on
        var globals = {
            centerX: 0,                 // Only used if doubleClick is true - for zooming in
            centerY: 0,                 // Y-coordinate, see above
            currentPageIndex: 0,        // The current page in the viewport (center-most page)
            dimAfterZoom: 0,            // Used for storing the item dimensions after zooming
            dimBeforeZoom: 0,           // Used for storing the item dimensions before zooming
            doubleClick: false,         // If the zoom has been triggered by a double-click event
            elementSelector: '',        // The ID of the element plus the # for easy selection, set in init()
            firstAjaxRequest: true,     // True initially, set to false after the first request
            firstPageLoaded: -1,        // The ID of the first page loaded (value set later)
            firstRowLoaded: -1,         // The index of the first row loaded
            fullscreenStatusbar: null,  // The popup box that tells you what page you're on
            goDirectlyTo: 0,            // For the page hash param (#p=100 or &p=5)
            heightAbovePages: [],       // The height above each page
            horizontalOffset: 0,        // Used for storing the page offset before zooming
            horizontalPadding: 0,       // Either the fixed padding or adaptive padding
            ID: null,                   // The prefix of the IDs of the elements (usually 1-diva-)
            inFullscreen: false,        // Set to true when the user enters fullscreen mode
            inGrid: false,              // Set to true when the user enters the grid view
            itemTitle: '',              // The title of the document
            lastPageLoaded: -1,         // The ID of the last page loaded (value set later)
            lastRowLoaded: -1,          // The index of the last row loaded
            maxHeight: 0,               // The height of the tallest page
            maxWidth: 0,                // The width of the widest page
            mobileSafari: false,        // Checks if the user is on an iPad, iPhone or iPod
            numPages: 0,                // Number of pages in the array
            numRows: 0,                 // Number of rows
            pages: [],                  // An array containing the data for all the pages
            panelHeight: 0,             // Height of the panel. Set in initiateViewer()
            panelWidth: 0,              // Width of the panel. Set in initiateViewer()
            prevVptTop: 0,              // Used to determine vertical scroll direction
            scaleWait: false,           // For preventing double-scale on the iPad
            selector: '',               // Uses the generated ID prefix to easily select elements
            scrollSoFar: 0,             // Holds the number of pixels of vertical scroll
            totalHeight: 0,             // Height of all the image stacked together, value set later
            verticalOffset: 0,          // Used for storing the page offset before zooming
            verticalPadding: 0,         // Either the fixed padding or adaptive padding
            viewerXOffset: 0,           // Distance between left edge of viewer and document left edge
            viewerYOffset: 0,           // ^ for top edges
            zoomInCallback: null,       // Only executed after zoomIn() if present
            zoomOutCallback: null       // Only executed after zoomOut() if present
        };

        $.extend(settings, globals);

        // Checks if a page is within the viewport vertically
        var verticallyInViewport = function(top, bottom) {
            var panelHeight = settings.panelHeight;
            var topOfViewport = settings.scrollSoFar - settings.viewportMargin;
            var bottomOfViewport = topOfViewport + panelHeight + settings.viewportMargin * 2;
           
            if (top >= topOfViewport && top <= bottomOfViewport) {
                // If top of page is in the viewport
                return true;
            } else if (bottom >= topOfViewport && bottom <= bottomOfViewport) {
                // Same as above for the bottom of the page
                return true;
            } else if (top <= topOfViewport && bottom >= bottomOfViewport) {
                // Top of page is above, bottom of page is below
                return true;
            } else {
                // The page is nowhere near the viewport, return 0
                return false;
            }
        };
        
        // Check if a page has been loaded (i.e. is visible to the user) 
        var isPageLoaded = function(pageIndex) {
            // Done using the length attribute in jQuery
            // If and only if the div does not exist, its length will be 0
            if ($(settings.selector + 'page-' + pageIndex).length === 0) {
                return false;
            } else {
                return true;
            }
        };
        
        // Check if a page is near the viewport and thus should be loaded
        var isPageVisible = function(pageIndex) {
            var topOfPage = settings.heightAbovePages[pageIndex];
            var bottomOfPage = topOfPage + settings.pages[pageIndex].h + settings.verticalPadding;
            return verticallyInViewport(topOfPage, bottomOfPage);
        };

        // Check if a specific tile is near the viewport and thus should be loaded (row-based only)
        var isTileVisible = function(pageIndex, tileRow, tileCol) {
            // Call near viewport
            var tileTop = settings.heightAbovePages[pageIndex] + (tileRow * settings.tileHeight) + settings.verticalPadding;
            var tileBottom = tileTop + settings.tileHeight;
            return verticallyInViewport(tileTop, tileBottom);
        };
        
        // Check if a tile has already been appended
        var isTileLoaded = function(pageIndex, tileNumber) {
            if ($(settings.selector + 'tile-' + pageIndex + '-' + tileNumber).length > 0) {
                return true;
            } else {
                return false;
            }
        };
       
        // Appends the page directly into the document body, or loads the relevant tiles
        var loadPage = function(pageIndex) {
            var content = [];
            var filename = settings.pages[pageIndex].fn;
            var rows = settings.pages[pageIndex].r;
            var cols = settings.pages[pageIndex].c;
            var width = settings.pages[pageIndex].w;
            var height = settings.pages[pageIndex].h;
            var maxZoom = settings.pages[pageIndex].m_z;
            var leftOffset, widthToUse;
            
            // Use an array as a string builder - faster than str concatentation
            var lastHeight, lastWidth, row, col, tileHeight, tileWidth, imgSrc;
            var tileNumber = 0;
            var heightFromTop = settings.heightAbovePages[pageIndex] + settings.verticalPadding;

            // Only try to append the div part if the page has not already been loaded
            if (!isPageLoaded(pageIndex)) {
                // Magically centered using left: 50% and margin-left: -(width/2)
                content.push('<div id="' + settings.ID + 'page-' + pageIndex + '" style="top: ' + heightFromTop + 'px; width: ' + width + 'px; height: ' + height + 'px; left: 50%; margin-left: -' + (width / 2) + 'px" class="diva-page">');
            }

            // Calculate the width and height of the outer tiles (the ones that may have weird dimensions)
            lastHeight = height - (rows - 1) * settings.tileHeight;
            lastWidth = width - (cols - 1) * settings.tileWidth;
            var tilesToLoad = [];

            // Now loop through the rows and columns
            for (row = 0; row < rows; row++) {
                for (col = 0; col < cols; col++) {
                    var top = row * settings.tileHeight;
                    var left = col * settings.tileWidth;

                    // Set to none if there is a tileFadeSpeed set
                    var displayStyle = (settings.tileFadeSpeed) ? 'none' : 'inline';

                    // The zoom level might be different, if a page has a different max zoom level than the others
                    var zoomLevel = (maxZoom === settings.maxZoomLevel) ? settings.zoomLevel : settings.zoomLevel + (maxZoom - settings.maxZoomLevel); 
                    tileHeight = (row === rows - 1) ? lastHeight : settings.tileHeight; // If it's the LAST tile, calculate separately
                    tileWidth = (col === cols - 1) ? lastWidth : settings.tileWidth; // Otherwise, just set it to the default height/width
                    imgSrc = settings.iipServerBaseUrl + filename + '&amp;JTL=' + zoomLevel + ',' + tileNumber;
                    
                    if (!isTileLoaded(pageIndex, tileNumber) && isTileVisible(pageIndex, row, col)) {
                        content.push('<div id="' + settings.ID + 'tile-' + pageIndex + '-' + tileNumber + '"style="display: ' + displayStyle + '; position: absolute; top: ' + top + 'px; left: ' + left + 'px; background-image: url(\'' + imgSrc + '\'); height: ' + tileHeight + 'px; width: ' + tileWidth + 'px;"></div>');
                    }

                    tilesToLoad.push(tileNumber);
                    tileNumber++;
                }
            }

            if (!isPageLoaded(pageIndex)) {
                content.push('</div>');

                // Build the content string and append it to the document
                var contentString = content.join('');
                $(settings.innerSelector).append(contentString);
            } else {
                // Append it to the page
                $(settings.selector + 'page-' + pageIndex).append(content.join(''));
            }

            // Make the tiles we just appended fade in
            if (settings.tileFadeSpeed) {
                for (var i = 0; i < tilesToLoad.length; i++) {
                    $(settings.selector + 'tile-' + pageIndex + '-' + tilesToLoad[i]).fadeIn(settings.tileFadeSpeed);
                }
            }
        };

        // Delete a page from the DOM; will occur when a page is scrolled out of the viewport
        var deletePage = function(pageIndex) {
            if (isPageLoaded(pageIndex)) {
                $(settings.selector + 'page-' + pageIndex).remove();
            }
        };

        // Check if a row index is valid
        var rowInRange = function(rowIndex) {
            if (rowIndex >= 0 && rowIndex < settings.numRows) {
                return true;
            } else {
                return false;
            }
        }

        // Check if a page index is valid
        var pageInRange = function(pageIndex) {
            if (pageIndex >= 0 && pageIndex < settings.numPages) {
                return true;
            } else {
                return false;
            }
        };

        // Check if the bottom of a page is above the top of a viewport (scrolling down)
        // For when you want to keep looping but don't want to load a specific page
        var pageAboveViewport = function(pageIndex) {
            var bottomOfPage = settings.heightAbovePages[pageIndex] + settings.pages[pageIndex].h + settings.verticalPadding;
            var topOfViewport = settings.scrollSoFar; 

            if (bottomOfPage < topOfViewport) {
                return true;
            } else {
                return false;
            }
        };
       
        // Check if the top of a page is below the bottom of a viewport (scrolling up)
        var pageBelowViewport = function(pageIndex) {
            var topOfPage = settings.heightAbovePages[pageIndex];
            var bottomOfViewport = settings.scrollSoFar + settings.panelHeight;

            if (topOfPage > bottomOfViewport) {
                return true;
            } else {
                return false;
            }
        };

        // Check if the bottom of a row is above the top of the viewport (scrolling down)
        var rowAboveViewport = function(rowIndex) {
            var bottomOfRow = settings.rowHeight * (rowIndex + 1);
            var topOfViewport = settings.scrollSoFar;

            if (bottomOfRow < topOfViewport) {
                return true;
            } else {
                return false;
            }
        }

        // Check if the top of a row is below the bottom of the viewport (scrolling up)
        var rowBelowViewport = function(rowIndex) {
            var topOfRow = settings.rowHeight * rowIndex;
            var bottomOfViewport = settings.scrollSoFar + settings.panelHeight;

            if (topOfRow > bottomOfViewport) {
                return true;
            } else {
                return false;
            }
        }

        // Helper function for setCurrentPage; should only be called at the end
        var updateCurrentPage = function(pageIndex) {
            var pageNumber = pageIndex + 1;

            // Update the URL - has to be a string
            $.updateHashParam('p', '' + pageNumber);
            
            $(settings.selector + 'current span').text(pageNumber);

            // If we're in fullscreen mode, change the statusbar
            if (settings.inFullscreen) {
                if (settings.fullscreenStatusbar === null) {
                    createFullscreenStatusbar('fade');
                }

                settings.fullscreenStatusbar.pnotify({
                    pnotify_title: 'Page: ' + pageNumber
                });
            }
        };

        // Determines and sets the "current page" (settings.currentPageIndex); called within adjustPages 
        // The "direction" can be 0, 1 or -1; 1 for down, -1 for up, and 0 to go straight to a specific page
        var setCurrentPage = function(direction) {
            var currentPage = settings.currentPageIndex;
            var pageToConsider = settings.currentPageIndex + parseInt(direction, 10);
            var middleOfViewport = settings.scrollSoFar + (settings.panelHeight / 2);
            var changeCurrentPage = false;

            // When scrolling up:
            if (direction < 0) {
                // If the current pageTop is below the middle of the viewport
                // Or the previous pageTop is below the top of the viewport
                if (pageToConsider >= 0 && (settings.heightAbovePages[currentPage] >= middleOfViewport || settings.heightAbovePages[pageToConsider] >= settings.scrollSoFar)) {
                    changeCurrentPage = true;
                }
            } else if ( direction > 0) {
                // When scrolling down:
                // If the previous pageBottom is above the top and the current page isn't the last page
                if (settings.heightAbovePages[currentPage] + settings.pages[currentPage].h < settings.scrollSoFar && pageToConsider < settings.pages.length) {
                    changeCurrentPage = true;
                }
            }

            if (changeCurrentPage) {
                // Set this to the current page
                settings.currentPageIndex = pageToConsider;

                // Now try to change the next page, given that we're not going to a specific page
                // Calls itself recursively - this way we accurately obtain the current page
                if (direction !== 0) {
                    // Only change it when we're done scrolling etc
                    if (!setCurrentPage(direction)) {
                        updateCurrentPage(pageToConsider);
                    }
                }
                return true;
            } else {
                return false;
            }
        };

        // Called by adjust pages - see what pages should be visisble, and show them
        var attemptPageShow = function(pageIndex, direction) {
            if (direction > 0) {
                // Direction is positive - we're scrolling down
                // Should we add this page to the DOM? First check if it's a valid page
                if (pageInRange(pageIndex)) {
                    // If it's near the viewport, yes, add it
                    if (isPageVisible(pageIndex)) {
                        loadPage(pageIndex);

                        // Reset the last page loaded to this one
                        settings.lastPageLoaded = pageIndex;

                        // Recursively call this function until there's nothing to add
                        attemptPageShow(settings.lastPageLoaded+1, direction);
                    } else if (pageAboveViewport(pageIndex)) {
                        // Otherwise, is it below the viewport?
                        // Do not increment last page loaded, that would be lying
                        // Attempt to call this on the next page
                        attemptPageShow(pageIndex + 1, direction);
                    }
                } else {
                    // Nothing to do ... return
                    return;
                }
            } else {
                // Direction is negative - we're scrolling up
                if (pageInRange(pageIndex)) {
                    // If it's near the viewport, yes, add it
                    if (isPageVisible(pageIndex)) {
                        loadPage(pageIndex);

                        // Reset the first page loaded to this one
                        settings.firstPageLoaded = pageIndex;

                        // Recursively call this function until there's nothing to add
                        attemptPageShow(settings.firstPageLoaded-1, direction);
                    } else if (pageBelowViewport(pageIndex)) {
                        // Attempt to call this on the next page, do not increment anything
                        attemptPageShow(pageIndex-1, direction);
                    }
                } else {
                    // Nothing to do ... return
                    return;
                }
            }
        };

        // Called by adjustPages - see what pages need to be hidden, and hide them
        var attemptPageHide = function(pageIndex, direction) {
            if (direction > 0) {
                // Direction is positive - we're scrolling down
                // Should we delete this page from the DOM?
                if (pageInRange(pageIndex) && pageAboveViewport(pageIndex)) {
                    // Yes, delete it, reset the first page loaded
                    deletePage(pageIndex);
                    settings.firstPageLoaded++;

                    // Try to call this function recursively until there's nothing to delete
                    attemptPageHide(settings.firstPageLoaded, direction);
                } else {
                    // Nothing to delete - return
                    return;
                }
            } else {
                // Direction must be negative (not 0, see adjustPages), we're scrolling up
                if (pageInRange(pageIndex) && pageBelowViewport(pageIndex)) {
                    // Yes, delete it, reset the last page loaded
                    deletePage(pageIndex);
                    settings.lastPageLoaded--;
                    
                    // Try to call this function recursively until there's nothing to delete
                    attemptPageHide(settings.lastPageLoaded, direction);
                } else {
                    return;
                }
            }
        };

        // Same thing as attemptPageShow only with rows
        var attemptRowShow = function(rowIndex, direction) {
            if (direction > 0) {
                if (rowInRange(rowIndex)) {
                    if (isRowVisible(rowIndex)) {
                        loadRow(rowIndex);
                        settings.lastRowLoaded = rowIndex;
                        attemptRowShow(settings.lastRowLoaded+1, direction);
                    } else if (rowAboveViewport(rowIndex)) {
                        attemptRowShow(rowIndex+1, direction);
                    }
                }
            } else {
                if (rowInRange(rowIndex)) {
                    if (isRowVisible(rowIndex)) {
                        loadRow(rowIndex);
                        settings.currentPageIndex = settings.firstRowLoaded * settings.pagesPerRow;
                        updateCurrentPage(settings.currentPageIndex);
                        settings.firstRowLoaded = rowIndex;
                        attemptRowShow(settings.firstRowLoaded-1, direction);
                    } else if (rowBelowViewport(rowIndex)) {
                        attemptRowShow(rowIndex-1, direction);
                    }
                }
            }
        }

        var deleteRow = function(rowIndex) {
            if (isRowLoaded(rowIndex)) {
                $(settings.selector + 'row-' + rowIndex).remove();
            }
        }

        var attemptRowHide = function(rowIndex, direction) {
            if (direction > 0) {
                if (rowInRange(rowIndex) && rowAboveViewport(rowIndex)) {
                    deleteRow(rowIndex);
                    settings.firstRowLoaded++;
                    settings.currentPageIndex = settings.firstRowLoaded * settings.pagesPerRow;
                    updateCurrentPage(settings.currentPageIndex);
                    attemptRowHide(settings.firstRowLoaded, direction);
                }
            } else {
                if (rowInRange(rowIndex) && rowBelowViewport(rowIndex)) {
                    deleteRow(rowIndex);
                    settings.lastRowLoaded--;

                    attemptRowHide(settings.lastRowLoaded, direction);
                }
            }
        }

        var adjustRows = function(direction) {
            if (direction < 0) {
                attemptRowShow(settings.firstRowLoaded, -1);
                attemptRowHide(settings.lastRowLoaded, -1);
            } else if (direction > 0) {
                attemptRowHide(settings.firstRowLoaded, 1);
                attemptRowShow(settings.lastRowLoaded, 1);
            }
        }

        // Handles showing and hiding pages when the user scrolls
        var adjustPages = function(direction) {
            // Direction is negative, so we're scrolling up
            if (direction < 0) {
                attemptPageShow(settings.firstPageLoaded, direction);
                setCurrentPage(-1);
                attemptPageHide(settings.lastPageLoaded, direction);
            } else if (direction > 0) {
                // Direction is positive so we're scrolling down
                attemptPageHide(settings.firstPageLoaded, direction);
                attemptPageShow(settings.lastPageLoaded, direction);
                setCurrentPage(1);
            }

            // Handle the scrolling callback functions here
            if (direction !== 0) {
                $.executeCallback(settings.onScroll, settings.currentPageIndex);

                // If we're scrolling down
                if (direction > 0) {
                    $.executeCallback(settings.onScrollDown, settings.currentPageIndex);
                } else {
                    // We're scrolling up
                    $.executeCallback(settings.onScrollUp, settings.currentPageIndex);
                }
            }
        };

        // Goes directly to the page index stored in settings.goDirectlyTo
        var goDirectlyTo = function() {
            if (settings.goDirectlyTo) {
                gotoPage(settings.goDirectlyTo);
                updateCurrentPage(settings.goDirectlyTo - 1);
                settings.goDirectlyTo = 0;
                return true;
            }
            return false;
        }

        // Helper function called by loadDocument to scroll to the desired place
        var scrollAfterRequest = function() {
            if (goDirectlyTo()) {
                return;
            }

            // The x and y coordinates of the center ... let's zoom in on them
            var centerX, centerY, desiredLeft, desiredTop;
            
            // Determine the zoom change ratio - if first ajax request, set to 1
            var zChangeRatio = (settings.dimBeforeZoom > 0) ? settings.dimAfterZoom / settings.dimBeforeZoom : 1;
                
            // First figure out if we need to zoom in on a specific part (if doubleclicked)
            if (settings.doubleClick) {
                centerX = settings.centerX * zChangeRatio;
                centerY = settings.centerY * zChangeRatio;
                desiredLeft = Math.max((centerX) - (settings.panelWidth / 2), 0);
                desiredTop = Math.max((centerY) - (settings.panelHeight / 2), 0);
            } else {
                // Just zoom in on the middle
                // If the user wants more precise scrolling the user will have to double-click
                desiredLeft = settings.maxWidth / 2 - settings.panelWidth / 2 + settings.horizontalPadding;
                desiredTop = settings.verticalOffset * zChangeRatio;
            }
            
            settings.prevVptTop = 0;
            $(settings.outerSelector).scrollTop(desiredTop);
            $(settings.outerSelector).scrollLeft(desiredLeft);
        };

        // Perform the AJAX request; afterwards, execute the callback
        var ajaxRequest = function(zoomLevel, successCallback) {
            $.ajax({
                url: settings.backendServer += '&z=' + zoomLevel,
                cache: true,
                context: this, // Not sure if necessary
                dataType: 'json',
                success: function(data) {
                    // If it's the first request, set some initial settings
                    if (settings.firstAjaxRequest) {
                        setupInitialLoad(data, zoomLevel);
                    }

                    // Clear the document, then execute the callback
                    clearDocument();

                    // Save some data
                    settings.pages = data.pgs;
                    settings.maxWidth = data.dims.max_w;
                    settings.maxHeight = data.dims.max_h;
                    $.executeCallback(successCallback, data);
                    settings.firstAjaxRequest = false;
                }
            });
        };

        // Helper function for setting settings in the first AJAX request
        var setupInitialLoad = function(data, zoomLevel) {
            settings.itemTitle = data.item_title;
            settings.numPages = data.pgs.length;

            // Make sure the set max zoom level is valid
            settings.maxZoomLevel = (settings.maxZoomLevel > 0 && settings.maxZoomLevel <= data.max_zoom) ? settings.maxZoomLevel : data.max_zoom;

            // Make sure the initial zoom level is valid (could be a hashparam)
            if (zoomLevel > settings.maxZoomLevel) {
                // If it's invalid, just use 0 (that's what divaserve.php does)
                zoomLevel = 0;
            }

            // Set the total number of pages
            $(settings.selector + 'current label').text(settings.numPages);

            if (settings.enableAutoTitle) {
                $(settings.elementSelector).prepend('<div id="' + settings.ID + 'title">' + settings.itemTitle + '</div>');
            }
        };

        // Check if a row (in grid view) has been appended already
        var isRowLoaded = function(rowIndex) {
            if ($(settings.selector + 'row-' + rowIndex).length > 0) {
                return true;
            } else {
                return false;
            }
        }

        // Check if a row should be visible in the viewport
        var isRowVisible = function(rowIndex) {
            // Calculate the top and bottom, then call verticallyInViewport
            var topOfRow = settings.rowHeight * rowIndex;
            var bottomOfRow = topOfRow + settings.rowHeight + settings.fixedPadding;
            return verticallyInViewport(topOfRow, bottomOfRow);
        }

        var loadRow = function(rowIndex) {
            if (isRowLoaded(rowIndex)) {
                return;
            }

            var i;
            var heightFromTop = (settings.rowHeight) * rowIndex + settings.fixedPadding;
            var stringBuilder = [];
            stringBuilder.push('<div id="' + settings.ID + 'row-' + rowIndex + '" style="width: 100%; height: ' + settings.rowHeight + '; position: absolute; top: ' + heightFromTop + 'px;">');

            // Load each page within that row
            for (i = 0; i < settings.pagesPerRow; i++) {
                // Figure out the actual page number
                var pageIndex = rowIndex * settings.pagesPerRow + i;

                if (!pageInRange(pageIndex)) {
                    break; // when we're at the last page etc
                }
                
                var pageNumber = pageIndex + 1;
                var filename = settings.pages[pageIndex].fn;
                var imgSrc = settings.iipServerBaseUrl + filename + '&amp;WID=' + settings.gridPageWidth + '&amp;CVT=JPG';
                var leftOffset = i * (settings.fixedPadding + settings.gridPageWidth) + settings.fixedPadding;
                stringBuilder.push('<div id="' + settings.ID + 'page-' + pageIndex + '" style="position: absolute; left: ' + leftOffset + 'px; display: inline; background-image: url(\'' + imgSrc  + '\'); background-repeat: no-repeat; width: ' + settings.gridPageWidth + 'px; height: ' + settings.rowHeight + 'px;"></div>');
            }

            // Append, using an array as a string builder instead of string concatenation
            $(settings.innerSelector).append(stringBuilder.join(''))
        }

        var loadGrid = function() {
            // Ignore the zoom level if it's in a grid
            // As for page number, try to get the row containing that grid near the middle
            // Uses zoom level = 0 as the grid? smallest numbers etc
            ajaxRequest(0, function(data) {
                // Create the grid slider here
                if (settings.enableGridSlider) {
                    createGridSlider();
                }

                // Now go through the pages
                var horizontalPadding = settings.fixedPadding * (settings.pagesPerRow + 1);
                var pageWidth = (settings.panelWidth - horizontalPadding) / settings.pagesPerRow;
                settings.gridPageWidth = pageWidth;

                // Now calculate the maximum height, use that as the row height
                settings.rowHeight = settings.fixedPadding + data.dims.max_ratio * pageWidth;
                settings.numRows = Math.ceil(settings.numPages / settings.pagesPerRow);
                settings.totalHeight = settings.numRows * settings.rowHeight + settings.fixedPadding;
                $(settings.innerSelector).css('height', Math.round(settings.totalHeight));
                $(settings.innerSelector).css('width', Math.round(settings.panelWidth));

                // First scroll directly to the row containing the current page
                if (!goDirectlyTo()) {
                    gotoPage(settings.currentPageIndex + 1);
                }

                settings.scrollSoFar = $(settings.outerSelector).scrollTop();

                // Figure out the row each page is in
                for (var i = 0; i < settings.numPages; i += settings.pagesPerRow) {
                    var rowIndex = Math.floor(i / settings.pagesPerRow);

                    if (isRowVisible(rowIndex)) {
                        settings.firstRowLoaded = (settings.firstRowLoaded < 0) ? rowIndex : settings.firstRowLoaded;
                        loadRow(rowIndex);
                        settings.lastRowLoaded = rowIndex;
                    }
                }
            });
        }

        // When changing between grid/document view, or fullscreen toggling, or zooming
        var clearDocument = function() {
            $(settings.outerSelector).scrollTop(0);
            settings.scrollSoFar = 0; // important - for issue 26
            $(settings.innerSelector).text('');
            settings.firstPageLoaded = 0;
        }
        
        // AJAX request to start the whole process - called upon page load and upon zoom change
        var loadDocument = function(zoomLevel) {
            ajaxRequest(zoomLevel, function(data) {
                // Calculate the horizontal and vertical inter-page padding
                if (settings.adaptivePadding > 0) {
                    settings.horizontalPadding = data.dims.a_wid * settings.adaptivePadding;
                    settings.verticalPadding = data.dims.a_hei * settings.adaptivePadding;
                } else {
                    // It's less than or equal to 0; use fixedPadding instead
                    settings.horizontalPadding = settings.fixedPadding;
                    settings.verticalPadding = settings.fixedPadding;
                }

                // Now reset some things that need to be changed after each zoom
                settings.totalHeight = data.dims.t_hei + settings.verticalPadding * (settings.numPages + 1); 
                settings.zoomLevel = zoomLevel;
                settings.dimAfterZoom = settings.totalHeight; 

                // Create the zoom slider at this point, if desired
                if (settings.enableZoomSlider) {
                    createZoomSlider();
                }

                // Needed to set settings.heightAbovePages - initially just the top padding
                var heightSoFar = 0;
                for (var i = 0; i < settings.numPages; i++) {                 
                    // First set the height above that page by adding this height to the previous total
                    // A page includes the padding above it
                    settings.heightAbovePages[i] = heightSoFar;

                    // Has to be done this way otherwise you get the height of the page included too
                    heightSoFar = settings.heightAbovePages[i] + settings.pages[i].h + settings.verticalPadding;

                    // Now try to load the page ONLY if the page needs to be loaded
                    // Take scrolling into account later, just try this for now
                    if (isPageVisible(i)) {
                        loadPage(i);
                        settings.lastPageLoaded = i;
                    }
                }
                    
                // Set the height and width of documentpane (necessary for dragscrollable)
                $(settings.innerSelector).css('height', Math.round(settings.totalHeight));
                var widthToSet = (data.dims.max_w + settings.horizontalPadding * 2 < settings.panelWidth ) ? settings.panelWidth : data.dims.max_w + settings.horizontalPadding * 2; // width of page + 40 pixels on each side if necessary
                $(settings.innerSelector).css('width', Math.round(widthToSet));

                // Scroll to the proper place
                scrollAfterRequest();

                // Now execute the zoom callback functions (if it's not the initial load)
                // No longer gets executed when leaving or entering fullscreen mode
                if (!settings.firstAjaxRequest) {
                    if (settings.dimBeforeZoom !== settings.dimAfterZoom) {
                        $.executeCallback(settings.onZoom, zoomLevel);

                        // Execute the zoom in/out callback functions if set
                        if (settings.dimBeforeZoom > settings.dimAfterZoom) {
                            // Zooming out
                            $.executeCallback(settings.onZoomOut, zoomLevel);

                            // Execute the one-time callback, too, if present
                            $.executeCallback(settings.zoomOutCallback, zoomLevel);
                            settings.zoomOutCallback = null;
                        } else {
                            // Zooming in
                            $.executeCallback(settings.onZoomIn, zoomLevel);
                            $.executeCallback(settings.zoomInCallback, zoomLevel);
                            settings.zoomInCallback = null;
                        }
                    } else {
                        // Switching between fullscreen mode
                        $.executeCallback(settings.onFullscreen, zoomLevel);
                    }
                } else {
                    // The document viewer has loaded, execute onReady
                    $.executeCallback(settings.onReady);
                }

                // For use in the next ajax request (zoom change)
                settings.dimBeforeZoom = settings.dimAfterZoom;

                // For the iPad - wait until this request finishes before accepting others
                if (settings.scaleWait) {
                    settings.scaleWait = false;
                }
            });
        };
        
        // Called whenever there is a scroll event in the document panel (the #diva-outer element)
        var handleScroll = function() {
            settings.scrollSoFar = $(settings.outerSelector).scrollTop();
            adjustPages(settings.scrollSoFar - settings.prevVptTop);
            settings.prevVptTop = settings.scrollSoFar;
        };

        var handleGridScroll = function() {
            settings.scrollSoFar = $(settings.outerSelector).scrollTop();
            adjustRows(settings.scrollSoFar - settings.prevVptTop);
            settings.prevVptTop = settings.scrollSoFar;
        };

        // Handles zooming - called after pinch-zoom, changing the slider, or double-clicking
        var handleZoom = function(zoomLevel) {
            // First make sure that this is an actual zoom request
            if (settings.zoomLevel != zoomLevel && zoomLevel >= settings.minZoomLevel && zoomLevel <= settings.maxZoomLevel) {
                // Now do an ajax request with the new zoom level
                loadDocument(zoomLevel);

                // Make the slider display the new value (it may already)
                $(settings.selector + 'zoom-slider').slider({
                    value: zoomLevel
                });

                // Update the URL (again, must be a string)
                $.updateHashParam('z', '' + zoomLevel);
                return true;
            } else {
                // Execute the callback functions anyway (required for the unit testing)
                $.executeCallback(settings.zoomInCallback, settings.zoomLevel);
                $.executeCallback(settings.zoomOutCallback, settings.zoomLevel);

                // Set them to null so we don't try to call it again
                settings.zoomOutCallback = null;
                settings.zoomInCallback = null;
                return false;
            }
        };

        // Called whenever the zoom slider is moved
        var handleZoomSlide = function(zoomLevel) {
            // First get the vertical offset (vertical scroll so far)
            settings.verticalOffset = $(settings.outerSelector).scrollTop();
            settings.horizontalOffset = $(settings.outerSelector).scrollLeft();

            // If we're in grid mode, leave it
            if (settings.inGrid) {
                // Don't call loadDocument() in leaveGrid() otherwise it loads twice
                leaveGrid(true);
            }
            
            // Let handleZoom handle zooming
            settings.doubleClick = false;
            handleZoom(zoomLevel);
        };

        // Private function for going to a page
        var gotoPage = function(pageNumber) {
            // If we're in grid view, find out the row number that is
            if (settings.inGrid) {
                var rowIndex = Math.ceil(pageNumber / settings.pagesPerRow) - 1;

                if (rowInRange(rowIndex)) {
                    var heightToScroll = rowIndex * settings.rowHeight;
                    $(settings.outerSelector).scrollTop(heightToScroll);

                    // Update the "currently on page" thing here as well
                    updateCurrentPage(pageNumber - 1);
                    settings.currentPageIndex = pageNumber - 1;
                    return true;
                }
            } else {
                // Since we start indexing from 0, subtract 1 to behave as the user expects
                pageIndex = pageNumber - 1;
    
                // First make sure that the page number exists (i.e. is in range)
                if (pageInRange(pageIndex)) {
                    var heightToScroll = settings.heightAbovePages[pageIndex];
    
                    // Change the "currently on page" thing
                    updateCurrentPage(pageIndex);
                    $(settings.outerSelector).scrollTop(heightToScroll);

                    // Now figure out the horizontal scroll - scroll to the MIDDLE
                    var horizontalScroll = ($(settings.innerSelector).width() - settings.panelWidth) / 2;
                    $(settings.outerSelector).scrollLeft(horizontalScroll);
    
                    // Now execute the callback function, pass it the page NUMBER not the page index
                    $.executeCallback(settings.onJump, pageNumber);

                    return true; // To signify that we can scroll to this page
                }
            }
            return false;
        };
        
        // Handles the double click event, put in a new function for better codeflow
        var handleDoubleClick = function(event) {
                // If the zoom level is already at max, zoom out
                var newZoomLevel;
                if (settings.zoomLevel === settings.maxZoomLevel) {
                    if (event.ctrlKey) {
                        newZoomLevel = settings.zoomLevel - 1;
                    } else {
                        return;
                    }
                } else if (settings.zoomLevel === settings.minZoomLevel) {
                    if (event.ctrlKey) {
                        return;
                    } else {
                        newZoomLevel = settings.zoomLevel + 1;
                    }
                } else {
                    if (event.ctrlKey) {
                        newZoomLevel = settings.zoomLevel - 1;
                    } else {
                        newZoomLevel = settings.zoomLevel + 1;
                    }
                }

                
                // Set centerX and centerY for scrolling in after zoom
                // Need to use this.offsetLeft and this.offsetTop to get it relative to the edge of the document
                settings.centerX = (event.pageX - settings.viewerXOffset) + $(settings.outerSelector).scrollLeft();
                settings.centerY = (event.pageY - settings.viewerYOffset) + $(settings.outerSelector).scrollTop();

                // Set doubleClick to true, so we know where to zoom
                settings.doubleClick = true;
                
                // Zoom
                handleZoom(newZoomLevel);
        };

        // Bound to an event handler if iStuff detected; prevents window dragging
        var blockMove = function(event) {
            event.preventDefault();
        };

        // Allows pinch-zooming for iStuff
        var scale = function(event) {
            var newZoomLevel = settings.zoomLevel;

            // First figure out the new zoom level:
            if (event.scale > 1 && newZoomLevel < settings.maxZoomLevel) {
                newZoomLevel++;
            } else if (event.scale < 1 && newZoomLevel > settings.minZoomLevel) {
                newZoomLevel--;
            } else {
                return;
            }

            // Set it to true so we have to wait for this one to finish
            settings.scaleWait = true;

            // Has to call handleZoomSlide so that the coordinates are kept
            handleZoomSlide(newZoomLevel);
        };

        var toggleFullscreen = function() {
            // First store the offsets so the user stays in the same place
            settings.verticalOffset = $(settings.outerSelector).scrollTop();
            settings.horizontalOffset = $(settings.outerSelector).scrollLeft();
            settings.doubleClick = false;

            // Empty the viewer so we don't get weird jostling
            $(settings.innerSelector).text('');

            // If we're already in fullscreen mode, leave it
            if (settings.inFullscreen) {
                leaveFullscreen();

                // Update the hash param
                $.updateHashParam('fullscreen', 'false');
            } else {
                enterFullscreen();
                $.updateHashParam('fullscreen', 'true');
            }

            // Recalculate height and width
            // 20 = magic number to account for the scrollbar width for now
            settings.panelWidth = parseInt($(settings.outerSelector).width(), 10) - 20;
            settings.panelHeight = parseInt($(settings.outerSelector).height(), 10);

            // Change the width of the inner div correspondingly
            $(settings.innerSelector).width(settings.panelWidth);

            // Do another AJAX request to fix the padding and so on
            if (settings.inGrid) {
                loadGrid();
            } else {
                loadDocument(settings.zoomLevel);
            }
        }

        // Handles entering fullscreen mode
        var enterFullscreen = function() {
            if (settings.fullscreenStatusbar == null) {
                createFullscreenStatusbar('none');
            }

            // Change the styling of the fullscreen icon - two viewers on a page won't work otherwise
            $(settings.selector + 'fullscreen').css('position', 'fixed').css('z-index', '9001');

            $(settings.outerSelector).addClass('fullscreen');
            settings.inFullscreen = true;

            // Hide the body scrollbar
            $('body').css('overflow', 'hidden');

            // Execute the callback
            $.executeCallback(settings.onFullscreenEnter);
        };

        // Handles leaving fullscreen mode
        var leaveFullscreen = function() {
            // Remove the status bar
            if (settings.fullscreenStatusbar != null) {
                // In case animation has been set to fade
                settings.fullscreenStatusbar.pnotify({
                    pnotify_animation: 'none'
                });

                settings.fullscreenStatusbar.pnotify_remove();
                settings.fullscreenStatusbar = null;
            }

            $(settings.outerSelector).removeClass('fullscreen');
            settings.inFullscreen = false;

            // Return the body scrollbar and the fullscreen icon to their original places
            $(settings.selector + 'fullscreen').css('position', 'absolute').css('z-index', '8999');

            // Execute the callback
            $.executeCallback(settings.onFullscreenExit);
        };

        // Toggle, enter and leave grid mode functions akin to those for fullscreen
        var toggleGrid = function() {
            // Already in grid, leave it
            if (settings.inGrid) {
                leaveGrid();
            } else {
                // Enter grid view
                enterGrid();
            }
        };

        var enterGrid = function() {
            settings.inGrid = true;
            loadGrid();
            $.updateHashParam('grid', 'true');
        }

        var leaveGrid = function(preventLoad) {
            settings.inGrid = false;

            // Jump to the "current page" if double-click wasn't used
            if (!settings.goDirectlyTo) {
                settings.goDirectlyTo = settings.currentPageIndex + 1;
            }

            // preventLoad is only true when the zoom slider is used
            if (!preventLoad) {
                loadDocument(settings.zoomLevel);
            }
            $.updateHashParam('grid', 'false');
        };

        // Handles all the events
        var handleEvents = function() {
            // Handle the grid toggle events
            if (settings.enableGrid) {
                $(settings.selector + 'grid-icon').click(function() {
                    toggleGrid();
                });
            }

            // Create the fullscreen toggle icon if fullscreen is enabled
            if (settings.enableFullscreen) {
                // Event handler for fullscreen toggling
                $(settings.selector + 'fullscreen').click(function() {
                    toggleFullscreen();
                });

                // Listen to window resize events during fullscreen mode, change dimensions accordingly
                var resizeTimer;
                $(window).resize(function() {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(function() {
                        settings.panelHeight = parseInt($(settings.outerSelector).height(), 10);

                        // It should simulate scrolling down since it only matters if the page gets bigger
                        adjustPages(1);

                        var newWidth = $('body').css('width');
                        $(settings.innerSelector).css('width', newWidth);
                    }, 10);
                });
            }

            // Change the cursor for dragging
            $(settings.innerSelector).mouseover(function() {
                $(this).removeClass('grabbing').addClass('grab');
            });
            
            $(settings.innerSelector).mouseout(function() {
                $(this).removeClass('grab');
            });
            
            $(settings.innerSelector).mousedown(function() {
                $(this).removeClass('grab').addClass('grabbing');
            });
            
            $(settings.innerSelector).mouseup(function() {
                $(this).removeClass('grabbing').addClass('grab');
            });

            
            // Set drag scroll on first descendant of class dragger on both selected elements
            $(settings.outerSelector + ', ' + settings.innerSelector).dragscrollable({dragSelector: '.dragger', acceptPropagatedEvent: true});

            // Handle the scroll
            $(settings.outerSelector).scroll(function() {
                // Has to be within this otherwise settings.inGrid is checked ONCE
                if (settings.inGrid) {
                    handleGridScroll();
                } else {
                    handleScroll();
                }
            });
                
            // Double-click to zoom
            $(settings.outerSelector).dblclick(function(event) {
                // First set the x and y offsets of the viewer from the edge of document
                settings.viewerXOffset = this.offsetLeft;
                settings.viewerYOffset = this.offsetTop;

                if (settings.inGrid) {
                    // Figure out the page that was clicked, scroll to that page
                    var centerX = (event.pageX - settings.viewerXOffset) + $(settings.outerSelector).scrollLeft();
                    var centerY = (event.pageY - settings.viewerYOffset) + $(settings.outerSelector).scrollTop();
                    var rowIndex = Math.floor(centerY / settings.rowHeight);
                    var colIndex = Math.floor(centerX / (settings.panelWidth / settings.pagesPerRow));
                    var pageNumber = rowIndex * settings.pagesPerRow + colIndex + 1;
                    settings.goDirectlyTo = pageNumber;
                    leaveGrid();
                } else {
                    handleDoubleClick(event);
                }
            });

            // Prevent the context menu within the outerdrag IF it was triggered with the ctrl key
            $(settings.outerSelector).bind("contextmenu", function(event) {
                var e = event.originalEvent;
                if (e.ctrlKey) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            // Check if the user is on a iPhone or iPod touch or iPad
            if (settings.mobileSafari) {
                // One-finger scroll within outerdrag
                $(settings.outerSelector).oneFingerScroll();

                // Prevent resizing (below from http://matt.might.net/articles/how-to-native-iphone-ipad-apps-in-javascript/)
                var toAppend = [];
                toAppend.push('<meta name="viewport" content="user-scalable=no, width=device-width" />');

                // Eliminate URL and button bars if added to home screen
                toAppend.push('<meta name="apple-mobile-web-app-capable" content="yes" />');

                // Choose how to handle the phone status bar
                toAppend.push('<meta name="apple-mobile-web-app-status-bar-style" content="black" />');
                $('head').append(toAppend.join('\n'));

                // Block the user from moving the window
                $('body').bind('touchmove', function(event) {
                    var e = event.originalEvent;
                    blockMove(e);
                });

                // Allow pinch-zooming
                // If originally in grid view, go to document view with the lowest zoom
                $('body').bind('gestureend', function(event) {
                    var e = event.originalEvent;
                    if (!settings.scaleWait) {
                        if (settings.inGrid) {
                            leaveGrid();
                        } else {
                            scale(e);
                        }
                    }
                    return false;
                });

            }

            // Only check if either scrollBySpace or scrollByKeys is enabled
            if (settings.enableSpaceScroll || settings.enableKeyScroll) {
                var spaceKey = $.ui.keyCode.SPACE;
                var pageUpKey = $.ui.keyCode.PAGE_UP;
                var pageDownKey = $.ui.keyCode.PAGE_DOWN;

                // Catch the key presses in document
                $(document).keydown(function(event) {
                    // Space or page down - go to the next page
                    if ((settings.enableSpaceScroll && event.keyCode == spaceKey) || (settings.enableKeyScroll && event.keyCode == pageDownKey)) {
                        $(settings.outerSelector).scrollTop(settings.scrollSoFar + settings.panelHeight);
                        return false;
                    }

                    // Page up - go to the previous page
                    if (settings.enableKeyScroll && event.keyCode == pageUpKey) {
                        $(settings.outerSelector).scrollTop(settings.scrollSoFar - settings.panelHeight);
                        return false;
                    }
                });
            }
        };

        // Create a fullscreen statusbar thing - if it doesn't exist
        var createFullscreenStatusbar = function(animation) {
            var options = { 
                pnotify_text: '<form id="' + settings.ID + 'goto-page-fullscreen"><input placeholder="' + settings.numPages + '" type="text" size="4" id="' + settings.ID + 'goto-input-fullscreen" /><input type="submit" value="Go"></form>',
                pnotify_title: 'Page: ' + (settings.currentPageIndex + 1),
                pnotify_history: false,
                pnotify_width: '110px',
                pnotify_hide: false,
                pnotify_notice_icon: '',
                pnotify_animation: animation, // Can be 'none' or 'fade' depending on what calls it
                pnotify_before_close: function() {
                    settings.fullscreenStatusbar = null;
                }
            };

            settings.fullscreenStatusbar = $.pnotify(options);

            // Handle clicking, a bit redundant but better than using live(), maybe
            $(settings.selector + 'goto-page-fullscreen').submit(function() {
                var desiredPage = parseInt($(settings.selector + 'goto-input-fullscreen').val(), 10);

                if (!gotoPage(desiredPage)) {
                    alert("Invalid page number");
                }

                return false;
            });
        };

        // Creates a zoomer using the min and max zoom levels specified ... PRIVATE, only if zoomSlider = true
        var createZoomSlider = function() {
            // This whole thing can definitely be optimised
            $(settings.selector + 'slider').remove();
            $(settings.selector + 'slider-label').remove();
            $(settings.selector + 'tools').prepend('<div id="' + settings.ID + 'slider"></div>');
            $(settings.selector + 'slider').slider({
                    value: settings.zoomLevel,
                    min: settings.minZoomLevel,
                    max: settings.maxZoomLevel,
                    step: 1,
                    slide: function(event, ui) {
                        handleZoomSlide(ui.value);
                    }
                });
            $(settings.selector + 'slider').after('<div id="' + settings.ID + 'slider-label">Zoom level: <span>' + settings.zoomLevel + '</span></div>');
        };

        // Creates a slider for controlling the number of pages per grid row
        var createGridSlider = function() {
            $(settings.selector + 'slider').remove();
            $(settings.selector + 'slider-label').remove();
            $(settings.selector + 'tools').prepend('<div id="' + settings.ID + 'slider"></div>');
            $(settings.selector + 'slider').slider({
                value: settings.pagesPerRow,
                min: settings.minPagesPerRow,
                max: settings.maxPagesPerRow,
                step: 1,
                slide: function(event, ui) {
                    handleGridSlide(ui.value);
                }
            });
            $(settings.selector + 'slider').after('<div id="' + settings.ID + 'slider-label">Pages per row: <span>' + settings.pagesPerRow + '</span></div>');
        };

        var handleGridSlide = function(newPagesPerRow) {
            settings.pagesPerRow = newPagesPerRow;
            enterGrid();
        }

        var createGridIcon = function() {
            $(settings.selector + 'tools').prepend('<div id="' + settings.ID + 'grid-icon"></div>');
        };
        
        // Creates the "go to page" box
        var createGotoPage = function() {
            $(settings.selector + 'tools').append('<form id="' + settings.ID + 'goto-page">Go to page <input type="text" size="3" id="' + settings.ID + 'goto-input" /> <input type="submit" value="Go" /><br /><div id="' + settings.ID + 'current">Current page: <span>1</span> of <label></label></div></form>');
            
            $(settings.selector + 'goto-page').submit(function() {
                var desiredPage = parseInt($(settings.selector + 'goto-input').val(), 10);

                if (!gotoPage(desiredPage)) {
                    alert("Invalid page number");
                }

                return false;
            });
        };

        var init = function() {
            // Check if the platform is the iPad/iPhone/iPod
            settings.mobileSafari = navigator.platform == 'iPad' || navigator.platform == 'iPhone' || navigator.platform == 'iPod';

            // For easier selecting of the container element
            settings.elementSelector = '#' + $(element).attr('id');
   
            // Generate an ID that can be used as a prefix for all the other IDs
            settings.ID = $.generateId('diva-');
            settings.selector = '#' + settings.ID;
            
            // Since we need to reference these two a lot
            settings.outerSelector = settings.selector + 'outer';
            settings.innerSelector = settings.selector + 'inner';
            
            // Create a diva-tools div only if we need to
            if (settings.zoomSlider || settings.enableGotoPage || settings.enableGrid) {
                $(settings.elementSelector).prepend('<div id="' + settings.ID + 'tools"></div>');
            }
            
            // Create the go to page box, if enabled
            if (settings.enableGotoPage) {
                createGotoPage();
            }

            // Create the icon for toggling grid view, if enabled
            if (settings.enableGrid) {
                createGridIcon();
            }
            
            // Create the inner and outer panels
            $(settings.elementSelector).append('<div id="' + settings.ID + 'outer"></div>');
            $(settings.outerSelector).append('<div id="' + settings.ID + 'inner" class="dragger"></div>');
            
            // Adjust the document panel dimensions for Apple touch devices
            if (settings.mobileSafari) {
                // Account for the scrollbar
                settings.panelWidth = screen.width - 20;

                // The iPhone's toolbar etc takes up slightly more screen space
                // So the height of the panel needs to be adjusted accordingly
                if (navigator.platform == 'iPad') {
                    settings.panelHeight = screen.height - 170;
                } else {
                    settings.panelHeight = screen.height - 250;
                }

                $(settings.elementSelector).css('width', settings.panelWidth);
                $(settings.outerSelector).css('width', settings.panelWidth + 'px');
                $(settings.outerSelector).css('height', settings.panelHeight + 'px');
            } else {
                // For other devices, adjust to take the scrollbar into account
                settings.panelWidth = parseInt($(settings.elementSelector).width(), 10) - 18;
                $(settings.outerSelector).css('width', (settings.panelWidth + 18) + 'px');
                settings.panelHeight = parseInt($(settings.outerSelector).height(), 10);
            }
            
            
            // Create the fullscreen icon
            if (settings.enableFullscreen) {
                $(settings.elementSelector).prepend('<div id="' + settings.ID + 'fullscreen"></div>');
            }

            // If there is a 'z' hash param, make that the initial zoom level
            // Invalid zoom levels will become 0 or the absolute value (e.g. -1 => 1)
            var zoomParam = $.getHashParam('z');
            if (zoomParam) {
                settings.zoomLevel = Math.abs(parseInt(zoomParam, 10));
            }

            // If there's a 'p' hash param, make that the initial page
            // Do so by pretending it's a regular zoom event
            var pageParam = $.getHashParam('p');
            if (pageParam) {
                settings.goDirectlyTo = parseInt(pageParam, 10);
            }

            // If the "fullscreen" hash param is true, go to fullscreen initially
            var fullscreenParam = $.getHashParam('fullscreen');
            if (fullscreenParam === 'true' && settings.enableFullscreen) {
                toggleFullscreen();
            }

            // If the grid hash param is true, go to grid view initially
            var gridParam = $.getHashParam('grid');
            if (gridParam === 'true' && settings.enableGrid) {
                toggleGrid();
            }
            
            // Load the images at the initial zoom level, if we haven't already 
            if (!settings.inFullscreen && !settings.inGrid) {
                loadDocument(settings.zoomLevel);
            }
        
            handleEvents();
        };

        // Call the init function when this object is created.
        init();

        /* PUBLIC FUNCTIONS
        ===============================================
        */

        // Returns the title of the document, based on the directory name
        this.getItemTitle = function() {
            return settings.itemTitle;
        };

        // Go to a particular page (with indexing starting at 1)
        this.gotoPage = function(pageNumber) {
            return gotoPage(pageNumber);
        };

        // Returns the page index (with indexing starting at 0)
        this.getCurrentPage = function() {
            return settings.currentPageIndex;
        };

        // Returns the current zoom level
        this.getZoomLevel = function() {
            return settings.zoomLevel;
        };

        // Zoom in, with callback. Will return false if it's at the maximum zoom
        this.zoomIn = function(callback) {
            settings.zoomInCallback = callback;
            return handleZoom(settings.zoomLevel+1);
        };

        // Zoom out, with callback. Will return false if it's at the minimum zoom
        this.zoomOut = function(callback) {
            settings.zoomOutCallback = callback;
            return handleZoom(settings.zoomLevel-1);
        };

        // Uses the verticallyInViewport() function, but relative to a page
        // Check if something (e.g. a highlight box on a particular page) is visible
        this.inViewport = function(pageNumber, topOffset, height) {
            var pageIndex = pageNumber - 1;
            var top = settings.heightAbovePages[pageIndex] + topOffset;
            var bottom = top + height;
            return verticallyInViewport(top, bottom);
        }
    };
    
    $.fn.diva = function(options) {
        return this.each(function() {
            var element = $(this);

            // Return early if this element already has a plugin instance
            if (element.data('diva')) {
                return;
            }
            
            // Otherwise, instantiate the document viewer
            var diva = new Diva(this, options);
            element.data('diva', diva);
        });
    };
    
})( jQuery );
