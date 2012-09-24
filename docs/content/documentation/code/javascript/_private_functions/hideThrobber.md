* **Parameters**: 0
* **Return type**: none
* **Called by**: [`setupViewer`](#setupViewer) (in the `error` and `success`
  callback functions)

Hides the throbber (loading indicator icon), which is first created at the
beginning of `setupViewer` and is only shown if the initial asynchronous
request takes longer than the number of milliseconds defined in
[`settings.throbberTimeout`](#MONKEY).
