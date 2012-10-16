{% load extras %}

* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleModeChange()`](#handleModeChange),
  [`handleViewChange()`](#handleViewChange), [`handleEvents()`](#handleEvents)
  (in the event handler for the `orientationchange` event, triggered when
  rotating a touch device, and in the event handler for the window resizing),
  [`setupViewer()`](#setupViewer), [`this.setState`](#this.setState),
  [`this.resize`](#this.resize)

Shortcut function to load either grid view or document view depending on the
value of {% settings_link "inGrid" %}.
