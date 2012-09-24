* **Parameters**: 3
    * **pageIndex**: the index of the page we wish to jump to
    * **verticalOffset**: the amount of vertical scroll, in pixels, from the
      top of the page to the location we wish to jump to
    * **horizontalOffset**: the amount of horizontal scroll, in pixels, from the
      horizontal centre of the page to the location we wish to jump to
* **Return type**: none
* **Called by**: [`documentScroll()`](#documentScroll),
  [`createToolbar`](#createToolbar) (in the submit handler for the "Go to page"
  form, if we're in document view), [`this.gotoPage()`](#this.gotoPage),
  [`this.gotoPageByName`](#this.gotoPageByName)

Jumps to the location specified by the vertical and horizontal offsets relative
to the desired page. Sets [`settings.currentPageIndex`](#MONKEY) to the index
of this page.
