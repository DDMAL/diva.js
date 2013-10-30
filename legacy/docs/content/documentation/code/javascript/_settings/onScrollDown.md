A callback function that is only executed when a user scrolls down. Takes the
new page number (0-based indexing) as a parameter.

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onScrollDown: function (newPageIndex) {
        // Write your code here
    },
    // ...
});
```
