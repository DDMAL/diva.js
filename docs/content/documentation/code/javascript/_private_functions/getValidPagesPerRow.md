{% load extras %}

* **Parameter**: 1
    * **pagesPerRow**: a zoom level that may or may not be valid
* **Return type**: integer
* **Called by**: [`loadGrid()`](#loadGrid),
  [`handleGrid()`](#handleGrid)

If the argument is a valid number of pages per row, then it returns that value;
otherwise, it returns {% settings_link "maxPagesPerRow" %}.
