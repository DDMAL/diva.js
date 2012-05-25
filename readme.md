diva.js - Document Image Viewer with AJAX
=========================================

[![Build Status](https://secure.travis-ci.org/DDMAL/diva.js.png?branch=develop)](http://travis-ci.org/DDMAL/diva.js)

Description
-----------

Diva.js (Document Image Viewer with AJAX) is a Javascript frontend for viewing documents, designed to work with digital libraries to present multi-page documents as a single, continuous item. Using "lazy loading" methods for loading parts of a document on demand, it presents a quick and efficient way of displaying hundreds (or even thousands) of high-resolution page images from digitized books and other documents on a single web page. Written as a jQuery plugin, diva.js requires the jQuery Javascript library and several included jQuery plugins. On the backend, the images will be served by [IIPImage server](http://iipimage.sourceforge.net) after processing, and the image information will be received, in JSON format, through an AJAX request by a PHP or Python script (included).

Installation and setup
----------------------

Setting up the document viewer comes in two parts: the jQuery plugin on the frontend, and the tile image server and PHP script on the backend. First, download the contents of this repository, using `git clone https://github.com/DDMAL/diva.js.git`, or by downloading the [zip](https://github.com/DDMAL/diva.js/zipball/master] or [compressed tar](https://github.com/DDMAL/diva.js/tarball/master) package and extracting.

### Setting up the frontend

All of the relevant Javascript, CSS, and image files can be found in the `build/` directory, under the subdirectories `js`/, `css/`, and `img/`, respectively. The included HTML files in the `demo/` directory give an example of how the document viewer can set up, with some more setup details in the readme.md file in that directory.

There are several ways in which you can customise your Diva installation:

* Passing in settings (see the [user-configurable settings documentation](https://github.com/DDMAL/diva.js/wiki/Code-documentation#wiki-js-settings))
* Editing the CSS or LESS files (see the [stylesheet code documentation](https://github.com/DDMAL/diva.js/wiki/Code-documentation#wiki-stylesheets))
* Editing diva.js or utils.js directly (see the [Javascript code documentation](https://github.com/DDMAL/diva.js/wiki/Code-documentation#wiki-javascript))
* Using the [plugin system](https://github.com/DDMAL/diva.js/wiki/Plugins)

For more information, see [Setup and installation - Configuring the frontend](https://github.com/DDMAL/diva.js/wiki/Installation#configuring-the-frontend).

### Setting up the backend

Setting up the backend requires access to a server capable of running IIPImage, as well as PHP or Python. The PHP and Python "divaserve" scripts for sending the image information can be found under `build/divaserve/`, with some usage instructions in the readme.md file in that directory. You will also need to preprocess the images you wish to display, which should be in either TIFF or JPEG2000 format; the relevant scripts and processing instructions can be found under `source/processing/`.

For more, see [Setup and installation - Setting up the backend](https://github.com/DDMAL/diva.js/wiki/Installation#setting-up-the-backend).

Getting help
------------

Help for diva.js is available through this repository's [wiki](https://github.com/DDMAL/diva.js/wiki), in the form of code documentation, installation instructions and usage tips.

Let Us Know
-----------

We're developing Diva.js as part of our research in [Distributed Digital Music Libraries](http://ddmal.music.mcgill.ca). If you use it in your project, it would be great if you could [let us know](mailto:andrew.hankinson@mail.mcgill.ca).
