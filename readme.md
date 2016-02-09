<p align="center">
  <a href="http://ddmal.github.io/diva.js">
    <img width="382" height="191" src="https://github.com/DDMAL/diva.js/wiki/img/diva-logo-sm.png" />
  </a>
</p>
Diva.js [![Build Status](https://travis-ci.org/DDMAL/diva.js.svg?branch=develop)](http://travis-ci.org/DDMAL/diva.js) [![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/DDMAL/diva.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
=========================================

Diva.js (Document Image Viewer with AJAX) is a JavaScript book image viewer designed to present multi-page documents at multiple resolutions.

Version 4.0 contains many new features and improvements:

 * [International Image Interoperability Framework](http://iiif.io) (IIIF) support
 * Book Layout view (facing pages)
 * New plugins: Autoscroll (animated page scrolling), Page Alias (pages may have multiple identifiers), IIIF Metadata (displays document metadata from IIIF manifest), IIIF Highlight (displays annotations from a IIIF manifest)
 * Improved development workflow ([Gulp](https://github.com/gulpjs/gulp))
 * Support for changing which document is being viewed without re-instantiating the viewer
 * Numerous bug fixes and optimizations (See our [commits](https://github.com/DDMAL/diva.js/commits/master) for more details).

## Overview

There are two components to a functioning Diva system:

1. **An image server.** Either [IIP Image Server](http://iipimage.sourceforge.net) with Diva's JSON measurement data file or [any other IIIF-compatible image server](http://iiif.io/apps-demos.html).
2. **The Diva.js jQuery plugin.** The embedded web application that displays the images in a browser.

If using IIP, your document image files must be processed into either Pyramid TIFF or JPEG2000 format. We provide [a script](https://github.com/DDMAL/diva.js/wiki/Preparing-Your-Images) to easily do this.

### Details

#### If using IIIF
Diva.js is an image viewing client compatible with version 2.0 of the IIIF [Image](http://iiif.io/api/image/2.0/) and [Presentation](http://iiif.io/api/presentation/2.0/) APIs. Simply supply the path to a valid IIIF Manifest and Diva will display the document as described by the metadata (see [Installing](#installing)).

#### If using IIP
IIP creates the image tiles and other image representations "on the fly". Instructions for building and installing IIP are available on the [project's website](http://iipimage.sourceforge.net/documentation/server/). If you want to support JPEG 2000 you will either need to download a pre-compiled version (available on the [Old Maps Online site](http://help.oldmapsonline.org/jpeg2000/installation)) or [purchase the Kakadu libraries](http://www.kakadusoftware.com) and build it yourself.

Diva relies on a JavaScript Object Notation (JSON) file that contains data about your document. This JSON file is automatically generated when you use the image conversion scripts that we distribute with Diva. These files can be served using a regular web server.

There are two image formats supported by IIP: Pyramid TIFF and, with the inclusion of the Kakadu libraries, JPEG2000. These formats support multiple file resolutions and image tiling. 

## Installing

Download the [latest release](https://github.com/DDMAL/diva.js/releases) of Diva. In the `diva.js` directory (or `build` if you have the source code) you can find a pre-compiled version of Diva. The `css`, `js` and `img` directories contain the files necessary to use Diva. You will also find a number of demos and some helper scripts for processing your image files.

The most basic Diva viewer is instantiated with three (IIP) or one (IIIF) required parameter(s):

```javascript

$('#diva-wrapper').diva({
    iipServerURL: "http://www.example.com/fcgi-bin/iipsrv.fcgi",
    objectData: "http://www.example.com/beromunster.json",
    imageDir: "/mnt/images/beromunster"
});
```

Required for IIP and IIIF:
 * `objectData`: The URL (absolute or relative) to the document's `.json` file, or a IIIF Manifest
 
Required for IIP:
 * `iipServerURL`: The URL to your IIP installation. In most cases this should point to the iipsrv.fcgi file;
 * `imageDir`: Either the absolute path to your images on your server, OR the path relative to your IIP installation's [`FILESYSTEM_PREFIX`](http://iipimage.sourceforge.net/documentation/server/) configuration option.

The `#diva-wrapper` selector points to a `div` element within which the document viewer will appear.

See [Installation](https://github.com/DDMAL/diva.js/wiki/Installation) for full instructions.

### Running the Demos

Running the demos works best using a web server. The easiest is to use Python to start a small web server in the `diva.js` directory (or `build` if you have the source code):

```
$> cd diva-v3.0.0/diva.js/ # (or cd diva.js/build)
$> python -m SimpleHTTPServer
Serving HTTP on 0.0.0.0 port 8000 ...
```
You may then load the demos in your web browser by visiting `http://localhost:8000` in your browser.

## Building from source

If you wish to install from source, first you must install [node](https://nodejs.org/en/) and npm. Then, check out the code from [our GitHub repository](http://github.com/DDMAL/diva.js) or `npm install diva.js`. Once you've obtained the code, change to the project directory and run `npm install -g gulp` then `npm install` to fetch all development dependencies.

The full installation gives you access to the un-minified JavaScript source, the plugins, the documentation, and our unit-tests. We use [gulp](http://gulpjs.com/) as our build system and for other development tasks.


```
gulp develop          // Runs a webserver at localhost:9001 and automatically builds and reloads upon changes
gulp develop:build    // Compiles the Javascript and LESS source and places it in the build/ directory
gulp develop:test     // Runs the unit tests and outputs a report to the console
```

See [Installation](https://github.com/DDMAL/diva.js/wiki/Installation) for more information.

### Cross-site Requests

You may receive an error that looks something like this:

```
XMLHttpRequest cannot load http://example.com/demo/imagefiles.json. No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'http://localhost:8000' is therefore not allowed access.
```

This is a security precaution that all browsers use to prevent cross-site request forgeries. If you receive this message it is because your `objectData` parameter and the server used to serve the Diva page are not at the same server address.

To fix this you must ensure that the Diva HTML page, and the location pointed to by the `objectData` page are being served by the same server, or you must create an exception using the `Access-Control-Allow-Origin` header on your server to explicitly white-list the `objectData` location.


### Getting help

Help for diva.js is available through this repository's [wiki](https://github.com/DDMAL/diva.js/wiki), in the form of code documentation, installation instructions and usage tips.

Let Us Know
-----------

We're developing Diva.js as part of our research in [Distributed Digital Music Libraries](http://ddmal.music.mcgill.ca). If you use it in your project, it would be great if you could [let us know](mailto:andrew.hankinson@mail.mcgill.ca).
