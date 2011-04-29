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
        var defaults =  {
            itemOrientation: 0,         // Either "h" (horizontal) or "v" (vertical)
            pages: [],                  // an array of all the pages in the item. Can be quite large.
            heightAbovePages: [],       // The heights above the pages
            numPages: 0,             // Number of pages in the array 
            pageLoadedId: 0,           // The current page in the viewport. Usually set to the center-most page.
            scrollLoadedId: -1,         // ??
            scrollTrigger: false,       // ??
            itemXOffset: 0,          // the x-offset for the item in the viewport
            itemYOffset: 0,          // the y-offset for the item in the viewport
            itemLength: null,           // the full length of the item (large if vertical, small if horiz.)
            itemWidth: null,            // opposite itemLength.
            itemHeight: null,           // ??
            centerline: null,           // ??
            tileHeight: 256,            // Same width and height for tiles for every page in this item
            tileWidth: 256,             // ^
            maxWidth: 0,                // The width of the largest page
            maxHeight: 0,               // the height of the largest page
            viewport: [],               // Coordinates of the moving viewport
            prevVptTop: 0,           // used to determine vert. scroll direction
            zoomLevel: 2,               // current zoom level. (initial zoom level)
            containerEl: null,          // the container element id.
            itemEl: null,               // the item element id
            panelWidth: parseInt($('#outerdrag').width(), 10) - 20,          // the panel width
            panelHeight: parseInt($('#outerdrag').height(), 10),             // panel height
            prevZoomLevel: 0,           // previous zoom level (change this later?)
            verticalOffset: 0,          // used for storing the page offset before zooming
            horizontalOffset: 0,        // ^
            dimBeforeZoom: 0,           // used for storing the item dimensions before zooming.
            dimAfterZoom: 0,            // used for storing the item dimensions after zooming
            minZoomLevel: 0,
            maxZoomLevel: 5,            // used in conjunction with IIP server. Default is 5 levels of zoom.
            isZoomCall: false,          // set to "true" if a zoom change request is detected
            isOrientationChange: false, // set to "true" if an orienation change request is detected.
            scrollSoFar: 0,             // How much the user has scrolled so far - replace later
            totalHeight: 0,             // Height of all the images stacked together (total)
            heightAboveTop: 0,          // when changing zoom ... height above the first loaded
            latestPage: 0,              // The most recent pageID loaded - for optimisation, sorta
            paddingPerPage: 40,         // For now because it is
            doubleClick: false,         // For use in AJAX requests - where do we zoom in, see handleDoubleClick()
            centerX: 0,                 // only used if doubleClick is true - for zooming in
            centerY: 0,                 // ^
            viewerXOffset: 0,           // distance between left edge of viewer and document left edge
            viewerYOffset: 0,            // ^ for top edges
            firstPageLoaded: -1,        // change these later (figure out default values)
            lastPageLoaded: -1,
            canScroll: false,         // If we're scrolling directly to a specific page
            scrollDelay: 20             // Number of milliseconds for delaying
        };
        
        // Timeout helper functions ... to skip scroll events if too frequent
        // 20 milliseconds between scroll events?
        // Start the timer
        var startTheTimer = function() {
            var timeoutID = setTimeout(function() {
                settings.canScroll = true;
            }, settings.scrollDelay);
        }
        // After the timer, set canScroll to true
        // After scrolling, set canScroll to false again

        // apply the defaults, or override them with passed in options.
        var settings = $.extend({}, defaults, options);

        // Checks if a page is within the viewport (called by pageLoad)
        var nearViewport = function(pageID) {
            var topOfPage = settings.heightAbovePages[pageID];
            var bottomOfPage = topOfPage + settings.pages[pageID].h;
            var panelHeight = settings.panelHeight;
            var topOfViewport = settings.scrollSoFar;
            var bottomOfViewport = topOfViewport + panelHeight;
           
            // Got rid of the +/- 100 thing maybe that will fix things
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
        
        // Private helper function for determining if a page has been loaded yet or not (i.e. has images)
        var isPageLoaded = function(pageID) {
            var thisID = '#page-' + pageID;
            console.log('checking if page ' + pageID + ' is loaded');
            if ($(thisID).length === 0) {
                return false;
            } else {
                return true;
            }
        };
        
        // Appends the page directly into the document body
        var appendPage = function(pageID) {
            console.log('appending page ' + pageID + ' to the dom');

            if (!isPageLoaded(pageID)) {
                var filename = settings.pages[pageID].fn;
                var rows = settings.pages[pageID].r;
                var cols = settings.pages[pageID].c;
                var width = settings.pages[pageID].w;
                var height = settings.pages[pageID].h;
                var leftOffset, widthToUse;
                var content = [];
                var lastHeight, lastWidth, row, col, tileHeight, tileWidth, imgSrc;
                var tileNumber = 0;
                var heightFromTop = settings.heightAbovePages[pageID] + (settings.paddingPerPage / 2);

                // If it's the max width:
                if (width == settings.maxWidth) {
                    // If it's larger than the panel (or almost), we use the standard padding per page
                    if (width >= settings.panelWidth - 2 * settings.paddingPerPage) {
                        leftOffset = settings.paddingPagePage;
                    } else {
                        leftOffset = (settings.panelWidth - width) / 2;
                    }
                } else {
                    // Smaller than the max width
                    widthToUse = (settings.maxWidth > settings.panelWidth) ? settings.maxWidth + 2 * settings.paddingPerPage : settings.panelWidth;
                    leftOffset = (widthToUse - width) / 2;
                }

                /* 
                If it's the max width:
                    -if it's larger than the panel, then use standard padding per page
                    -if it's smaller than the panel - 2*paddingPerPage, use:
                        (panelWidth - width) / 2
                If it's smaller than the max width:
                    -then take the max of the maxWidth and the panelWidth
                        -and use that to get the padding
                 
                */

                content.push('<div id="page-' + pageID + '" style="top: ' + heightFromTop + 'px; width:' + width + 'px; height: ' + height + 'px; left:' + leftOffset + 'px;">');

                // Calculate the width and height of the outer tiles (the ones that may have weird dimensions)
                lastHeight = height - (rows - 1) * settings.tileHeight;
                lastWidth = width - (cols - 1) * settings.tileWidth;

                // Now loop through the rows and columns
                for ( row = 0; row < rows; row++ ) {
                    for ( col = 0; col < cols; col++ ) {
                        var top = row * settings.tileHeight;
                        var left = col * settings.tileWidth;
                        tileHeight = ( row == rows - 1 ) ? lastHeight : settings.tileHeight; // If it's the LAST tile, calculate separately
                        tileWidth = ( col == cols - 1 ) ? lastWidth : settings.tileWidth; // Otherwise, just set it to the default height/width
                        imgSrc = settings.iipServerBaseUrl + filename + '&amp;JTL=' + settings.zoomLevel + ',' + tileNumber;
                        content.push('<div style="position: absolute; top: ' + top + 'px; left: ' + left + 'px; background-image: url(\'' + imgSrc + '\'); height: ' + tileHeight + 'px; width: ' + tileWidth + 'px;"></div>');
                        tileNumber++;
                    }
                }
            
                content.push('</div>');
                // Append the content
                var contentString = content.join('');
                // Just append it straight to the document
                $('#documentpanel').append(contentString);
            }
        };

        var deletePage = function(pageID) {
            console.log("deleting page " + pageID + " from the dom");
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
            var bottomOfPage = settings.heightAbovePages[pageID] + settings.pages[pageID].h;
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

        var attemptPageShow = function(pageID, direction) {
            console.log("attempting to show page " + pageID);

            if (direction > 0) {
                // Direction is positive - we're scrolling down
                // Should we add this page to the DOM? First check if it's a valid page
                if (inRange(pageID)) {
                    // If it's near the viewport, yes, add it
                    if (nearViewport(pageID)) {
                        console.log("scrolling down and it's near the viewport");
                        appendPage(pageID);
                        // Reset the last page loaded to this one
                        settings.lastPageLoaded = pageID;
                        // Recursively call this function until there's nothing to add
                        attemptPageShow(settings.lastPageLoaded+1, direction);
                    } else if (aboveViewport(pageID)) {
                        console.log("scrolling down and it's above the viewport");
                        // Otherwise, is it below the viewport?
                        // Do not increment last page loaded, that would be lying
                        // Attempt to call this on the next page
                        attemptPageShow(pageID + 1, direction);
                    }
                } else {
                    // Nothing to do ... return
                    console.log("not in range");
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

        var attemptPageHide = function(pageID, direction) {
            console.log("attempting to hide page " + pageID);
            //console.log("in range: " + inRange(pageID) + " and near viewport: " + nearViewport(pageID));
            
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
                console.log("Scrolling up");
                attemptPageShow(settings.firstPageLoaded-1, direction);
                attemptPageHide(settings.lastPageLoaded, direction);
            } else if (direction > 0) {
                // Direction is positive so we're scrolling down
                console.log("Scrolling down");
                attemptPageHide(settings.firstPageLoaded, direction);
                attemptPageShow(settings.lastPageLoaded+1, direction);
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
                    
                    // Reapply all the settings? Or just most of them? Figure out later
                    settings.totalHeight = data.dims.t_hei + settings.paddingPerPage * data.pgs.length;
                    // Could make settings.numPages = settings.pages.length but is there any points ...
                    
                    // pgs array stored in data.pgs - save it to settings.pages
                    settings.pages = data.pgs;
                    settings.numPages = data.pgs.length;
                    
                    // Change the set zoom and other things (clean this up later)
                    settings.zoomLevel = zoomLevel;
                    settings.maxWidth = data.dims.mx_w;
                    settings.maxHeight = data.dims.mx_h;
                    settings.dimAfterZoom = data.dims.t_hei + data.pgs.length * settings.paddingPerPage;

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
        
        

        // Determines and sets the "current page" (settings.pageLoadedId); called within handleScroll
        var setCurrentPage = function(direction, page) {
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
                // If the current pageTop is above the top and the current page isn't the last page
                if ( settings.heightAbovePages[currentPage] < settings.scrollSoFar && pageToConsider < settings.pages.length ) {
                    changeCurrentPage = true;
                }
            } else {
                // Just go straight to a certain page (for the goto function)
                changeCurrentPage = true;
                pageToConsider = page;
            }

            if ( changeCurrentPage ) {
                // Set this to the current page
                settings.pageLoadedId = pageToConsider;
                // Change the text to reflect this - pageToConsider + 1 (becuase it's page number not ID)
                $('#currentpage span').text(pageToConsider + 1);
                
                // Now try to change the next page, given that we're not going to a specific page
                // Calls itself recursively - this way we accurately obtain the current page
                if ( direction !== 0 ) {
                    setCurrentPage(direction);
                }
            }
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
                return 1; // To signify that we can scroll to this page
            }
            return 0;
        };
        
        // Handles the double click event, put in a new function for better codeflow
        var handleDoubleClick = function(event, viewer) {
                // If the zoom level is already at max, zoom out
                var newZoomLevel;
                if (settings.zoomLevel == settings.maxZoomLevel) {
                    if (event.altKey === true) {
                        newZoomLevel = settings.zoomLevel - 1;
                    } else {
                        return;
                    }
                } else if (settings.zoomLevel == settings.minZoomLevel) {
                    if (event.altKey === true) {
                        return;
                    } else {
                        newZoomLevel = settings.zoomLevel + 1;
                    }
                } else {
                    if (event.altKey === true) {
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
            
                        
            // Do the AJAX request - calls all the image display functions in turn
            ajaxRequest(settings.zoomLevel); // with the default zoom level
            // Handle the scroll
            $(outerdrag).scroll(function() {
                /*startTheTimer(); // trying out timer stuff
                if (settings.canScroll) {*/
                    handleScroll();
                /*}
                settings.canScroll = false;*/
                // timer not working work on it later
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
        };

        // Creates a zoomer using the min and max zoom levels specified ... PRIVATE, only if zoomSlider = true
        var createZoomer = function() {
            $('#diva-wrapper').prepend('<div id="zoomer"></div>');
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
            $('#diva-wrapper').prepend('<div id="gotopage">Go to page <input type="text" size="3" id="goto-page" /> <input type="submit" id="goto" value="Go" /><br /><div id="currentpage">Current page: <span>1</span></div></div>');
            
            $('#goto').click(function() {
                var desiredPage = parseInt($('#goto-page').val(), 10);
                if ( gotoPage(desiredPage) === 0 ) {
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
