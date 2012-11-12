* **Parameters**: 1
  * **pageIndex**: the page index whose validity we want to check
* **Return type**: boolean
* **Called by**: [`attemptPageShow()`](#attemptPageShow),
  [`attemptPageHide()`](#attemptPageHide), [`loadRow()`](#loadRow),
  [`createToolbar()`](#createToolbar), [`setupViewer()`](#setupViewer),
  [`this.gotoPage()`](#this.gotoPage),
  [`this.gotoPageByName()`](#this.gotoPageByName),
  [`this.setState()`](#this.setState)

Returns true if the page index is valid (between 0, inclusive, and the number
of pages, exclusive).
