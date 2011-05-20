/*
Copyright (C) 2011 by Andrew Hankinson, Laurent Pugin, Wendy Liu

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
            automaticTitle: true,       // Shows the title within a div of id diva-title
            backendServer: '',          // The URL to the script returning the JSON data; mandatory
            gotoPage: true,             // Should there be a "go to page" option or not, defaults to yes
            iipServerBaseUrl: '',       // The URL to the IIPImage installation, including the ?FIF=
            jump: null,                 // Callback function for jumping to a specific page (using the gotoPage feature)
            maxZoomLevel: 0,            // Optional; defaults to the max zoom returned in the JSON response
            minZoomLevel: 0,            // Defaults to 0 (the minimum zoom)
            paddingPerPage: 40,         // The pixels of padding surrounding and between pages
            scroll: null,               // Callback function for scrolling
            scrollBySpace: false,       // Can user scroll down with the space bar? Disabled by default
            scrollByKeys: true,         // Can user scroll with the page up/page down keys?
            scrollDown: null,           // Callback function for scrolling down, only
            scrollUp: null,             // Callback function for scrolling up only
            tileHeight: 256,            // The height of each tile, in pixels; usually 256
            tileWidth: 256,             // The width of each tile, in pixels; usually 256
            zoom: null,                 // Callback function for zooming in general
            zoomIn: null,               // Callback function for zooming in only
            zoomLevel: 2,               // The initial zoom level (used to store the current zoom level)
            zoomOut: null,              // Callback function for zooming out only
            zoomSlider: true,           // Should there be a zoom slider or not, defaults to yes
            //itemOrientation: 0,       // Either "h" (horizontal) or "v" (vertical) - currently not implemented
        };
        
        // Apply the defaults, or override them with passed-in options.
        var settings = $.extend({}, defaults, options);

        // Things that cannot be changed because of the way they are used by the script
        // Many of these are declared with arbitrary values that are changed later on
        var globals = {
            centerX: 0,                 // Only used if doubleClick is true - for zooming in
            centerY: 0,                 // Y-coordinate, see above
            dimAfterZoom: 0,            // Used for storing the item dimensions after zooming
            dimBeforeZoom: 0,           // Used for storing the item dimensions before zooming
            doubleClick: false,         // If the zoom has been triggered by a double-click event
            elementSelector: '',        // The ID of the element plus the # for easy selection, set in init()
            firstPageLoaded: -1,        // The ID of the first page loaded (value set later)
            firstAjaxRequest: true,     // True initially, set to false after the first request
            heightAbovePages: [],       // The height above each page
            horizontalOffset: 0,        // Used for storing the page offset before zooming
            itemTitle: '',              // The title of the document
            lastPageLoaded: -1,         // The ID of the last page loaded (value set later)
            maxHeight: 0,               // The height of the tallest page
            maxWidth: 0,                // The width of the widest page
            numPages: 0,                // Number of pages in the array
            pageLoadedId: 0,            // The current page in the viewport (center-most page)
            pages: [],                  // An array containing the data for all the pages
            panelHeight: 0,             // Height of the panel. Set in initiateViewer()
            panelWidth: 0,              // Width of the panel. Set in initiateViewer()
            prevVptTop: 0,              // Used to determine vertical scroll direction
            scrollSoFar: 0,             // Holds the number of pixels of vertical scroll
            totalHeight: 0,             // Height of all the image stacked together, value set later
            verticalOffset: 0,          // Used for storing the page offset before zooming
            viewerXOffset: 0,           // Distance between left edge of viewer and document left edge
            viewerYOffset: 0,           // ^ for top edges
        };

        $.extend(settings, globals);

        // Checks if a page is within the viewport
        var nearViewport = function(pageID) {
            var topOfPage = settings.heightAbovePages[pageID];
            var bottomOfPage = topOfPage + settings.pages[pageID].h + settings.paddingPerPage;
            var panelHeight = settings.panelHeight;
            var topOfViewport = settings.scrollSoFar;
            var bottomOfViewport = topOfViewport + panelHeight;
           
            if ( topOfPage >= topOfViewport && topOfPage <= bottomOfViewport  ) {
                // If top of page is in the viewport
                return true;
            } else if ( bottomOfPage >= topOfViewport && bottomOfPage <= bottomOfViewport ) {
                // Same as above for the bottom of the page
                return true;
            } else if ( topOfPage <= topOfViewport && bottomOfPage >= bottomOfViewport ) {
                // Top of page is above, bottom of page is below
                return true;
            } else {
                // The page is nowhere near the viewport, return 0
                return false;
            }
        };
        
        // Check if a page has been loaded (i.e. is visible to the user) 
        var isPageLoaded = function(pageID) {
            var thisID = '#diva-page-' + pageID;

            // Done using the length attribute in jQuery
            // If and only if the div does not exist, its length will be 0
            if ($(thisID).length === 0) {
                return false;
            } else {
                return true;
            }
        };
        
        // Appends the page directly into the document body
        var appendPage = function(pageID) {
            // Only try to append the page if the page has not already been loaded
            if (!isPageLoaded(pageID)) {
                var filename = settings.pages[pageID].fn;
                var rows = settings.pages[pageID].r;
                var cols = settings.pages[pageID].c;
                var width = settings.pages[pageID].w;
                var height = settings.pages[pageID].h;
                var maxZoom = settings.pages[pageID].m_z;
                var leftOffset, widthToUse;

                // Use an array as a string builder - faster than str concatentation
                var content = [];
                var lastHeight, lastWidth, row, col, tileHeight, tileWidth, imgSrc;
                var tileNumber = 0;
                var heightFromTop = settings.heightAbovePages[pageID] + settings.paddingPerPage;

                // If it's the max width:
                if (width === settings.maxWidth) {
                    // If it's larger than the panel (or almost), we use the standard padding per page
                    if (width >= settings.panelWidth - 2 * settings.paddingPerPage) {
                        leftOffset = settings.paddingPerPage;
                    } else {
                        leftOffset = (settings.panelWidth - width) / 2;
                    }
                } else {
                    // Smaller than the max width
                    widthToUse = (settings.maxWidth > settings.panelWidth) ? settings.maxWidth + 2 * settings.paddingPerPage : settings.panelWidth;
                    leftOffset = (widthToUse - width) / 2;
                }

                content.push('<div id="diva-page-' + pageID + '" style="top: ' + heightFromTop + 'px; width:' + width + 'px; height: ' + height + 'px; left:' + leftOffset + 'px;">');

                // Calculate the width and height of the outer tiles (the ones that may have weird dimensions)
                lastHeight = height - (rows - 1) * settings.tileHeight;
                lastWidth = width - (cols - 1) * settings.tileWidth;

                // Now loop through the rows and columns
                for ( row = 0; row < rows; row++ ) {
                    for ( col = 0; col < cols; col++ ) {
                        var top = row * settings.tileHeight;
                        var left = col * settings.tileWidth;

                        // The zoom level might be different, if a page has a different max zoom level than the others
                        var zoomLevel = (maxZoom === settings.maxZoomLevel) ? settings.zoomLevel : settings.zoomLevel + (maxZoom - settings.maxZoomLevel); 
                        tileHeight = ( row === rows - 1 ) ? lastHeight : settings.tileHeight; // If it's the LAST tile, calculate separately
                        tileWidth = ( col === cols - 1 ) ? lastWidth : settings.tileWidth; // Otherwise, just set it to the default height/width
                        imgSrc = settings.iipServerBaseUrl + filename + '&amp;JTL=' + zoomLevel + ',' + tileNumber;
                        content.push('<div style="position: absolute; top: ' + top + 'px; left: ' + left + 'px; background-image: url(\'' + imgSrc + '\'); height: ' + tileHeight + 'px; width: ' + tileWidth + 'px;"></div>');
                        tileNumber++;
                    }
                }
            
                content.push('</div>');

                // Build the content string and append it to the document
                var contentString = content.join('');
                $('#diva-inner').append(contentString);
            }
        };

        // Delete a page from the DOM; will occur when a page is scrolled out of the viewport
        var deletePage = function(pageID) {
            if (isPageLoaded(pageID)) {
                $('#diva-page-' + pageID).remove();
            }
        };

        // Private helper function, check if a page ID is valid
        var inRange = function(pageID) {
            if (pageID >= 0 && pageID < settings.numPages) {
                return true;
            } else {
                return false;
            }
        };

        // Private helper function, check if the bottom of a page is above the top of a viewport
        // For when you want to keep looping but don't want to load a specific page
        var aboveViewport = function(pageID) {
            var bottomOfPage = settings.heightAbovePages[pageID] + settings.pages[pageID].h + settings.paddingPerPage;
            var topOfViewport = settings.scrollSoFar; 
            if ( bottomOfPage < topOfViewport ) {
                return true;
            }
            return false;
        };
        
        // Private helper function, check if the top of a page is below the bottom of a viewport
        // Used for scrolling up
        var belowViewport = function(pageID) {
            var topOfPage = settings.heightAbovePages[pageID];
            var bottomOfViewport = settings.scrollSoFar + settings.panelHeight;
            if ( topOfPage > bottomOfViewport ) {
                return true;
            }
            return false;
        };

        // Determines and sets the "current page" (settings.pageLoadedId); called within adjustPages 
        // The "direction" can be 0, 1 or -1; 1 for down, -1 for up, and 0 to go straight to a specific page
        var setCurrentPage = function(direction, pageID) {
            var currentPage = settings.pageLoadedId;
            var pageToConsider = settings.pageLoadedId + parseInt(direction, 10);
            var middleOfViewport = settings.scrollSoFar + (settings.panelHeight / 2);
            var changeCurrentPage = false;

            // When scrolling up:
            if ( direction < 0 ) {
                // If the current pageTop is below the middle of the viewport
                // Or the previous pageTop is below the top of the viewport
                if ( pageToConsider >= 0 && (settings.heightAbovePages[currentPage] >= middleOfViewport || settings.heightAbovePages[pageToConsider] >= settings.scrollSoFar) ) {
                    changeCurrentPage = true;
                }
            } else if ( direction > 0) {
                // When scrolling down:
                // If the previous pageBottom is above the top and the current page isn't the last page
                if ( settings.heightAbovePages[currentPage] + settings.pages[currentPage].h < settings.scrollSoFar && pageToConsider < settings.pages.length ) {
                    changeCurrentPage = true;
                }
            } else {
                // Just go straight to a certain page (for the goto function)
                changeCurrentPage = true;
                pageToConsider = pageID;
            }

            if ( changeCurrentPage ) {
                // Set this to the current page
                settings.pageLoadedId = pageToConsider;

                // Change the text to reflect this - pageToConsider + 1 (because it's page number not ID)
                $('#diva-current span').text(pageToConsider + 1);
                
                // Now try to change the next page, given that we're not going to a specific page
                // Calls itself recursively - this way we accurately obtain the current page
                if ( direction !== 0 ) {
                    setCurrentPage(direction);
                }
            }
        };

        // Called by adjust pages - see what pages should be visisble, and show them
        var attemptPageShow = function(pageID, direction) {
            if (direction > 0) {
                // Direction is positive - we're scrolling down
                // Should we add this page to the DOM? First check if it's a valid page
                if (inRange(pageID)) {
                    // If it's near the viewport, yes, add it
                    if (nearViewport(pageID)) {
                        appendPage(pageID);

                        // Reset the last page loaded to this one
                        settings.lastPageLoaded = pageID;

                        // Recursively call this function until there's nothing to add
                        attemptPageShow(settings.lastPageLoaded+1, direction);
                    } else if (aboveViewport(pageID)) {
                        // Otherwise, is it below the viewport?
                        // Do not increment last page loaded, that would be lying
                        // Attempt to call this on the next page
                        attemptPageShow(pageID + 1, direction);
                    }
                } else {
                    // Nothing to do ... return
                    return;
                }
            } else {
                // Direction is negative - we're scrolling up
                if (inRange(pageID)) {
                    // If it's near the viewport, yes, add it
                    if (nearViewport(pageID)) {
                        appendPage(pageID);

                        // Reset the first page loaded to this one
                        settings.firstPageLoaded = pageID;

                        // Recursively call this function until there's nothing to add
                        attemptPageShow(settings.firstPageLoaded-1, direction);
                    } else if (belowViewport(pageID)) {
                        // Attempt to call this on the next page, do not increment anything
                        attemptPageShow(pageID-1, direction);
                    }
                } else {
                    // Nothing to do ... return
                    return;
                }
            }
        };

        // Called by adjustPages - see what pages need to be hidden, and hide them
        var attemptPageHide = function(pageID, direction) {
            if (direction > 0) {
                // Direction is positive - we're scrolling down
                // Should we delete this page from the DOM?
                if (inRange(pageID) && aboveViewport(pageID)) {
                    // Yes, delete it, reset the first page loaded
                    deletePage(pageID);
                    settings.firstPageLoaded++;

                    // Try to call this function recursively until there's nothing to delete
                    attemptPageHide(settings.firstPageLoaded, direction);
                } else {
                    // Nothing to delete - return
                    return;
                }
            } else {
                // Direction must be negative (not 0, see adjustPages), we're scrolling up
                if (inRange(pageID) && belowViewport(pageID)) {
                    // Yes, delete it, reset the last page loaded
                    deletePage(pageID);
                    settings.lastPageLoaded--;
                    
                    // Try to call this function recursively until there's nothing to delete
                    attemptPageHide(settings.lastPageLoaded, direction);
                } else {
                    return;
                }
            }
        };

        // Handles showing and hiding pages when the user scrolls
        var adjustPages = function(direction) {
            // Direction is negative, so we're scrolling up
            if (direction < 0) {
                attemptPageShow(settings.firstPageLoaded-1, direction);
                setCurrentPage(-1);
                attemptPageHide(settings.lastPageLoaded, direction);
            } else if (direction > 0) {
                // Direction is positive so we're scrolling down
                attemptPageHide(settings.firstPageLoaded, direction);
                attemptPageShow(settings.lastPageLoaded+1, direction);
                setCurrentPage(1);
            }

            // Handle the scrolling callback functions here
            if (typeof settings.scroll == 'function' && direction != 0) {
                settings.scroll.call(this);
            }
            if (typeof settings.scrollUp == 'function' && direction < 0) {
                settings.scrollUp.call(this);
            }
            if (typeof settings.scrollDown == 'function' && direction > 0) {
                settings.scrollDown.call(this);
            }
        };
        
        // Helper function called by ajaxRequest to scroll to the desired place
        var scrollAfterRequest = function() {
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
                // This isn't working just zoom in on the middle for now
                if ( settings.maxWidth + settings.paddingPerPage * 2 <= settings.panelWidth ) {
                    desiredLeft = 0;
                } else {
                    desiredLeft = settings.maxWidth / 2 - settings.panelWidth / 2 + settings.paddingPerPage;
                }

                // Either do the expected zoom or zoom in on the middle
                desiredLeft = ( settings.horizontalOffset > 0 ) ? settings.horizontalOffset * zChangeRatio : settings.maxWidth / 2 - settings.panelWidth / 2 + settings.paddingPerPage;
                desiredTop = settings.verticalOffset * zChangeRatio;
            }
            
            settings.prevVptTop = 0;
            $('#diva-outer').scrollTop(desiredTop);
            $('#diva-outer').scrollLeft(desiredLeft);
        };
        
        // AJAX request to start the whole process - called upon page load and upon zoom change
        var ajaxRequest = function(zoomLevel) {
            $.ajax({
                // Works now - using proxy_pass for nginx to forward to the other port
                url: settings.backendServer + zoomLevel + '/',
                cache: false, // debugging
                context: this, // for later
                dataType: "json",
                success: function(data) {
                    // If it's the first AJAX request, store some variables that won't change with each zoom
                    if (settings.firstAjaxRequest) {
                        settings.itemTitle = data.item_title;
                        settings.numPages = data.pgs.length;
                        settings.maxZoomLevel = (settings.maxZoomLevel > 0) ? settings.maxZoomLevel : data.max_zoom;

                        // Set the total number of pages
                        $('#diva-current label').text(settings.numPages);

                        // Create the zoomer here, if needed
                        if (settings.zoomSlider) {
                            createZoomer();
                        }

                        // Change the title to the actual title if automatic title is true
                        if (settings.automaticTitle) {
                            $(settings.elementSelector).prepend('<div id="diva-title">' + settings.itemTitle + '</div>');
                        }

                        settings.firstAjaxRequest = false;
                    }

                    // Reset the vertical scroll and clear out the innerdrag div
                    $('#diva-outer').scrollTop(0);
                    $('#diva-inner').text('');                   

                    // Now reset some things that need to be changed after each zoom
                    settings.pages = data.pgs;
                    settings.totalHeight = data.dims.t_hei + settings.paddingPerPage * (settings.numPages + 1); 
                    settings.zoomLevel = zoomLevel;
                    settings.maxWidth = data.dims.mx_w;
                    settings.maxHeight = data.dims.mx_h;
                    settings.dimAfterZoom = settings.totalHeight; 
                    settings.firstPageLoaded = 0;

                    // Needed to set settings.heightAbovePages - initially just the top padding
                    var heightSoFar = 0;

                    var i;
                    for ( i = 0; i < settings.numPages; i++ ) {                 
                        // First set the height above that page by adding this height to the previous total
                        // A page includes the padding above it
                        settings.heightAbovePages[i] = heightSoFar;

                        // Has to be done this way otherwise you get the height of the page included too
                        heightSoFar = settings.heightAbovePages[i] + settings.pages[i].h + settings.paddingPerPage;

                        // Now try to load the page ONLY if the page needs to be loaded
                        // Take scrolling into account later, just try this for now
                        if (nearViewport(i)) {
                            appendPage(i);
                            settings.lastPageLoaded = i;
                        }
                    }
                    
                    // Set the height and width of documentpane (necessary for dragscrollable)
                    $('#diva-inner').css('height', settings.totalHeight);
                    var widthToSet = (data.dims.mx_w + settings.paddingPerPage * 2 < settings.panelWidth ) ? settings.panelWidth : data.dims.mx_w + settings.paddingPerPage * 2; // width of page + 40 pixels on each side if necessary
                    $('#diva-inner').css('width', widthToSet);

                    // Scroll to the proper place
                    scrollAfterRequest();

                    // For use in the next ajax request (zoom change)
                    settings.dimBeforeZoom = settings.dimAfterZoom;

                } // ends the success function
            }); // ends the $.ajax function
        };
        
        // Called whenever there is a scroll event in the document panel (the #diva-outer element)
        var handleScroll = function() {
            settings.scrollSoFar = $('#diva-outer').scrollTop();
            adjustPages(settings.scrollSoFar - settings.prevVptTop);
            settings.prevVptTop = settings.scrollSoFar;
        };

        // Handles zooming - called after pinch-zoom, changing the slider, or double-clicking
        var handleZoom = function(zoomLevel) {
            var zoomDirection;

            // First check if we're zooming in or out
            if (settings.zoomLevel === zoomLevel) {
                // They are the same (why?); return
                return;
            } else if (settings.zoomLevel > zoomLevel) {
                // Zooming out; zoom direction is positive
                zoomDirection = 1;
            } else {
                // Zooming in; zoom direction is negative
                zoomDirection = -1;
            }

            // Now do an ajax request with the new zoom level
            ajaxRequest(zoomLevel);

            // Make the slider display the new value (it may already)
            $('#diva-zoomer').slider({
                value: zoomLevel
            });

            // If the callback function is set, execute it
            if (typeof settings.zoom == 'function') {
                // zoom: function(newZoomLevel) { doSomething(); }
                settings.zoom.call(this, zoomLevel);
            }

            // Execute the zoom in/out callback function if necessary
            if (zoomDirection > 0) {
                // Zooming out
                if (typeof settings.zoomOut == 'function') {
                    settings.zoomOut.call(this, zoomLevel);
                }
            } else {
                // Zooming in
                if (typeof settings.zoomIn == 'function') {
                    settings.zoomIn.call(this, zoomLevel);
                }
            }
        };

        // Called whenever the zoom slider is moved
        var handleZoomSlide = function(zoomLevel) {
            // First get the vertical offset (vertical scroll so far)
            settings.verticalOffset = $('#diva-outer').scrollTop();
            settings.horizontalOffset = $('#diva-outer').scrollLeft();
            
            // Let handleZoom handle zooming
            settings.doubleClick = false;
            handleZoom(zoomLevel);
        };

        // Private function for going to a page
        var gotoPage = function(pageNumber) {
            // Since we start indexing from 0, subtract 1 to behave as the user expects
            pageNumber--;

            // First make sure that the page number exists (i.e. is in range)
            if ( inRange(pageNumber) ) {
                var heightToScroll = settings.heightAbovePages[pageNumber];

                // Change the "currently on page" thing
                setCurrentPage(0, pageNumber);
                $('#diva-outer').scrollTop(heightToScroll);

                // Now execute the callback function if it is defined
                if (typeof settings.jump == 'function') {
                    // Pass it the page number, +1 as the user expects
                    settings.jump.call(this, pageNumber+1);
                }

                return true; // To signify that we can scroll to this page
            }
            return false;
        };
        
        // Handles the double click event, put in a new function for better codeflow
        var handleDoubleClick = function(event, viewer) {
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
                settings.centerX = (event.pageX - settings.viewerXOffset) + $('#diva-outer').scrollLeft();
                settings.centerY = (event.pageY - settings.viewerYOffset) + $('#diva-outer').scrollTop();

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
            }

            // Has to call handleZoomSlide so that the coordinates are kept
            handleZoomSlide(newZoomLevel);
        };

        // Initiates the process
        var initiateViewer = function() {
            // Create the inner and outer panels
            $(settings.elementSelector).append('<div id="diva-outer"></div>');
            $('#diva-outer').append('<div id="diva-inner" class="dragger"></div>');

            // Change the cursor for dragging.
            $('#diva-inner').mouseover(function() {
                $(this).removeClass('grabbing').addClass('grab');
            });
            
            $('#diva-inner').mouseout(function() {
                $(this).removeClass('grab');
            });
            
            $('#diva-inner').mousedown(function() {
                $(this).removeClass('grab').addClass('grabbing');
            });
            
            $('#diva-inner').mouseup(function() {
                $(this).removeClass('grabbing').addClass('grab');
            });

            // Get the height and width of the outerdrag element
            settings.panelWidth = parseInt($('#diva-outer').width(), 10) - 20; // for the scrollbar change later
            settings.panelHeight = parseInt($('#diva-outer').height(), 10);
            
                        
            // Do the AJAX request - calls all the image display functions in turn
            ajaxRequest(settings.zoomLevel); // with the default zoom level


            // Handle the scroll
            $('#diva-outer').scroll(function() {
                handleScroll();
            });
            
            // Set drag scroll on first descendant of class dragger on both selected elements
            $('#diva-outer, #diva-inner').dragscrollable({dragSelector: '.dragger', acceptPropagatedEvent: true});
            
            // Double-click to zoom
            $('#diva-outer').dblclick(function(event) {
                // First set the x and y offsets of the viewer from the edge of document
                settings.viewerXOffset = this.offsetLeft;
                settings.viewerYOffset = this.offsetTop;

                handleDoubleClick(event);
            });

            // Prevent the context menu within the outerdrag IF it was triggered with the ctrl key
            $('#diva-outer').bind("contextmenu", function(e) {
                if (event.ctrlKey) {
                    e.preventDefault();
                }
            });

            // Check if the user is on a iPhone or iPod touch or iPad
            if ((navigator.userAgent.match(/iPhone/i)) || (navigator.userAgent.match(/iPad/i)) || (navigator.userAgent.match(/iPod/i))) {
                // One-finger scroll within outerdrag
                $('#diva-outer').oneFingerScroll();

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
                $('body').bind('gestureend', function(event) {
                    var e = event.originalEvent;
                    scale(e);
                });
            }

            // Only check if either scrollBySpace or scrollByKeys is enabled
            if (settings.scrollBySpace || settings.scrollByKeys) {
                var spaceKey = $.ui.keyCode.SPACE;
                var pageUpKey = $.ui.keyCode.PAGE_UP;
                var pageDownKey = $.ui.keyCode.PAGE_DOWN;

                // Catch the key presses in document
                $(document).keydown(function(event) {
                    // Space or page down - go to the next page
                    if ((settings.scrollBySpace && event.keyCode == spaceKey) || (settings.scrollByKeys && event.keyCode == pageDownKey)) {
                        $('#diva-outer').scrollTop(settings.scrollSoFar + settings.panelHeight);
                        return false;
                    }

                    // Page up - go to the previous page
                    if (settings.scrollByKeys && event.keyCode == pageUpKey) {
                        $('#diva-outer').scrollTop(settings.scrollSoFar - settings.panelHeight);
                        return false;
                    }
                });
            }

        };

        // Creates a zoomer using the min and max zoom levels specified ... PRIVATE, only if zoomSlider = true
        var createZoomer = function() {
            $('#diva-tools').prepend('<div id="diva-zoomer"></div>');
            $('#diva-zoomer').slider({
                    value: settings.zoomLevel,
                    min: settings.minZoomLevel,
                    max: settings.maxZoomLevel,
                    step: 1,
                    slide: function(event, ui) {
                        handleZoomSlide(ui.value);
                    }
                });
        };
        
        // Creates the gotoPage thing
        var createGotoPage = function() {
            $('#diva-tools').append('<div id="diva-goto">Go to page <input type="text" size="3" id="diva-goto-input" /> <input type="submit" id="diva-goto-submit" value="Go" /><br /><div id="diva-current">Current page: <span>1</span> of <label></label></div></div>');
            
            $('#diva-goto-submit').click(function() {
                var desiredPage = parseInt($('#diva-goto-input').val(), 10);
                if ( !gotoPage(desiredPage) ) {
                    alert('Invalid page number');
                }
            });
        };

        
        var init = function() {
            settings.elementSelector = '#' + $(element).attr('id');

            /*settings.id = $.generateId('dv');
            
            // Figure out how to use this
            settings.containerEl = settings.id + '-container';
            settings.itemEl = settings.id + '-item';
            settings.pageEl = settings.id + '-page-';
            settings.tileEl = settings.id + '-tile-';*/
            
            // If we need either a zoom slider or a gotoPage thing, create a "viewertools" div
            if (settings.zoomSlider || settings.gotoPage) {
                $(settings.elementSelector).prepend('<div id="diva-tools"></div>');
            }
            
            if (settings.gotoPage) {
                createGotoPage();
            }
            
            if (!settings.interPagePaddingType) {
                settings.interPagePaddingType = 'adaptive';
            }

            initiateViewer();
        };

        // call the init function when this object is created.
        init();

        // Public function, returns the title of the document
        this.getItemTitle = function() {
            return settings.itemTitle;
        };

        // Public function for going to a specific page, returns false if that page is invalid
        this.gotoPage = function(pageNumber) {
            return gotoPage(pageNumber);
        };

        // Public function, returns the current page that the user is on
        this.getCurrentPage = function() {
            return settings.pageLoadedId;
        };
    };
    
    /// this should not need to be changed.
    $.fn.diva = function(options) {
        return this.each(function() {
            var element = $(this);
            // Return early if this element already has a plugin instance
            
            if (element.data('diva')) {
                return;
            }
            
            var diva = new Diva(this, options);
            element.data('diva', diva);
        });
    };
    
})( jQuery );
