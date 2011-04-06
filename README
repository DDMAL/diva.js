WHAT IS THIS?
-------------
Diva (Document Image Viewer with AJAX(?)) is a javascript frontend for viewing documents, originally created for the purpose of viewing large scanned musical documents using one's web browser. It uses the jQuery Javascript library, along with one jQuery plugin and the jQuery UI. This package also includes instructions on how to get the backend set up, which consists of an IIPImage server to serve the images, and a Django app to serve data regarding the images (a PHP alternative will be provided for those unable to run Django).

USAGE INSTRUCTIONS
------------------
1.	Go to a page with a document viewer serving up a specific document. [See here for an example.](example)
2.	To browse through the pages, simply scroll up or down, using the scrollbar or the scrollwheel on your mouse.
3.	To zoom in and out, move the slider to the left or right.
	*	If the page is currently centered in the viewport, it will attempt to preserve the centered area.
	*	If the page is not centered, it will attempt to keep the left edge in the same area.
4.	To zoom in on a specific part of the part, double-click that region.
	*	That region will then be centered in the viewport.
	*	To zoom out, simply hold the alt-key while double-clicking.
5. To go to a specific page, enter that page number in the text box, and press "Go".
	*	If that page does not exist in the document (i.e. greater than the number of pages, or below 1), it will error

SETUP AND INSTALLATION	
----------------------
*	A server with [IIPImage](http://iipimage.sourceforge.net/) installed will host and serve the images (i.e. the pages of the document)
	*	The images must be hosted on this server, in pyramidal TIFF format
*	Another server (it could be the same one) will serve JSON data (information about the images)
	*	By default, this will be through a [Django](http://www.djangoproject.com) application (already written)
	*	However, a PHP script to do the same is also provided if Django is not available
*	The javascript viewer, optimally located on the same server, will serve as the frontend
	* 	Through an AJAX call to the page serving JSON data, it will gather the information
	*	Then it will process the information and display the images
	*	There should probably be a different (dynamically-generated) page for each document you want to show
*	For a complete guide, see [installation](docs/INSTALL)

PROCESS
-------
This is a brief explanation of how the process works. For a more comprehensive overview of what exactly is happening when you request a document, see [process](docs/PROCESS).

1.	The user loads the document viewer page, with a specific document being requested (get/post var, or flat page).
2.	The viewer sends an AJAX request to a server (preferably on the same domain), with the desired document ID and the initial zoom level (2 by default).
3.	The server returns the JSON data ([see sample data here](docs/PROCESS#json-sample)).
4.	The viewer code than constructs the document viewer from the data, positioning the images as it sees fit.
5.	The images themselves are served by the IIPImage server, which can be on a different domain; IIPImage simply takes the pyramidal .tiff images hosted on the server and slices them into tiles, to improve loading speeds or something.
6.	Only pages that are near the viewport are loaded initially, but any time a user scrolls somewhere or attempts to go to a page, more will load as necessary.
7. If the user wants to zoom in or out, a new AJAX request is fired, with the new zoom level, and the images are reloaded again.

CODE DOCUMENTATION
------------------
If you need a more thorough explanation of the code than what's offered in the comments, check out the [code documentation](docs/CODE). There, you will find documentation on each function - parameters, return value, purpose, process, etc. See the next section for documentation on known bugs and issues to watch out for that will be relevant if you're going to be making any modifications to the code.

BUGS AND DEVELOPMENT NOTES
--------------------------
There are a few things that you may need to watch out for if you're going to be altering the code - strange workarounds that aren't fully explained in the comments, unexpected behaviour, straight-out bugs, etc. These have been documented as thoroughly as possible in the [development notes section](docs/DEVELOPMENT-NOTES).

FAQS
----
For answers to some frequently asked questions, see the [FAQs](docs/FAQS)