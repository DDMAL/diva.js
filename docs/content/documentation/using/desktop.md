{% load extras %}

The diva.js viewer is best viewed on a desktop/laptop computer, using a modern
browser such as Google Chrome, Firefox, Safari, Opera, or Internet Explorer 9.
Other browsers/devices are supported as well, although certain functionality
may be limited or disabled; for more information on this subject, consult our
[browser support](../browser-support) page.

Below, you will find a comprehensive overview of the standard features of
diva.js, complete with usage instructions and screenshots.

For usage instructions on touch devices, such as the iPad or iPod touch, see
[mobile/tablet usage instructions](../mobile).

[TOC]

Basic navigation
----------------

The most basic functionality is the ability to navigate the document, by
scrolling through the pages or jumping to a particular page as desired.

### Scrolling with the mouse

Scrolling with the mouse can be accomplished using the scroll wheel on the
mouse or touchpad (if present), by dragging the scrollbar that appears within
the document viewer pane, or by clicking anywhere within the document viewer
and dragging it in the direction you want to move.

### Scrolling with the keyboard

You can use certain keys to scroll vertically through the document (although
they can be disabled for a particular viewer by the site administrator.) The
keys are:

* the "up" arrow key, to scroll up by a small amount
* the "down" arrow key, to scroll down by a small amount
* the "spacebar" key, to scroll down by a slightly greater amount (note that
  spacebar scrolling is disabled by default)
* the "page up" key, to scroll up by the height of the document viewer pane
* the "page down" key, to scroll down by the height of the document viewer
  pane (see the diagram below)
* the "home" key, to scroll to the very top of the document
* the "end" key, to scroll to the very bottom of the document

The diagram below illustrates the scroll amounts for the various keys:

{% docs_image "scroll-amounts" %}

Note that while the up, down, and spacebar keys only work if the focus of your
cursor is on the document viewer pane (e.g., if you most recently clicked
something within it or have used the scrollbar), the other keys work when your
focus is anywhere in the document.

At the present time, only vertical key-scrolling is supported.

### Jumping to a page

You can also jump to a specific page by typing in the number of the page into
the "Go" box near the top right corner, as indicated in the screenshot below:

{% docs_image "jumping-to-a-page" %}

Press the "Go" button or hit the enter key to jump to the entered page. If you
enter an invalid page number - for instance, something that is not a number,
or a number greater than the total number of pages, an alert box will pop up
informing you of the fact.

Fullscreen mode
---------------

To enter fullscreen mode, click the icon that appears at the top left corner
of the page:

{% docs_image "fullscreen-icon" %}

In some cases, the viewer will be integrated within a larger page and the icon
will appear at a different location, as in the following screenshot:

{% docs_image "integrated-fullscreen-icon" %}

This will result in the document viewer pane taking over the entire browser
window, as in the following screenshot:

{% docs_image "fullscreen-mode" %}

To exit fullscreen mode, simply click the same icon (in the top left corner)
again.

If the aforementioned icon does not appear at either of the expected locations,
then the site administrator has likely disabled the fullscreen icon
functionality. In this case, it should still be possible to activate fullscreen
mode by modifying the URL; see the 
[Manipulating the hash parameters](#manipulating-the-hash-parameters) section
for more information.

Grid view
---------

There are two different "views" in a standard diva.js installation: document
view, and grid view. Document view is usually the default view, and consists of
pages stacked on top of each other vertically:

{% docs_image "document-view" %}

Grid view, on the other hand, consists of 2 or more pages per row. To enter
grid view, click the icon near the top right of the viewer, to the left of the
link icon:

{% docs_image "grid-icon" %}

By default, the number of pages per row is adjustable via a slider in the top
left corner (although this functionality may be disabled for a particular
document). The standard range for this slider is 2 pages per row to 8 pages per
row, shown respectively in the following screenshots:

{% docs_image "grid-view-2" %}

{% docs_image "grid-view-8" %}

As with the fullscreen icon, if the grid icon does not show up, then it has
likely been disabled; however, it should still be possible to activate grid
view or change the number of pages per row by modifying the URL. See the
[Manipulating the hash parameters](#manipulating-the-hash-parameters) section
section for more information.

Sharing a link
--------------

### Grabbing the current URL

Sometimes, you'll want to link to a particular state of the document viewer so
that you can share it with someone else or post it somewhere. To facilitate it,
diva.js comes with a link feature that lets you grab the URL to what you're
currently looking at. If you're in document view, clicking on the link icon at
the top right of the document viewer pane will open a small window directly
underneath it, containing a link (illustrated in the screenshot below). Click
anywhere in the link field and the entire link will be selected, after which
you can copy it with CTRL+C.

{% docs_image "link-icon" %}

The link icon appears slightly differently in fullscreen mode:

{% docs_image "fullscreen-link-icon" %}

Anyone who accesses that link will be brought to a page identical (ignoring
differences in window size or browser/platform) to what you were viewing. If
you wish to test it, open a new tab or window and paste it in the URL bar.
You can also enter it in the URL bar for the current tab or window, but that
doesn't work in all browsers and if it does, may require you to presse tner
twice.

### Manipulating the URL hash parameters

Of course, using the link icon is not the only way to get the link to a given
view. You can also create a link yourself. For example, if the document viewer
is located at http://www.example.com/diva, and you wish to show a viewer in
grid view with 5 pages per row, you could construct the following URL:

```text
http://www.example.com/diva#g=true&n=5
```

Or, if you wanted to link to the viewer in fullscreen mode:

```text
http://www.example.com/diva#f=true
```

There are several other options you can set. The full list of hash parameters
is below:

* `f`: `true` or `false`. Controls fullscreen mode.
* `g`: `true` or `false`. Determines whether or not the user is in grid view.
* `z`: an integer between the minimum zoom level and the maximum zoom level,
  inclusive.
* `n`: an integer between the minimum number of pages per row and the maximum
  number of pages per row, inclusive.
* `i`: the filename of the page you wish to jump directly to. Note that this
  will only work if the site administrator has configured the viewer to take in
  a page filename as opposed to a page number. This is the default behaviour.
* `p`: the page number (starting from 1). Not always accepted; see above.
* `y`: the number of pixels that you wish to scroll, vertically, from the top
  of the current page. Can be any integer (positive or negative). A positive
  `y` value will result in downward scrolling, and a negative value will
  result in upward scrolling.
* `x`: the number of pixels that you wish to scroll, horizontally, from the
  default centred position. Can be any integer (positive or negative). A
  positive `x` value will result in scrolling to the right, and a negative
  value will result in scrolling to the left.

Note that if the value of a hash parameter is invalid (e.g., a negative number
for the zoom level, or something other than "true" or "false" for a boolean
parameter), then the value will be ignored and the document viewer will fall
back on the default value as set by the site administrator.

Using the plugins
-----------------

By default, diva.js ships with two enabled plugins, which you can activate by
clicking on the relevant icon near the top left corner of every page. To learn
how to use any of the plugins that ship with diva.js by default, see the
[plugin documentation](../plugins).
