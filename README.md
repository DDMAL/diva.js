<p align="center">
  <a href="http://ddmal.github.io/diva.js">
    <img width="382" height="191" src="https://github.com/DDMAL/diva.js/wiki/img/diva-logo-sm.png" />
  </a>
</p>

Diva.js [![Build Status](https://travis-ci.org/DDMAL/diva.js.svg?branch=master)](http://travis-ci.org/DDMAL/diva.js)
=========================================

Diva.js (Document Image Viewer with AJAX) is a JavaScript book image viewer designed to present multi-page documents at multiple resolutions.

Version 6.0 contains many new features and improvements:

- Complete re-organization of the source code. Diva has been largely rewritten to ES6. We also use WebPack, Karma, and Mocha (with Chai). This makes both the development process and code debugging much easier.
- Complete removal of external dependencies, namely JQuery. 
- The metadata plugin. 
- New plugins can now be easily hooked as toolbar plugins, instead of page-tool plugins.
- Compatibility with IIIF version 3 image manifests. 

## Overview

There are two components to a functioning Diva system:

1. **[A IIIF Manifest](https://iiif.io/)** that will be displayed.
2. **The Diva.js plugin.** The embedded web application that displays the images in a browser.

### Details

#### Using IIIF
Diva.js is an image viewing client compatible with version 2.0 (and now 3.0) of the IIIF [Image](http://iiif.io/api/image/2.0/) and [Presentation](http://iiif.io/api/presentation/2.0/) APIs. Simply supply the path to a valid IIIF Manifest and Diva will display the document as described by the metadata (see [Installing](#installing)).

## Installing

### From a CDN (hosted)

If you wish to skip downloading the full Diva.js release and prefer to use a CDN, simply paste the following tags into the `<head>` of any webpage to include all the files necessary to use Diva.js.
```javascript
<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/diva.js/6.0.0/css/diva.css" />
<script src="//cdnjs.cloudflare.com/ajax/libs/diva.js/6.0.0/js/diva.js"></script>
```
### Locally (release package)

Download the [latest release](https://github.com/DDMAL/diva.js/releases) of Diva. In the `diva.js` directory you can find a pre-compiled version. The `css` and `js` directories contain the files necessary to use Diva. Simply include `build/diva.css` and `build/diva.js` in the `<head>` of your webpage, as shown in the HTML source of the example [index page](https://github.com/DDMAL/diva.js/blob/develop/index.html). 

### Basic setup

After including the necessary files, the most basic Diva viewer is instantiated with one (IIIF) required parameter (by targeting a parent div, in this case diva-wrapper):
```html
<div id="diva-wrapper"></div>

<script>
    let diva = new Diva('diva-wrapper', {
        objectData: "http://www.example.com/beromunster.json"
        // possible settings
    });
</script>
```
 * `objectData`: The URL (absolute or relative) to the document's `.json` file, or a IIIF Manifest

The `diva-wrapper` selector points to a `div` element within which the document viewer will appear.

There are a large number of settings that can be enabled/disabled for this Diva instance. See [Settings](https://github.com/DDMAL/diva.js/wiki/Settings) for a comprehensive list.

See [Installation](https://github.com/DDMAL/diva.js/wiki/Installation) for full instructions.

### Running the Demos

Running the demos works best using a web server. The easiest is to use Python to start a small web server in the `diva.js` directory (or `build` if you have the source code):

```bash
$> cd diva-v6.0.0/diva.js/ # (or cd diva.js/build)
$> python -m SimpleHTTPServer
Serving HTTP on 0.0.0.0 port 8000 ...
```
You may then load the demos in your web browser by visiting `http://localhost:8000` in your browser.

## Building from source

If you wish to install from source, first you must install [node.js and npm](https://nodejs.org/en/). Then, check out the code from [our GitHub repository](http://github.com/DDMAL/diva.js) or run `npm install diva.js`. Once you've obtained the code, change to the project directory and run `npm install` to fetch all development dependencies.

The full installation gives you access to the un-minified JavaScript source, the plugins, the documentation, and our unit-tests. 

```javascript
npm run develop          // Runs a server at localhost:9001 and automatically builds and reloads upon changes
npm run build:develop    // Compiles the Javascript and SASS source and places it in the build/ directory
npm run lint             // Lints the Javascript source with JSHint
npm test                 // Runs the unit tests and outputs a report to the console
npm run build:production // Builds the release package
```

Run `npm run develop` and navigate to [http://localhost:9001](http://localhost:9001) in your web browser to see a basic Diva instance.

See [Installation](https://github.com/DDMAL/diva.js/wiki/Installation) for more information.

## Getting help

Help for Diva.js is available through this repository's [wiki](https://github.com/DDMAL/diva.js/wiki), in the form of code documentation, installation instructions and usage tips. You can also [submit an issue](https://github.com/DDMAL/diva.js/issues)!

## Cross-site Requests

You may receive an error that looks something like this:

```
XMLHttpRequest cannot load http://example.com/demo/imagefiles.json. No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'http://localhost:8000' is therefore not allowed access.
```

This is a security precaution that all browsers use to prevent cross-site request forgeries. If you receive this message it is because your `objectData` parameter and the server used to serve the Diva page are not at the same server address.

To fix this you must ensure that the Diva HTML page, and the location pointed to by the `objectData` page are being served by the same server, or you must create an exception using the `Access-Control-Allow-Origin` header on your server to explicitly white-list the `objectData` location.

Let Us Know
-----------

We're developing Diva.js as part of our research in [Distributed Digital Music Libraries](http://ddmal.music.mcgill.ca). If you use it in your project, it would be great if you could [let us know](mailto:andrew.hankinson@mail.mcgill.ca).