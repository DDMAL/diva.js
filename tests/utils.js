// Utility methods for testing

(function () {
    // Allows you to clone, create a document viewer on, then remove an element
    $.tempDiva = function (settings) {
        // If the divaserveURL, imageDir, iconPath and iipServerURL settings aren't defined, define them
        settings.divaserveURL = settings.divaserveURL || "http://petrucci.musiclibs.net:9002/demo/demo.php";
        settings.imageDir = settings.imageDir || "beromunster";
        settings.imageRoot = settings.imageRoot || "/mnt/images";
        settings.iipServerURL = settings.iipServerURL || "http://coltrane.music.mcgill.ca/fcgi-bin/iipsrv.fcgi";
        settings.iconPath = settings.iconPath || "../build/img/";

        // First, empty it in case something else has been using it
        var dv = $('#diva-temp').data('diva');
        if (dv) {
            dv.destroy();
        }
        return $('#diva-temp').diva(settings).data('diva');
    };
})(jQuery);
