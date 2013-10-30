A callback function that will be executed each time the user attempts to go
straight to a page using the "Go to page" box. Can be wrapped in an anonymous
function that takes the desired page number (0-indexed) as the parameter
(optional). Will only be used if [`settings.enableGotoPage`](#enableGotoPage)
is set to true.

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onJump: function (pageIndex) {
        // Write your code here
    },
    // ...
});
```
