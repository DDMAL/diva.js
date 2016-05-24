module.exports = function getPageDimensions(pageIndex, manifest, zoomLevel)
{
    var pageData = manifest.pages[pageIndex].d[zoomLevel];

    return {
        width: Math.floor(pageData.w),
        height: Math.floor(pageData.h)
    };
};
