Used for calculating the vertical padding (stored in
[`settings.verticalPadding`](#verticalPadding) if adaptive padding is enabled
(i.e., if [`settings.adaptivePadding`](#adaptivePadding) is greater than 0).
The vertical padding at a particular zoom level is then the product of the
average height of each page at that zoom level and the adaptive padding.

If adaptive padding is disabled, this setting is not used.
