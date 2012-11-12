A callback function that is only executed when a user scrolls up. Takes the
new page number (0-based indexing) as a parameter.

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onScrollUp: function (newPageIndex) {
        // Write your code here
    },
    // ...
});
```
