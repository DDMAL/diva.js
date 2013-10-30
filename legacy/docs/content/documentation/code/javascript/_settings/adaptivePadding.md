A float, between 0 and 1, that determines the padding between pages
(vertically) and around the edges of pages (horizontally) based on the average
height and width of the pages in the document. For instance, if set to 0.05,
horizontal padding will be 5% of the average width and vertical padding will be
5% of the average height. Note that if there are any plugins with icons
enabled, the vertical padding will be at least 40 pixels to make room for the
icons above each page. 

To disable adaptive padding and instead used a fixed padding per page, set this
to 0; the fixed padding per page can then be set in
[`settings.fixedPadding`](#fixedPadding).
