* **Parameters**: 1
  * **pageIndex**: the index of the page we want to check
* **Return type**: boolean
* **Called by**: [`attemptPageShow()`](#attemptPageShow),
  [`attemptPageHide()`](#attemptPageHide)

Checks if the bottom of a page is above the viewport. This is used when we're
scrolling through a document and we want to determine if we should keep looping
through the pages or if we've reached the last page that we need to show (or
hide).
