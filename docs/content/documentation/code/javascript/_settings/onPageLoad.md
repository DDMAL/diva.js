A callback function that will be executed any time a page is loaded (i.e. the
page div is appended to the DOM). Takes three parameters: the page index
(0-indexed), the page filename, and a string that can be used to select the
page div using jQuery (`$(pageSelector)` where `pageSelector` is the name of
the parameter).

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onPageLoad: function (pageIndex, filename, pageSelector) {
        // Write your code here
    },
    // 
});
```
