This page will explain the HTML edits and DOM structure required by diva.js.

[TOC]

Document head
-------------

The required Javascript and CSS dependencies must be included in the `<head>`
element of the HTML file.

### CSS includes

The only required CSS file is `diva.min.css` (found under `build/css/` in the
download package). This file is responsible for styling the internal components
of diva.js and many of the attributes are required in order for diva.js to work
properly. The `demo.css` file included in the `demos/` directory is purely for
making the demos look nice (in terms of fonts, sizing, margin/padding, etc). If
you have your own custom CSS you likely won't need to use it, although there
are certain attributes that may be desirable to set for the certain elements.
See the `demo.css` file for more information.

If you're including both files, the relevant HTML would look like this:

```html
<head>
    <!-- ... -->
    <link rel="stylesheet" href="/path/to/css/diva.min.css" type="text/css" />
    <link rel="stylesheet" href="/path/to/css/demo.css" type="text/css" />
    <!-- ... -->
</head>
```

### Javascript includes

The only dependency that is not included with diva is jQuery. You can either
use a CDN, such as Google's, or host it yourself. It is recommended that you
use the latest version, or at least 1.7+.

You'll also have to include the diva.js source (file `diva.min.js` under
`build/js`), as well as the script that actually instantiates the viewer
instance. The latter could also be contained within the head, in a `<script>`
block; see the [Javascript section](javascript) for more information on this.

The order of the includes needs to be: jQuery, diva.min.js, and instantiation
code. For example, if jQuery were hosted on the same server and the instantion code
were contained in a file called `diva-setup.js`, the script tags would look
something like this:

```html
<head>
    <!-- ... -->
    <script src="/path/to/js/jquery.js" type="text/javascript"></script>
    <script src="/path/to/js/diva.min.js" type="text/javascript"></script>
    <script src="/path/to/js/diva-setup.js" type="text/javascript"></script>
    <!-- ... -->
</head>
```

### Example document head

Combining the above examples, we would get a `<head>` that looked something
like this:

```html
<head>
    <!-- ... -->
    <link rel="stylesheet" href="/path/to/css/diva.min.css" type="text/css" />
    <link rel="stylesheet" href="/path/to/css/demo.css" type="text/css" />

    <script src="/path/to/js/jquery.js" type="text/javascript"></script>
    <script src="/path/to/js/diva.min.js" type="text/javascript"></script>
    <script src="/path/to/js/diva-setup.js" type="text/javascript"></script>
    <!-- ... -->
</head>
```

It's usually a good idea to put the stylesheets above the Javascript, to ensure
that everything looks right even if the Javascript hasn't yet loaded. It's also
possible to put the Javascript in the body of the document as opposed to the
head, to ensure that the document structure is loaded before attempting to
execute the Javascript.

Document body
-------------

The required DOM structure is very basic. There needs to be a `<div>` (or other
block-style container element, although for best results you should use a div
or something else with minimal built-in browser styling), preferably with an ID
such as `diva-wrapper` or `diva-container` or something similar.

At its simplest, it would look like this:

```html
<body>
    <div id="diva-wrapper"></div>
</body>
```

For instructions on setting up multiple viewers on a page, see the
[multiple viewers section](multiple-viewers).

Sample HTML files
-----------------

You can find some sample HTML files in the download package, within the demo/
directory:

* `single.html` contains a basic document viewer setup;
* `double.html` demos two document viewers on one page;
* and `integrated.html` shows a document viewer nicely integrated into an
  existing page.
