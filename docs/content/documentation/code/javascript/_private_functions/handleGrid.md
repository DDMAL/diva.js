* **Parameters**: 1
    * **newValue**: the desired number of pages per row
* **Return type**: boolean
* **Called by**: [`createToolbar()`](#createToolbar) (within the `slide` and
  `change` event handlers for the zoom slider)

Called when we're already in grid view and we need to change the number of
pages per row.

Takes care of validating the desired number of pages per row, updating
[`settings.oldPagesPerRow`](#MONKEY) and [`settings.oldPagesPerRow`](#MONKEY),
updating the slider, and loading the grid with the desired number of pages per
row.

If the desired number of pages per row is invalid, this function returns
`false`; otherwise, it returns `true`.
