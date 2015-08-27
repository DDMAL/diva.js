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
//
// Modified by Evan Magoni for Diva.js - allow passing in an
// alternate testRunner script

'use strict';

var path = require('path'),
    childProcess = require('child_process'),
    gutil = require('gulp-util'),
    chalk = require('chalk'),
    through = require('through2'),
    phantomjs = require('phantomjs'),
    binPath = phantomjs.path;

module.exports = function (params) {
    var options = params || {};
    binPath = options.binPath || binPath;
    var testRunnerPath = options.testRunner || './node_modules/qunit-phantomjs-runner/runner-json.js';

    return through.obj(function (file, enc, cb) {
        var absolutePath = path.resolve(file.path),
            isAbsolutePath = absolutePath.indexOf(file.path) >= 0;

        var childArgs = [];
        if (options['phantomjs-options'] && options['phantomjs-options'].length) {
            childArgs.push( options['phantomjs-options'] );
        }

        childArgs.push(
            //path.join(__dirname, './node_modules/qunit-phantomjs-runner/runner-json.js'),
            path.join(__dirname, testRunnerPath),
            (isAbsolutePath ? 'file:///' + absolutePath.replace(/\\/g, '/') : file.path)
        );

        if ( options.timeout ) {
            childArgs.push( options.timeout );
        }

        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-qunit', 'Streaming not supported'));
            return cb();
        }

        childProcess.execFile(binPath, childArgs, function (err, stdout, stderr) {
            var passed = true;

            gutil.log('Testing ' + file.relative);

            if (stdout) {
                try {
                    var out,
                        result,
                        color;

                    stdout.trim().split('\n').forEach(function(line) {
                        if (line.indexOf('{') !== -1) {
                            out = JSON.parse(line.trim());
                            result = out.result;

                            color = result.failed > 0 ? chalk.red : chalk.green;

                            gutil.log('Took ' + result.runtime + ' ms to run ' + chalk.blue(result.total) + ' tests. ' + color(result.passed + ' passed, ' + result.failed + ' failed.'));

                            if(out.exceptions) {
                                for(var test in out.exceptions) {
                                    gutil.log('\n' + chalk.red('Test failed') + ': ' + chalk.red(test) + ': \n' + out.exceptions[test].join('\n  '));
                                }
                            }
                        } else {
                            line = line.trim(); // Trim trailing cr-lf
                            gutil.log(line);
                        }
                    });
                } catch (e) {
                    this.emit('error', new gutil.PluginError('gulp-qunit', e));
                }
            }

            if (stderr) {
                gutil.log(stderr);
                this.emit('error', new gutil.PluginError('gulp-qunit', stderr));
                passed = false;
            }

            if (err) {
                gutil.log('gulp-qunit: ' + chalk.red('✖ ') + 'QUnit assertions failed in ' + chalk.blue(file.relative));
                this.emit('error', new gutil.PluginError('gulp-qunit', err));
                passed = false;
            } else {
                gutil.log('gulp-qunit: ' + chalk.green('✔ ') + 'QUnit assertions all passed in ' + chalk.blue(file.relative));
            }

            this.emit('gulp-qunit.finished', {'passed': passed});

            this.push(file);

            return cb();
        }.bind(this));
    });
};
