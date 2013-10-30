* **Parameters**: 1
  * **rowIndex**: the row index whose validity we want to check
* **Return type**: boolean
* **Called by**: [`attemptRowShow()`](#attemptRowShow),
  [`attemptRowHide()`](#attemptRowHide), [`setCurrentRow`](#setCurrentRow)

Returns true if the row index is valid (between 0, inclusive, and the number
of rows, exclusive). The number of rows for a particular number of pages per
row is determined in [`loadGrid()`](#loadGrid).
