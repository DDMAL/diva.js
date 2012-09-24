* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleEvents()`](#handleEvents) (in the event handler for
  scrolling within the `.diva-outer` element; only triggered when in grid
  view)

Called any time the user scrolls while in grid view. Updates
[`settings.topScrollSoFar`](#MONKEY) and
[`settings.previousTopScroll`](#MONKEY), and calls
[`adjustRows()`](#adjustRows).
