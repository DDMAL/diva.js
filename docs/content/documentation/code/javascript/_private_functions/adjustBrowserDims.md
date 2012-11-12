{% load extras %}

* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleEvents()`](#handleEvents) (within the event handler
  for the `resize` event on the window, when not in fullscreen mode),
  [`setupViewer()`](#setupViewer) (in the `success` callback function)

Changes the dimensions of the document viewer pane based on the dimensions of
the window, for non-mobile devices (e.g., desktop computers). This adjustment
is performed following the initial load, and again whenever the window is
resized (and the user is not in fullscreen mode).

To disable this automatic resizing for either width or height, set
{% settings_link "enableAutoHeight" %} or {% settings_link "enableAutoWidth" %}
to false, respectively.
