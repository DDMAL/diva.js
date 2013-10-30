* **Parameters**: 1
  * **pageIndex**: the index of the page we want to load
* **Return type**: none
* **Called by**: [`attemptPageShow()`](#attemptPageShow),
  [`adjustPages()`](#adjustPages), [`loadDocument()`](#loadDocument)

If a page is not present in the DOM (as determined by
[`isPageLoaded()`](#isPageLoaded)), then this function will create a div for
the page and load all of its tiles that are in the viewport (or near it - see
[`settings.viewportMargin`](#viewportMargin)). The div for the page is
appended first, and the tiles are appended after a timeout (specified in
[`settings.pageLoadTimeout`](#pageLoadTimeout) to prevent excessive
unnecessary tile loading when scrolling quickly through the document.

If a page has already been inserted into the DOM (as determined by
[`isPageLoaded()`](#isPageLoaded)) but not all of its tiles have been loaded,
then this function will attempt to load the remaining tiles (depending on
whether or not they are in or near the viewport).
