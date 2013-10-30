* **Parameters**: 2
    * **top**: the distance between the top edge of the inner panel
      ([`.diva-inner`](#MONKEY)) and the top edge of the tile in question
    * **bottom**: the distance between the top edge of the inner panel and the
      bottom edge of the tile in question
* **Return type**: boolean
* **Called by**: [`isTileVisible()`](#isTileVisible),
  [`isPageVisible()`](#isPageVisible), [`isRowVisible()`](#isRowVisible),
  [`this.inViewport()`](#this.inViewport)

Checks if the item (tile, page, row, etc) whose top and bottom edge coordinates
are given is vertically within the viewport (the document viewer panel) or not.
