const path = require('path');
const buildMode = (process.env.NODE_ENV === "production") ? 'production' : 'development';
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");


module.exports = [{
    entry: [
        // 'babel-polyfill',
        "array.prototype.fill",
        './source/js/diva.js',
        './source/css/diva.scss'
    ],
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: ['style-loader', MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(['build']),
        new CopyWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: path.join('diva.css')
        })
    ],
    output: {
        publicPath: '/build/',
        path: path.join(__dirname, 'build'),
        filename: 'diva.js'
    },
    mode: buildMode,
    devtool: (buildMode === "production") ? 'cheap-source-map' : 'cheap-module-eval-source-map',
    devServer: {
        contentBase: __dirname,
        compress: true,
        port: 9001
    }
}, {
    entry: {
        'download': './source/js/plugins/download.js',
        'manipulation': './source/js/plugins/manipulation.js',
        'metadata': './source/js/plugins/metadata.js',
        'simple-auth': './source/js/plugins/simple-auth.js'
    },
    plugins: [
        new CleanWebpackPlugin([path.join('build', 'plugins')]),
    ],
    output: {
        publicPath: '/build/plugins/',
        path: path.join(__dirname, 'build', 'plugins'),
        filename: '[name].js'
    },
    mode: buildMode,
    devtool: (buildMode === "production") ? 'cheap-source-map' : 'cheap-module-eval-source-map'
}];