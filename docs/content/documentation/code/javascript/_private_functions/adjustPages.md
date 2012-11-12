* **Parameters**: 1
    * **direction**: the direction in which we are scrolling (positive for
      downward scroll, negative for upward scroll)
* **Return type**: none
* **Called by**: [`handleDocumentScroll()`](#handleDocumentScroll)

Takes care of showing and hiding the necessary pages when a user scrolls
throught the document by calling [`attemptPageHide()`](#attemptPageHide) and
[`attemptPageShow()`](#attemptPageShow) as necessary.

