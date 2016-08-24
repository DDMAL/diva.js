'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var merge = require('merge-stream');
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var rename = require('gulp-rename');

var karma = require('karma');

var Promise = global.Promise || require('bluebird');

var getSourceCompiler = (function webpackCompilerGetter()
{
    var webpackCompiler = null;

    return function ()
    {
        if (webpackCompiler === null)
        {
            var webpack = require('webpack');

            var conf;

            if (process.env.DIVA_ENV === 'production')
                conf = require('./webpack.conf.prod');
            else
                conf = require('./webpack.conf.dev');

            webpackCompiler = webpack(conf);
        }

        return webpackCompiler;
    };
})();

gulp.task('develop:jshint', function()
{
    return gulp.src(['source/js/**/*.js'])
               .pipe($.jshint({lookup: true, devel: true}))
               .pipe($.jshint.reporter('jshint-stylish'))
               .pipe($.jshint.reporter('fail'));
});

gulp.task('develop:compile', function(done)
{
    getSourceCompiler().run(done);

});

gulp.task('develop:styles', function()
{
    var autoprefixer = require('autoprefixer');
    var auditDivaClasses = require('./audit-diva-css-classes');
    var reporter = require('postcss-reporter');

    var autoprefix = autoprefixer(['last 2 versions', 'Firefox ESR', 'IE >= 9']);

    var unminimized = gulp.src('source/css/diva.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe($.postcss([autoprefix, auditDivaClasses(), reporter]))
        .pipe(sourcemaps.write('./', {sourceRoot: '/source/css'}))
        .pipe(gulp.dest('build/css'));

    var minimized = gulp.src('source/css/diva.less')
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.init())
        .pipe(less({compress: true}))
        .pipe($.postcss([autoprefix]))
        .pipe(sourcemaps.write('./', {sourceRoot: '/source/css'}))
        .pipe(gulp.dest('build/css'));

    return merge(minimized, unminimized);
});

gulp.task('develop:server', function(done)
{
    var serveStatic = require('serve-static');
    var serveIndex = require('serve-index');

    var app = require('connect')()
        .use(require('connect-livereload')({port:35729}))
        .use(serveStatic('.'))
        .use(serveIndex('.'))
        .use('/js', serveStatic('build/js'))
        .use('/css', serveStatic('build/css'))
        .use('/demo', serveStatic('demo/diva'));  // Munge demo/ and demo/diva/ directories

    require('http')
        .createServer(app)
        .listen(9001)
        .on('listening', function()
        {
            console.log('Started a web server on http://localhost:9001');
            console.log('Visit http://localhost:9001/demo/ or http://localhost:9001/tests/');
            done();
        });
});

gulp.task('develop:clean', function(done)
{
    var del = require('del');

    del(['build/'], function() {
        console.log('Cleaning build directory');
        done();
    });
});

gulp.task('develop:build', ['develop:styles', 'develop:compile']);

gulp.task('develop', ['develop:styles', 'develop:server', 'develop:testServer'], function()
{
    $.livereload.listen();

    gulp.watch([
        'build/js/**/*.js',
        'build/css/**/*.css'
    ]).on('change', $.livereload.changed);

    gulp.watch(['source/js/**/*.js', 'tests/**/*.js'], ['develop:jshint']);
    gulp.watch('source/css/**/*.less', ['develop:styles']);

    // This also runs the initial compilation
    getSourceCompiler().watch({}, logWebpackErrors);

    function logWebpackErrors(err, stats)
    {
        if (err)
            console.error(err);

        var jsonStats = stats.toJson();

        if (jsonStats.errors.length > 0)
            console.error(jsonStats.errors);

        if (jsonStats.warnings.length > 0)
            console.error(jsonStats.warnings);
    }
});

gulp.task('release', function ()
{
    var runSequence = require('run-sequence');
    var checkGitStatus = require('./tools/check-git-status');

    if (!process.env.DIVA_ENV)
    {
        process.env.DIVA_ENV = 'production';
    }
    else if (process.env.DIVA_ENV !== 'production')
    {
        console.warn('Running release script in ' + process.env.DIVA_ENV + ' mode!');
    }

    return checkGitStatus().then(function ()
    {
        return new Promise(function (resolve, reject)
        {
            runSequence('develop:clean', 'develop:build', 'release:version', 'release:package', function (err)
            {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        })
    });
});

gulp.task('release:version', function ()
{
    var npmExec = require('./tools/npm-exec');
    var argv = require('yargs')
        .usage('Usage: gulp release -v [num]')
        .demand(['v'])
        .alias('v', 'version')
        .argv;

    return npmExec(['version', '--no-git-tag-version', argv.v]);
});

gulp.task('release:package', function ()
{
    var generateArchives = require('./tools/generate-archives');

    return generateArchives().then(function ()
    {
        console.warn('Manually release on GitHub, publish to npm, and update the website');
        console.warn('See https://github.com/DDMAL/diva.js/wiki/Developing-Diva.js#releasing-a-new-version');
    });
});

// Start a background Karma server
gulp.task('develop:testServer', function (done)
{
    var server = new karma.Server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: false,
        autoWatch: false,
        logLevel: 'OFF' // disable logging in the server process
    });

    server.start();

    console.log('Karma server started. Run `npm run trigger-tests` to run the test suite.');

    done();
});

// The JS dependencies are bundled inside Karma, so we only to build the styles
gulp.task('develop:test', ['develop:styles'], function (done)
{
    new karma.Server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done).start();
});

gulp.task('default', ['develop:build']);
