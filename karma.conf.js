module.exports = function(config)
{
    // Default port plus three; hopefully, this will help prevent collisions
    var KARMA_PORT = 9879;

    var srcFiles;

    if (process.env.TEST_DIVA === 'build')
    {
        srcFiles = [
            'build/js/diva.min.js'
        ];
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
    }

    config.set({
        frameworks: ['qunit'],
        reporters: ['mocha'],

        browsers: ['PhantomJS'],

        port: KARMA_PORT,
        proxies: {
            '/demo/': 'http://localhost:' + KARMA_PORT + '/base/demo/'
        },

        files: [
            {pattern: 'demo/**/*.json', included: false, served: true},
            'node_modules/jquery/dist/jquery.js',
            'node_modules/jquery-simulate/jquery.simulate.js',
            'build/css/diva.min.css',
            {pattern: 'build/css/diva.min.css.map', included: false, served: true}
        ].concat(srcFiles)
        .concat([
            'tests/utils.js',
            'tests/unit/**/*.js'
        ])
    });
};
