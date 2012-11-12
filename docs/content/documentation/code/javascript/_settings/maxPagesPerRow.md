{% load extras %}

Controls the maximum number of pages per row to display in grid view. Should be
equal to or greater than [`settings.minPagesPerRow`](#minPagesPerRow) (if
not, will be set to `settings.minPagesPerRow`). This value is used by the grid
slider and when validating the `n` {% link "hash parameter" %}.
