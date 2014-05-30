diva.js - Document Image Viewer with AJAX
=========================================

[![Build Status](https://secure.travis-ci.org/DDMAL/diva.js.png?branch=develop)](http://travis-ci.org/DDMAL/diva.js)

# Description

Diva.js (Document Image Viewer with AJAX) is a JavaScript book image viewer designed to present multi-page documents at multiple resolutions.

Version 3.0 contains many new features and improvements:

 * JavaScript Performance improvements
 * Simplified setup by removing dependency on `divaserve` script
 * Improved API
 * A new publish/subscribe system for viewer
 * Bug-fixes (See our [commits](https://github.com/DDMAL/diva.js/commits/master) for more details).

# Overview

There are three components to a functioning Diva system:

1. The IIP Image Server, a highly optimized image server;
2. A JavaScript and HTML front-end component used to display the images in a browser;
3. A `.json` file containing data about the image collection, used by the front-end component to determine the layout of the viewer.

Additionally, your document image files must be processed into either Pyramid TIFF, or JPEG2000 format, in order to be served by IIP.

## Details

The IIP Image Server is required by Diva to serve image data. IIP creates the image tiles and other image representations "on the fly". Instructions for building and installing IIP are available on the [project's website](http://iipimage.sourceforge.net/documentation/server/). If you want to support JPEG 2000 you will either need to download a pre-compiled version (available on the [Old Maps Online site](http://help.oldmapsonline.org/jpeg2000/installation)) or [purchase the Kakadu libraries](http://www.kakadusoftware.com) and build it yourself.

Diva relies on a JavaScript Object Notation (JSON) file that contains data about your document. This JSON file is automatically generated when you use the image conversion scripts that we distribute with Diva. These files can be served using a regular web server. _(If you used previous versions of Diva, we had a dedicated `divaserve` script to do this. This dependency has been removed in version 3.0)_.

Download the [latest release](https://github.com/DDMAL/diva.js/releases) of Diva. In the `build` directory you can find a pre-compiled version of Diva. The `css`, `js` and `img` directories contain the files necessary to use Diva. You will also find a number of demos and some helper scripts for processing your image files.

There are two image formats supported by IIP: Pyramid TIFF and, with the inclusion of the Kakadu libraries, JPEG2000. These formats support multiple file resolutions and image tiling. 

# Installing

The most basic Diva viewer is instantiated with three required parameters:

```javascript

$('#diva-wrapper').diva({
    iipServerURL: "http://www.example.com/fcgi-bin/iipsrv.fcgi",
    objectData: "http://www.example.com/beromunster.json",
    imageDir: "/mnt/images/beromunster"
});
```

 * `#diva-wrapper`: A selector pointing to a `div` element where you want the scrollable page images to appear;
 * `iipServerURL`: The URL to your IIP installation. In most cases this should point to the iipsrv.fcgi file;
 * `objectData`: The URL (absolute or relative) to the document's `.json` file
 * `imageDir`: Either the absolute path to your images on your server, OR the path relative to your IIP installation's [`FILESYSTEM_PREFIX`](http://iipimage.sourceforge.net/documentation/server/) configuration option.

Since IIP will be serving the images you should not place your images in directory accessible by your web server. In other words, if your web server uses `/srv/www` as its root directory you do not need to place your images there -- they can reside in any directory on your server as long as it they can be read by the IIP instance.

### Cross-site Requests

You may receive an error that looks something like this:

```
XMLHttpRequest cannot load http://example.com/demo/imagefiles.json. No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'http://localhost:8000' is therefore not allowed access.
```

This is a security precaution that all browsers use to prevent cross-site request forgeries. If you receive this message it is because your `objectData` parameter and the server used to serve the Diva page are not at the same server address.

To fix this you must ensure that the Diva HTML page, and the location pointed to by the `objectData` page are being served by the same server, or you must create an exception using the `Access-Control-Allow-Origin` header on your server to explicitly white-list the `objectData` location.

## Running the Demos

Running the demos works best using a web server. The easiest is to use Python to start a small web server in the 'build' directory:

```
$> cd diva.js/build
$> python -m SimpleHTTPServer
Serving HTTP on 0.0.0.0 port 8000 ...
```
You may then load the demos in your web browser by visiting `http://localhost:8000` in your browser.

# Building from source

If you wish to install from source, you can check out the code from [our GitHub repository](http://github.com/DDMAL/diva.js). To fully build Diva you will need the following dependencies:

 * the [LESS stylesheet compiler](http://lesscss.org)
 * the [Closure Javascript compiler](https://developers.google.com/closure/)

All other dependencies are listed above.

The full installation gives you access to the un-minified JavaScript source, the plugins, the documentation, and our unit-tests. We use a build script (`build.sh`) for basic development tasks:

 * `./build.sh less`: Compiles and minifies the LESS files into CSS.
 * `./build.sh minify`: Minifies the JavaScript files using the Closure compiler.
 * `./build.sh all`: Performs both less and minify.
 * `./build.sh test`: Runs Diva's unit tests with [PhantomJS](http://phantomjs.org/).
 * `./build.sh release VERSION`: Builds the release package. `VERSION` is the release name, so `./build.sh release 3.0.0` will create `diva-3.0.0.tar.gz`. 

## Getting help

Help for diva.js is available through this repository's [wiki](https://github.com/DDMAL/diva.js/wiki), in the form of code documentation, installation instructions and usage tips.

Let Us Know
-----------

We're developing Diva.js as part of our research in [Distributed Digital Music Libraries](http://ddmal.music.mcgill.ca). If you use it in your project, it would be great if you could [let us know](mailto:andrew.hankinson@mail.mcgill.ca).
