var jsdom = require('jsdom');

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
global.window = document.parentWindow;

var expect = require('chai').expect;
global.expect = expect;

console.log('hello');
