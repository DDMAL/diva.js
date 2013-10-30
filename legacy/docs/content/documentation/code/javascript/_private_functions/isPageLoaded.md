* **Parameters**: 1
  * **pageIndex**: the index of the page whose presence we want to check
* **Return type**: boolean
* **Called by**: [`loadPage()`](#loadPage)

Checks if a page is present in the DOM (i.e. if there is a div with the id
`?-diva-page-#` where ? is the number of the document viewer and # is
`pageIndex`). Used to prevent a page from being inserted multiple times.
