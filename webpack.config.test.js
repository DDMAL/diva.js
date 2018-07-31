var path = require('path');

module.exports = {
    entry: './test/main.js',
    output: {
        filename: './build/test-bundle.js'
    },
    node: {
        fs: 'empty'
    },
    module: {
        rules: [
            {
                loader: "babel-loader",
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
