{% load extras %}

* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleEvents()`](#handleEvents) (within the event handler
  for the `resize` event on the window, when in fullscreen mode)

Updates {% settings_link "panelHeight" %} and {% settings_link "panelWidth" %}
depending on the height and width (minus the scrollbar) of the window, when the
user is in fullscreen mode.
