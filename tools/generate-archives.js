'use strict';

var Promise = global.Promise || require('bluebird');

var fs = require('fs');
var zlib = require('zlib');
var tar = require('tar-fs');
var archiver = require('archiver');

var promisify = require('bluebird').promisify;

var rmRec = promisify(require('rimraf'));

var npmExec = require('./npm-exec');

// Create a tar archive using npm pack and a zip archive based on it
module.exports = function ()
{
    // Ensure version is up to date
    delete require.cache[require.resolve('../package.json')];
    var version = require('../package.json').version;

    var releaseName = 'diva-v' + version;
    var npmPackFilename = 'diva.js-' + version + '.tgz';

    return npmExec(['pack']).then(function ()
    {
        var extractor = tar.extract('.tmp-package');
        var extracterComplete = streamToPromise(extractor, 'finish');

        var tgz = fs.createReadStream(npmPackFilename);
        tgz
            .pipe(zlib.Gunzip())
            .pipe(extractor);

        return extracterComplete;
    }).then(function ()
    {
        var tarOpts = {
            gzip: true,
            gzipOptions: {
                level: 9
            }
        };

        return Promise.all([
            writeArchive('zip', undefined, releaseName, '.zip'),
            writeArchive('tar', tarOpts,   releaseName, '.tar.gz')
        ]);
    }).then(function ()
    {
        // No-op, ensure undefined returned
    }, function (err)
    {
        // Catch error to re-raise later
        return err;
    })
    .then(function (err)
    {
        // Cleanup
        return Promise.all([
            rmRec(npmPackFilename),
            rmRec('./.tmp-package')
        ]).then(function ()
        {
            // Re-throw an error if there was one
            if (err)
                throw err;

            console.log('Release build complete');
        });
    });
};

function writeArchive(format, options, releaseName, extension)
{
    var fname = releaseName + extension;
    var output = fs.createWriteStream(fname);

    var archive = archiver(format, options);

    var archiverComplete = streamToPromise(archive, 'end');

    archive.pipe(output);
    archive.directory('.tmp-package/package', releaseName)
        .finalize();

    return archiverComplete.then(function ()
    {
        console.log('Wrote ' + fname + ' (' + archive.pointer() + ' bytes)');
    });
}

function streamToPromise(stream, endEvent)
{
    return new Promise(function(resolve, reject)
    {
        stream.on(endEvent, resolve);
        stream.on('error', reject);
    });
}
