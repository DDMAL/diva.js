* **Parameters**: 0
* **Return type**: object
* **Called by**: [`getURLHash()`](#getURLHash),
  [`this.getState()`](#this.getState)

Returns an object indicating the state of the document viewer. This is used
primarily for building the URL hash (shown when clicking the link icon). The
state object returned by this function (via {% public_link "getState" %} can be
passed to [`this.setState`](#this.setState) for another diva.js instance in
order to synchronise two viewers.

The "state" object has the following key-value pairs:

* `f`: true or false (whether or not it's in fullscreen mode)
* `g`: true or false (whether or not it's in grid view)
* `z`: current zoom level (e.g., 2)
* `n`: current number of pages  per row (e.g., 5)
* `i`: if {% settings_link "enableFilename" %} is set, the filename of the
  current page; otherwise, false
* `p`: if {% settings_link "enableFilename" %} is false, the number (1-indexed)
  of the current page; otherwise, false
* `y`: if not in grid view, the vertical offset from the current page (see
  {% private_link "getYOffset" %}); otherwise, false
* `x`: if not in grid view, the horizontal offset from the current page (see
  {% private_link "getXOffset" %}); otherwise, false
* `h`: if not in fullscreen mode, the height of the view; else, false
* `w`: if not in fullscreen mode, the width of the viewer; else, false
