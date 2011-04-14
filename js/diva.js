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
            numPages: null,             // Number of pages in the previous array.
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
            viewerYOffset: 0            // ^ for top edges
        };

        // apply the defaults, or override them with passed in options.
        var settings = $.extend({}, defaults, options);

        // Checks if a page is within 100px of the viewport (called by pageLoad)
        var nearViewport = function(pageID) {
            var heightAbovePage = settings.heightAbovePages[pageID];
            var bottomOfPage = heightAbovePage + settings.pages[pageID].h;
            var panelHeight = settings.panelHeight;
            var topOfViewport = $('#outerdrag').scrollTop();
            var bottomOfViewport = topOfViewport + panelHeight;
            
            if ( heightAbovePage > topOfViewport - 100 && heightAbovePage < bottomOfViewport + 100 ) {
                // If top of page is in the viewport (+/- 100 px) ... broken up for easier reading
                return true;
            } else if ( bottomOfPage > topOfViewport - 100 && bottomOfPage < bottomOfViewport + 100 ) {
                // Same as above for the bottom of the page
                return true;
            } else if ( heightAbovePage < topOfViewport && bottomOfPage > bottomOfViewport ) {
                // Top of page is above, bottom of page is below
                return true;
            } else {
                // The page is nowhere near the viewport, return 0
                return false;
            }
        };
        
        // Private helper function for determining if a page has been loaded yet or not (i.e. has images)
        var pageLoaded = function(pageID) {
            var thisClass = $('#page-' + pageID).attr('class');
            if ( thisClass === 'loaded-page') {
                return true;
            } else {
                return false;
            }
        };
        
        // Private helper function for determining if a page exists or not (i.e. the div is there)
        var pageExists = function(pageID) {
            var thisID = '#page-' + pageID;
            
            // If the length of this element is greater than 0, then it exists (jQuery shortcut)
            if ( $(thisID).length ) {
                return true;
            } else {
                return false;
            }
        };
        
        // Private helper function for loadPage - so blank pages and loaded pages are done the same way
        // Appends the page directly into the document body
        var appendPage = function(pageID, filename, rows, cols, width, height) {
            
            var leftOffset, pageType, content, lastHeight, lastWidth, row, col, tileHeight, tileWidth, imgSrc, tileNumber = 0;      
            var heightFromTop = settings.heightAbovePages[pageID] + (settings.paddingPerPage / 2);
            
            // If it just needs the standard padding per page
            if ( width >= settings.panelWidth && width === settings.maxWidth ) {
                leftOffset = settings.paddingPerPage;
            } else if ( width < settings.panelWidth ) {
                // if it's strictly smaller than the panel
                leftOffset = parseInt((settings.panelWidth - width) / 2, 10);
            } else {
                // It's larger than the panel, but a non-standard width
                leftOffset = ((settings.maxWidth + settings.paddingPerPage * 2) - width) / 2;
            }

            pageType = ( filename == 'blank' ) ? 'blank' : 'loaded';
            content = '<div class="' + pageType + '-page" id="page-' + pageID + '" style="top: ' + heightFromTop + 'px; width:' + width + 'px; height: ' + height + 'px; left:' + leftOffset + 'px;">';

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
                    imgSrc = ( filename == 'blank' ) ? 'blank.gif' : settings.iipServerBaseUrl + filename + '&amp;JTL=' + settings.zoomLevel + ',' + tileNumber;
                    content += '<div style="position: absolute; top: ' + top + 'px; left: ' + left + 'px; background-image: url(\'' + imgSrc + '\'); height: ' + tileHeight + 'px; width: ' + tileWidth + 'px;"></div>';
                    tileNumber++;
                }
            }
            
            content += '</div>';
            // Append the content
            $('#documentpanel').append(content);
        };
        
        // Pass it a page, it will determine if it needs to be loaded, and if so, load it
        var loadPage = function(pageID) {
            if ( nearViewport(pageID) ) {
                if ( pageExists(pageID) && !pageLoaded(pageID) ) {
                    // Currently a blank page, just change the background-image property and set it to loaded                   
                    var imgSrc = settings.iipServerBaseUrl + settings.pages[pageID].fn + '&JTL=' + settings.zoomLevel + ',';
                    var tileNumber = 0;
                    // First change the class to loaded-page so we know that it's loaded
                    $('#page-' + pageID).removeClass('blank-page').addClass('loaded-page');
                    $('#page-' + pageID).children('div').each(function() {
                        $(this).css("background-image", "url(" + imgSrc + tileNumber + ")");
                        tileNumber++;
                    });
                } else if ( !pageExists(pageID) ) {
                    // Append the page, give it a loaded class
                    appendPage(pageID, settings.pages[pageID].fn, settings.pages[pageID].r, settings.pages[pageID].c, settings.pages[pageID].w, settings.pages[pageID].h);
                }
                settings.latestPage = pageID;
                // Only other possibility - page is already loaded, do nothing
                // In any case, it was near the viewport, return 1
                return 1;
            } else {
                if ( !pageExists(pageID) ) {
                    // append the blank page
                    appendPage(pageID, 'blank', settings.pages[pageID].r, settings.pages[pageID].c, settings.pages[pageID].w, settings.pages[pageID].h);
                }
                // If the blank page already existed, do nothing, return 0
                // In any case it was not near the viewport so return 0
                return 0;
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
                //url: settings.backendServer + zoomLevel + '/',
                // commented out for debugging
                url: 'http://petrucci.musiclibs.net:9002/json.html',
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
                    
                    // Change the set zoom and other things (clean this up later)
                    settings.zoomLevel = zoomLevel;
                    settings.maxWidth = data.dims.mx_w;
                    settings.maxHeight = data.dims.mx_h;
                    settings.dimAfterZoom = data.dims.t_hei + data.pgs.length * settings.paddingPerPage;

                    // Needed to set settings.heightAbovePages - initially just the top padding
                    var heightSoFar = 0;

                    // Loop through them this way instead of the $.each way because we need the actual index
                    for ( var i = 0; i < settings.pages.length; i++ ) {                 
                        // First set the height above top for that page ... add this page height to the previous total
                        // Think of a page as including the padding ... so you get sent to 10px above the top or whatever
                        settings.heightAbovePages[i] = heightSoFar;
                        // Has to be done this way otherwise you get the height of the page included too ...
                        heightSoFar = settings.heightAbovePages[i] + settings.pages[i].h + settings.paddingPerPage;

                        // Now try to load the page (it may or may not need to be loaded)
                        loadPage(i);
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
                    
                    // For use in the next ajax request (zoom change)
                    settings.dimBeforeZoom = settings.dimAfterZoom;

                } // ends the success function
            }); // ends the $.ajax function
        };
        
        
        // Temporary private helper functions - move them later
        var aboveViewport = function(pageID) {
            // If the bottom of the page is above the top of viewport
            // For when you want to keep looping but don't want to load a specific page
            var bottomOfPage = settings.heightAbovePages[pageID] + settings.pages[pageID].h;
            var topOfViewport = $('#outerdrag').scrollTop();
            if ( bottomOfPage < topOfViewport ) {
                return true;
            }
            return false;
        };
        
        // For scrolling up
        var belowViewport = function(pageID) {
            // If the top of the page is below the bottom of the viewport
            var topOfPage = settings.heightAbovePages[pageID];
            var bottomOfViewport = $('#outerdrag').scrollTop() + settings.panelHeight;
            if ( topOfPage > bottomOfViewport ) {
                return true;
            }
            return false;
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


        // Public function for handling scroll, pass it the ID of the thing
        var handleScroll = function() {
            settings.scrollSoFar = $('#outerdrag').scrollTop();
            if ( settings.scrollSoFar > settings.prevVptTop ) {
                var nextPage = settings.latestPage + 1;
                
                // The || condition is a bit of a hack to get goto page to work
                while ( nextPage < settings.pages.length && ( loadPage(nextPage) || aboveViewport(nextPage) ) ) {
                        nextPage = nextPage + 1;
                }
                setCurrentPage(1);
            } else if ( settings.scrollSoFar < settings.prevVptTop ) {
                var previousPage = settings.latestPage - 1;
                while ( previousPage >= 0  && ( loadPage(previousPage) || belowViewport(previousPage) ) ) {
                    previousPage = previousPage - 1;
                }
                setCurrentPage(-1);
            }
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
            // Since it starts indexing from 0, subtract 1 to behave as the user expects
            // First make sure that the page number exists
            if ( pageNumber >= 1 && pageNumber <= settings.pages.length ) {
                var heightToScroll = settings.heightAbovePages[pageNumber-1];
                $('#outerdrag').scrollTop(heightToScroll);
                // Change the "currently on page" thing
                setCurrentPage(0, pageNumber - 1);
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
