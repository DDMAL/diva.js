(function() {
    /*
        Unit tests writen using QUnit, jQuery's unit-testing framework
    */

    $('document').ready(function() {
        var dv;
        // First instantiate the element
        $('#diva-wrapper').diva({
            iipServerBaseUrl: "http://coltrane.music.mcgill.ca:9000/fcgi-bin/iipsrv.fcgi?FIF=/mnt/images/beromunster/",
            backendServer: "http://petrucci.musiclibs.net:9002/divaserve.php?d=beromunster",
            onReady: function() {
                // Only run tests after the document viewer has loaded
                dv = $('#diva-wrapper').data('diva');

                /* =============================== */
                module("Public functions");

                test("getItemTitle()", function() {
                    equals(dv.getItemTitle(), "Beromunster", "The title should be Beromunster");
                });

                test("getZoomLevel()", function() {
                    equals(dv.getZoomLevel(), 2, "The initial zoom level should be 2");
                });

                test("getCurrentPage()", function() {
                    equals(dv.getCurrentPage(), 0, "The initial page index (not number) should be 0");
                });

                test("gotoPage()", function() {
                    equals(dv.gotoPage(1000), false, "We shouldn't be able to go to page 1000");
                    equals(dv.gotoPage(0), false, "We shouldn't be able to go to page 0 (as 0 is not a valid page number)");
                    equals(dv.gotoPage(100), true, "We SHOULD be able to go to page 100");
                });

            }
        });
    });
}());
