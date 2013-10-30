* **Parameters**: 1
    * **event**: the jQuery event object for the pinch-zoom (`gestureend`)
      event
* **Return type**: none
* **Called by**: [`handleEvents()`](#handleEvents) (within the event handler
  for `gestureend`)

Handles pinch-zooming on mobile devices. If the gesture appears to be a zoom-in
event, a zoom-in level will be triggered; if it appears to be a zoom-out event,
a zoom-out event will be triggered (for a difference of one zoom level). If the
user is initially in grid mode, a pinch-zoom event will cause the viewer to
enter document view.
