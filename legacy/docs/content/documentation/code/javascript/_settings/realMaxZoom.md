This is assigned the value of `max_zoom` as returned by the divaserve script.
This is necessary in cases where [`settings.maxZoomLevel`](#maxZoomLevel) is
set to something less than the true maximum zoom level of the document. In that
case, the user should be limited to the maximum zoom level specified by the
site administrator, but the true maximum zoom level of the document is still
needed for calculating the zoom level to pass to IIPImage for each individual
image.
