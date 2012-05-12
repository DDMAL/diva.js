module("Hash params");

var hashParamTest = function (testName, hashParam, hashValue, onReadyCallback) {
    asyncTest(testName, function () {
        var previousHash = window.location.hash;
        var suffix = parseInt($.generateId(), 10) + 1;
        window.location.hash += hashParam + suffix + '=' + hashValue;
        $.tempDiva({
            onReady: function (settings) {
                onReadyCallback.call(this, settings);
                window.location.hash = previousHash;
                start();
            }
        });
    });
}

hashParamTest("grid (g)", "g", "true", function (settings) {
    ok(settings.inGrid, "inGrid setting should be true");
    ok($(settings.selector + 'grid-slider').is(':visible'), "Grid slider should be visible");
    ok(!$(settings.selector + 'zoom-slider').is(':visible'), "Zoom slider should not be visible");
    equal($('.document-page').length, 0, "There should be no document pages");
    notEqual($('.row').length, 0, "There should be at least one row");
});

hashParamTest("fullscreen (f)", "f", "true", function (settings) {
    ok(settings.inFullscreen, "inFullscreen setting should be true");
    ok($('body').hasClass('hide-scrollbar'), "The body element should have the hide-scrollbar class")
});
