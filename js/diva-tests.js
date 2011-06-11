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
                // Looks like each async test has to be done separately
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

                // Now make sure zooming out works
                asyncTest("zoomOut() once", function() {
                    expect(2);
                    var canZoomOut = dv.zoomOut(function(zoomLevel) {
                        equals(zoomLevel, 3, "Should be 3 now");
                        start();
                    });

                    ok(canZoomOut, "Should be able to zoom out");
                });

                asyncTest("zoomOut() again", function() {
                    var canZoomOut = dv.zoomOut(function(zoomLevel) {
                        equals(zoomLevel, 2, "Should be 2 now");
                        start();
                    });

                    ok(canZoomOut, "Should work");
                });

                asyncTest("zoomOut() once again", function() {
                    var canZoomOut = dv.zoomOut(function(zoomLevel) {
                        equals(zoomLevel, 1, "Should be one now");
                        start();
                    });

                    ok(canZoomOut, "Zooming out should work");
                });

                asyncTest("last working zoomOut()", function() {
                    var canZoomOut = dv.zoomOut(function(zoomLevel) {
                        equals(zoomLevel, 0, "Should be 0");
                        start();
                    });

                    ok(canZoomOut, "Should still work");
                });

                asyncTest("zoomOut() when we can't zoom out", function() {
                    var canZoomOut = dv.zoomOut(function(zoomLevel) {
                        equals(zoomLevel, 0, "Should still be 0");
                        start();
                    });

                    ok(!canZoomOut, "Can't zoom out anymore");
                });

                // iPad-specific tests
                if (navigator.platform == 'iPad') {
                    module("Testing on the iPad");
                    test("Dimensions on the iPad", function() {
                        // First get a jQuery object for the outer element
                        var selector = $('#1-diva-outer');
                        // Figure out what the heights and widths should be later
                        equals(selector.height(), 854, "An arbitrary height");
                        equals(selector.width(), 748, "An arbitrary width");
                    });
                }

                module("Other tests");
                test("executeCallback()", function() {
                    expect(3);
                    $.executeCallback(function(parameter) {
                        equals(parameter, 4, "Should pass it a 4");
                    }, 4);
                    $.executeCallback(function() {
                        ok(true, "Execute callback with no parameters (no errors hopefully");
                    });
                    ok(!$.executeCallback(null), "If it can't be executed, return false");
                });
            }
        });
    });
}());
