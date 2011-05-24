diva.js - Document Image Viewer with AJAX
=========================================

Description
-----------

Diva.js (Document Image Viewer with AJAX) is a Javascript frontend for viewing documents, designed to work with digital libraries to present multi-page documents as a single, continuous item. Only the pages that are being viewed at any given time are actually present in the document, with the rest appended as necessary, ensuring efficient memory usage and high loading speeds. Written as a jQuery plugin, diva.js requires the jQuery Javascript library, along with several jQuery plugins and the jQuery UI, all of which are included. On the backend, the images will be served by [IIPImage server](http://iipimage.sourceforge.net) after processing, and the image information will be sent, in JSON format, through an AJAX request by a PHP script (also included).

Installation and setup
----------------------

Setting up the document viewer comes in two parts: the jQuery plugin on the frontend, and the tile image server and PHP script on the backend.

### Setting up the frontend ###

Download the contents of this repository, using `git clone git://github.com/DDMAL/diva.js.git`, or downloading the [zip](https://github.com/DDMAL/diva.js/zipball/master) or [compressed tar](https://github.com/DDMAL/diva.js/zipball/master) packages. The included `example.html` file gives an example of how the document viewer can set up. For more, see [Setup and installation - Configuring the frontend](https://github.com/DDMAL/diva.js/wiki/Installation#configuring-the-frontend).

### Setting up the backend ###

Setting up the backend requires access to a server capable of running IIPImage as well as PHP. For more, see [Setup and installation - Setting up the backend](https://github.com/DDMAL/diva.js/wiki/Installion#setting-up-the-backend).

Getting help
------------

Help for diva.js is available through this repository's [wiki](https://github.com/DDMAL/diva.js/wiki), in the form of code documentation, installation instructions and usage tips.

Let Us Know
-----------

We're developing Diva.js as part of our research in [Distributed Digital Music Libraries](http://ddmal.music.mcgill.ca). If you use it in your project, it would be great if you could [let us know](andrew.hankinson@mail.mcgill.ca).
