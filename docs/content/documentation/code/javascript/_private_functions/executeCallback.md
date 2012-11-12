* **Parameters**: 1 or more
    * **callback**: a callback function
    * other arguments: arguments to pass to the callback function (0 or more)
* **Return type**: boolean
* **Called by**: [`adjustPages()`](#adjustPages),
  [`adjustRows()`](#adjustRows), [`loadDocument()`](#loadDocument),
  [`handleModeChange()`](#handleModeChange),
  [`handleViewChange()`](#handleViewChange),
  [`initPlugins()`](#initPlugins), [`setupViewer()`](#setupViewer),
  [`this.destroy()`](#thisDestroy)

Executes the callback with the document viewer instance as context (so
referring to `this` within the callback function will give the diva instance).
Any arguments following the callback function will be passed directly to the
callback function. If the `callback` parameter is a function that can be
executed, then it will be executed and the `executeCallback` function will
return true; otherwise, it will return false.
