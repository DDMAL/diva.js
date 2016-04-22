// Utility methods for testing

var jQuery = require('jquery');
var $ = jQuery;

(function () {
    // Allows you to clone, create a document viewer on, then remove an element
    $.tempDiva = function (settings) {
        var wrapper = $('#diva-temp');

        // Attach the wrapper to the DOM on first instantiation
        if (wrapper.length === 0)
        {
            // The tests were developed for a viewport width of 1000px,
            // so we set the parent element to have a width of 1000px minus
            // standard body padding
            var width = 1000 - (8 * 2);

            var wrapperHtml = (
                '<div style="width: ' + width + 'px; height: 800px;">' +
                    '<div id="diva-temp"></div>' +
                '</div>'
            );

            var parent = $(wrapperHtml);
            parent.appendTo(document.body);

            wrapper = parent.find('#diva-temp');
        }

        settings = settings || {};
        // If the divaserveURL, imageDir, iconPath and iipServerURL settings aren't defined, define them
        settings.imageDir = settings.imageDir || "/srv/images/beromunster";
        settings.iipServerURL = settings.iipServerURL || "http://diva.simssa.ca/fcgi-bin/iipsrv.fcgi";
        settings.objectData = settings.objectData || "../demo/beromunster.json";

        // These are always enabled. I don't think that was really intentional
        // initially, but it's required now to keep existing tests from breaking.
        settings.enableCanvas = true;
        settings.enableDownload = true;

        return wrapper.diva(settings).data('diva');
    };
})(jQuery);

module.exports.clearTempDiva = function()
{
    // First, empty it in case something else has been using it
    var dv = $('#diva-temp').data('diva');
    if (dv)
    {
        dv.destroy();
    }

    // Clear globally subscribed events (i.e. test callbacks)
    diva.Events.unsubscribeAll();
};
