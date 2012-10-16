{% load extras %}

This is used to store the number (with 0-based indexing) of the page considered
the "current" page, so that it can be displayed to the user. If more than one
page is visible at a given time, then the current page is determined according
to the scroll direction; see {% private_link "setCurrentPage" %} for more information.
