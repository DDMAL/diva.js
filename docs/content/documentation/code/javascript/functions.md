All the private and public functions defined in source/js/diva.js and
source/js/utils.js are described below.

[TOC]

Private functions
-----------------

These functions are all local to the `Diva` function (which behaves like a
class that can be instantiated). In other words, although they can be accessed
_within_ the main diva.js code (within the outer `Diva` function), they cannot
be accessed from outside it. For the list of functions that _can_ be accessed
from outside the `Diva` function, see the [Public functions](#public-functions)
section below.

{% include "documentation/private_functions.html" %}

Public functions
----------------

{% include "documentation/public_functions.html" %}

Utility functions
-----------------

These functions are defined in source/js/utils.js. Most are defined within
anonymous functions to prevent local variables from polluting the global
namescape and to ensure that there is no conflict with other libraries that
have aliased the `$` variable to something other than `jQuery`.

{% comment %}
Parsing the utils.js file and getting the functions from there is too difficult
as the functions are all defined in differently. There are also fewer functions
and it's unlikely to change much. For now, the utility function names are just
going to be hardcoded in jsparse.py.
{% endcomment %}
