var diva;
(function () {
    /*
        Unit tests writen using QUnit, jQuery's unit-testing framework
    */

    $('document').ready(function() {
        var dv;
        // First instantiate the element
        $('#integrated-demo').diva({
            contained: true,
            enableAutoTitle: false,
            iipServerURL: "http://coltrane.music.mcgill.ca/fcgi-bin/iipsrv.fcgi?FIF=/mnt/images/beromunster/",
            zoomLevel: 2,
            divaserveURL: "http://petrucci.musiclibs.net:9002/loldivaserve.php",
            imageDir: "beromunster",
            iconPath: "../build/img/",
            onReady: function() {
                // Only run tests after the document viewer has loaded
                dv = $('#integrated-demo').data('diva');
                diva = dv;

                /* =============================== */
                module("Public functions");

                test("getItemTitle()", function() {
                    equal(dv.getItemTitle(), "Beromunster", "The title should be Beromunster");
                });


                test("getCurrentPage()", function() {
                    equal(dv.getCurrentPage(), 0, "The initial page index (not number) should be 0");
                });

                test("gotoPage()", function() {
                    ok(!dv.gotoPage(1000), "We shouldn't be able to go to page 1000");
                    ok(!dv.gotoPage(0), "We shouldn't be able to go to page 0 (as 0 is not a valid page number)");
                    ok(dv.gotoPage(100), "We SHOULD be able to go to page 100");
                    // Reset it to the initial page
                    dv.gotoPage(1);
                });

                test("getZoomLevel() and zoomIn()", function () {
                    stop();
                    expect(4);
                    // First make sure the initial zoom level is correct
                    equal(dv.getZoomLevel(), 2, "Initial should be 2");

                    // Then, try zooming in
                    dv.zoomIn(function (zoomLevel) {
                        equal(zoomLevel, 3, "After zooming in once, should be 3");
                        dv.zoomIn(function (zoomLevel) {
                            equal(zoomLevel, 4, "After zooming in again, should be 4");
                            dv.zoomIn(function (zoomLevel) {
                                equal(zoomLevel, 4, "Should still be 4");

                                // Set the zoom level back to 2
                                dv.setZoomLevel(2, function () {
                                    start();
                                });
                            });
                        });
                    });
                });

                test("getZoomLevel() and zoomOut()", function () {
                    stop();
                    expect(4);

                    // Zoom level should be back to 2
                    equal(dv.getZoomLevel(), 2, "Initial should be 2");

                    // Then, try zooming out
                    dv.zoomOut(function (zoomLevel) {
                        equal(zoomLevel, 1, "After zooming in once, should be 1");
                        dv.zoomOut(function (zoomLevel) {
                            equal(zoomLevel, 0, "After zooming in again, should be 0");
                            dv.zoomOut(function (zoomLevel) {
                                equal(zoomLevel, 0, "Should still be 0");

                                // Set the zoom level back to 2
                                dv.setZoomLevel(2, function () {
                                    start();
                                });
                            });
                        });
                    });
                });

                test("gotoPageByName()", function() {
                    expect(2);

                    ok(dv.gotoPageByName('bm_500.tif'));
                    ok(!dv.gotoPageByName('bm_000.tif'));
                    dv.gotoPage(1);
                });

                // Can't really test this as we don't know the URL
                /*
                test("getCurrentURL()", function() {
                    dv.gotoPage(1);
                    equal(dv.getCurrentURL(), 'petrucci.musiclibs.net:9002/tests.html#z=2&i=bm_001.tif&y=1&x=158');
                });
                */

                // Test setting the zoom level
                test("setZoomLevel()", function () {
                    stop();
                    expect(2);
                    dv.setZoomLevel(0, function () {
                        var zoomLevel = dv.getZoomLevel();
                        equal(zoomLevel, 0, "Should be 0 now");
                        dv.setZoomLevel(2, function () {
                            equal(dv.getZoomLevel(), 2, "Should be 2 now");
                            start();
                        });
                    });
                });

                test("getURLHash()", function() {
                    expect(2);
                    equal(dv.getURLHash(), 'z=2&n=5&i=bm_001.tif&y=0&x=157&gy=0&h=700&w=958');
                    stop();

                    // Now zoom in once
                    dv.zoomIn(function (zoomLevel) {
                        equal(dv.getURLHash(), 'z=3&n=5&i=bm_001.tif&y=0&x=786&gy=0&h=700&w=958');

                        // Zoom back out to reset it
                        dv.zoomOut(function (zoomLevel) {
                            start();
                        });
                    });
                });

                // iPad-specific tests
                if (navigator.platform == 'iPad') {
                    module("Testing on the iPad");
                    test("Dimensions on the iPad", function() {
                        // First get a jQuery object for the outer element
                        var selector = $('#1-diva-outer');
                        // Figure out what the heights and widths should be later
                        equal(selector.height(), 854, "An arbitrary height");
                        equal(selector.width(), 748, "An arbitrary width");
                    });
                }

                module("diva-utils.js functions");
                test("executeCallback()", function() {
                    expect(3);
                    $.executeCallback(function(parameter) {
                        equal(parameter, 4, "Should pass it a 4");
                    }, 4);
                    $.executeCallback(function() {
                        ok(true, "Execute callback with no parameters (no errors hopefully");
                    });
                    ok(!$.executeCallback(null), "If it can't be executed, return false");
                });

                test("getHashParam()", function() {
                    // First try it with no hash params - should return false
                    ok(!$.getHashParam('anything'), "No hash params, should return false");

                    // Now set the current URL to something
                    var baseUrl = window.location.href;
                    window.location.hash = '#p=149&z=2'
                    var nonexistentParam = $.getHashParam('lol');
                    var firstParam = $.getHashParam('p');
                    var secondParam = $.getHashParam('z');
                    ok(!nonexistentParam, "The nonexistent param should return false");
                    equal(firstParam, '149', "The 'p' param should be 149 (string)");
                    equal(secondParam, '2', "The 'z' param should be 2 (string)");

                    // Now let there be only one element in the URL
                    window.location.hash = '#p=149';
                    var soleParam = $.getHashParam('p');
                    equal(soleParam, '149', "The 'p' param should be 149 when it is the sole param");

                    // Now let there be other elements in the URL
                    window.location.hash = '#z=2&p=100&lol=lol';
                    var anotherFirstParam = $.getHashParam('z');
                    var anotherSecondParam = $.getHashParam('p');
                    var thirdParam = $.getHashParam('lol');
                    equal(anotherFirstParam, '2', "The 'z' param should be '2' when it is the first param");
                    equal(anotherSecondParam, '100', "The 'p' param should be '100' when it is the middle param");
                    equal(thirdParam, 'lol', "The last param should be 'lol'");
                    window.location.hash = '';
                });

                test("updateHashParam()", function() {
                    window.location.hash = '';
                    // First try it with no hash params in the URL
                    $.updateHashParam('p', '1');
                    equal(window.location.hash, '#p=1');

                    // The key is present but there is no value
                    window.location.hash = '#p=';
                    $.updateHashParam('p', '2');
                    equal(window.location.hash, '#p=2');

                    // Then, with a bunch of irrelevant ones
                    window.location.hash = '#key=2&another=3';
                    $.updateHashParam('p', '3');
                    equal(window.location.hash, '#key=2&another=3&p=3');
                
                    // One irrelevant one
                    window.location.hash = '#a=b';
                    $.updateHashParam('p', '4');
                    equal(window.location.hash, '#a=b&p=4');

                    // Only one hash param, and it's the one we want to update
                    window.location.hash = '#p=1';
                    $.updateHashParam('p', '9001');
                    equal(window.location.hash, '#p=9001');

                    // Two hash params, one of which is the one we want to update
                    window.location.hash = '#p=4&h=1';
                    $.updateHashParam('p', '1');
                    equal(window.location.hash, '#p=1&h=1');
                    $.updateHashParam('h', '100');
                    equal(window.location.hash, '#p=1&h=100');

                    // Two hash params, both are which are right (choose one)
                    // Should never happen unless the user is being malicious
                    window.location.hash = '#p=4&p=2';
                    $.updateHashParam('p', '5');
                    equal(window.location.hash, '#p=4&p=5');
                    // Not actually sure why it chooses the first one to update

                    window.location.hash = '';
                });
            }
        });
    });
}());
