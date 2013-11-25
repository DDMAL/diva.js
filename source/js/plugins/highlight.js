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
                divaSettings.parentSelector.data('highlights', {});
                function _highlight(pageIdx, filename, pageSelector)
                {
                    var highlightObj = divaSettings.parentSelector.data('highlights');
                    if (highlightObj.hasOwnProperty(pageIdx))
                    {
                        var pageId = divaInstance.getInstanceId() + 'page-' + pageIdx;
                        var pageObj = document.getElementById(pageId);
                        var regions = highlightObj[pageIdx]['regions'];
                        var colour = highlightObj[pageIdx]['colour'];

                        var maxZoom = divaInstance.getMaxZoomLevel();
                        var zoomDifference = maxZoom - divaInstance.getZoomLevel();

                        var j = regions.length;
                        while (j--)
                        {
                            var box = document.createElement('div');

                            box.style.width = _incorporate_zoom(regions[j].width, zoomDifference) + "px";
                            box.style.height = _incorporate_zoom(regions[j].height, zoomDifference) + "px";
                            box.style.top = _incorporate_zoom(regions[j].uly, zoomDifference);
                            box.style.left = _incorporate_zoom(regions[j].ulx, zoomDifference);
                            box.style.backgroundColor = colour;
                            box.style.border = "1px solid #555";
                            box.style.position = "absolute";
                            box.style.zIndex = 1000;
                            box.className = "search-result";

                            pageObj.appendChild(box);
                        }
                    }
                }

                // subscribe the highlight method to the page change notification
                Events.subscribe("PageHasLoaded", _highlight);

                var _incorporate_zoom = function(position, zoomDifference)
                {
                    return position / Math.pow(2, zoomDifference);
                };

                /*
                    Reset the highlights object and removes all highlights from the document.
                */
                divaInstance.resetHighlights = function()
                {
                    var highlights = document.getElementsByClassName("search-result");
                    var j = highlights.length;
                    while (j--)
                    {
                        var parentObj = highlights[j].parentNode;
                        parentObj.removeChild(highlights[j]);
                    }

                    divaSettings.parentSelector.data('highlights', {});
                };
                
                /*
                    Resets the highlights for a single page.
                */
                divaInstance.removeHighlightsOnPage = function(pageIdx)
                {
                    var highlightsObj = divaSettings.parentSelector.data('highlights');
                    if (highlightsObj.hasOwnProperty(pageIdx))
                    {
                        var pageId = divaInstance.getInstanceId() + 'page-' + pageIdx;
                        var pageObj = document.getElementById(pageId);
                        var highlights = pageObj.getElementsByClassName('search-result');

                        var j = highlights.length;
                        while (j--)
                        {
                            pageObj.removeChild(highlights[j]);
                        }
                        delete highlightsObj[pageIdx];
                    }
                }

                /*
                    Highlights regions on multiple pages.
                    @param pageIdxs An array of page index numbers
                    @param regions  An array of regions
                    @param colour   (optional) A colour for the highlighting, specified in RGBA CSS format
                */
                divaInstance.highlightOnPages = function(pageIdxs, regions, colour)
                {
                    var j = pageIdxs.length;
                    while(j--)
                    {
                        divaInstance.highlightOnPage(pageIdxs[j], regions, colour);
                    }
                };

                /*
                    Highlights regions on multiple pages.
                    @param pageIdxs An array of page index numbers
                    @param regions  An array of regions. Use {'width':i, 'height':i, 'ulx':i, 'uly': i} for each region.
                    @param colour   (optional) A colour for the highlighting, specified in RGBA CSS format
                */
                divaInstance.highlightOnPage = function(pageIdx, regions, colour)
                {
                    if (typeof colour === 'undefined')
                    {
                        colour = 'rgba(255, 0, 0, 0.5)';
                    }

                    var maxZoom = divaInstance.getMaxZoomLevel();
                    var highlightsObj = divaSettings.parentSelector.data('highlights');

                    highlightsObj[pageIdx] = {
                        'regions': regions, 'colour': colour
                    };

                    return true;
                };

                return true;
            },
            pluginName: 'highlight',
            titleText: 'Highlight regions of pages'
        };
        return retval;
    })());
})(jQuery);
