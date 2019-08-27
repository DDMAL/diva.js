<p align="center">
  <a href="http://ddmal.github.io/diva.js">
    <img width="382" height="191" src="https://github.com/DDMAL/diva.js/wiki/img/diva-logo-sm.png" />
  </a>
</p>

Diva.js [![Build Status](https://travis-ci.org/DDMAL/diva.js.svg?branch=master)](http://travis-ci.org/DDMAL/diva.js)
=========================================

Diva.js (Document Image Viewer with AJAX) is a JavaScript book image viewer designed to present multi-page documents at multiple resolutions.

Version 6.0 contains many new features and improvements:

- **Compatibility with IIIF Presentation API version 2.1 and 3**.
- **Small footprint, zero dependencies**. Can be deployed with just a JavaScript and a CSS file.
- **Rewritten in ES6** for compatibility with the new JavaScript module system.
- **New plugins**: Metadata, Image Manipulation

## Overview

There are two components to a functioning Diva system:

1. **[A IIIF Manifest](https://iiif.io/)** that will be displayed.
2. **The Diva.js plugin.** The embedded web application that displays the images in a browser.

### Details

#### Using IIIF
Diva.js is an image viewer compatible with IIIF Presentation API versions [2](http://iiif.io/api/presentation/2.0/) and [3](http://iiif.io/api/presentation/3.0/). Simply supply the path to a valid IIIF Manifest and Diva will display the document as described by the metadata (see [Installing](#installing)).

## Installing

### From a CDN (hosted)

If you prefer to use a hosted version of Diva, copy and paste the following into the `<head>` of any webpage to 
include all the files necessary to use Diva.js.
```html
<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/diva.js/6.0.2/css/diva.css" />
<script src="//cdnjs.cloudflare.com/ajax/libs/diva.js/6.0.2/js/diva.js"></script>
```
### Locally (release package)

Download the [latest release](https://github.com/DDMAL/diva.js/releases) of Diva. In the `diva.js` directory you can
find a pre-compiled version. The `build` directory contains the files necessary 
to use Diva. Simply include `build/diva.css` and `build/diva.js` in the `<head>`
of your webpage, as shown in the HTML source of the example [index page](https://github.com/DDMAL/diva.js/blob/develop/index.html). 

### From npm

You can also run `npm install diva.js` in order to install Diva as a node package. Then, Diva will be located 
under `node_modules/diva.js/`, and you can access the `build` directory the same as above. 

## Basic setup
### HTML
After including the necessary files, the most basic Diva viewer is instantiated with one (IIIF) required parameter
and several optional settings parameters. Diva must target a parent div, in this case diva-wrapper:
```html
<div id="diva-wrapper"></div>

<script>
    let diva = new Diva('diva-wrapper', {
        objectData: "http://www.example.com/manifest.json"
        // possible settings
    });
</script>
```
 * `objectData`: The URL (absolute or relative) to the document's `.json` file, or a IIIF Manifest

The `diva-wrapper` selector points to a `div` element within which the document viewer will appear.

### JavaScript
If you wish to include the Diva viewer component into your own JavaScript app, this can be done easily by just importing Diva beforehand. 
```javascript
import Diva from './path/to/source/diva.js';

let diva = new Diva('diva-wrapper', {
    objectData: "http://www.example.com/manifest.json"
    // possible settings
});
```

There are a large number of settings that can be enabled/disabled for this Diva instance. See [Settings](https://github.com/DDMAL/diva.js/wiki/Settings) for a comprehensive list.

See [Installation](https://github.com/DDMAL/diva.js/wiki/Installation) for full instructions.

## Building from source

If you wish to install from source, first you must install [node.js and npm](https://nodejs.org/en/). Then, check out the code from [our GitHub repository](http://github.com/DDMAL/diva.js). Once you've obtained the code, change to the project directory and run `npm install` to fetch all development dependencies.

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
