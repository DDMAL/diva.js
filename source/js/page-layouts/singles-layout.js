var getPageDimensions = require('./page-dimensions');

module.exports = function getSinglesLayoutGroups(viewerConfig)
{
    var manifest = viewerConfig.manifest;
    var zoomLevel = viewerConfig.zoomLevel;

    // Render each page alone in a group
    return manifest.pages.map(function (_, i)
    {
        var pageDims = getPageDimensions(i, manifest, zoomLevel);

        return {
            dimensions: pageDims,
            pages: [
                {
                    index: i,
                    groupOffset: {top: 0, left: 0},
                    dimensions: pageDims
                }
            ]
        };
    });
};
