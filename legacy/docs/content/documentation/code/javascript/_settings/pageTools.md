More specifically, this holds the HTML (as a string) of the `.diva-page-tools`
div. If no plugins with a `handleClick()` method are enabled, then this will be
an empty string. Otherwise, it will contain the HTML necessary to create an
icon for that plugin.

For example, if exactly one plugin (called `info`) were enabled, then
`settings.pageTools` would look like this:

```html
<div class="diva-page-tools">
    <div class="diva-info-icon" title="Some description for this plugin"></div>
</div>
```

The above would be appended to each page div, immediately before the first tile
div.
