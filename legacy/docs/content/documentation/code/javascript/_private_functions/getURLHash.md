* **Parameters**: 0
* **Return type**: string
* **Called by**: [`getCurrentURL()`](#getCurrentURL),
  [`this.getURLHash()`](#this.getURLHash)

Builds the URL hash (looks something like `#foo=bar&something=1`) based on the
state object returned by [`getState()`](#getState). Only attributes of the
state that are not explicitly set to `false` are included.
