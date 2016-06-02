var webpack = require('webpack');

module.exports = function (mode)
{
    var config = {
        entry: [
            './source/js/register-builtin-plugins.js',
            // The export
            './source/js/diva.js'
        ],
        output: {
            path: __dirname + '/build/js',
            filename: 'diva.min.js',
            library: 'diva',
            libraryTarget: 'umd'
        },
        externals: {
            jquery: {
                root: 'jQuery',
                amd: 'jquery',
                commonjs: 'jquery',
                commonjs2: 'jquery'
            }
        }
    };

    if (mode === 'production')
    {
        config.devtool = 'sourcemap';
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
