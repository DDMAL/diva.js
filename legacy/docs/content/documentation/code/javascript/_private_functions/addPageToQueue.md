{% load extras %}

* **Parameters**: 5
    * **rowIndex**: the index of the row the page is in
    * **pageIndex**: the index of the page
    * **imageURL**: the full URL of the image at the specified dimensions,
      converted to JPEG
    * **pageWidth**: the desired width of the image
    * **pageHeight**: the desired height of the image
* **Return type**: none
* **Called by**: [`loadRow()`](#loadRow)

Used to prevent page images in grid view from being loaded unnecessarily. A
short delay is introduced between initially identifying a row that needs to be
loaded and actually loading the pages in that row (after checking that the row
still needs to be loaded). The duration of the delay is controlled by
{% settings_link "rowLoadTimeout" %}.

The ID of the timeout (as returned by `setTimeout`) is added to the
{% settings_link "pageTimeouts" %} array to ensure that the loading is halted
if the user leaves grid view.
