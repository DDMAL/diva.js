* **Parameters**: 0
* **Return type**: object
* **Called by**: [`getURLHash()`](#getURLHash),
  [`this.getState()`](#this.getState)

Returns an object indicating the state of the document viewer. This is used
primarily for building the URL hash (shown when clicking the link icon). The
state object returned by this function (via `this.getState()`) can be passed to
[`this.setState`](#this.setState) for another diva.js instance in order to
synchronise two viewers.
