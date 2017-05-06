const gulp = require('gulp');
const gutil = require('gulp-util');
const del = require('del');
const path = require('path');
const p = require('gulp-load-plugins')();
const webpack = require('webpack');
const webpackConf = require('./webpack.config');
const WebpackDevServer = require('webpack-dev-server');

const manifest = require('./package.json');
const mainFile = manifest.main;
const buildFolder = path.dirname(mainFile);


function cleanDist (done)
{
    del([buildFolder]).then( () => done() );
}

function cleanTemp (done)
{
    del(['tmp']).then( () => done() );
}

function lint (files)
{
    return gulp.src(files)
               .pipe(p.jshint({lookup: true, devel: true}))
               .pipe(p.jshint.reporter('jshint-stylish'))
               .pipe(p.jshint.reporter('fail'));
}

function lintSrc ()
{
    return lint('source/js/**/*.js');
}

function lintTest ()
{
    return lint('tests/*.js');
}

function lintGulpfile ()
{
    return lint('gulpfile.js');
}

function plugins (done)
{
    let pluginConfig = Object.create(webpackConf).slice(1);
    webpack(pluginConfig).run(done);
}

function server ()
{
    let devConfig = Object.create(webpackConf)[0];
    devConfig.entry.unshift("webpack-dev-server/client?http://localhost:9001/");
    devConfig.devtool = "source-map";
    devConfig.debug = true;
    devConfig.devServer = {
        inline: true
    };

    new WebpackDevServer(webpack(devConfig),
        {
            publicPath: devConfig.output.publicPath,
            stats: {
                colors: true
            }
        }).listen(9001, 'localhost', function (err)
    {
        if (err)
            throw new gutil.PluginError('dev-server', err);
        gutil.log('dev-server', "http://localhost:9001/index.html");
    });
}


gulp.task('lint-src', lintSrc);
gulp.task('lint-test', lintTest);
gulp.task('lint-gulpfile', lintGulpfile);

gulp.task('develop:build-icons', ['convert-svg-to-png', 'make-sprites']);
gulp.task('develop:build-plugins', plugins);
gulp.task('develop:clean', cleanDist);
gulp.task('develop:tmp-clean', cleanTemp);
gulp.task('develop:lint', ['lint-src', 'lint-test', 'lint-gulpfile']);
gulp.task('develop:server', server);
gulp.task('develop', ['develop:lint', 'develop:clean', 'develop:build-plugins', 'develop:server']);
gulp.task('default', ['develop']);
