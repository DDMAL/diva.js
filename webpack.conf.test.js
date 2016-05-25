var path = require('path');

module.exports = {
    externals: {
        // qunit-assert-close looks for this
        qunit: 'QUnit',
        qunitjs: 'QUnit'
    },

    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json'
            },
            {
                include: path.resolve('node_modules/jquery-simulate'),
                loader: 'imports?jQuery=jquery'
            }
        ]
    },

    devtool: 'inline-source-map'
};
