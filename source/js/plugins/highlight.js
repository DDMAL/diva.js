/*
Highlight plugin for diva.js
Allows you to highlight regions of a page image
*/

var jQuery = require('jquery');
var elt = require('../utils/elt');
var diva = require('../diva');

(function ($)
{
    module.exports = (function()
    {
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                var highlightManager = new HighlightManager(divaInstance);
                divaSettings.parentObject.data('highlightManager', highlightManager);

                var currentHighlight;

                /*
                    Reset the highlights object and removes all highlights from the document.
                */
                divaInstance.resetHighlights = function()
                {
                    highlightManager.clear();
                };

                /*
                    Resets the highlights for a single page.
                */
                divaInstance.removeHighlightsOnPage = function(pageIdx)
                {
                    highlightManager.removeHighlightsOnPage(pageIdx);
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
                    if (colour === undefined)
                    {
                        colour = 'rgba(255, 0, 0, 0.2)';
                    }

                    if (divClass === undefined)
                    {
                        divClass = divaSettings.ID + 'highlight diva-highlight';
                    }
                    else
                    {
                        divClass = divaSettings.ID + 'highlight diva-highlight ' + divClass;
                    }

                    highlightManager.addHighlight({
                        page: pageIdx,
                        regions: regions,
                        colour: colour,
                        divClass: divClass
                    });

                    return true;
                };

                /*
                    Jumps to a highlight somewhere in the document.
                    @param divID The ID of the div to jump to. This ID must be attached to the div using .highlightOnPage(s) as the highlight may not be currently appended to the DOM.
                */
                divaInstance.gotoHighlight = function(divID)
                {
                    var result = highlightManager.getHighlightByRegionId(divID);

                    if (result)
                        return gotoDiv(result.highlight.page, result.region);

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
                    var viewportObject = divaInstance.getSettings().viewportObject;
                    var currentTop = viewportObject.scrollTop() + desiredY - (viewportObject.height() / 2) + divaSettings.verticalPadding;
                    var currentLeft = viewportObject.scrollLeft() + desiredX - (viewportObject.width() / 2) + divaSettings.horizontalPadding;

                    //changes the scroll location to center on the div as much as is possible
                    viewportObject.scrollTop(currentTop);
                    viewportObject.scrollLeft(currentLeft);

                    currentHighlight = {
                        region: thisDiv,
                        page: page
                    };

                    diva.Events.publish("SelectedHighlightChanged", [thisDiv.id, currentHighlight.page]);

                    //selects the highlight
                    updateCurrentHighlight(divaInstance, currentHighlight);
                    return thisDiv.id;
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
                    var highlightFound = false;
                    var centerOfCurrentDiv;
                    var currentPage;
                    var regionArr, arrIndex;
                    var pageDims;
                    var centerOfDiv, targetDiv;

                    var thisDiv;
                    var compFunction;

                    // If currentHighlight does not already exists,
                    // just pretend we're starting at the northwest corner of diva-inner
                    if (!currentHighlight)
                    {
                        centerOfCurrentDiv = 0;
                        currentPage = 0;
                    }
                    else {
                        currentPage = currentHighlight.page;

                        //find the center of the current div
                        centerOfCurrentDiv = getDivCenter(currentHighlight.region);
                    }

                    //if we do have a current highlight, try to find the next one in the same page

                    regionArr = highlightManager.getHighlightRegions(currentPage);
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

                    //find the minimum div on the next page with highlights and loop around if necessary

                    //find the next page in the pageArr; this will be in order
                    var pageArr = highlightManager.getHighlightedPages();
                    var curIdx = pageArr.indexOf(currentPage.toString());

                    var targetPage;

                    if(forward)
                    {
                        while (!targetPage || !divaInstance.isPageIndexValid (targetPage))
                        {
                            //default to first page, move to next if possible
                            if (curIdx == pageArr.length - 1) targetPage = pageArr[0];
                            else targetPage = pageArr[++curIdx];
                        }
                    }

                    else
                    {
                        while (!targetPage || !divaInstance.isPageIndexValid (targetPage))
                        {
                            //default to last page, move to previous if possible
                            if (curIdx === 0) targetPage = pageArr[pageArr.length - 1];
                            else targetPage = pageArr[--curIdx];
                        }
                    }

                    //reset regionArr and centerOfTargetDiv for the new page we're testing
                    regionArr = highlightManager.getHighlightRegions(targetPage);
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
                    if (highlightManager.getHighlightCount() > 0)
                        return findAdjacentHighlight(true);
                    else
                        return false;
                };

                /*
                    Jumps to the previous highlight along the primary axis of the document.
                */
                divaInstance.gotoPreviousHighlight = function()
                {
                    if (highlightManager.getHighlightCount() > 0)
                        return findAdjacentHighlight(false);
                    else
                        return false;
                };

                diva.Events.subscribe('ViewerWillTerminate', this.destroy, divaSettings.ID);

                return true;
            },
            destroy: function (divaSettings)
            {
                var highlightManager = divaSettings.parentObject.data('highlightManager');
                highlightManager.clear();
                divaSettings.parentObject.removeData('highlightManager');
            },
            pluginName: 'highlight',
            titleText: 'Highlight regions of pages',

            // Exposed export
            HighlightManager: HighlightManager
        };
        return retval;
    })();
})(jQuery);

/** Manages the addition and removal of the page overlays which display the highlights */
function HighlightManager(divaInstance, getCurrentHighlight)
{
    this._divaInstance = divaInstance;
    this._overlays = {};
    this._getCurrentHighlight = getCurrentHighlight;
}

HighlightManager.prototype.getHighlightCount = function ()
{
    var count = 0;
    Object.keys(this._overlays).forEach(function (key)
    {
        count += this._overlays[key].highlight.regions.length;
    }, this);

    return count;
};

HighlightManager.prototype.getHighlightRegions = function (pageIndex)
{
    if (!this._overlays[pageIndex])
        return [];

    return this._overlays[pageIndex].highlight.regions;
};

HighlightManager.prototype.getHighlightedPages = function ()
{
    // FIXME: Conceptually awkward that these are strings
    return Object.keys(this._overlays);
};

HighlightManager.prototype.getHighlightByRegionId = function (id)
{
    for (var i in this._overlays)
    {
        if (!this._overlays.hasOwnProperty(i))
            continue;

        var regions = this._overlays[i].highlight.regions;
        for (var j in regions)
        {
            if (!regions.hasOwnProperty(j))
                continue;

            if (regions[j].divID === id)
            {
                return {
                    highlight: this._overlays[i].highlight,
                    region: regions[j]
                };
            }
        }
    }

    return null;
};

HighlightManager.prototype.addHighlight = function (highlight)
{
    var existingOverlay = this._overlays[highlight.page];

    if (existingOverlay)
        this._divaInstance.__removePageOverlay(existingOverlay);

    var overlay = new HighlightPageOverlay(highlight, this._divaInstance, this._getCurrentHighlight);
    this._overlays[highlight.page] = overlay;
    this._divaInstance.__addPageOverlay(overlay);
};

HighlightManager.prototype.removeHighlightsOnPage = function (pageIndex)
{
    if (!this._overlays[pageIndex])
        return;

    this._divaInstance.__removePageOverlay(this._overlays[pageIndex]);
    delete this._overlays[pageIndex];
};

HighlightManager.prototype.clear = function ()
{
    for (var i in this._overlays)
    {
        if (!this._overlays.hasOwnProperty(i))
            continue;

        this._divaInstance.__removePageOverlay(this._overlays[i]);
    }

    this._overlays = {};
};

/**
 When a new page is loaded, this overlay will be called with the
 page index for the page. It looks at the 'highlights' data object
 set on the diva parent element, and determines whether
 highlights exist for that page.

 If so, the overlay will create and render elements for every
 highlighted box.

 @param highlight
 @param divaInstance
 @param getCurrentHighlight (optional)
 */
function HighlightPageOverlay(highlight, divaInstance, getCurrentHighlight)
{
    this.page = highlight.page;
    this.highlight = highlight;
    this._highlightRegions = [];
    this._divaInstance = divaInstance;
    this._getCurrentHighlight = getCurrentHighlight;
}

HighlightPageOverlay.prototype.mount = function ()
{
    var divaSettings = this._divaInstance.getSettings();

    var highlight = this.highlight;
    var regions = highlight.regions;
    var colour = highlight.colour;
    var divClass = highlight.divClass;

    var j = regions.length;
    while (j--)
    {
        var region = regions[j];

        // FIXME: Use CSS class instead of inline style
        var box = elt('div', {
            class: divClass,
            style: {
                background: colour,
                border: "1px solid #555",
                position: "absolute",
                zIndex: 100
            }
        });

        if (region.divID !== undefined)
        {
            box.setAttribute('data-highlight-id', region.divID);
        }

        // Used by IIIFHighlight
        if (region.name !== undefined)
        {
            box.setAttribute('data-name', region.name);
        }

        this._highlightRegions.push({
            element: box,
            region: region
        });
    }

    this.refresh();

    var frag = document.createDocumentFragment();
    this._highlightRegions.forEach(function (highlight)
    {
        frag.appendChild(highlight.element);
    });

    divaSettings.innerElement.appendChild(frag);

    if (this._getCurrentHighlight)
        updateCurrentHighlight(this._divaInstance, this._getCurrentHighlight());

    diva.Events.publish("HighlightCompleted", [this.page, this._divaInstance.getFilenames()[this.page]]);
};

HighlightPageOverlay.prototype.unmount = function ()
{
    var innerElement = this._divaInstance.getSettings().innerElement;

    this._highlightRegions.forEach(function (highlight)
    {
        innerElement.removeChild(highlight.element);
    });

    this._highlightRegions = [];
};

// FIXME: Updating a box per highlight region might be too expensive
// Maybe stick all the elements in a container and then scale it using CSS transforms?
HighlightPageOverlay.prototype.refresh = function ()
{
    var maxZoom = this._divaInstance.getMaxZoomLevel();

    var maxZoomWidth = this._divaInstance.getPageDimensionsAtZoomLevel(this.page, maxZoom).width;
    var currentWidth = this._divaInstance.getPageDimensions(this.page).width;
    var zoomDifference = Math.log(maxZoomWidth / currentWidth) / Math.log(2);

    var pageOffset = this._divaInstance.getPageOffset(this.page, {
        excludePadding: true,
        incorporateViewport: true
    });

    this._highlightRegions.forEach(function (highlight)
    {
        var region = highlight.region;

        elt.setAttributes(highlight.element, {
            style: {
                width: incorporateZoom(region.width, zoomDifference) + "px",
                height: incorporateZoom(region.height, zoomDifference) + "px",
                top: pageOffset.top + incorporateZoom(region.uly, zoomDifference) + "px",
                left: pageOffset.left + incorporateZoom(region.ulx, zoomDifference) + "px"
            }
        });
    });
};

function incorporateZoom(position, zoomDifference)
{
    return position / Math.pow(2, zoomDifference);
}

function updateCurrentHighlight(divaInstance, currentHighlight)
{
    var classString = divaInstance.getInstanceId() + "selected-highlight";
    var classElem = document.getElementsByClassName(classString);
    var idx;
    var box;
    var boxes;

    for (idx = 0; idx < classElem.length; idx++)
    {
        box = classElem[idx];
        if (box.id !== currentHighlight.id)
        {
            box.className = box.className.replace(' '+classString, '');
            box.style.border = "1px solid #555";
        }
    }

    if (divaInstance.isPageInViewport(currentHighlight.page))
    {
        boxes = document.querySelectorAll("*[data-highlight-id=" + currentHighlight.id + "]");
        for(idx = 0; idx < boxes.length; idx++)
        {
            box = boxes[idx];
            box.className = box.className + " " + classString;
            box.style.border = "2px solid #000";
        }
    }
}
