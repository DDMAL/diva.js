* **Parameters**: 1
  * **pageIndex**: the index of the page whose visibility we want to check
* **Return type**: boolean
* **Called by**: [`loadPage()`](#loadPage),
  [`attemptPageShow()`](#attemptPageShow), [`adjustPages()`](#adjustPages),
  [`loadDocument()`](#loadDocument)

Returns true if the page is in or near the viewport (and thus should be
loaded).
