A callback function that is executed whenever a zoom event is fired on the
document viewer. Such an event will be fired whenever the user moves the zoom
slider, double-clicks to zoom in or out, or pinch-zooms on a touch device. The
new zoom level is passed as a parameter.

If you need to distinguish between zooming in and zooming out, you can make use
of [`settings.onZoomIn`](#onZoomIn) and [`settings.onZoomOut`](#onZoomOut)
instead.

Format:

```javascript
$('#diva-wrapper').diva({
    // ...
    onZoom: function (newZoomLevel) {
        // Write your code here
    },
    // ...
});
```
