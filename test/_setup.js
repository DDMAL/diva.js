require('jsdom-global/register');

let expect = require('chai').expect;
global.expect = expect;

let assert = require('chai').assert;
global.assert = assert;

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
let dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id='diva-wrapper'></div></body></html>`);
global.window = dom.window;
global.document = dom.window.document;