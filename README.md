diva.js
=======

Diva.js (Document Image Viewer with AJAX) is a Javascript frontend for viewing documents, designed to work with digital libraries to present multi-page documents as a single, continuous item. Only the pages that are being viewed at any given time are actually shown to the user, with the rest appended as necessary, ensuring efficient memory usage and high loading speeds. It uses the jQuery Javascript library, along with one jQuery plugin and the jQuery UI. This package also includes instructions on how to get the backend set up, which consists of an IIPImage server to serve the images, and either a Django app or a PHP script to serve the image data.

Getting help
------------

For more information, including installation instructions, code documentation, and usage tips, see the [wiki](https://github.com/DDMAL/diva.js/wiki).

Roadmap/To-do list
------------------

*Orientation (horizontal/vertical)
*Better handling of interpage padding
*Timer for skipping scroll events when too frequent
*Go-to page function - should be faster
