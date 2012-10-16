{% load extras %}

* **Parameters**: 0
* **Return type**: none
* **Called by**: [`loadGrid()`](#loadGrid)

Helper function to scroll to the correct row after loading the viewer in
grid view. After the initial load, the page to scroll to is determined by
first by the {% link "hash parameter" %}, and if that isn't specified or is
invalid, by {% settings_link "goDirectlyTo" %}. In all cases, the viewer will
attempt to preserve the page that was last being viewed.
