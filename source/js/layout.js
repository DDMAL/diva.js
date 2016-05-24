module.exports = getDocumentLayout;

function getDocumentLayout(config)
{
    // Get layout groups for the current view
    var layouts;

    if (config.inBookLayout)
        layouts = getBookLayoutGroups(config.manifest, config.zoomLevel, config.verticallyOriented);
    else
        layouts = getSinglesLayoutGroups(config.manifest, config.zoomLevel, config.verticallyOriented);

    // Now turn layouts into concrete regions

    var documentSecondaryExtent = getExtentAlongSecondaryAxis(layouts, config);

    // The current position in the document along the primary axis
    var primaryDocPosition = 0;

    var pageGroups = [];

    // TODO: Use bottom, right as well
    var pagePadding = {
        top: config.padding.page.top,
        left: config.padding.page.left
    };

    layouts.forEach(function (layout, index)
    {
        var top, left;

        if (config.verticallyOriented)
        {
            top = primaryDocPosition;
            left = (documentSecondaryExtent - layout.dimensions.width) / 2;
        }
        else
        {
            top = (documentSecondaryExtent - layout.dimensions.height) / 2;
            left = primaryDocPosition;
        }

        var region = {
            top: top,
            bottom: top + pagePadding.top + layout.dimensions.height,
            left: left,
            right: left + pagePadding.left + layout.dimensions.width
        };

        pageGroups.push({
            index: index,
            dimensions: layout.dimensions,
            pages: layout.pages,
            region: region,
            padding: pagePadding
        });

        primaryDocPosition = config.verticallyOriented ? region.bottom : region.right;
    });

    var height, width;

    if (config.verticallyOriented)
    {
        height = primaryDocPosition + pagePadding.top;
        width = documentSecondaryExtent;
    }
    else
    {
        height = documentSecondaryExtent;
        width = primaryDocPosition + pagePadding.left;
    }

    return {
        dimensions: {
            height: height,
            width: width
        },
        pageGroups: pageGroups
    };
}

function getSinglesLayoutGroups(manifest, zoomLevel)
{
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
}

function getBookLayoutGroups(manifest, zoomLevel, verticallyOriented)
{
    var groups = [];
    var leftPage = null;

    manifest.pages.forEach(function (page, index)
    {
        // Skip non-paged canvases in a paged manifest.
        // NB: If there is currently a pending left page, then it will form
        // an opening with the following page. This seems to be desired behaviour.
        if (manifest.paged && !page.paged)
            return;

        var pageDims = getPageDimensions(index, manifest, zoomLevel, { round: false });

        if (verticallyOriented && index === 0)
        {
            // The first page is placed on its own to the right
            groups.push({
                dimensions: {
                    height: pageDims.height,
                    width: pageDims.width * 2
                },
                pages: [{
                    index: 0,
                    groupOffset: {
                        top: 0,
                        left: pageDims.width
                    },
                    dimensions: pageDims
                }]
            });

            return;
        }

        if (leftPage === null)
        {
            leftPage = {
                index: index,
                dimensions: pageDims
            };

            return;
        }

        groups.push(getFacingPageGroup(leftPage, { index: index, dimensions: pageDims }, verticallyOriented));

        leftPage = null;
    });

    // Flush a final left page
    if (leftPage !== null)
    {
        // We need to left-align the page in vertical orientation, so we double
        // the group width
        groups.push({
            dimensions: {
                height: leftPage.dimensions.height,
                width: verticallyOriented ? leftPage.dimensions.width * 2 : leftPage.dimensions.width
            },
            pages: [{
                index: leftPage.index,
                groupOffset: {
                    top: 0,
                    left: 0
                },
                dimensions: leftPage.dimensions
            }]
        });
    }

    return groups;
}

function getFacingPageGroup(leftPage, rightPage, verticallyOriented)
{
    var leftDims = leftPage.dimensions;
    var rightDims = rightPage.dimensions;

    var height = Math.max(leftDims.height, rightDims.height);

    var width, firstLeftOffset, secondLeftOffset;

    if (verticallyOriented)
    {
        var midWidth = Math.max(leftDims.width, rightDims.width);

        width = midWidth * 2;

        firstLeftOffset = midWidth - leftDims.width;
        secondLeftOffset = midWidth;
    }
    else
    {
        width = leftDims.width + rightDims.width;
        firstLeftOffset = 0;
        secondLeftOffset = leftDims.width;
    }

    return {
        dimensions: {
            height: height,
            width: width
        },
        pages: [
            {
                index: leftPage.index,
                dimensions: leftDims,
                groupOffset: {
                    top: 0,
                    left: firstLeftOffset
                }
            },
            {
                index: rightPage.index,
                dimensions: rightDims,
                groupOffset: {
                    top: 0,
                    left: secondLeftOffset
                }
            }
        ]
    };
}

function getExtentAlongSecondaryAxis(layouts, config)
{
    // Get the extent of the document along the secondary axis
    var secondaryDim, secondaryPadding;
    var docPadding = config.padding.document;

    if (config.verticallyOriented)
    {
        secondaryDim = 'width';
        secondaryPadding = docPadding.left + docPadding.right;
    }
    else
    {
        secondaryDim = 'height';
        secondaryPadding = docPadding.top + docPadding.bottom;
    }

    return secondaryPadding + layouts.reduce(function (maxDim, layout)
    {
        return Math.max(layout.dimensions[secondaryDim], maxDim);
    }, 0);
}

function getPageDimensions(pageIndex, manifest, zoomLevel, options)
{
    var pageData = manifest.pages[pageIndex].d[zoomLevel];

    // FIXME(wabain): These are always rounded! Does rounding really need to be optional?
    var width = Math.floor(pageData.w);
    var height = Math.floor(pageData.h);

    var round = !options || options.round;

    if (round)
    {
        return {
            width: Math.floor(width),
            height: Math.floor(height)
        };
    }

    return {
        width: width,
        height: height
    };
}
