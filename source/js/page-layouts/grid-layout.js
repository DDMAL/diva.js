module.exports = getGridLayoutGroups;

function getGridLayoutGroups(viewerConfig)
{
    var viewportWidth = viewerConfig.viewport.width;
    var manifest = viewerConfig.manifest;
    var pagesPerRow = viewerConfig.pagesPerRow;
    var fixedHeightGrid = viewerConfig.fixedHeightGrid;
    var fixedPadding = viewerConfig.fixedPadding;

    var horizontalPadding = fixedPadding * (pagesPerRow + 1);
    var pageWidth = (viewportWidth - horizontalPadding) / pagesPerRow;
    var gridPageWidth = pageWidth;

    // Calculate the row height depending on whether we want to fix the width or the height
    var rowHeight = (fixedHeightGrid) ? fixedPadding + manifest.minRatio * pageWidth : fixedPadding + manifest.maxRatio * pageWidth;

    var groups = [];
    var currentPages = [];

    var getGridPageDimensions = function (pageData)
    {
        // Calculate the width, height and horizontal placement of this page
        // Get dimensions at max zoom level, although any level should be fine
        var pageDimenData = pageData.d[pageData.d.length - 1];
        var heightToWidthRatio = pageDimenData.h / pageDimenData.w;

        var pageWidth, pageHeight;

        if (fixedHeightGrid)
        {
            pageWidth = (rowHeight - fixedPadding) / heightToWidthRatio;
            pageHeight = rowHeight - fixedPadding;
        }
        else
        {
            pageWidth = gridPageWidth;
            pageHeight = pageWidth * heightToWidthRatio;
        }

        return {
            width: Math.round(pageWidth),
            height: Math.round(pageHeight)
        };
    };

    var rowDimensions = {
        height: rowHeight,
        width: viewportWidth
    };

    manifest.pages.forEach(function (page, pageIndex)
    {
        // Calculate the width, height and horizontal placement of this page
        var pageDimens = getGridPageDimensions(page);
        var leftOffset = Math.floor(currentPages.length * (fixedPadding + gridPageWidth) + fixedPadding);

        // Center the page if the height is fixed (otherwise, there is no horizontal padding)
        if (fixedHeightGrid)
        {
            leftOffset += (gridPageWidth - pageDimens.width) / 2;
        }

        // TODO: Precompute page dimensions everywhere
        currentPages.push({
            index: pageIndex,
            dimensions: pageDimens,
            groupOffset: {
                top: 0,
                left: leftOffset
            }
        });

        if (currentPages.length === pagesPerRow)
        {
            groups.push({
                dimensions: rowDimensions,
                pages: currentPages
            });

            currentPages = [];
        }
    });

    if (currentPages.length > 0)
    {
        groups.push({
            dimensions: rowDimensions,
            pages: currentPages
        });
    }

    return groups;
}
