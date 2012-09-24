* **Parameters**: 1
    * **zoomLevel**: the desired zoom level
* **Return type**: boolean
* **Called by**: [`handleDocumentDoubleClick()`](#handleDocumentDoubleClick),
  [`handlePinchZoom()`](#handlePinchZoom), [`createToolbar()`](#createToolbar)
  (within the `slide` and `change` event handlers for the zoom slider),
  [`this.setZoomLevel()`](#this.setZoomLevel)

Called when we're already in document view and we need to change the zoom
level.

Takes care of validating the desired zoom level, updating
[`settings.oldZoomLevel`](#MONKEY) and [`settings.zoomLevel`](#MONKEY),
updating the slider, and loading the document at the desired zoom level.

If the desired zoom level is invalid, this function returns `false`; otherwise,
it returns `true`.
