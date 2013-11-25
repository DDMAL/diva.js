diva.js - Document Image Viewer with AJAX
=========================================

[![Build Status](https://secure.travis-ci.org/DDMAL/diva.js.png?branch=develop)](http://travis-ci.org/DDMAL/diva.js)

Description
-----------

Diva.js (Document Image Viewer with AJAX) is a JavaScript book image viewer designed to present multi-page documents at multiple resolutions.

Version 3.0 contains many new features and improvements:

 * JavaScript Performance improvements
 * Simplified setup by removing dependency on `divaserve` script
 * Improved API
 * A new publish/subscribe system for viewer
 * Bug-fixes (See our [commits](https://github.com/DDMAL/diva.js/commits/master) for more details).

Overview
----------------------

The IIP Image Server is required by Diva to serve image data. IIP creates the image tiles and other image representations "on the fly". Instructions for building and installing IIP are available on the [project's website](http://iipimage.sourceforge.net/documentation/server/). If you want to support JPEG 2000 you will either need to download a pre-compiled version (available on the [Old Maps Online site](http://help.oldmapsonline.org/jpeg2000/installation)) or [purchase the Kakadu libraries](http://www.kakadusoftware.com) and build it yourself.

Additionally, Diva relies on a JavaScript Object Notation (JSON) file that contains data about your document. This JSON file is automatically generated when you use the image conversion scripts that we distribute with Diva. These files can be served using a regular web server. (If you used previous versions of Diva, we had a dedicated `divaserve` script to do this. This dependency has been removed in version 3.0).

Download the [latest release](https://github.com/DDMAL/diva.js/releases) of Diva. In the `build` directory you can find a pre-compiled version of Diva. The `css`, `js` and `img` directories contain the files necssary to use Diva. You will also find a number of demos and some helper scripts for processing your image files.

There are two image formats supported by IIP: Pyramid TIFF and, with the inclusion of the Kakadu libraries, JPEG2000. These formats support multiple file resolutions and image tiling. We have included a few Python scripts to help you convert your images, but you can also use other image manipulation systems. In the `processing` directory you will find:

 * `process.py`: Converts a directory of images to JPEG2000 or Pyramid TIFF. This script requires the Kakadu `kdu_compress` command and the ImageMagick `convert` command. If you choose Pyramid TIFF you must also have the VIPS Python library installed. This script will produce images, as well as a JSON file containing the document's measurement data.
 * `generate_json.py`: This script creates the JSON file necessary to serve the images in Diva. Your images must already be in JPEG2000 or Pyramid TIFF format for this script to work.

## Installing

The most basic Diva viewer requires three parameters:

```javascript

$('#diva-wrapper').diva({
    iipServerURL: "http://www.example.com/fcgi-bin/iipsrv.fcgi",
    objectData: "http://www.example.com/beromunster.json",
    imageDir: "/mnt/images/beromunster"
});
```

 * `iipServerURL`: The URL to your IIP installation.
 * `objectData`: The URL (absolute or relative) to your document's `.json` file
 * `imageDir`: Either the absolute path to your images on your server, OR the path relative to your IIP installation's `FILESYSTEM_PREFIX` configuration option.

Since IIP will be serving the images you do not need to place your images in directory accessible by your web server. In other words, if your web server uses `/srv/www` as its root directory you do not need to place your images there -- they can reside in any directory outside of this.

## Running the Demos



Building from source
--------------------

If you wish to install from source, you can check out the code from [our GitHub repository](http://github.com/DDMAL/diva.js). To fully build Diva you will need the following dependencies:

 * the Python Fabric module for running the build scripts
 * the [LESS stylesheet compiler](http://lesscss.org)
 * the [Closure](https://developers.google.com/closure/) JavaScript compiler

All other dependencies are listed above.

The full installation gives you access to the un-minified JavaScript source and the plugins, the documentation, and our unit-tests. We have pre-defined Fabric commands for performing basic development tasks:

 * `fab less`: Compiles and minifies the LESS files into CSS.
 * `fab minify`: Minifies the JavaScript files using the Closure compiler.
 * `fab build`: Performs both less and minify.
 * `fab release:xxx`: Builds the release package. `:xxx` is the release name, so `fab release:2.0.0` will create `diva-2.0.0.tar.gz`. 

Getting help
------------

Help for diva.js is available through this repository's [wiki](https://github.com/DDMAL/diva.js/wiki), in the form of code documentation, installation instructions and usage tips.

Let Us Know
-----------

We're developing Diva.js as part of our research in [Distributed Digital Music Libraries](http://ddmal.music.mcgill.ca). If you use it in your project, it would be great if you could [let us know](mailto:andrew.hankinson@mail.mcgill.ca).
