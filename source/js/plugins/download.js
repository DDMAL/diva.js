/*
Download plugin for diva.js
Allows you to download images served by IIPImage or IIIF compatible image servers
*/

var jQuery = require('jquery');

(function ($)
{
    window.divaPlugins.push((function()
    {
        var settings = {};
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                settings.divaInstance = divaInstance;
                return true;
            },
            pluginName: 'download',
            titleText: 'Download image at the given zoom level',
            handleClick: function(event, divaSettings)
            {
                var pageDiv = $(this).parent().parent();
                var pageIndex = $(pageDiv).attr('data-index');
                var width = $(pageDiv).width() - 1;
                var image = settings.divaInstance.getPageImageURL(pageIndex, { width: width });

                window.open(image);
            }
        };

        return retval;
    })());
})(jQuery);
