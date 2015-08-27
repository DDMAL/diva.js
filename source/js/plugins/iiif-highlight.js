/*
IIIF Highlight plugin for diva.js
Allows you to highlight regions of a page image based off of annotations in a IIIF Manifest
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

                    if (typeof highlightObj === 'undefined' || !settings.highlightsVisible)
                        return;

                    if (highlightObj.hasOwnProperty(pageIdx))
                    {
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

                            if (typeof regions[j].name !== 'undefined')
                            {
                                box.setAttribute('data-name', regions[j].name);
                            }

                            if (typeof regions[j].divID !== 'undefined')
                            {
                                box.id = regions[j].divID;
                            }

                            pageObj.appendChild(box);
                        }
                    }

                    diva.Events.publish("HighlightCompleted", [pageIdx, filename, pageSelector]);
                }

                settings.highlightedPages = [];

                // subscribe the highlight method to the page change notification
                diva.Events.subscribe("PageWillLoad", _highlight);

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

                divaInstance.hideHighlights = function()
                {
                    settings.highlightsVisible = false;

                    var highlightClass = divaSettings.ID + 'highlight';

                    var inner = document.getElementById(divaSettings.ID + 'inner');
                    var highlights = inner.getElementsByClassName(highlightClass);

                    var j = highlights.length;

                    while (j--) {
                        var parentObj = highlights[j].parentNode;
                        parentObj.removeChild(highlights[j]);
                    }
                };

                divaInstance.showHighlights = function()
                {
                    settings.highlightsVisible = true;

                    var inner = document.getElementById(divaSettings.ID + 'inner');
                    var pages = inner.getElementsByClassName('diva-document-page');

                    var pageIdx;

                    for (var i = 0; i < pages.length; i++)
                    {
                        pageIdx = parseInt(pages[i].getAttribute('data-index'), 10);

                        var highlightsObj = divaSettings.parentObject.data('highlights');

                        if (!highlightsObj.hasOwnProperty(pageIdx))
                        {
                            //highlights object is empty, check if it has annotations
                            getAnnotationsList(pageIdx);
                        }
                        else
                        {
                            //draw the existing highlights
                            _highlight(pageIdx, null, null);
                        }
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
                        colour = 'rgba(255, 0, 0, 0.1)';
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
                    @param divID The ID of the div to jump to. This ID must be attached to the div using .highlightOnPage(s) as the highlight may not be appended to the DOM.
                */
                divaInstance.gotoHighlight = function(divID)
                {
                    var page;
                    var thisDiv;
                    var centerYOfDiv;
                    var centerXOfDiv;

                    var highlightsObj = divaSettings.parentObject.data('highlights');
                    var highlightFound = false; //used to break both loops

                    //see if it exists in the DOM already first
                    if (document.getElementById(divID) !== null)
                    {
                        page = parseInt(document.getElementById(divID).parentNode.getAttribute('data-index'), 10);

                        var numDivs = highlightsObj[page].regions.length;
                        while (numDivs--)
                        {
                            if (highlightsObj[page].regions[numDivs].divID === divID)
                            {
                                thisDiv = highlightsObj[page].regions[numDivs];
                                centerYOfDiv = parseFloat(thisDiv.uly) + parseFloat(thisDiv.height) / 2;
                                centerXOfDiv = parseFloat(thisDiv.ulx) + parseFloat(thisDiv.width) / 2;

                                highlightFound = true;
                                break;
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
                                    page = pageArr[pageIdx];
                                    thisDiv = regionArr[arrIndex];
                                    centerYOfDiv = parseFloat(thisDiv.uly) + parseFloat(thisDiv.height) / 2;
                                    centerXOfDiv = parseFloat(thisDiv.ulx) + parseFloat(thisDiv.width) / 2;

                                    highlightFound = true;
                                    break;
                                }
                            }

                            if (highlightFound) break;
                        }
                    }

                    if (!highlightFound)
                    {
                        console.warn("Diva just tried to find a highlight that doesn't exist.");
                        return false;
                    }

                    var outerObject = divaInstance.getSettings().outerObject;

                    var desiredY = divaInstance.translateFromMaxZoomLevel(centerYOfDiv);
                    var desiredX = divaInstance.translateFromMaxZoomLevel(centerXOfDiv);

                    divaInstance.gotoPageByIndex(page);
                    var currentTop = outerObject.scrollTop() + desiredY - (outerObject.height() / 2) + divaSettings.verticalPadding;
                    var currentLeft = outerObject.scrollLeft() + desiredX - (outerObject.width() / 2) + divaSettings.horizontalPadding;

                    outerObject.scrollTop(currentTop);
                    outerObject.scrollLeft(currentLeft);

                    divaSettings.currentHighlight = divID;

                    return true;
                };

                var showAnnotations = function(canvasIndex)
                {
                    return function(data, status, jqXHR)
                    {
                        var canvasAnnotations = data;
                        var numAnnotations = data.length;

                        //convert annotations in annotations object to diva highlight objects
                        var regions = [];

                        //loop over annotations in a single canvas
                        for (var k = 0; k < numAnnotations; k++)
                        {
                            var currentAnnotation = canvasAnnotations[k];
                            // get text content
                            var text = currentAnnotation.resource.chars;

                            // get x,y,w,h (slice string from '#xywh=' to end)
                            var onString = currentAnnotation.on;
                            var coordString = onString.slice(onString.indexOf('#xywh=') + 6);
                            var coordinates = coordString.split(',');

                            var region = {
                                ulx: parseInt(coordinates[0], 10),
                                uly: parseInt(coordinates[1], 10),
                                width: parseInt(coordinates[2], 10),
                                height: parseInt(coordinates[3], 10),
                                name: text
                            };

                            regions.push(region);
                        }

                        divaInstance.highlightOnPage(canvasIndex, regions);
                        //flag this page's annotations as having been retrieved
                        settings.highlightedPages.push(canvasIndex);
                    };
                };

                var getAnnotationsList = function(pageIndex)
                {
                    //if page has annotationList
                    var canvases = settings.manifest.sequences[0].canvases;

                    if (canvases[pageIndex].hasOwnProperty('otherContent'))
                    {
                        var otherContent = canvases[pageIndex].otherContent;

                        for (var j = 0; j < otherContent.length; j++)
                        {
                            if (otherContent[j]['@type'] === 'sc:AnnotationList')
                            {
                                // canvas has annotations. get the annotations:
                                $.ajax({
                                    url: otherContent[j]['@id'],
                                    cache: true,
                                    dataType: 'json',
                                    success: showAnnotations(pageIndex)
                                });
                            }
                        }
                    }
                };

                var setManifest = function(manifest)
                {
                    settings.manifest = manifest;
                };

                diva.Events.subscribe('ManifestDidLoad', setManifest);

                diva.Events.subscribe('PageWillLoad', function(pageIndex)
                {
                    if (!settings.highlightsVisible)
                    {
                        return;
                    }

                    //if highlights for this page have already been checked/loaded, return
                    for (var i = 0; i < settings.highlightedPages.length; i++)
                    {
                        if (settings.highlightedPages[i] === pageIndex)
                        {
                            return;
                        }
                    }

                    getAnnotationsList(pageIndex, settings.manifest);
                });

                var activeOverlays = [];

                //on mouseover, show the annotation text
                divaSettings.innerObject.on('mouseenter', '.' + divaSettings.ID + 'highlight', function(e)
                {
                    var annotationElement = e.target;
                    var name = annotationElement.dataset.name;
                    var textOverlay = document.createElement('div');

                    textOverlay.style.top = (annotationElement.offsetTop + annotationElement.offsetHeight - 1) + 'px';
                    textOverlay.style.left = annotationElement.style.left;
                    textOverlay.style.background = '#fff';
                    textOverlay.style.border = '1px solid #555';
                    textOverlay.style.position = 'absolute';
                    textOverlay.style.zIndex = 101;
                    textOverlay.className = 'annotation-overlay';
                    textOverlay.textContent = name;

                    annotationElement.parentNode.appendChild(textOverlay);
                    activeOverlays.push(textOverlay);
                });

                divaSettings.innerObject.on('mouseleave', '.' + divaSettings.ID + 'highlight', function(e)
                {
                    while (activeOverlays.length)
                    {
                        var textOverlay = activeOverlays.pop();
                        textOverlay.parentNode.removeChild(textOverlay);
                    }
                });

                diva.Events.subscribe('ViewerDidLoad', function(){
                    //button to toggle annotations
                    $('#' + divaSettings.ID + 'page-nav').before('<div id="' + divaSettings.ID + 'annotations-icon" class="diva-button diva-annotations-icon" title="Turn annotations on or off"></div>');

                    $(divaSettings.selector + 'annotations-icon').addClass('annotations-icon-active');

                    $('#' + divaSettings.ID + 'annotations-icon').on('click', function(e)
                    {
                        //toggle visibility of annotations
                        if (settings.highlightsVisible)
                        {
                            divaInstance.hideHighlights();
                            $(divaSettings.selector + 'annotations-icon').removeClass('annotations-icon-active');
                        }
                        else
                        {
                            divaInstance.showHighlights();
                            $(divaSettings.selector + 'annotations-icon').addClass('annotations-icon-active');
                        }
                    });
                });

                //enable annotations by default
                settings.highlightsVisible = true;

                return true;
            },
            destroy: function (divaSettings, divaInstance)
            {
                divaSettings.parentObject.removeData('highlights');
            },
            pluginName: 'IIIFHighlight',
            titleText: 'Highlight regions of pages'
        };
        return retval;
    })());
})(jQuery);
