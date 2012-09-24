* **Parameters**: 2
    * **pageIndex**: the index of the initial page we want to hide 
    * **direction**: the direction in which we are scrolling (positive for
      downward scroll, negative for upward scroll
* **Return type**: none
* **Called by**: [`attemptPageHide()`](#attemptPageHide) (recursive),
  [`adjustPages()`](#adjustPages)

Recursively attempts to hide the next page that is present in the DOM but is
not within the viewport, based on the direction of scroll. 
