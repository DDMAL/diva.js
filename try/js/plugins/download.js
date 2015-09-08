/*
Download plugin for diva.js
Allows you to download images served by IIPImage or IIIF compatible image servers
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
                return true;
            },
            pluginName: 'download',
            titleText: 'Download image at the given zoom level',
            handleClick: function(event, divaSettings)
            {
                var pageDiv = $(this).parent().parent();
                var filename = $(pageDiv).attr('data-filename');
                var pageIndex = $(pageDiv).attr('data-index');
                var width = $(pageDiv).width() - 1;
                var image;

                if (divaSettings.isIIIF)
                {
                    var quality = (divaSettings.pages[pageIndex].api > 1.1) ? 'default' : 'native';
                    image = encodeURI(divaSettings.pages[pageIndex].url + 'full/' + width + ',/0/' + quality + '.jpg');
                }
                else
                {
                    image = divaSettings.iipServerURL + "?FIF=" + divaSettings.imageDir + '/' + filename + '&WID=' + width + '&CVT=JPEG';
                }
                window.open(image);
            }
        };

        return retval;
    })());
})(jQuery);
