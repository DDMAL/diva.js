{% load extras %}

If there is only one document viewer on the page, this will be empty, and you
can set the hash parameters for the document viewer in the standard way (e.g.
with `#z=2&f=true`). However, if there is more than one document viewer, then
it becomes necessary to use a suffix for each parameter for all but the first
document viewer. In this case, the first diva.js instance created will have no
suffix; the second will have a suffix of '2', and the third will have a suffix
of '3', etc. To target only the second document viewer, you can set the hash
parameters using, e.g., `#z2=2&f2=true`.

The generated link for each document viewer takes this into account, so there
is no need to worry about this when using the {% public_link "getCurrentURL" %}
or {% public_link "getURLHash" %} public methods (or the link icon).
