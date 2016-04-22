require('qunit-assert-close');
require('jquery');
require('jquery-simulate/jquery.simulate.js');

require('./utils');

// Load all source files to ensure they're counted for code coverage
const srcContext = require.context('../source/js/', true, /(diva|plugins\/.*)\.js$/);
srcContext.keys().forEach(srcContext);

// Load all test files
const testsContext = require.context('./unit/', true, /\.js$/);
testsContext.keys().forEach(testsContext);
