* **Parameters**: 2
    * **pageIndex**: the index of the initial page we want to show
    * **direction**: the direction in which we are scrolling (positive for
      downward scroll, negative for upward scroll
* **Return type**: none
* **Called by**: [`attemptPageShow()`](#attemptPageShow) (recursive),
  [`adjustPages()`](#adjustPages)

Recursively attempts to load the next page that hasn't yet been loaded, based
on the direction of scroll. Once it hits a page that is beyond the viewport in
the wrong direction (meaning that no subsequent pages could be within the
viewport), it stops.
