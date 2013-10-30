* **Parameters**: 1
  * **pageIndex**: the index of the page we want to delete
* **Return type**: none
* **Called by**: [`attemptPageHide()`](#attemptPageHide)

Deletes the div for a page from the DOM. The child elements of the container
are removed (using jQuery's [`empty()`](http://api.jquery.com/empty/)) before
the container itself is removed (using jQuery's
[`remove()`](http://api.jquery.com/remove/)) for performance reasons.
