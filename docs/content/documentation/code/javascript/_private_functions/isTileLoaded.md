{% load extras %}

* **Parameters**: 2
  * **pageIndex**: index of the page this tile is part of
  * **tileIndex**: index of this tile (starts from 0)
* **Return type**: boolean
* **Called by**: [`loadPage()`](#loadPage)

Checks if a tile has been loaded into the DOM. Note that tiles are only loaded
if they are both vertically and horizontally within the viewport (taking 
{% settings_link "viewportMargin" %} into account).
