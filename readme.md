diva.js - Document Image Viewer with AJAX
=========================================

[![Build Status](https://secure.travis-ci.org/DDMAL/diva.js.png?branch=develop)](http://travis-ci.org/DDMAL/diva.js)

Description
-----------

Diva.js (Document Image Viewer with AJAX) is a Javascript frontend for viewing documents, designed to work with digital libraries to present multi-page documents as a single, continuous item. Using "lazy loading" methods for loading parts of a document on demand, it presents a quick and efficient way of displaying hundreds (or even thousands) of high-resolution page images from digitized books and other documents on a single web page.

Version 2.0+ contains many new features and improvements:

 * Support for JPEG2000 images.
 * New plug-in architecture for extending the functionality of Diva without 'hacking' the core.
 * In-browser image manipulation for adjusting brightness, contrast, and page rotation.
 * Speed improvements thanks to fewer calls to the server.
 * A cleaner default interface.
 * Built using LESS for easier style development.
 * Lots and lots of bug-fixes (See our [commits](https://github.com/DDMAL/diva.js/commits/master) for more details).

Installation and setup
----------------------

## Overview

Diva has three main components: The front-end that runs in the browser, the image server ([IIP Image Server](http://iipimage.sourceforge.net)) and the Diva data server, a small PHP or Python script that processes the image files for their measurements which are then sent to the front-end when a user first loads a document.

## Easy Install

The easiest way to get going is to download the [latest tagged release](https://github.com/DDMAL/diva.js/tags). This package contains what you will need to get started: full minified versions of the JavaScript and CSS, a few demo pages, and a basic Diva data server in both Python and PHP. (You will still have to download and install the IIP Image Server separately).

### Dependencies

Diva depends on the [jQuery library](http://www.jquery.com).

To run the basic Diva data server in Python, you will also need to install the [Tornado](http://www.tornadoweb.org) web server and the [VIPS Python module](http://www.vips.ecs.soton.ac.uk/index.php?title=Python)

To run the image processing scripts `process.py` and `process_jp2.py` you will also need the VIPS Python module.

### Setting up the frontend

All of the relevant Javascript, CSS, and image files can be found in the `build` directory, under the subdirectories `js`/, `css/`, and `img/`, respectively. The included HTML files in the `demo/` directory give an example of how the document viewer can be initialized, with further setup details in the readme.md file in that directory.

### Setting up the backend

Setting up the backend requires access to a server capable of running IIPImage, as well as PHP or Python. The PHP and Python "divaserve" scripts for sending the image information can be found under `dataservers` directory, with some usage instructions in the readme.md file in that directory. The download also ships with a very basic Tornado web application, `server.py` that illustrates how you might integrate the `divaserve.py` module in your own web application.

You will configure the address of where the Diva front-end can find both the IIP Image Server and the Diva data server when you initialize the viewer. See the `examples/` directory for more details.

The PHP version of the divaserve script requires the GD PHP extension. The Python version requires the VIPS Python module, and can be optionally configured to use a Memcached installation.

### Image processing

You will also need to preprocess the images you wish to display, which should be in either TIFF or JPEG2000 format; the relevant scripts and processing instructions can be found under `processing/`.

The `process.py` script uses the VIPS Python library to produce [Pyramid TIFF](http://www.digitalpreservation.gov/formats/fdd/fdd000237.shtml) images, while the `process_jp2.py` script uses the [Kakadu](http://www.kakadusoftware.com) `kdu_compress` utility to produce JPEG2000 images. You can find a free version of this script on their website.

## Full Installation

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
