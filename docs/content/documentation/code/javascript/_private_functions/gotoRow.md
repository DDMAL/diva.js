* **Parameters**: 1
    * **rowIndex**: the index of the row we wish to jump to
* **Return type**: none
* **Called by**: [`gridScroll()`](#gridScroll),
  [`createToolbar()`](#createToolbar) (in the submithandler for the "Go to
  page" form, if we're in grid view

Jumps to the specified row. At this time, it is not possible to specify a
particular location relative to a row. Sets
[`settings.currentRowIndex`](#MONKEY) to the index of this row.
