{% load extras %}

* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleEvents()`](#handleEvents) (in the event handler for
  scrolling within the `.diva-outer` element; only triggered when in grid
  view)

Called any time the user scrolls while in grid view. Updates
{% settings_link "topScrollSoFar" %} and
{% settings_link "previousTopScroll" %}, and calls
[`adjustRows()`](#adjustRows).
