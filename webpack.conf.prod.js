module.exports = [
    require('./get-webpack-config')('production'),
    require('./get-webpack-config')('production', { compress: true })
];
