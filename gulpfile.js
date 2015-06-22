/* jshint node:true */
'use strict'

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require('gulp-rename');

gulp.task('develop:jshint', function()
{
    return gulp.src(['source/js/**/*.js'])
               .pipe($.jshint({lookup: true, devel: true}))
               .pipe($.jshint.reporter('jshint-stylish'))
               .pipe($.jshint.reporter('fail'));
});

gulp.task('develop:compile', function()
{
    return gulp.src(['source/js/utils.js', 'source/js/diva.js', 'source/js/plugins/*.js'])
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
    del(['build/'], function() {});
});

gulp.task('develop:build', function()
{
    gulp.src('source/js/**/*.js')
        .pipe(gulp.dest('build/js/'));

    gulp.src('source/img/**/*')
        .pipe(gulp.dest('build/img'));

    gulp.src('source/processing/*.py')
        .pipe(gulp.dest('build/processing'));

    gulp.src('demo/*')
        .pipe(gulp.dest('build/demo'));

    gulp.src('demo/diva/*')
        .pipe(gulp.dest('build/demo'));

    gulp.start('develop:styles');
    gulp.start('develop:compile');
})

gulp.task('develop', ['develop:build', 'develop:server'], function()
{
    $.livereload.listen();

    gulp.watch([
        'build/js/diva.min.js',
        'build/css/diva.css'
    ]).on('change', $.livereload.changed);

    gulp.watch('source/js/**/*.js', ['develop:jshint', 'develop:compile']);
    gulp.watch('source/css/**/*.less', ['develop:styles']);
});

gulp.task('release', ['develop:build'], function()
{

});

gulp.task('default', function()
{
    gulp.start('develop:build');
});