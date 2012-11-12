{% load extras %}

* **Parameters**: 1
    * **changeView**: a boolean indicating whether or not we also need to
      change the view (between grid and document)
* **Return type**: none
* **Called by**: [`toggleFullscreenIcon()`](#toggleFullscreenIcon),
  [`setupViewer()`](#setupViewer), [`this.setState()`](#this.setState)

Called whenever we need to enter or exit fullscreen mode (after
{% settings_link "inFullscreen" %} has been updated to the desired value). This
takes care of saving some offsets required to scroll to the same place after
changing the mode, updating the toolbar, resetting the dimensions, changing the
view if necessary (depending on the `changeView` parameter) and executing the
{% settings_link "onModeToggle" %} callback.
