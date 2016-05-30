module.exports = function getPageDimensions(pageIndex, manifest, zoomLevel)
{
    var dims = manifest.getPageDimensionsAtZoomLevel(pageIndex, zoomLevel);

    return {
        width: Math.floor(dims.width),
        height: Math.floor(dims.height)
    };
};
