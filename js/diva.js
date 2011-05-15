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
            backendServer: '',          // Must be set
            gotoPage: true,             // Should there be a "go to page" option or not, defaults to yes
            iipServerBaseUrl: '',       // Must be set
            maxZoomLevel: 5,            // used in conjunction with IIP server. Default is 5 levels of zoom.
            minZoomLevel: 0,            // Defaults to 0 (the minimum zoom)
            paddingPerPage: 40,         // For now because it is
            scrollBySpace: false,       // Can user scroll down with the space bar? Disabled by default
            scrollByKeys: true,         // Can user scroll with the page up/page down keys?
            tileHeight: 256,            // Same width and height for tiles for every page in this item
            tileWidth: 256,             // ^
            zoomLevel: 2,               // current zoom level. (initial zoom level)
            zoomSlider: true,           // Should there be a zoom slider or not, defaults to yes
            //containerEl: null,          // the container element id.
            //itemEl: null,               // the item element id
            //itemOrientation: 0,         // Either "h" (horizontal) or "v" (vertical) - currently unused
        };
        
        // apply the defaults, or override them with passed in options.
        var settings = $.extend({}, defaults, options);

        // Things that cannot be changed because of the way they are used by the script
        // Many of these are set with arbitrary values here; equivalent to declaring them
        var globals = {
            centerX: 0,                 // Only used if doubleClick is true - for zooming in
            centerY: 0,                 // Y-coordinate, see above
            dimAfterZoom: 0,            // used for storing the item dimensions after zooming
            dimBeforeZoom: 0,           // used for storing the item dimensions before zooming.
            doubleClick: false,         // If the zoom has been triggered by a double-click event
            firstPageLoaded: -1,        // The ID of the first page loaded (value set later)
            heightAbovePages: [],       // The height above each page
            horizontalOffset: 0,        // Used for storing the page offset before zooming
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
            viewerXOffset: 0,           // distance between left edge of viewer and document left edge
            viewerYOffset: 0,            // ^ for top edges
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
            var thisID = '#page-' + pageID;

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

                content.push('<div id="page-' + pageID + '" style="top: ' + heightFromTop + 'px; width:' + width + 'px; height: ' + height + 'px; left:' + leftOffset + 'px;">');

                // Calculate the width and height of the outer tiles (the ones that may have weird dimensions)
                lastHeight = height - (rows - 1) * settings.tileHeight;
                lastWidth = width - (cols - 1) * settings.tileWidth;

                // Now loop through the rows and columns
                for ( row = 0; row < rows; row++ ) {
                    for ( col = 0; col < cols; col++ ) {
                        var top = row * settings.tileHeight;
                        var left = col * settings.tileWidth;
                        tileHeight = ( row === rows - 1 ) ? lastHeight : settings.tileHeight; // If it's the LAST tile, calculate separately
                        tileWidth = ( col === cols - 1 ) ? lastWidth : settings.tileWidth; // Otherwise, just set it to the default height/width
                        imgSrc = settings.iipServerBaseUrl + filename + '&amp;JTL=' + settings.zoomLevel + ',' + tileNumber;
                        content.push('<div style="position: absolute; top: ' + top + 'px; left: ' + left + 'px; background-image: url(\'' + imgSrc + '\'); height: ' + tileHeight + 'px; width: ' + tileWidth + 'px;"></div>');
                        tileNumber++;
                    }
                }
            
                content.push('</div>');
                // Build the content string 
                var contentString = content.join('');
                // Just append it straight to the document
                $('#documentpanel').append(contentString);
            }
        };

        var deletePage = function(pageID) {
            if (isPageLoaded(pageID)) {
                $('#page-' + pageID).remove();
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

        // Temporary private helper functions - move them later
        var aboveViewport = function(pageID) {
            // If the bottom of the page is above the top of viewport
            // For when you want to keep looping but don't want to load a specific page
            var bottomOfPage = settings.heightAbovePages[pageID] + settings.pages[pageID].h + settings.paddingPerPage;
            var topOfViewport = settings.scrollSoFar; 
            if ( bottomOfPage < topOfViewport ) {
                return true;
            }
            return false;
        };
        
        // For scrolling up
        var belowViewport = function(pageID) {
            // If the top of the page is below the bottom of the viewport
            var topOfPage = settings.heightAbovePages[pageID];
            var bottomOfViewport = settings.scrollSoFar + settings.panelHeight;
            if ( topOfPage > bottomOfViewport ) {
                return true;
            }
            return false;
        };

        // Determines and sets the "current page" (settings.pageLoadedId); called within adjustPages 
        var setCurrentPage = function(direction, pageID) {
            // direction can be 0, 1 or -1 ... 1 for down, -1 for up, 0 for bypassing, going to a specific page
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
                $('#currentpage span').text(pageToConsider + 1);
                
                // Now try to change the next page, given that we're not going to a specific page
                // Calls itself recursively - this way we accurately obtain the current page
                if ( direction !== 0 ) {
                    setCurrentPage(direction);
                }
            }
        };

        var attemptPageShow = function(pageID, direction) {
            if (direction > 0) {
                // Direction is positive - we're scrolling down
                // Should we add this page to the DOM? First check if it's a valid page
                if (inRange(pageID)) {
                    // If it's near the viewport, yes, add it
                    if (nearViewport(pageID)) {
                        appendPage(pageID);
                        //setCurrentPage(1);
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
                        //setCurrentPage(-1);
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
        };
        
        // Helper function called by ajaxRequest to scroll to the desired place
        var scrollAfterRequest = function() {
            // The x and y coordinates of the center ... let's zoom in on them
            var centerX, centerY, desiredLeft, desiredTop;
            
            // zoom change ratio - if first ajax request, set to 1
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
            $('#outerdrag').scrollTop(desiredTop);
            $('#outerdrag').scrollLeft(desiredLeft);
        };
        
        // AJAX request to start the whole process - called upon page load and upon zoom change
        var ajaxRequest = function(zoomLevel) {
            $.ajax({
                // Works now - using proxy_pass for nginx to forward to the other port
                url: settings.backendServer + zoomLevel + '/',
                //url: 'http://petrucci.musiclibs.net:9002/json.html',
                cache: false, // debugging
                context: this, // for later
                dataType: "json",
                //jsonp: 'onJSONPLoad',
                success: function(data) {
                    $('#outerdrag').scrollTop(0);
                    // Clear 
                    $('#documentpanel').text('');                   

                    // pgs array stored in data.pgs - save it to settings.pages
                    settings.pages = data.pgs;
                    settings.numPages = data.pgs.length;

                    // Have to set the number of pages here
                    if ($('#currentpage label').text().length == 0) {
                        $('#currentpage label').text(settings.numPages);
                    }
                    
                    // Reapply all the settings? Or just most of them? Figure out later
                    settings.totalHeight = data.dims.t_hei + settings.paddingPerPage * (settings.numPages + 1); 
                    
                    // Change the set zoom and other things (clean this up later)
                    settings.zoomLevel = zoomLevel;
                    settings.maxWidth = data.dims.mx_w;
                    settings.maxHeight = data.dims.mx_h;
                    settings.dimAfterZoom = settings.totalHeight; 

                    // Needed to set settings.heightAbovePages - initially just the top padding
                    var heightSoFar = 0;
                    settings.firstPageLoaded = 0; // for now (before zooming etc is implemented)

                    var i;
                    // Loop through them this way instead of the $.each way because we need the actual index
                    for ( i = 0; i < settings.numPages; i++ ) {                 
                        // First set the height above top for that page ... add this page height to the previous total
                        // Think of a page as including the padding ... so you get sent to 10px above the top or whatever
                        settings.heightAbovePages[i] = heightSoFar;
                        // Has to be done this way otherwise you get the height of the page included too ...
                        heightSoFar = settings.heightAbovePages[i] + settings.pages[i].h + settings.paddingPerPage;

                        // Now try to load the page ONLY if the page needs to be loaded
                        // Take scrolling into account later, just try this for now
                        if (nearViewport(i)) {
                            appendPage(i);
                            settings.lastPageLoaded = i;
                        }
                    }
                    // Set the offset stuff, scroll to the proper places
        
                    // Change the title to the actual title
                    $('#itemtitle').text(data.item_title);
                    
                    // Set the height and width of documentpane (necessary for dragscrollable)
                    $('#documentpanel').css('height', settings.totalHeight);
                    var widthToSet = (data.dims.mx_w + settings.paddingPerPage * 2 < settings.panelWidth ) ? settings.panelWidth : data.dims.mx_w + settings.paddingPerPage * 2; // width of page + 40 pixels on each side if necessary
                    $('#documentpanel').css('width', widthToSet);

                    // Scroll to the proper place
                    scrollAfterRequest();
                    // Figure out way to scroll before doing shit

                    // For use in the next ajax request (zoom change)
                    settings.dimBeforeZoom = settings.dimAfterZoom;

                } // ends the success function
            }); // ends the $.ajax function
        };
        
        // Called by something in index.html
        // Optional argument "direct" - when called by gotoPage
        var handleScroll = function() {
            settings.scrollSoFar = $('#outerdrag').scrollTop();
            adjustPages(settings.scrollSoFar - settings.prevVptTop);
            settings.prevVptTop = settings.scrollSoFar;
        };
        
        var handleZoom = function(zoomLevel) {
            // First get the vertical offset (vertical scroll so far)
            settings.verticalOffset = $('#outerdrag').scrollTop();
            settings.horizontalOffset = $('#outerdrag').scrollLeft();
            
            // Do another request with the requested zoomLevel, set doubleClick to NOT true
            settings.doubleClick = false;
            ajaxRequest(zoomLevel);
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
                $('#outerdrag').scrollTop(heightToScroll);

                // Isn't working properly figure it out
                // Now we have to actually load the page, and possible pages on both sides
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
                // have to do this.offsetLeft and top ... otherwise relative to edge of document
                settings.centerX = (event.pageX - settings.viewerXOffset) + $('#outerdrag').scrollLeft();
                settings.centerY = (event.pageY - settings.viewerYOffset) + $('#outerdrag').scrollTop();

                // Set doubleClick to true, so we know where to zoom in
                settings.doubleClick = true;
                
                // Do an AJAX request with the new zoom level - will zoom in to the right place
                ajaxRequest(newZoomLevel);
                
                // Make the slider display the new value
                $('#zoomer').slider({
                    value: newZoomLevel
                });
        };

        // Testing scale in the iPad
        this.scale = function(event) {
            var newZoomLevel = settings.zoomLevel;
            // First figure out the new zoom level:
            if (event.scale > 1 && newZoomLevel < settings.maxZoomLevel) {
                newZoomLevel++;
            } else if (event.scale < 1 && newZoomLevel > settings.minZoomLevel) {
                newZoomLevel--;
            }
            handleZoom(newZoomLevel);
            // Make the slider display the new zoom level
            // Unnecessarily reusing code ... fix later
            $('#zoomer').slider({
                value: newZoomLevel
            });
        };

        // Initiates the process; accepts outerdrag and innerdrag ID's
        this.initiateViewer = function(outerdrag, innerdrag) {
            
            // change the cursor for dragging.
            $(innerdrag).mouseover(function() {
                $(this).removeClass('grabbing').addClass('grab');
            });
            
            $(innerdrag).mouseout(function() {
                $(this).removeClass('grab');
            });
            
            $(innerdrag).mousedown(function() {
                $(this).removeClass('grab').addClass('grabbing');
            });
            
            $(innerdrag).mouseup(function() {
                $(this).removeClass('grabbing').addClass('grab');
            });

            // Get the height and width of the outerdrag element
            settings.panelWidth = parseInt($(outerdrag).width(), 10) - 20; // for the scrollbar change later
            settings.panelHeight = parseInt($(outerdrag).height(), 10);
            
                        
            // Do the AJAX request - calls all the image display functions in turn
            ajaxRequest(settings.zoomLevel); // with the default zoom level

            // Handle the scroll
            $(outerdrag).scroll(function() {
                handleScroll();
            });
            
            // Set drag scroll on first descendant of class dragger on both selected elements
            $(outerdrag + ', ' + innerdrag).dragscrollable({dragSelector: '.dragger', acceptPropagatedEvent: true});
            
            // Double-click to zoom
            $(outerdrag).dblclick(function(event) {
                // First set the x and y offsets of the viewer from the edge of document
                settings.viewerXOffset = this.offsetLeft;
                settings.viewerYOffset = this.offsetTop;

                handleDoubleClick(event);
            });

            // Prevent the context menu within the outerdrag IF it was triggered with the ctrl key
            $(outerdrag).bind("contextmenu", function(e) {
                if (event.ctrlKey) {
                    e.preventDefault();
                }
            });

            // Check if the user is on a iPhone or iPod touch or iPad
            if ((navigator.userAgent.match(/iPhone/i)) || (navigator.userAgent.match(/iPad/i)) || (navigator.userAgent.match(/iPod/i))) {
                // One-finger scroll within outerdrag
                $(outerdrag).oneFingerScroll();
                // Prevent resizing
                $('head').append('<meta name="viewport" content="user-scalable=no, width=device-width" />');
                // Prevent elastic scrolling
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
                        $(outerdrag).scrollTop(settings.scrollSoFar + settings.panelHeight);
                        return false;
                    }

                    // page up - go to the previous page
                    if (settings.scrollByKeys && event.keyCode == pageUpKey) {
                        $(outerdrag).scrollTop(settings.scrollSoFar - settings.panelHeight);
                        return false;
                    }
                });
            }

        };

        // Creates a zoomer using the min and max zoom levels specified ... PRIVATE, only if zoomSlider = true
        var createZoomer = function() {
            $('#viewertools').prepend('<div id="zoomer"></div>');
            $('#zoomer').slider({
                    value: 2,
                    min: settings.minZoomLevel,
                    max: settings.maxZoomLevel,
                    step: 1,
                    slide: function(event, ui) {
                        handleZoom(ui.value);
                    }
                });
        };
        
        // Creates the gotoPage thing
        var createGotoPage = function() {
            $('#viewertools').append('<div id="gotopage">Go to page <input type="text" size="3" id="goto-page" /> <input type="submit" id="goto" value="Go" /><br /><div id="currentpage">Current page: <span>1</span> of <label></label></div></div>');
            
            $('#goto').click(function() {
                var desiredPage = parseInt($('#goto-page').val(), 10);
                if ( !gotoPage(desiredPage) ) {
                    alert('Invalid page number');
                }
            });
        };
        
        this.getId = function() {
            return settings.id;
        };
        
        this.getContainerId = function() {
            return settings.containerEl;
        };
        
        // private methods
        var init = function() {
            settings.id = $.generateId('dv');
            
            // Figure out how to use this
            settings.containerEl = settings.id + '-container';
            settings.itemEl = settings.id + '-item';
            settings.pageEl = settings.id + '-page-';
            settings.tileEl = settings.id + '-tile-';
            
            // If we need either a zoom slider or a gotoPage thing, create a "viewertools" div
            if (settings.zoomSlider || settings.gotoPage) {
                $('#itemtitle').after('<div id="viewertools"></div>');
            }
            
           if (settings.zoomSlider) {
                createZoomer();
            }

            if (settings.gotoPage) {
                createGotoPage();
            }
            
            if (!settings.interPagePaddingType) {
                settings.interPagePaddingType = 'adaptive';
            }
        };

        // call the init function when this object is created.
        init();
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
