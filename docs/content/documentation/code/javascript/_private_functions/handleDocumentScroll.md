* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleEvents()`](#handleEvents) (in the event handler for
  scrolling within the `.diva-outer` element; only triggered when in document
  view)

Called any time the user scrolls while in document view. Updates
[`settings.topScrollSoFar`](#MONKEY) and
[`settings.previousTopScroll`](#MONKEY), and calls
[`adjustPages()`](#adjustPages).
