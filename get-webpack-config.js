var glob = require('glob');
var webpack = require('webpack');

module.exports = function (mode)
{
    var plugins = glob.sync('./source/js/plugins/*.js');

    var config = {
        entry: plugins.concat([
            // The export
            './source/js/diva.js'
        ]),
        output: {
            path: __dirname + '/build/js',
            filename: 'diva.min.js',
            library: 'diva',
            libraryTarget: 'umd'
        }
    };

    if (mode === 'production')
    {
        config.externals = {
            jquery: {
                root: 'jQuery',
                    amd: 'jquery',
                    commonjs: 'jquery',
                    commonjs2: 'jquery'
            }
        };

        config.plugins = [
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false
                }
            })
        ];
    }
    else
    {
        config.devtool = 'inline-source-map';
    }

    return config;
};
