module("Download plugin");

module("Canvas plugin");

asyncTest("Passing in settings", function () {
    $.tempDiva({
        canvasPlugin: {
            rgbMin: -255,
            rgbMax: 255,
            proxyURL: 'test.php',
            onInit: function (settings) {
                equal(settings.proxyURL, 'test.php', "Should use the specified proxyURL");
                start();
            }
        }
    });
});
