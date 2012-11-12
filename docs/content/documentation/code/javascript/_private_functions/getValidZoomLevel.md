{% load extras %}

* **Parameter**: 1
    * **zoomLevel**: a zoom level that may or may not be valid
* **Return type**: integer
* **Called by**: [`loadDocument()`](#loadDocument),
  [`handleZoom()`](#handleZoom)

If the argument is a valid zoom level, then it returns that zoom level;
otherwise, it returns {% settings_link "minZoomLevel" %}.
