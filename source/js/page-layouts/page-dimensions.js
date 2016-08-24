module.exports = function getPageDimensions(pageIndex, manifest)
{
    var dims = manifest.getMaxPageDimensions(pageIndex);

    return {
        width: Math.floor(dims.width),
        height: Math.floor(dims.height)
    };
};
