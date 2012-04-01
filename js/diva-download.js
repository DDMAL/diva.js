/* Page tool plugin for diva.js
 * Allows you to download images
 */

var divaDownload = (function() {
    var settings = {};
    return {
        init: function(divaSettings) {
            settings.iipServerBaseUrl = divaSettings.iipServerBaseUrl;
        },
        pluginName: 'download',
        titleText: 'Download image at the given zoom level',
        handleClick: function(event) {
            var pageDiv = $(this).parent().parent();
            var filename = $(pageDiv).attr('data-filename');
            var width = $(pageDiv).width() - 1;
            var image = settings.iipServerBaseUrl + filename + '&WID=' + width + '&CVT=JPG';
            window.open(image);
        }
    }
})();
