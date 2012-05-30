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
            },
            pluginName: 'download',
            titleText: 'Download image at the given zoom level',
            handleClick: function(event) {
                var pageDiv = $(this).parent().parent();
                var filename = $(pageDiv).attr('data-filename');
                var width = $(pageDiv).width() - 1;
                var image = settings.iipServerURL + filename + '&WID=' + width + '&CVT=JPG';
                window.open(image);
            }
        };
    })());
})(jQuery);
