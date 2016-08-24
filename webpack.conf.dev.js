// Output to diva.min.js because that's what the demos use.
module.exports = require('./get-webpack-config')('development', { outputFilename: 'diva.min.js' });
