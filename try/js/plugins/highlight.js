/*
Highlight plugin for diva.js
Allows you to highlight regions of a page image
*/

(function ($)
{
    window.divaPlugins.push((function()
    {
        var settings = {};
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                // initialize an empty highlights object.
                divaSettings.parentObject.data('highlights', {});
                var currentHighlight, currentHighlightPage;

                /*
                    When a new page is loaded, this method will be called with the
                    page index for the page. This method looks at the 'highlights'
                    data object set on the diva parent element, and determines whether
                    highlights exist for that page.

                    If so, this method will create and render elements for every
                    highlighted box.

                    If a page scrolls out of the viewer, the highlight elements
                    will be removed as part of the Diva DOM pruning process, since
                    each highlight element is a child of the the page object. When the page
                    is scrolled back in to view, this method is called again.

                    @param pageIdx       The page index of the page that is to be highlighted
                    @param filename      The image filename of the page
                    @param pageSelector  The selector for the page (unused here)
                */
                function _highlight(pageIdx, filename, pageSelector)
                {
                    var highlightObj = divaSettings.parentObject.data('highlights');

                    if (typeof highlightObj === 'undefined')
                        return;

                    if (highlightObj.hasOwnProperty(pageIdx))
                    {
                        //first, make sure no highlights already exist on the page
                        var pageHighlights = document.getElementById(divaSettings.ID + "page-" + pageIdx).getElementsByClassName(divaSettings.ID + "highlight");
                        while(pageHighlights[0])
                        {
                            pageHighlights[0].parentNode.removeChild(pageHighlights[0]);
                        }

                        var pageId = divaInstance.getInstanceId() + 'page-' + pageIdx;
                        var pageObj = document.getElementById(pageId);
                        var regions = highlightObj[pageIdx].regions;
                        var colour = highlightObj[pageIdx].colour;
                        var divClass = highlightObj[pageIdx].divClass;

                        var maxZoom = divaInstance.getMaxZoomLevel();
                        var zoomDifference;

                        if (divaSettings.inGrid)
                        {
                            var maxZoomWidth = divaInstance.getPageDimensionsAtZoomLevel(pageIdx, maxZoom).width;
                            var currentWidth = pageObj.clientWidth;
                            var widthProportion = maxZoomWidth / currentWidth;
                            zoomDifference = Math.log(widthProportion) / Math.log(2);
                        }
                        else
                        {
                            zoomDifference = maxZoom - divaInstance.getZoomLevel();
                        }

                        var j = regions.length;
                        while (j--)
                        {
                            var box = document.createElement('div');

                            box.style.width = _incorporate_zoom(regions[j].width, zoomDifference) + "px";
                            box.style.height = _incorporate_zoom(regions[j].height, zoomDifference) + "px";
                            box.style.top = _incorporate_zoom(regions[j].uly, zoomDifference) + "px";
                            box.style.left = _incorporate_zoom(regions[j].ulx, zoomDifference) + "px";
                            box.style.background = colour;
                            box.style.border = "1px solid #555";
                            box.style.position = "absolute";
                            box.style.zIndex = 100;
                            box.className = divClass;

                            if (typeof regions[j].divID !== 'undefined')
                            {
                                box.setAttribute('data-highlight-id', regions[j].divID);
                            }

                            pageObj.appendChild(box);
                        }
                    }
                    updateCurrentHighlight();
                    diva.Events.publish("HighlightCompleted", [pageIdx, filename, pageSelector]);
                }

                var updateCurrentHighlight = function()
                {
                    var classString = divaSettings.ID + "selected-highlight";
                    var classElem = document.getElementsByClassName(classString);
                    var idx;
                    for(idx = 0; idx < classElem.length; idx++)
                    {
                        box = classElem[idx];
                        if(box.id != currentHighlight)
                        {
                            box.className = box.className.replace(' '+classString, '');
                            box.style.border = "1px solid #555";  
                        }
                    }

                    if (divaInstance.isPageLoaded(currentHighlightPage))
                    {
                        boxes = document.querySelectorAll("*[data-highlight-id=" + currentHighlight + "]");
                        for(idx = 0; idx < boxes.length; idx++)
                        {
                            box = boxes[idx];
                            box.className = box.className + " " + classString;
                            box.style.border = "2px solid #000";
                        }
                    }
                };

                // subscribe the highlight method to the page change notification
                diva.Events.subscribe("PageDidLoad", _highlight);

                var _incorporate_zoom = function(position, zoomDifference)
                {
                    return position / Math.pow(2, zoomDifference);
                };

                /*
                    Reset the highlights object and removes all highlights from the document.
                */
                divaInstance.resetHighlights = function()
                {
                    var inner = document.getElementById(divaSettings.ID + 'inner');
                    var highlightClass = divaSettings.ID + 'highlight';
                    var descendents = inner.getElementsByClassName(highlightClass);
                    var j = descendents.length;

                    while (j--) {
                        var parentObj = descendents[j].parentNode;
                        parentObj.removeChild(descendents[j]);
                    }

                    divaSettings.parentObject.data('highlights', {});
                };

                /*
                    Resets the highlights for a single page.
                */
                divaInstance.removeHighlightsOnPage = function(pageIdx)
                {
                    var highlightsObj = divaSettings.parentObject.data('highlights');
                    if (highlightsObj.hasOwnProperty(pageIdx))
                    {
                        var pageId = divaInstance.getInstanceId() + 'page-' + pageIdx;
                        var pageObj = document.getElementById(pageId);
                        var descendents = pageObj.getElementsByTagName('div');
                        var highlightClass = highlightsObj[pageIdx].divClass;

                        var j = descendents.length;

                        while (j--)
                        {
                            if (descendents[j].className === highlightClass)
                                pageObj.removeChild(descendents[j]);
                        }

                        delete highlightsObj[pageIdx];
                    }
                };

                /*
                    Highlights regions on multiple pages.
                    @param pageIdxs An array of page index numbers
                    @param regions  An array of regions
                    @param colour   (optional) A colour for the highlighting, specified in RGBA CSS format
                */
                divaInstance.highlightOnPages = function(pageIdxs, regions, colour, divClass)
                {
                    var j = pageIdxs.length;
                    while (j--)
                    {
                        divaInstance.highlightOnPage(pageIdxs[j], regions[j], colour, divClass);
                    }
                };

                /*
                    Highlights regions on a page.
                    @param pageIdx  A page index number
                    @param regions  An array of regions. Use {'width':i, 'height':i, 'ulx':i, 'uly': i, 'divID': str} for each region.
                    @param colour   (optional) A colour for the highlighting, specified in RGBA CSS format
                    @param divClass (optional) A class to identify a group of highlighted regions on a specific page by
                */
                divaInstance.highlightOnPage = function(pageIdx, regions, colour, divClass)
                {
                    if (typeof colour === 'undefined')
                    {
                        colour = 'rgba(255, 0, 0, 0.2)';
                    }

                    if (typeof divClass === 'undefined')
                    {
                        divClass = divaSettings.ID + 'highlight';
                    }
                    else
                    {
                        divClass = divaSettings.ID + 'highlight ' + divClass;
                    }

                    var maxZoom = divaInstance.getMaxZoomLevel();
                    var highlightsObj = divaSettings.parentObject.data('highlights');

                    highlightsObj[pageIdx] = {
                        'regions': regions, 'colour': colour, 'divClass': divClass
                    };


                    //Highlights are created on load; create them for all loaded pages now
                    if (divaInstance.isPageLoaded(pageIdx))
                    {
                        _highlight(pageIdx, null, null);
                    }

                    return true;
                };

                /*
                    Jumps to a highlight somewhere in the document.
                    @param divID The ID of the div to jump to. This ID must be attached to the div using .highlightOnPage(s) as the highlight may not be currently appended to the DOM.
                */
                divaInstance.gotoHighlight = function(divID)
                {
                    var thisDiv;
                    var centerYOfDiv;
                    var centerXOfDiv;

                    var highlightsObj = divaSettings.parentObject.data('highlights');
                    var highlightFound = false; //used to break both loops

                    //see if it exists in the DOM already first
                    if (document.getElementById(divID) !== null)
                    {
                        var page = parseInt(document.getElementById(divID).parentNode.getAttribute('data-index'), 10);
                        
                        var numDivs = highlightsObj[page].regions.length;
                        while (numDivs--)
                        {
                            if (highlightsObj[page].regions[numDivs].divID === divID)
                            {
                                return gotoDiv(page, highlightsObj[page].regions[numDivs]);
                            }
                        }
                    }
                    else
                    {
                        var pageArr = Object.keys(highlightsObj);
                        var pageIdx = pageArr.length;
                        while (pageIdx--)
                        {
                            var regionArr = highlightsObj[pageArr[pageIdx]].regions;
                            var arrIndex = regionArr.length;

                            while (arrIndex--)
                            {
                                if (regionArr[arrIndex].divID === divID)
                                {
                                    return gotoDiv(pageArr[pageIdx], regionArr[arrIndex]);
                                }
                            }
                        }
                    }

                    console.warn("Diva just tried to find a highlight that doesn't exist.");
                    return false;
                };

                /**
                * Moves the diva pane to (page) and makes a darker border on (thisDiv)
                */
                var gotoDiv = function(page, thisDiv)
                {
                    //gets center of the div
                    var centerYOfDiv = parseFloat(thisDiv.uly) + parseFloat(thisDiv.height) / 2;
                    var centerXOfDiv = parseFloat(thisDiv.ulx) + parseFloat(thisDiv.width) / 2;

                    var desiredY = divaInstance.translateFromMaxZoomLevel(centerYOfDiv);
                    var desiredX = divaInstance.translateFromMaxZoomLevel(centerXOfDiv);

                    //navigates to the page
                    page = parseInt(page, 10);
                    divaInstance.gotoPageByIndex(page);
                    var outerObject = divaInstance.getSettings().outerObject;
                    var currentTop = outerObject.scrollTop() + desiredY - (outerObject.height() / 2) + divaSettings.verticalPadding;
                    var currentLeft = outerObject.scrollLeft() + desiredX - (outerObject.width() / 2) + divaSettings.horizontalPadding;

                    //changes the scroll location to center on the div as much as is possible
                    outerObject.scrollTop(currentTop);
                    outerObject.scrollLeft(currentLeft);

                    currentHighlight = thisDiv.divID;
                    currentHighlightPage = page;

                    diva.Events.publish("SelectedHighlightChanged", [currentHighlight, currentHighlightPage]);

                    //selects the highlight
                    updateCurrentHighlight();
                    return currentHighlight;
                };

                var getDivCenter = function(thisDiv)
                {
                    if (divaSettings.verticallyOriented) return divaInstance.translateFromMaxZoomLevel(parseFloat(thisDiv.uly) + parseFloat(thisDiv.height) / 2);
                    else return divaInstance.translateFromMaxZoomLevel(parseFloat(thisDiv.ulx) + parseFloat(thisDiv.width) / 2);
                };

                /*
                    Jumps to the next highlight along the primary axis of the document.
                */
                var findAdjacentHighlight = function(forward)
                {
                    var centerOfTargetDiv;
                    var highlightsObj = divaSettings.parentObject.data('highlights');
                    var highlightFound = false;
                    var centerOfCurrentDiv;
                    var currentPage;
                    var regionArr, arrIndex;
                    var pageDims;
                    var centerOfDiv, targetDiv;
                    
                    var thisDiv;
                    var compFunction;


                    //if currentHighlight already exists
                    if(currentHighlight && currentHighlightPage)
                    {
                        currentPage = currentHighlightPage;
                        regionArr = highlightsObj[currentPage].regions;
                        arrIndex = regionArr.length;

                        //find the center of the current div
                        while(arrIndex--)
                        {
                            if (regionArr[arrIndex].divID == currentHighlight)
                            {
                                thisDiv = regionArr[arrIndex];
                                centerOfCurrentDiv = getDivCenter(thisDiv);     
                                break;
                            }
                        }

                        //if we do have a current highlight, try to find the next one in the same page

                        //reinitialize the index in case regionArr is out of order
                        arrIndex = regionArr.length;
                        pageDims = divaInstance.getPageDimensionsAtZoomLevel(currentPage, divaInstance.getZoomLevel());
                        
                        //initialize the center of the div to the maximum possible value
                        if(forward) centerOfTargetDiv = (divaSettings.verticallyOriented) ? pageDims.height : pageDims.width;
                        else centerOfTargetDiv = 0;

                        if(forward)
                        {
                            compFunction = function(thisC, curC, targetC)
                            {
                                return (thisC > curC && thisC < targetC);
                            };
                        }
                        else
                        {
                            compFunction = function(thisC, curC, targetC)
                            {
                                return (thisC < curC && thisC > targetC);
                            };
                        }

                        while(arrIndex--)
                        {
                            thisDiv = regionArr[arrIndex];
                            centerOfDiv = getDivCenter(thisDiv);

                            //skip if the data-highlight-id is the same
                            if (thisDiv.divID == currentHighlight) continue;

                            //if this div is farther along the main axis but closer than the current closest
                            if (compFunction(centerOfDiv, centerOfCurrentDiv, centerOfTargetDiv))
                            {
                                //update targetDiv
                                highlightFound = true; 
                                centerOfTargetDiv = centerOfDiv;
                                targetDiv = thisDiv;
                            }
                        }

                        //if a highlight was found on the current page that was next; this can get overwritten but we're still good
                        if (highlightFound) return gotoDiv(currentPage, targetDiv);
                        //if it wasn't found, continue on...
                    }
                    //otherwise just pretend we're starting at the northwest corner of diva-inner...
                    //if we got into the previous if statement, currentPage and centerOfCurrentDiv should already be set and we still want next
                    else
                    {
                        currentPage = 0;
                        centerOfCurrentDiv = 0;
                    }

                    //find the minimum div on the next page with highlights and loop around if necessary

                    //find the next page in the pageArr; this will be in order
                    var pageArr = Object.keys(highlightsObj);
                    var curIdx = pageArr.indexOf(currentPage);
                    var targetPage;

                    if(forward)
                    {
                        //default to first page, move to next if possible
                        if(curIdx == pageArr.length - 1) targetPage = pageArr[0];
                        else targetPage = pageArr[curIdx + 1];
                    }

                    else
                    {
                        //default to last page, move to previous if possible
                        if(curIdx === 0) targetPage = pageArr[pageArr.length - 1];
                        else targetPage = pageArr[curIdx - 1];
                    }

                    //reset regionArr and centerOfTargetDiv for the new page we're testing
                    regionArr = highlightsObj[targetPage].regions;
                    arrIndex = regionArr.length;
                    pageDims = divaInstance.getPageDimensionsAtZoomLevel(targetPage, divaInstance.getMaxZoomLevel());
                    
                    if(forward) centerOfTargetDiv = (divaSettings.verticallyOriented) ? pageDims.height : pageDims.width;
                    else centerOfTargetDiv = 0;
                    
                    //find the minimum this time
                    if(forward)
                    {
                        compFunction = function(thisC, targetC)
                        {
                            return (thisC < targetC);
                        };
                    }
                    else
                    {
                        compFunction = function(thisC, targetC)
                        {
                            return (thisC > targetC);
                        };
                    }

                    while(arrIndex--)
                    {
                        thisDiv = regionArr[arrIndex];
                        centerOfDiv = getDivCenter(thisDiv);
                        if (compFunction(centerOfDiv, centerOfTargetDiv))
                        {
                            highlightFound = true; 
                            centerOfTargetDiv = centerOfDiv;
                            targetDiv = thisDiv;
                        }
                    }

                    //we've found it this time, as there'll be a region in the full regionArr to be the minimum
                    return gotoDiv(targetPage, targetDiv);
                };

                /*
                    Jumps to the next highlight along the primary axis of the document.
                */
                divaInstance.gotoNextHighlight = function()
                {
                    return findAdjacentHighlight(true);
                };

                /*
                    Jumps to the previous highlight along the primary axis of the document.
                */
                divaInstance.gotoPreviousHighlight = function()
                {
                    return findAdjacentHighlight(false);
                };

                diva.Events.subscribe('ViewerDidTerminate', this.destroy);

                return true;
            },
            destroy: function (divaSettings, divaInstance)
            {
                divaSettings.parentObject.removeData('highlights');
            },
            pluginName: 'highlight',
            titleText: 'Highlight regions of pages'
        };
        return retval;
    })());
})(jQuery);
