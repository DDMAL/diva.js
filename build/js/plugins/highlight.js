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
                divaSettings.parentSelector.data('highlighted', {});

                function _highlight(pageIdx, filename)
                {
                    var highlightObj = divaSettings.parentSelector.data('highlights');

                    if (highlightObj.hasOwnProperty(pageIdx))
                    {
                        var pageHighlights = highlightObj[pageIdx];
                        var j = pageHighlights.length;
                        var pageobj = $(divaInstance.getInstanceSelector() + 'page-' + pageIdx);

                        while (j--)
                        {
                            pageobj.append(pageHighlights[j]);
                        }
                    }
                }

                Events.subscribe("UpdateCurrentPage", _highlight);

                var _incorporate_zoom = function(position, zoomDifference)
                {
                    return position / Math.pow(2, zoomDifference);
                };

                /*
                    Reset the highlights object;
                */
                divaInstance.resetHighlights = function()
                {
                    divaSettings.parentSelector.data('highlights', {});
                };

                /*
                    Highlights regions on multiple pages.
                    @param pageIdxs An array of page index numbers
                    @param regions  An array of regions
                    @param colour   (optional) A colour for the highlighting, specified in RGBA CSS format
                */
                divaInstance.highlighOnPages = function(pageIdxs, regions, colour)
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
                    var zoomDifference = maxZoom - divaInstance.getZoomLevel();
                    console.log(zoomDifference);

                    var highlightsObj = divaSettings.parentSelector.data('highlights');

                    var highlightArr = [];
                    var j = regions.length;
                    while (j--)
                    {
                        var box = $("<div></div>");
                        box.width(_incorporate_zoom(regions[j].width, zoomDifference));
                        box.height(_incorporate_zoom(regions[j].height, zoomDifference));
                        box.offset({top: _incorporate_zoom(regions[j].uly, zoomDifference), left: _incorporate_zoom(regions[j].ulx, zoomDifference)});

                        box.css('background-color', colour);
                        box.css('border', '1px solid #555');
                        box.css('position', 'absolute');
                        box.css('z-index', 1000);

                        box.addClass('search-result');

                        highlightArr.push(box);
                    }

                    highlightsObj[pageIdx] = highlightArr;
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
