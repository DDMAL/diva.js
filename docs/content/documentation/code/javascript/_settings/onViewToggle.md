Callback function, executed when the user enters or exits grid view. Receives
one parameter: a boolean representing whether the user is now in grid view (if
it is true, then yes).

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onViewToggle: function (inGrid) {
        // Write your code here
    },
    // ...
});
```
