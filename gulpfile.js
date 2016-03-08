/* jshint node:true */
'use strict'

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require('gulp-rename');

var karma = require('karma');

var Promise = require('bluebird');

gulp.task('develop:jshint', function()
{
    return gulp.src(['source/js/**/*.js'])
               .pipe($.jshint({lookup: true, devel: true}))
               .pipe($.jshint.reporter('jshint-stylish'))
               .pipe($.jshint.reporter('fail'));
});

gulp.task('develop:compile', function()
{
    return gulp.src([
        'source/js/diva.prefix',
        'source/js/utils.js',
        'source/js/diva.js',
        'source/js/plugins/*.js',
        'source/js/diva.suffix'
    ])
               .pipe(sourcemaps.init())
               .pipe(concat('diva.min.js'))
               .pipe(uglify())
               .pipe(sourcemaps.write('./'))
               .pipe(gulp.dest('build/js'))
               .on('error', function()
               {
                    console.log('A compiler error has occurred');
               });
});

gulp.task('develop:styles', function()
{
    gulp.src('source/css/diva.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('build/css'));

    gulp.src('source/css/diva.less')
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.init())
        .pipe(less({compress: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('build/css'));
});

gulp.task('develop:server', function()
{
    var serveStatic = require('serve-static');
    var serveIndex = require('serve-index');

    var app = require('connect')()
                .use(require('connect-livereload')({port:35729}))
                .use(serveStatic('build'))
                .use(serveIndex('build'));

    require('http').createServer(app)
        .listen(9001)
        .on('listening', function()
        {
            console.log('Started a web server on http://localhost:9001');
        });
});

gulp.task('develop:clean', function()
{
    var del = require('del');
    del(['build/'], function() {
        console.log('Cleaning build directory');
    });
});

gulp.task('develop:build', ['develop:styles', 'develop:compile'], function()
{
    gulp.src('source/js/**/*.js')
        .pipe(gulp.dest('build/js'));

    gulp.src('source/processing/*.py')
        .pipe(gulp.dest('build/processing'));

    gulp.src('demo/*')
        .pipe(gulp.dest('build/demo'));

    gulp.src('demo/diva/*')
        .pipe(gulp.dest('build/demo'));

    gulp.src('AUTHORS')
        .pipe(gulp.dest('build'));

    gulp.src('LICENSE')
        .pipe(gulp.dest('build'));

    gulp.src('readme.md')
        .pipe(gulp.dest('build'));

    // gulp.start('develop:styles');
    // gulp.start('develop:compile');
});

gulp.task('develop', ['develop:build', 'develop:server'], function()
{
    $.livereload.listen();

    gulp.watch([
        'build/js/**/*',
        'build/css/diva.css'
    ]).on('change', $.livereload.changed);

    gulp.watch('source/js/**/*.js', ['develop:jshint', 'develop:compile']);
    gulp.watch('source/css/**/*.less', ['develop:styles']);
});

gulp.task('release', ['develop:build'], function()
{
    var archiver = require('archiver');

    var argv = require('yargs')
                .usage('Usage: gulp release -v [num]')
                .demand(['v'])
                .alias('v', 'version')
                .argv;

    var release_name = 'diva-v' + argv.v;

    var tgz_archive = archiver('tar', {
        gzip: true,
        gzipOptions: {
            level: 9
        }
    });

    var zip_archive = archiver('zip');

    return Promise.all([
        writeArchive(release_name + '.tar.gz', release_name, tgz_archive),
        writeArchive(release_name + '.zip',    release_name, zip_archive),
        setVersionForNpm(argv.v)
    ]);
});

gulp.task('develop:test', ['develop:build'], function (done)
{
    new karma.Server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done).start();
});

gulp.task('default', ['develop:build'], function()
{
    gulp.start('develop:build');
});

function writeArchive(filename, releaseName, archive)
{
    var fs = require('fs');

    var out = fs.createWriteStream(__dirname + '/' + filename);
    var format = archive._format;

    var promise = new Promise(function (resolve, reject)
    {
        archive.on('close', function()
        {
            console.log(archive.pointer() + ' total bytes');
            console.log('Finished writing ' + format + ' archive');

            resolve();
        });

        archive.on('error', function(err)
        {
            console.error('There was a problem creating the ' + format + ' archive: ' + err);

            reject(err);
        });
    });

    archive.pipe(out);
    archive.directory('build/', releaseName)
        .finalize();

    return promise;
}

function setVersionForNpm(version)
{
    var spawn = require('child_process').spawn;

    return new Promise(function (resolve, reject)
    {
        var npm = spawn('npm', ['version', '--no-git-tag-version', version], {stdio: 'inherit'});

        npm.on('error', function (err)
        {
            console.error('failed to call npm version: ' + err);
            reject(err);
        });

        npm.on('exit', function (code)
        {
            if (code === 0)
            {
                resolve();
            }
            else
            {
                console.error('npm exited with code ' + code);
                reject();
            }
        });
    });
}
