* **Parameters**: 0
* **Return type**: none
* **Called by**: [`loadViewer()`](#loadViewer), [`handleZoom`](#handleZoom)

This is called every time we need to reload the pages while in document view
(e.g. after a zoom event, or changing mode, or resizing the window). Takes care
of clearing the viewer, calculating padding and other dimensions, loading the
first few pages, executing any zoom-related callbacks and scrolling to the
correct page afterwards.
