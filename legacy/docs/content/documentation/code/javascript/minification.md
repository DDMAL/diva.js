[Javascript minification](http://www.alistapart.com/articles/better-javascript-minification/) provides a way to shrink Javascript files that are being served so as to reduce bandwidth consumption. It also offers a way to combine multiple files into one, compressed file, while allowing developers to structure their code however they want.

Below, you can find details on the minification process for diva.js. This is only necessary if you need to modify the Javascript files directly.

[TOC]

## Using the Closure Compiler

We use the [Closure Compiler](http://code.google.com/closure/compiler/) to
create the minified file `diva.min.js`, which contains `utils.js`, `diva.js`,
and the .js files in the plugins/ directory. This is done via the command line,
using the .jar file available from the Closure Compiler website, as follows:

```console
cat diva-utils.js diva.js > diva-full.js && java -jar /path/to/compiler/compiler.jar --js diva-full.js --js_output_file diva-min.js && rm diva-full.js
```

The compilation level `SIMPLE_OPTIMIZATION` is used, as the
`ADVANCED_OPTIMIZATION` level results in non-functioning code due to overly
aggressive renaming. This compilation level results in a file size decrease of
~65%.

### Using fabric

[Fabric](http://docs.fabfile.org/en/1.4.3/index.html) is a Python library for
automating tasks. If you install fabric and download the [developer version]({{
ROOT_URL }}download#developer-version), you can use the `minify` command in the
included fabfile.py to build the Javascript:

```console
fab minify
```

To build the Javascript and stylesheets at the same time, run

```console
fab build
```

## Developing without minifying files

When you're continually modifying the Javascript source, you don't want to have to re-minifiy any time you make a change. The alternative is to include the source files directly, in the `<head>` element of your HTML page, as in the following example:

```html
<head>
    <!-- ... -->
    <script src="/static/js/jquery.min.js"></script>
    <script src="/static/js/diva/utils.js"></script>
    <script src="/static/js/diva/diva.js"></script>
    <script src="/static/js/diva/plugins/canvas.js"></script>
    <script src="/static/js/diva/plugins/download.js"></script>
    <script src="/static/js/diva/plugins/mycustomplugin.js"></script>
    <!-- ... -->
</head>
```

The script includes must be in the order shown above: jQuery, utils.js,
diva.js, then any plugins. Any other scripts you wish to include that depend on
diva should be included after the last diva-related script above (in this case,
`mycustomplugin.js`).
