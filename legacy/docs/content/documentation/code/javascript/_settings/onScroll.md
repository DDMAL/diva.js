A callback function that will be executed whenever any vertical or horizontal scroll event is fired within the document viewer. Scroll events occur when the user scrolls through the documents by any method, including the page up/down keys (if
[`settings.enableKeyScroll`](#enableKeyScroll) is enabled), the scrollbar,
dragging the viewer pane, and the mousewheel; a scroll event is also fired
after each zoom and when the user attempts to jump to a specific page. Note
that this function will be executed for _every_ scroll event, regardless of
whether the user is scrolling up or down; if it is necessary to distinguish
between the two, you can assign callback functions to
[`settings.onScrollUp`](#onScrollUp) and
[`settings.onScrollDown`](#onScrollDown) instead.

This callback takes one parameter: the current page number (0-indexed), after
having scrolled. 

There are currently no callbacks for exclusively handling horizontal scrolling.

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onScroll: function (newPageIndex) {
        // Write your code here
    },
    // ...
});
```
