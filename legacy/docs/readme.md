Diva.js documentation
=====================

This is the source code for the usage and code documentation for Diva.js,
generated with a custom build script. Uses the Django template library,
[Pygments](http://pygments.org/), and
[Markdown](http://daringfireball.net/projects/markdown/syntax) with [several
custom extensions](#markdown-extensions).

## Editing the content

To edit the content, look for the corresponding markdown file in the `content/`
directory. For example, to edit the `documentation/setup/frontend/html` page,
simply edit `content/documentation/setup/frontend/html.md`.

### Markdown extensions

There are four Markdown extensions that are used when generating a page:

* [Tables](http://freewisdom.org/projects/python-markdown/Tables);
* [CodeHilite](http://freewisdom.org/projects/python-markdown/CodeHilite), for
  syntax highlighting with Pygments;
* [Fenced
  code
  blocks](http://freewisdom.org/projects/python-markdown/Fenced_Code_Blocks),
  in conjunction with Pygments syntax highlighting;
* and a modified version of [Table of
  Contents](http://freewisdom.org/projects/python-markdown/Table_of_Contents),
  the source for which can be found in `src/mdx_pilcrow_toc.py` (modified to
  show a pilcrow after each header).

## Editing the layout

Template files are found under `templates/`, and use the Django templating
language for logic and inheritance.

Stylesheet, image and javascript files can be found under `static/`.

## Building

To build the documentation, run

```console
fab build
```

from within the `docs/` directory (including subdirectories).

All the files required for the documentation (HTML, CSS, JS, image) will be
copied over to the build directory (`../diva`, relative to the root `docs/`
directory).

## Licensing information

The background image used on the home page is a modified version of a
[photograph taken by Amelia-Jane
Schmidt](http://www.flickr.com/photos/meeli/2854849909/), released under a [Creative Commons
BY-NC-SA](http://creativecommons.org/licenses/by-nc-sa/2.0/) license.

Other images (except for logos) are either taken from Glyphicons or
custom-created, unless otherwise specified.
