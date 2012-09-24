* **Parameters**: 0
* **Return type**: none
* **Called by**: [`loadDocument()`](#loadDocument)

Helper function to scroll to the correct page after loading the viewer in
document view. After the initial load, the page to scroll to is determined by
first by the [hash parameter](#MONKEY), and if that isn't specified or is
invalid, by [`settings.goDirectlyTo`](#MONKEY). After a zoom event, the page to
scroll to is the page that was being viewed directly prior to the zoom event,
or the area of the page that was double-clicked if the zoom was triggered by a
double-click event. After switching into document view from grid view or
entering or existing fullscreen mode, the page to scroll to is the last page
that was being viewed.
