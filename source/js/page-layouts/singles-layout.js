var getPageDimensions = require('./page-dimensions');

module.exports = function getSinglesLayoutGroups(viewerConfig)
{
    var manifest = viewerConfig.manifest;

    // Render each page alone in a group
    var pages = [];
    manifest.pages.forEach(function (page, index)
    {
        if (!viewerConfig.showNonPagedPages && manifest.paged && !page.paged)
            return;

        var pageDims = getPageDimensions(index, manifest);

        pages.push({
            dimensions: pageDims,
            pages: [
                {
                    index: index,
                    groupOffset: {top: 0, left: 0},
                    dimensions: pageDims
                }
            ]
        });
    });

    return pages;
};
