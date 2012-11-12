{% load extras %}

diva.js currently supports a limited variety of touch devices, most notably
the iPad. The viewer has also been tested on Android, the iPhone, and the iPod
Touch, and may work on other devices as well. On all touch devices, performance
is likely to be worse than on desktop computers, due to hardware limitations.

Below, you will find some usage tips for touch devices. All of the features
below have been tested on the second generation iPad, but may not be fully
supported on other devices. If you've been able to test out the viewer on
other devices, please [let us know](mailto:andrew.hankinson@mail.mcgill.ca)!

The following features behave more or less the same on touch devices and
desktop computers: toggling fullscreen mode, toggling grid view, linking,
and the "go to page" feature for jumping to a specific page. Zooming by
double-clicking, scrolling using the scrollbar, and scrolling using specific
keys are not supported.

[TOC]

Pinch zooming
-------------

To zoom in or out, use two fingers to initiate the "pinch-to-zoom" gesture,
by bringing your fingers closer together to zoom in or moving them apart to
zoom out, as shown in the following diagram ([source](http://commons.wikimedia.org/wiki/File:Pinch_zoom.png)):

{% docs_image "pinch-zoom" %}

You can do this anywhere on the page. Note that the default action
of zooming in on the _entire_ page (for Apple touch devices, and possibly
others) as a result of this gesture is disabled.

You can also zoom in and out using the zoom slider when in document view.

One-finger scroll
-----------------

To scroll through the document viewer, simply flick upward or downward with
one finger (with the finger starting within the document viewer pane) to
scroll up or down, respectively. There is limited inertial scrolling support,
meaning that you will continue to scroll for a short period of time after
you have finished the flick gesture.

If you wish to go to a specific page, just the "go to page" feature as you
would on a desktop computer.

Adding the page to the home screen on iOS
-----------------------------------------

If you wish to be able to access a page more easily on an Apple touch device,
you can add an icon for it to your home screen. There should be a button next
to the URL bar that, when pressed, gives you the option to "Add to Home
Screen". Select that option, and give it a suitable name. You should now be
able to quickly access the viewer from the home screen of your touch device
simply by tapping on its icon. You don't need to load up Safari, and indeed,
when the page is loaded, it looks less like a webpage and more like a native
application. All the features that were available in the regular view are
still available in this view.

Rotating the device
-------------------

If you change the orientation of the device (from portrait to landscape or
vice-versa) then the document viewer pane will resize to fill the available
space. This behaviour may be disabled for a particular viewer, which is useful
when there are other elements on the page and the viewer needs to be a fixed
width or height.

Limitations to the canvas plugin
--------------------------------

Due to resource constraints on touch devices, there are some limitations to
use of the canvas plugin. It is not possible to zoom in beyond the third
zoom level (level 3). This is due to a hard limit that Apple has imposed
on devices with 256 MB of RAM or more (e.g., the iPad, all generations) - the
maximum size of a canvas element is 5 megapixels, and 2 is the greatest zoom
level for which no image would result in a canvas element exceeding 5
megapixels. 

For devices with less than 256 MB of RAM, the limit is even less - 3
megapixels. Luckily, a maximum zoom level of 2 is still fine, as such an image
would result in a canvas element of 2 megapixels, well under the limit.

Other canvas functionality should be present, although it may take longer
to load or adjust an image than it would on a desktop computer. Additionally,
inertial scrolling is enabled.
