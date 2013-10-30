* **Parameters**: 0
* **Return type**: none
* **Called by**: [`loadViewer()`](#loadViewer), [`handleGrid`](#handleGrid)

This is called every time we need to reload the pages while in grid view
(e.g. after a zoom event, or changing mode, or resizing the window). Takes care
of clearing the viewer, calculating padding- and row-related dimensions,
loading the first few rows, and scrolling to the correct row afterwards.
