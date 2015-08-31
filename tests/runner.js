// The MIT License
//
// Copyright (c) 2014, Jonathan Kemp
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

/*global phantom:false, require:false, console:false, window:false, QUnit:false */

(function () {
    'use strict';

    var system = require('system');

    var url, page, timeout,
        args = system.args;

    // arg[0]: scriptName, args[1...]: arguments
    if (args.length < 2) {
        console.error('Usage:\n  phantomjs [phantom arguments] runner.js [url-of-your-qunit-testsuite] [timeout-in-seconds]');
        exit(1);
    }

    url = args[1];

    if (args[2] !== undefined) {
        timeout = parseInt(args[2], 10);
    }

    page = require('webpage').create();

    // patch to remove get/setState tests from Travis CI/Ubuntu builds due to off-by-one pixel error when run in Linux
    var env = system.env;
    var isTravis = false;

    for (var key in env)
    {
        if (key === 'TRAVIS')
            isTravis = true;
    }

    if (!isTravis) isTravis = navigator.appVersion.indexOf("Linux") != -1;

    // Route `console.log()` calls from within the Page context to the main Phantom context (i.e. current `this`)
    page.onConsoleMessage = function (msg) {
        console.log(msg);
    };

    page.onInitialized = function () {
        page.evaluate(addLogging);
    };

    page.viewportSize = {
        width: 1000,
        height: 800
    };

    page.settings.webSecurityEnabled = false;
    page.settings.localToRemoteUrlAccessEnabled = false;

    page.onCallback = function (message) {
        var result,
            failed;

        if (message) {
            if (message.name === 'QUnit.done') {
                result = message.data;
                failed = !result || !result.total || result.failed;

                if (!result.total) {
                    console.error('No tests were executed. Are you loading tests asynchronously?');
                }

                exit(failed ? 1 : 0);
            }
        }
    };

    page.open(url, function (status) {
        if (status !== 'success') {
            console.error('Unable to access network: ' + status);
            exit(1);
        } else {
            // Cannot do this verification with the 'DOMContentLoaded' handler because it
            // will be too late to attach it if a page does not have any script tags.
            var qunitMissing = page.evaluate(function () {
                return (typeof QUnit === 'undefined' || !QUnit);
            });
            if (qunitMissing) {
                console.error('The `QUnit` object is not present on this page.');
                exit(1);
            }

            // Set a default timeout value if the user does not provide one
            if (typeof timeout === 'undefined') {
                timeout = 5;
            }

            // Set a timeout on the test running, otherwise tests with async problems will hang forever
            setTimeout(function () {
                console.error('The specified timeout of ' + timeout + ' seconds has expired. Aborting...');

                var stalledTest = page.evaluate(function() {
                    var status;
                    var error = '';
                    var runningTest = $('.running');

                    if (runningTest.length) {
                        var testName = runningTest[0].children[0].innerText;
                        if ($('.running li.fail .test-message').length)
                        {
                            error = '\nError: ' + $('.running li.fail .test-message')[0].innerHTML;
                        }
                        status = 'Stalled test - ' + testName + error;
                    }
                    else {
                        status = '';
                    }

                    return status;
                });

                if (stalledTest.length)
                {
                    console.log(stalledTest);
                }

                exit(1);
            }, timeout * 1000);

            // Do nothing... the callback mechanism will handle everything!
        }
    });

    function addLogging() {
        window.document.addEventListener('DOMContentLoaded', function () {
            var currentTestAssertions = [];

            QUnit.log(function (details) {
                var response;

                // Ignore passing assertions
                if (details.result) {
                    return;
                }

                response = details.message || '';

                if (typeof details.expected !== 'undefined') {
                    if (response) {
                        response += ', ';
                    }

                    response += 'expected: ' + details.expected + ', but was: ' + details.actual;
                }

                if (details.source) {
                    response += '\n' + details.source;
                }

                currentTestAssertions.push('Failed assertion: ' + response + '\n');
            });

            QUnit.testDone(function (result) {
                var i,
                    len,
                    name = '';

                if (result.module) {
                    name += result.module + ': ';
                }
                name += result.name;

                if (result.failed) {
                    console.log('\n' + 'Test failed: ' + name);

                    for (i = 0, len = currentTestAssertions.length; i < len; i++) {
                        console.log('    ' + currentTestAssertions[i]);
                    }
                }

                currentTestAssertions.length = 0;
            });

            QUnit.done(function (result) {
                console.log('\n' + 'Took ' + result.runtime + 'ms to run ' + result.total + ' tests. ' + result.passed + ' passed, ' + result.failed + ' failed.');

                if (typeof window.callPhantom === 'function') {
                    window.callPhantom({
                        'name': 'QUnit.done',
                        'data': result
                    });
                }
            });
        }, false);
    }

    function exit(code) {
        if (page) {
            page.close();
        }
        setTimeout(function () {
            phantom.exit(code);
        }, 0);
    }
})();
