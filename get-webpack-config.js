var webpack = require('webpack');

module.exports = function (mode, options)
{
    var isCompressed = options && options.compress;

    var outputFilename;

    if (options && options.outputFilename)
        outputFilename = options.outputFilename;
    else if (isCompressed)
        outputFilename = 'diva.min.js';
    else
        outputFilename = 'diva.js';

    var config = {
        entry: [
            './source/js/register-builtin-plugins.js',
            // The export
            './source/js/diva.js'
        ],
        output: {
            path: __dirname + '/build/js',
            filename: outputFilename,
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
        },
        devtool: mode === 'production' ? 'sourcemap' : 'inline-source-map'
    };

    if (isCompressed)
    {
        config.plugins = [
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false
                }
            })
        ];
    }

    return config;
};
