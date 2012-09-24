* **Parameters**: 0
* **Return type**: none
* **Called by**: [`handleEvents()`](#handleEvents) (within the event handler
  for the `resize` event on the window, when in fullscreen mode)

Updates [`settings.panelHeight`](#MONKEY) and [`settings.panelWidth`](#MONKEY)
depending on the height and width (minus the scrollbar) of the window, when the
user is in fullscreen mode.
