* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleModeChange()`](#handleModeChange),
  [`toggleGridIcon()`](#toggleGridIcon),
  [`handleGridDoubleClick()`](#handleGridDoubleClick),
  [`handleEvents()`](#handleEvents), [`this.setState()`](#this.setState)

Called whenever we need to switch between grid and document grid or vice versa
(after [`settings.inGrid`](#MONKEY) has been updated to the desired value).
This takes care of updating the slider and icon in the toolbar, loading the
viewer, and executing the [`settings.onViewToggle`](#MONKEY) callback.
