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
                divaInstance.highlightOnPage = function(pageId, region, colour)
                {
                    console.log("Highlighting page " + pageId + " region " + region + " in colour " + colour);
                    return true;
                };

                return true;
            },
            pluginName: 'highlight',
            titleText: 'Highlight a region of a page',
            // handleClick: function(event)
            // {
            //     var pageDiv = $(this).parent().parent();
            //     var filename = $(pageDiv).attr('data-filename');
            //     var width = $(pageDiv).width() - 1;
            //     var imdir = settings.imageRoot + "/" + settings.imageDir + "/";
            //     var image = settings.iipServerURL + "?FIF=" + imdir + filename + '&WID=' + width + '&CVT=JPEG';
            //     window.open(image);
            // }
        };

        return retval;
    })());
})(jQuery);
