var expect = require('chai').expect;
global.expect = expect;

var assert = require('chai').assert;
global.assert = assert;

let div = document.createElement('div');
div.id = 'diva-wrapper';
document.body.appendChild(div);