* **Parameters**: 3
    * **pageNumber**: the number of the page (1-indexed)
    * **topOffset**: the vertical offset from the top of the page to the top of
      the element under consideration
    * **height**: the height of the element under consideration
* **Return type**: boolean (true if it is visible, false otherwise)

Used for checking if something attached to a particular page is visible in the
viewport. Useful for things like boxes for highlighting search queries, when
you don't want to display extra elements unnecessarily.
