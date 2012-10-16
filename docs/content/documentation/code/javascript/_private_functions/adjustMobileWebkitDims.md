{% load extras %}

* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleEvents()`](#handleEvents) (within the event handler
  for the `orientationchange` event on the body),
  [`setupViewer()`](#setupViewer) (in the `success` callback function)

Changes the dimensions of the document viewer pane based on the dimensions of
the window for mobile devices. This adjustment is performed following the
initial load, and again whenever the orientation of the device is changed.

To disable this automatic resizing for either width or height, set
{% settings_link "enableAutoHeight" %} or {% settings_link "enableAutoWidth" %}
to false, respectively.
