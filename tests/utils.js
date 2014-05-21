// Utility methods for testing

(function () {
    // Allows you to clone, create a document viewer on, then remove an element
    $.tempDiva = function (settings) {
        // If the divaserveURL, imageDir, iconPath and iipServerURL settings aren't defined, define them
        settings.imageDir = settings.imageDir || "/mnt/images/beromunster";
        settings.iipServerURL = settings.iipServerURL || "http://coltrane.music.mcgill.ca/fcgi-bin/iipsrv.fcgi";
        settings.iconPath = settings.iconPath || "../build/img/";
        settings.objectData = settings.objectData || "../demo/beromunster.json";

        // First, empty it in case something else has been using it
        var dv = $('#diva-temp').data('diva');
        if (dv) {
            dv.destroy();
        }
        return $('#diva-temp').diva(settings).data('diva');
    };
})(jQuery);
