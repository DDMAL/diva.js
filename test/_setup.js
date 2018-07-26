require('jsdom-global/register');

var expect = require('chai').expect;
global.expect = expect;

var assert = require('chai').assert;
global.assert = assert;

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
var dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id='diva-wrapper'></div></body></html>`);
global.window = dom.window;
global.document = dom.window.document;