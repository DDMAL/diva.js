If set to true, a div element with id `?-diva-title` (where ? is the number of
the document viewer, 1-indexed) will be created as the first child of the
wrapper element (the element that the document viewer is created upon), and
that div will contain the title of the document. This probably only needs to be
set to false if you don't want the title to appear at all, or want it to appear
somewhere completely different in the document, or want to add something before
or after the title; for the latter cases, you can get the title of the document
using the [`getItemTitle()`](#getItemTitle) MONKEY method. If you just want to
change the appearance of the title you can easily do so through CSS, by
targeting the 'diva-title' class.
