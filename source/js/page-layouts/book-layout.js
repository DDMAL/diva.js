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

    var pagesByGroup = [];
    var leftPage = null;
    var nonPagedPages = []; // Pages to display below the current group

    var _addNonPagedPages = function()
    {
        for (var i = 0; i < nonPagedPages.length; i++)
        {
            pagesByGroup.push([ nonPagedPages[i] ]);
        }
        nonPagedPages = [];
    };

    manifest.pages.forEach(function (page, index)
    {
        var pageRecord = {
            index: index,
            dimensions: getPageDimensions(index, manifest),
            paged: (!manifest.paged || page.paged)
        };

        // Only display non-paged pages if specified in the settings
        if (!viewerConfig.showNonPagedPages && !pageRecord.paged)
            return;

        if (!pageRecord.paged)
        {
            nonPagedPages.push(pageRecord);
        }
        else if (index === 0 || page.facingPages)
        {
            // The first page is placed on its own
            pagesByGroup.push([pageRecord]);
            _addNonPagedPages();
        }
        else if (leftPage === null)
        {
            leftPage = pageRecord;
        }
        else
        {
            pagesByGroup.push([leftPage, pageRecord]);
            leftPage = null;
            _addNonPagedPages();
        }
    });

    // Flush a final left page
    if (leftPage !== null)
    {
        pagesByGroup.push([leftPage]);
        _addNonPagedPages();
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
    // If the page is tagged as 'non-paged', center it horizontally
    var leftOffset;
    if (page.paged)
        leftOffset = (page.index === 0 && verticallyOriented) ? pageDims.width : 0;
    else
        leftOffset = (verticallyOriented) ? pageDims.width / 2 : 0;

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
