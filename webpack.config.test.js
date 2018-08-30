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
                    presets: ["env"],
                }
            },
            {
                test: /\.js$/,
                use: { 
                    loader: 'istanbul-instrumenter-loader',
                    options: { esModules: true }
                },
                exclude: [
                    // exclude so we don't test coverage of these files
                    // very hard to test them with pure JS anyway
                    /source\/js\/utils\/vanilla\.kinetic\.js/,
                    /source\/js\/utils\/dragscroll\.js/,
                    /source\/js\/plugins\/_filters\.js/,
                    /source\/js\/gesture-events\.js/
                ],
                enforce: 'post',
                include: path.resolve('source/js/')
            }
        ]
    },
};
