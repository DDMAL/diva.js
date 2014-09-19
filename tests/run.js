// From examples/run-qunit.js, modified (phantomjs)

/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 20 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 60000, //< Default Max Timout is 20s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    //console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 100); //< repeat check every 250ms
}

// If called with arguments, set the testURL to the first argument
var system = require('system');
var arg1 = system.args[1];
if (!arg1)
{
    var testURL = "tests/index.html";
    console.log("Testing using " + testURL);
}
else
{
    var testURL = arg1;
    console.log("Testing using " + testURL);
}

var page = require('webpage').create();

// patch to remove get/setState tests from Travis CI build due to off-by-one pixel error when run in Travis
var env = system.env;
var isTravis = false;

for (var key in env)
{
    if (key === 'TRAVIS')
        isTravis = true;
}

// Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.viewportSize = {
    width: 1000,
    height: 800
};
page.settings.webSecurityEnabled = false;
page.settings.localToRemoteUrlAccessEnabled = false;

page.open(testURL, function(status){
    // patch to remove get/setState tests from Travis CI build due to off-by-one pixel error when run in Travis
    if (isTravis)
        page.evaluate(function() { window.isTravis = true; });
    else
        page.evaluate(function() { window.isTravis = false; });

    if (status !== "success") {
        console.log("Unable to access network");
        phantom.exit();
    } else {
        waitFor(function(){
            return page.evaluate(function(){
                var el = document.getElementById('qunit-testresult');
                if (el && el.innerText.match('completed')) {
                    return true;
                }
                return false;
            });
        }, function(){
            var failedNum = page.evaluate(function(){
                var el = document.getElementById('qunit-testresult');
                var numFailed, failed, tests;
                var modules = {};

                try {
                    numFailed = parseInt(el.getElementsByClassName('failed')[0].innerHTML, 10);
                } catch (e) {
                    numFailed = 9001;
                }

                if (numFailed > 0) {
                    // First find out which ones failed, and print those
                    tests= $('#qunit-tests > li.fail');

                    $.each(tests, function(index, test) {
                        var moduleName = $(test).find('.module-name').text();
                        var testName = $(test).find('.test-name').text();
                        if (modules[moduleName]) {
                            // If we've already seen this module, do nothing
                        } else {
                            // Otherwise, print out the module name
                            modules[moduleName] = true;
                            console.log("\nMODULE: " + moduleName + " ==========");
                        }

                        console.log(testName + " -----------");

                        // Now find all of the assertions in this test
                        var assertions = $(test).find('li.fail');
                        $.each(assertions, function(index, assertion) {
                            var message = $(assertion).find('.test-message').text();
                            var expected = $(assertion).find('.test-expected pre').text();
                            var actual = $(assertion).find('.test-actual pre').text();

                            if (message.length > 0) {
                                console.log("\t" + message);
                            }

                            // If the expected and actual data is there, display it
                            if (expected.length + actual.length > 0) {
                                console.log("\t\tExpected: " + expected + "\tActual: " + actual);
                            } else {
                                console.log("\t\tN/A");
                            }
                        });
                    });

                    // Then make the text red for the summary
                    console.log("\033[91m");
                } else {
                    // Make the text green for the summary
                    console.log("\033[92m");
                }
                console.log(el.innerText);
                console.log("\033[0m");
                return numFailed;
            });
            phantom.exit((failedNum > 0) ? 1 : 0);
        });
    }
});
