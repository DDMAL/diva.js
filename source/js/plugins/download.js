/*
Download plugin for diva.js
Allows you to download images served by IIPImage or IIIF compatible image servers
*/

var jQuery = require('jquery');

(function ($)
{
    module.exports = (function()
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
            handleClick: function(event, divaSettings, divaInstance, pageIndex)
            {
                // TODO: Move rationale for -1 from Wiki (TLDR an old IIP bug)
                var width = divaInstance
                        .getPageDimensions(pageIndex)
                        .width - 1;

                var image = settings.divaInstance.getPageImageURL(pageIndex, { width: width });

                window.open(image);
            }
        };

        return retval;
    })();
})(jQuery);
