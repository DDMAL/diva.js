module.exports = function(config)
{
    // Default port plus three; hopefully, this will help prevent collisions
    var KARMA_PORT = 9879;

    var srcFiles, reporters, preprocessors;

    if (process.env.TEST_DIVA === 'build')
    {
        srcFiles = [
            'build/js/diva.min.js'
        ];

        // Don't run coverage on the minified build
        reporters = ['mocha'];
        preprocessors = {};
    }
    else
    {
        // Order is important here
        srcFiles = [
            'source/js/utils.js',
            'source/js/diva.js',
            'source/js/plugins/highlight.js',
            'source/js/plugins/canvas.js',
            'source/js/plugins/download.js'
        ];

        // Run coverage
        reporters = ['mocha', 'coverage'];
        preprocessors = {
            'source/**/*.js': ['coverage']
        };
    }

    var files = [
        {pattern: 'demo/**/*.json', included: false, served: true},
        'node_modules/jquery/dist/jquery.js',
        'node_modules/jquery-simulate/jquery.simulate.js',
        'build/css/diva.min.css',
        {pattern: 'build/css/diva.min.css.map', included: false, served: true}
    ].concat(srcFiles).concat([
        'tests/utils.js',
        'tests/unit/**/*.js'
    ]);

    config.set({
        frameworks: ['qunit'],
        reporters: reporters,
        preprocessors: preprocessors,

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
