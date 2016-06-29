/*
IIIF Highlight plugin for diva.js
Allows you to highlight regions of a page image based off of annotations in a IIIF Manifest
*/

var jQuery = require('jquery');
var diva = require('../diva');
var HighlightManager = require('./highlight').HighlightManager;

(function ($)
{
    module.exports = (function()
    {
        var settings = {};
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                var highlightManager = new HighlightManager(divaInstance);
                divaSettings.parentObject.data('highlightManager', highlightManager);

                settings.highlightedPages = [];

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

                divaInstance.hideHighlights = function()
                {
                    settings.highlightsVisible = false;
                    $(divaSettings.innerElement).addClass('annotations-hidden');
                };

                divaInstance.showHighlights = function()
                {
                    settings.highlightsVisible = true;
                    $(divaSettings.innerElement).removeClass('annotations-hidden');
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
                    @param divID The ID of the div to jump to. This ID must be attached to the div using .highlightOnPage(s) as the highlight may not be appended to the DOM.
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
                 * Moves the diva pane to (page)
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

                diva.Events.subscribe('ManifestDidLoad', setManifest, divaSettings.ID);

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
                }, divaSettings.ID);

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
                }, divaSettings.ID);

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
    })();
})(jQuery);
