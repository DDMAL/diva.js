var getPageDimensions = require('./page-dimensions');

module.exports = getBookLayoutGroups;

function getBookLayoutGroups(viewerConfig)
{
    var groupings = getGroupings(viewerConfig);

    return groupings.map(function (grouping)
    {
        return getGroupLayoutsFromPageGrouping(viewerConfig, grouping);
    });
}

function getGroupings(viewerConfig)
{
    var manifest = viewerConfig.manifest;
    var zoomLevel = viewerConfig.zoomLevel;

    var pagesByGroup = [];
    var leftPage = null;

    manifest.pages.forEach(function (page, index)
    {
        // Skip non-paged canvases in a paged manifest.
        // NB: If there is currently a pending left page, then it will form
        // an opening with the following page. This seems to be desired behaviour.
        if (manifest.paged && !page.paged)
            return;

        var pageRecord = {
            index: index,
            dimensions: getPageDimensions(index, manifest, zoomLevel)
        };

        if (index === 0 || page.facingPages)
        {
            // The first page is placed on its own
            pagesByGroup.push([pageRecord]);
        }
        else if (leftPage === null)
        {
            leftPage = pageRecord;
        }
        else
        {
            pagesByGroup.push([leftPage, pageRecord]);
            leftPage = null;
        }
    });

    // Flush a final left page
    if (leftPage !== null)
    {
        pagesByGroup.push([leftPage]);
    }

    return pagesByGroup;
}

function getGroupLayoutsFromPageGrouping(viewerConfig, grouping)
{
    var verticallyOriented = viewerConfig.verticallyOriented;

    if (grouping.length === 2)
        return getFacingPageGroup(grouping[0], grouping[1], verticallyOriented);

    var page = grouping[0];
    var pageDims = page.dimensions;

    // The first page is placed on its own to the right in vertical orientation.
    // NB that this needs to be the page with index 0; if the first page is excluded
    // from the layout then this special case shouldn't apply.
    var leftOffset = (page.index === 0 && verticallyOriented) ? pageDims.width : 0;

    var shouldBeHorizontallyAdjusted =
        verticallyOriented && !viewerConfig.manifest.pages[page.index].facingPages;

    // We need to left-align the page in vertical orientation, so we double
    // the group width
    return {
        dimensions: {
            height: pageDims.height,
            width: shouldBeHorizontallyAdjusted ? pageDims.width * 2 : pageDims.width
        },
        pages: [{
            index: page.index,
            groupOffset: {
                top: 0,
                left: leftOffset
            },
            dimensions: pageDims
        }]
    };
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
