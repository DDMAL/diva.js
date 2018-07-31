var path = require('path');

module.exports = {
    entry: './test/main.js',
    mode: 'development',
    output: {
        filename: './build/test-bundle.js'
    },
    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
        child_process: 'empty'
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
