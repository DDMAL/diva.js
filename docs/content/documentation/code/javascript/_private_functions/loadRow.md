* **Parameters**: 1
  * **rowIndex**: the index of the row we want to load
* **Return type**: none
* **Called by**: [`attemptRowShow()`](#attemptRowShow),
  [`loadGrid()`](#loadGrid)

If a row is not present in the DOM (as determined by
[`isRowLoaded()`](#isRowLoaded)), then this function will create a div for
the row and load all of its pages after checking that they are still
in the viewport after a brief timeout (see
