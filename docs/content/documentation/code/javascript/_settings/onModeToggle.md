Callback function, executed when the user enters or exits fullscreen mode.
Receives one parameter: a boolean representing whether the user is now in
fullscreen mode (if it is true, then yes).

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onModeToggle: function (inFullscreen) {
        // Write your code here
    },
    // ...
});
```
