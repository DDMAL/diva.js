This is used to accommodate multiple document viewers on a page. The first (or
only) document viewer on the page will have a prefix of `1-diva`; subsequent
document viewers will have prefixes of `2-diva`, `3-diva`, etc. This means that
any element created in the DOM will look something like this (replacing 1 with
the actual document viewer number):

```html
<div id="1-diva-something"></div>
```

This is to ensure that all the elements have unique IDs (as is required for the
HTML to be valid), even if there are multiple instances of diva.js on the page.

See also [`settings.selector`](#selector).
