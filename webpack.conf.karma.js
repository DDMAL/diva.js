var path = require('path');

module.exports = {
    externals: {
        // qunit-assert-close looks for this
        qunit: 'QUnit',
        qunitjs: 'QUnit'
    },

    module: {
        preLoaders: [
            // instrument only testing sources with Istanbul
            {
                test: /\.js$/,
                include: path.resolve('source/js/'),
                loader: 'istanbul-instrumenter'
            }
        ],
        loaders: [
            {
                include: path.resolve('node_modules/jquery-simulate'),
                loader: 'imports?jQuery=jquery'
            }
        ]
    },

    devtool: 'inline-source-map'
};
