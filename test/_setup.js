let expect = require('chai').expect;
global.expect = expect;

let assert = require('chai').assert;
global.assert = assert;

let wrapper = document.createElement('div');
wrapper.id = 'parent-wrapper';
wrapper.setAttribute('style', 'width: 984px; height: 800px');
let div = document.createElement('div');
div.id = 'diva-wrapper';
wrapper.appendChild(div);
document.body.appendChild(wrapper);