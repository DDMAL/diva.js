(function() {
    /*
        Unit tests writen using QUnit, jQuery's unit-testing framework
    */

    $('document').ready(function() {
        var dv;
        // First instantiate the element
        $('#diva-wrapper').diva({
            iipServerBaseUrl: "http://coltrane.music.mcgill.ca:9000/fcgi-bin/iipsrv.fcgi?FIF=/mnt/images/beromunster/",
            zoomLevel: 2,
            backendServer: "http://petrucci.musiclibs.net:9002/divaserve.php?d=beromunster",
            onReady: function() {
                // Only run tests after the document viewer has loaded
                dv = $('#diva-wrapper').data('diva');

                /* =============================== */
                module("Public functions");

                test("getItemTitle()", function() {
                    equals(dv.getItemTitle(), "Beromunster", "The title should be Beromunster");
                });


                test("getCurrentPage()", function() {
                    equals(dv.getCurrentPage(), 0, "The initial page index (not number) should be 0");
                });

                test("gotoPage()", function() {
                    ok(!dv.gotoPage(1000), "We shouldn't be able to go to page 1000");
                    ok(!dv.gotoPage(0), "We shouldn't be able to go to page 0 (as 0 is not a valid page number)");
                    ok(dv.gotoPage(100), "We SHOULD be able to go to page 100");
                    equals(dv.getCurrentPage(), 99, "getCurrentPage() should now return 99");
                    // Reset it to the initial page
                    dv.gotoPage(0);
                });

                test("getZoomLevel()", function() {
                    equals(dv.getZoomLevel(), 2, "The initial zoom level should be 2");
                });

                asyncTest("zoomIn(), callback and return value", function() {
                    expect(2);
                    var canZoomIn = dv.zoomIn(function(zoomLevel) {
                        equals(zoomLevel, 3, "After zooming in, level should be 3");
                        start();
                    });

                    ok(canZoomIn, "Should be able to zoom in");
                });

                // Unit tests shouldn't change state but it's hard to avoid in this case
                asyncTest("zoomIn() again", function() {
                    expect(2);
                    var canZoomIn = dv.zoomIn(function(zoomLevel) {
                        equals(zoomLevel, 4, "Should be 4 after zooming again");
                        start();
                    });

                    ok(canZoomIn, "Should be able to zoom in");
                });

                asyncTest("zoomIn() when we can't zoom in", function() {
                    expect(2);
                    var canZoomIn = dv.zoomIn(function(zoomLevel) {
                        equals(zoomLevel, 4, "Should still be 4");
                        start();
                    });

                    ok(!canZoomIn, "Should not be able to zoom in");
                });
            }
        });
    });
}());
