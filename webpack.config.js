var path = require('path');
var webpack = require('webpack');

// var sharedJQueryPath = require.resolve('jquery');

module.exports = [{
    entry: [
        // 'babel-polyfill',
        'whatwg-fetch',
        "array.prototype.fill",
        './source/js/diva.js'
    ],
    output: {
        path: path.join(__dirname, 'static', 'js'),
        filename: 'diva.js'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.json$/,
                loaders: ['json']
            },
            {
                loader: "babel",
                // include: [
                //     path.resolve(__dirname, "source/js")
                // ],
                query: {
                    presets: ["es2015"],
                }
            }
        ]
    },
    plugins: (process.env.NODE_ENV === "production") ? productionPlugins() : developmentPlugins()
}, {
    entry: {
        'download': './source/js/plugins/download.js',
        'manipulation': './source/js/plugins/manipulation.js'
    },
    output: {
        path: path.join(__dirname, 'static', 'js'),
        filename: '[name].js'
    },
    resolve: {
        extensions: ["", ".js"],
    },
    module: {
        loaders: [
            {
                loader: "babel",
                include: [
                    path.resolve(__dirname, "source/js/plugins")
                ],
                query: {
                    presets: ["es2015"]
                }
            }
        ]
    }
}];

function productionPlugins()
{
    return [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        }),
        new webpack.optimize.UglifyJsPlugin(),
        new webpack.optimize.OccurrenceOrderPlugin(true),
        new webpack.ProvidePlugin({
            // 'diva': 'diva',
            // '$': sharedJQueryPath,
            // 'jQuery': sharedJQueryPath,
            // 'window.jQuery': sharedJQueryPath,
            // URLSearchParams: "url-search-params"
        })
    ]
}

function developmentPlugins()
{
    return [
        new webpack.ProvidePlugin({
            // 'diva': 'diva',
            // '$': sharedJQueryPath,
            // 'jQuery': sharedJQueryPath,
            // 'window.jQuery': sharedJQueryPath,
            // URLSearchParams: "url-search-params"
        })
    ]
}
