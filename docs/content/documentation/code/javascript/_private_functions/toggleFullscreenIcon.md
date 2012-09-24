* **Parameters**: 0
* **Return type**: none 
* **Called by**: [`handleEvents()`](#handleEvents) (in the event handler for
  clicking on the fullscreen icon), [`this.toggleMode()`](#this.toggleMode),
  [`this.enterFullscreen()`](#this.enterFullscreen),
  [`this.leaveFullscreen()`](#this.leaveFullscreen)

Stores the current page in [`settings.goDirectlyTo`](#MONKEY) so that we can
jump directly to that page afterwards, updates
[`settings.inFullscreen`](#MONKEY), and calls
[`handleModeChange()`](#handleModeChange) with the value of the `changeView`
parameter set to false, triggering a mode toggle without a view toggle.
