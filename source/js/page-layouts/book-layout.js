var getPageDimensions = require('./page-dimensions');

module.exports = getBookLayoutGroups;

function getBookLayoutGroups(viewerConfig)
{
    var manifest = viewerConfig.manifest;
    var zoomLevel = viewerConfig.zoomLevel;
    var verticallyOriented = viewerConfig.verticallyOriented;

    var groups = [];
    var leftPage = null;

    manifest.pages.forEach(function (page, index)
    {
        // Skip non-paged canvases in a paged manifest.
        // NB: If there is currently a pending left page, then it will form
        // an opening with the following page. This seems to be desired behaviour.
        if (manifest.paged && !page.paged)
            return;

        var pageDims = getPageDimensions(index, manifest, zoomLevel);

        if (index === 0)
        {
            // The first page is placed on its own (to the right in vertical orientation)
            groups.push({
                dimensions: {
                    height: pageDims.height,
                    width: verticallyOriented ? pageDims.width * 2 : pageDims.width
                },
                pages: [{
                    index: 0,
                    groupOffset: {
                        top: 0,
                        left: verticallyOriented ? pageDims.width : 0
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
