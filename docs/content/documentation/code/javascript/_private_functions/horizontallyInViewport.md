* **Parameters**: 2
    * **left**: the distance between the left edge of the inner panel
      ([`.diva-inner`](#MONKEY)) and the left edge of the tile in question
    * **right**: the distance between the left edge of the inner panel and the
      right edge of the tile in question
* **Return type**: boolean
* **Called by**: [`isTileVisible()`](#isTileVisible)

Checks if the tile whose left and right edge coordinates are given is
horizontally within the viewport (the document viewer panel) or not.
