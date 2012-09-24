* **Parameters**: 1
    * **direction**: the direction of scroll (+1 for downwards scroll, -1 for
      upwards scroll)
* **Return type**: boolean
* **Called by**: [`setCurrentPage()`](#setCurrentPage) (recursive),
  [`adjustPages()`](#adjustPages)

Updates [`settings.currentPageIndex`](#MONKEY). The new "current" page is
determined based on the following algorithm: if the user is scrolling up, and
the current page is below the middle of the viewport, then we take the
previous page to be the new current page. If the user is scrolling down, and
the current page is below the middle of the viewport, then we take the next
page to be the new current page. This is then repeated recursively until we no
longer need to change the current page.
