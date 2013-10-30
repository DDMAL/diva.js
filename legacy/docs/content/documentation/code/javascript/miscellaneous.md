Here are some Javascript development notes that didn't really fit in any other
section.

[TOC]

## Asynchronicity

As is obvious from the name, AJAX requests are asynchronous. That means that
anything that depends on the request being complete has to be put in the
success callback function. For instance, if one wanted to append something to
the document (e.g. put an image at the very end of the document) it would have
to be put in the success function, probably near the end. If one were to do
something like this

```javascript
someAjaxRequest();
doSomethingAfterAjaxRequest(); // doesn't really happen after it
```

then `doSomethingAfterAjaxRequest()` will probably (though not always,
depending on how long the previous method takes) be executed before the AJAX
request is even complete, which is not the intended behaviour. Instead, one
could do this:

```javascript
var someAjaxRequest = function(zoomLevel) {
    $.ajax({
        // ...
        success: function(data) { // success callback function
            // ...
            doSomethingAfterAjaxRequest(); // really!
        }
    });
};
```

## The Javascript console

The console is a great developer's tool &mdash; just do

```javascript
console.log("Testing to see if this prints out");
```

to print debugging statements as you would in other languages. However, some
browsers that don't have a console (e.g., some older versions of Firefox
when Firebug is not opened) may refuse to run the Javascript at all if
`console` is referenced, so make sure console is opened if you're doing any
debugging (and delete references to it when you're done). This might seem
obvious, but it's easy to forget.

## Extending the jQuery namespace

In order to write individual methods for diva.js without having to either
pollute jQuery's plugin namespace or accept method calls through the first
parameter of the plugin call, a template from [Virgen Technologies - Building
an Object-Oriented jQuery
plugin](http://www.virgentech.com/blog/2009/10/building-object-oriented-jquery-plugin.html)
was used. This way, the methods and variables are not global, but are still
easily accessible. See the link for more information.

## Maximum zoom level calculations

Each document is tied to a specific maximum zoom level. This "maximum" zoom
level actually corresponds to the lowest maximum zoom level among all the pages
in the document, and it is this value that is used for calculating dimensions
at a particular zoom level. This is necessary to prevent zooming in more than
is actually possible based on the number of zoom levels of a particular page.
This is important to keep in mind when modifying the PHP script or porting it
to another language/environment.

Furthermore, although pre-release versions of the document viewer required the
user to determine and input the maximum zoom level of a document, later
versions incorporated this maximum zoom level directly into the JSON data,
without any action on the part of the user necessary. However, to avoid sizing
issues in documents whose pages do not all have the same maximum zoom level, it
was necessary to determine, within `divaserve.php`, the maximum zoom level of
each page and output that in the JSON response. This fact may be relevant in
terms of support for other tile image formats or processing libraries, as the
VIPS library has a fairly specific way of calculating the number of zoom levels
- based on the dimensions of the image and the tile size - while other
  libraries or formats may use different formulae. Currently, `divaserve.php`
assumes that the images are being processed using the VIPS library. In later
versions, we may add a layer of abstraction and increase the number of
processing libraries supported, but for now it is recommended to use VIPS.

## The same-origin policy for AJAX requests

In general, the AJAX request needs to be made within the same domain. For
instance, if your document viewer is located at
`http://www.yourdomain.com/viewer.php`, then the JSON-outputting script must
also be on the `http://www.yourdomain.com` domain, and on the same port. There
are, however, workarounds for this. For instance, the use of proxy_pass (within
your webserver) to proxy all requests for a certain URI (for example, `/php/`,
or `divaserve.php`) to a different domain should generally work.

For instance, let's say you have your document viewer on one server, and both
IIPImage and divaserve.php on another server, and you want to proxy all
requests for `divaserve.php` to that other server. (It's necessary to have the
PHP script and the images located on the same server physically, although they
can be on different ports or subdomains.) In an nginx configuration file, this
could be done as follows:

```nginx
server {
    listen 123.456.78.90:80;
    server_name yourdomain.com;
    # ...
    location /divaserve.php {
        proxy_pass http://www.yourotherdomain.com/divaserve.php;
    }
    # ...
}
```

This will probably not be necessary, but if you can't put the PHP script and
the document viewer frontend on the same domain for any reason then this may be
useful. Other workarounds are possible as well, but this is the recommended one
as there is no significant drop in speed. The use of a JSONP callback was also
considered but then dropped because it led to truncating data, which broke the
viewer. 

## Virtual rendering

The first versions of diva.js worked like this: all the pages were loaded
initially, but as blank images, and were only replaced with the actual tiles
once they entered the viewport. However, not only did this result in an initial
load time of several seconds, it also made scrolling fairly slow, especially
once a large portion of the document had been loaded in the browser's memory.
In the search for alternatives, I came across
[SlickGrid](https://github.com/mleibman/SlickGrid), whose  implementation of
virtual rendering resulted in an extremely fast way to page through large
datasets, and managed to implement a similar technique in diva.js, whereby
pages that were scrolled out of the viewport are deleted from the DOM, and
pages that should be visible in the viewport are appended to it. This
considerably speeded up initial load time and scrolling speed, and resulted in
improved memory handling within the browser. Although the use of this technique
should not affect ordinary installation and usage, the knowledge that it is
being used might be important should it be necessary to make any edits to the
appending/deleting functions. See [[Code documentation]] for more.

## loadRow image sizing

When requesting images for grid mode within `loadRow`, images are requested at
a particular height, and the full image is always returned, instead of
disparate tiles (as in loadPage). However, the height of the images returned by
iipImage is often one or two pixels less than the requested height. This
results in an unseemly white border along the bottom and right edges. To
counter this, the requested height is 2 pixels greater than it should be, which
should result in an image that may be cut off vertically by a few pixels but
which will not be too short to fill the container. This appears to be an issue
with iipImage and the way image dimensions are calculated, so this workaround
will have to do for now.

## The dragScrollable plugin

To make only the selected element drag-scrollable, set `acceptPropagatedEvents`
to false; otherwise, if you want all children of that element (the images, for
instance) to be drag-scrollable as well, set `acceptPropagatedEvents` to true.
Typically, it will be set to true.

## Data sent by the diva data server

The following data is returned through each AJAX request:

* `item_title`: The title of the document, as derived from the image
  directory name. The title is derived by substituting spaces for hyphens
  and then applying title case. For example, 

```text
this-is-an-image-directory-name
```

  would result in a title of `This Is An Image Directory Name`.

* `dims`: An array holding information related to the dimensions of the
  document. Contains the following information:
    * `a_hei`: The average height of all the images. This is used for
      calculating the vertical padding if [`settings.adaptivePadding`](Code
      documentation#adaptivePadding) is enabled.
    * `a_wid`: The average width of all the images. This is used for
      calculating the horizontal padding if
      [`settings.adaptivePadding`](Code documentation#adaptivePadding) is
      enabled.
    * `mx_h`: The maximum height among all the images. Not actually used at
      the moment.
    * `mx_w`: The maximum width among all the images. Necessary for
      calculating left offsets for each page (i.e. left and right padding).
    * `t_hei`: The total height of all the images stacked together,
      vertically. Necessary for calculating the total height of the
      containing element.
    * `t_wid`: The total width of all the images stacked together,
      horizontally. Not used at the moment but will be used once there is an
      option to switch orientation.
* `max_zoom`: the lowest maximum zoom level among all the pages of the
  document. The usage of this variable is explained in [an above
section](#varying-max-zoom)
* `pgs`: An array holding the data for all the pages in the document. See
  the explanation for the `pages` array in the [code documentation](MONKEY)
  for more.

The contents of the `pgs` array should be sorted chronologically - based on
their filename - prior to the request, and returned in a sorted order, so that
the user doesn't have to wait for it to be dynamically sorted.

## Container IDs

In order to allow more than one document viewer on a single page, we use the
`$.generateId` plugin (included in `diva-utils.js`) to generate a prefix for
the IDs of the elements of the document viewer. The first document viewer
instantiated on the page will have an ID prefix of `1-diva-`, the second
`2-diva-`, and so on. You can find all the IDs on the wiki page for Setup and
installation, in [Configuring the frontend: The
CSS](Installation#frontend-css).

To target all instances of a specific type of element using CSS, you can use
`$=` (i.e., ends with). For example, to make the text within all title elements
grey, you could do something like this:
```css
div[id$=diva-title] {
    color: #CCC;
}
```
