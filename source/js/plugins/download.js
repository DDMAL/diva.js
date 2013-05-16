/*
Download plugin for diva.js
Allows you to download images served by IIPImage
*/

(function ($) {
    window.divaPlugins.push((function() {
        var settings = {};
        return {
            init: function(divaSettings) {
                settings.iipServerURL = divaSettings.iipServerURL;
                settings.imageRoot = divaSettings.imageRoot;
                settings.imageDir = divaSettings.imageDir;
                return true;
            },
            pluginName: 'download',
            titleText: 'Download image at the given zoom level',
            handleClick: function(event) {
                var pageDiv = $(this).parent().parent();
                var filename = $(pageDiv).attr('data-filename');
                var width = $(pageDiv).width() - 1;
                var imdir = settings.imageRoot + "/" + settings.imageDir + "/";
                var image = settings.iipServerURL + "?FIF=" + imdir + filename + '&WID=' + width + '&CVT=JPEG';
                window.open(image);
            }
        };
    })());
})(jQuery);
