var path = require('path');

module.exports = {
    entry: './tests/tests.js',
    output: {
        filename: './build/test-bundle.js'
    },
    node: {
        fs: 'empty'
    },
    module: {
        loaders: [
            {
                loader: "babel",
                include: [
                    path.resolve(__dirname, "tests")
                ],
                query: {
                    presets: ["es2015"],
                }
            }
        ]
    },
};
