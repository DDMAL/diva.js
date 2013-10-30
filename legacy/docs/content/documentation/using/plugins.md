{% load extras %}

diva.js comes with two plugins that are enabled by default. Each plugin adds a
small icon to the top left of every page in document view which, when clicked, 
activates the plugin:

{% docs_image "plugin-icons" %}

These icons are for the canvas plugin and the download plugin respectively. You
can find an explanation of what they do below. Note that one or both may be
disabled for a particular document viewer, or could be configured with
different settings. Instructions on configuring the default plugins is
available [here](../customising/configuring-plugins).

Additionally, site administrators can create custom plugins. More information
on that is available [here](../../customising/writing-plugins).

[TOC]

The canvas plugin
-----------------

{% docs_image "canvas-icon" %}

This plugin provides a way to perform basic image manipulation. Clicking on the
icon will open a pane that takes over the browser window (in a similar manner
to fullscreen mode). On the left side of the screen is a small "tools" window
containing a miniature preview of the image and several sliders that can adjust
to modify the image.

The sliders you can adjust are as follows:

* Contrast. Default range: -1.00 to 3.00. Initial value: 1.00.
* Brightness. Default range: -100 to 150. Initial value: 0.
* Rotation (clockwise). Default range: 0 to 359&deg;. Initial value: 0&deg;.
* Zoom level. Default range: the minimum zoom level to the maximum zoom level
  (less on touch devices; see the last paragraph). Initial value: the current
  zoom level.
* Red channel (the amount of red in the image). Default range: -50 to 50.
  Initial value: 0. A negative value results in an image that contains more
  teal.
* Green channel. Default range: -50 to 50. Initial value: 0. A negative value
  results in an image that is more magenta.
* Blue channel. Default range: -50 to 50. Initial value: 0. A negative value
  results in an image that is more yellow.

To adjust a particular slider, click on the relevant icon. When you move the
slider, the preview image will be updated immediately, but the larger image is
only updated when you click the "Apply" button, for performance reasons. For
especially large images, applying changes can take a very long time (locking
the browser in the process), so it's a good idea to be cautious about viewing
images at high zoom levels, especially if you're on a low-powered computer.

To navigate the image, you can click-and-drag (one-finger scroll on a touch
device), use the scroll wheel or scrollbars, or click on the preview (the blue
box shows you where you currently are). You can see a screenshot of this
feature in action below.

{% docs_image "canvas-demo" %}

diva.js will remember any changes you've applied, so that the next time you
activate this plugin for the same image, the changes that you last applied will
be reapplied. You can tell if a page has had changes applied to it by looking
at the colour of the plugin icon in document view &mdash; if it is blue, then
changes have been applied:

{% docs_image "modified-canvas-icon" %}

To restore the default view and tell diva.js to stop remembering your changes,
simply click "Reset all" then "Apply". Note that diva.js can only remember
changes that you've made with the same computer and browser that you are
currently using, and while it does persist between browser/computer restarts
you can force it to forget any stored changes by clearing your localStorage.

This plugin will work in all browsers that support the HTML5 `canvas` element,
including IE9+, Firefox 2+, Safari 3.1+, Chrome 4+, and Opera 9+.

If you are viewing the plugin on a touch device (e.g., an iPad), then there are
some limitations to using this plugin due to hardware constraints. More
on that is available [here](../mobile#limitations-to-the-canvas-plugin).

The download plugin
-------------------

{% docs_image "download-icon" %}

This plugin allows you to download an image for the page, at the current zoom
level, in JPEG format. Click on the icon and a new tab or window will be
opened to a page containing only the image. To download it to your computer,
right-click the image and save it.
