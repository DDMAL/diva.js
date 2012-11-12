{% load extras %}

If set to true, all images will have the same height in grid view. If set to
false, they will all have the same width. If you know that all of your images
have the exact same dimensions, then this setting doesn't matter and they will
all have the same width and height. If one or more of the images is
significantly wider than the rest, then you may wish to set this to false;
otherwise, keep it at true.

Here is an example of a document with one page significantly wider than the
rest, with `fixedHeightGrid` set to false:

{% docs_image "fixed-width-grid" %}

The alternative for this document would be to set it to true, resulting in the
following sparse-looking grid:

{% docs_image "fixed-height-grid" %}
