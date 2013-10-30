* **Parameters**: 2
    * **pageIndex**: the index of the page to get data about
    * **attribute**: the name of the attribute, as returned by the divaserve
      script. Limited to the attributes that depend on the current zoom level
      [`settings.zoomLevel`](#zoomLevel): `c` (number of columns), `r` (number
      of rows), `h` (height), `w` (width).
* **Return type**: integer of float (depending on the requested attribute, and
  which divaserve script is used)
* **Called by**: [`isPageVisible()`](#isPageVisible),
  [`loadPage()`](#loadPage), [`pageAboveViewport()`](#pageAboveViewport),
  [`loadoadRow()`](#loadRow), [`setCurrentPage()`](#setCurrentPage),
  [`loadDocument()`](#loadDocument),
  [`handleModeChange()`](#handleModeChange)

A shortcut for accessing
`settings.pages[pageIndex]['d'][settings.zoomLevel][attribute]`.
