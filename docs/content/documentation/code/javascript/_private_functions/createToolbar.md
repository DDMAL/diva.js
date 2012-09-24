* **Parameters**: 0
* **Return type**: object
* **Called by**: [`setupViewer()`](#setupViewer) (within the `success` callback
  function)

Creates and inserts the HTML needed for the toolbar into the document, and
binds any necessary event handlers. Returns an object containing various
functions related to the toolbar, which is then saved as
[`settings.toolbar`](#MONKEY) within `setupViewer()`. These functions can be
accessed from the `settings.toolbar` object. For example, to update the current
page label in the toolbar:

```javascript
settings.toolbar.updateCurrentPage();
```
