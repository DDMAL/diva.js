module.exports = function(config)
{
    // Default port plus three; hopefully, this will help prevent collisions
    var KARMA_PORT = 9879;

    var webpackConfig = require('./webpack.conf.karma');

    var files = [
        // Assets
        {pattern: 'demo/**/*.json', included: false, served: true},

        // CSS
        'build/css/diva.min.css',
        {pattern: 'build/css/diva.min.css.map', included: false, served: true},

        // JS (root file)
        'tests/main.js'
    ];

    config.set({
        frameworks: ['qunit'],

        preprocessors: {
            'tests/main.js': ['webpack', 'sourcemap']
        },

        webpack: webpackConfig,

        webpackMiddleware: {
            noInfo: true
        },

        reporters: ['mocha', 'coverage'],

        coverageReporter: {
            type: 'html',
            dir: 'coverage/'
        },

        browsers: ['PhantomJS'],

        port: KARMA_PORT,
        proxies: {
            // Needed to load the test manifests
            '/demo/': 'http://localhost:' + KARMA_PORT + '/base/demo/'
        },

        files: files
    });
};
