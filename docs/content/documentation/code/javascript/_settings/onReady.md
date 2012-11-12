Callback function, executed when (and only when) the initial load is complete.
Takes the `settings` object as an optional parameter (passed by reference, so
any changes made to this object will affect the document viewer's settings).

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onReady: function (settings) {
        // Write your code here
    },
    // ...
});
```
