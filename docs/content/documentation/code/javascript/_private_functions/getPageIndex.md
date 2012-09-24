* **Parameters**: 1
    * **filename**: the filename corresponding to the page whose index we need
      (e.g. `bm_001.tif`)
* **Return type**: integer
* **Called by**: [`setupViewer()`](#setupViewer),
  [`this.gotoPageByName()`](#this.gotoPageByName),
  [`this.setState`](#this.setState)

Returns the index of the page whose filename is equal to the filename
parameter. If no page is found, -1 is returned.
