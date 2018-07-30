var path = require('path');
var webpack = require('webpack');

// var sharedJQueryPath = require.resolve('jquery');

module.exports = [{
    mode: "development",
    entry: [
        // 'babel-polyfill',
        'whatwg-fetch',
        "array.prototype.fill",
        './source/js/diva.js'
    ],
    output: {
        path: path.join(__dirname, 'build'),
        publicPath: '/assets/',
        filename: 'diva.js'
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.json$/,
                'loaders': ['json']
            },
            {
                loader: "babel-loader",
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
        'manipulation': './source/js/plugins/manipulation.js',
        'metadata': './source/js/plugins/metadata.js'
    },
    output: {
        path: path.join(__dirname, 'build', 'plugins'),
        filename: '[name].js'
    },
    resolve: {
        extensions: ["*", ".js"],
    },
    module: {
        rules: [
            {
                loader: "babel-loader",
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
