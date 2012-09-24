* **Parameters**: 1
* **Return type**: none
* **Called by**: [`init()`](#init)

Adds all the enabled plugins to [`settings.plugins`](#MONKEY), and takes care
of calling the `init()` function for each. If the plugin defines a
`handleClick()` function, then the HTML for a div containing that plugin's icon
is added to [`settings.pageTools`](#MONKEY), and the click event is delegated
to `handleClick()`. See the [plugin document](MONKEY) for more information.
