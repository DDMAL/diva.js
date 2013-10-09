/*
Gives a view of the text of this page.
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
                /*
                    Highlights regions on a page. `colour` is optional, and specified
                    using the RGBA CSS string.
                */
                var _incorporate_zoom = function(position, zoomDifference)
                {
                    return position / Math.pow(2, zoomDifference);
                };

                

                // divaInstance.highlightOnPage = function(pageId, regions, colour)
                // {
                //     if (typeof colour === 'undefined')
                //     {
                //         colour = 'rgba(255, 0, 0, 0.5)';
                //     }

                //     var maxZoom = dv.getMaxZoomLevel();
                //     var zoomDifference = maxZoom - dv.getZoomLevel();

                //     var pageobj = $(pageId);
                //     var highlightArr = [];
                //     var j = regions.length;
                //     while (j--)
                //     {
                //         var box = $("<div></div>");
                //         box.width(_incorporate_zoom(thisHighlight.width, zoomDifference));
                //         box.height(_incorporate_zoom(thisHighlight.height, zoomDifference));
                //         box.offset({top: _incorporate_zoom(thisHighlight.uly, zoomDifference), left: _incorporate_zoom(thisHighlight.ulx, zoomDifference)});

                //         box.css('background-color', 'rgba(225, 0, 0, 0.4)');
                //         box.css('border', '1px solid #555');
                //         box.css('position', 'absolute');
                //         box.css('z-index', 1000);

                //         box.addClass('search-result');

                //         page.append(box);
                //     }

                //     pageobj.data('highlights', highlightArr);

                //     return true;
                // };

                return true;
            },
            pluginName: 'text',
            titleText: 'View the text of this page',
        };

        return retval;
    })());
})(jQuery);
