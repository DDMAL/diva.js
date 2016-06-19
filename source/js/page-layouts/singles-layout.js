var getPageDimensions = require('./page-dimensions');

module.exports = function getSinglesLayoutGroups(viewerConfig)
{
    var manifest = viewerConfig.manifest;

    // Render each page alone in a group
    return manifest.pages.map(function (_unused, index)
    {
        var pageDims = getPageDimensions(index, manifest);

        return {
            dimensions: pageDims,
            pages: [
                {
                    index: index,
                    groupOffset: {top: 0, left: 0},
                    dimensions: pageDims
                }
            ]
        };
    });
};
