
export default function getGridLayoutGroups (viewerConfig)
{
    const viewportWidth = viewerConfig.viewport.width;
    const manifest = viewerConfig.manifest;
    const pagesPerRow = viewerConfig.pagesPerRow;
    const fixedHeightGrid = viewerConfig.fixedHeightGrid;
    const fixedPadding = viewerConfig.fixedPadding;
    const showNonPagedPages = viewerConfig.showNonPagedPages;

    const horizontalPadding = fixedPadding * (pagesPerRow + 1);
    const pageWidth = (viewportWidth - horizontalPadding) / pagesPerRow;
    const gridPageWidth = pageWidth;

    // Calculate the row height depending on whether we want to fix the width or the height
    const rowHeight = (fixedHeightGrid) ? fixedPadding + manifest.minRatio * pageWidth : fixedPadding + manifest.maxRatio * pageWidth;

    const groups = [];
    let currentPages = [];

    const getGridPageDimensions = pageData =>
    {
        // Calculate the width, height and horizontal placement of this page
        // Get dimensions at max zoom level, although any level should be fine
        const pageDimenData = pageData.d[pageData.d.length - 1];
        const heightToWidthRatio = pageDimenData.h / pageDimenData.w;

        let pageWidth, pageHeight;

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

    const rowDimensions = {
        height: rowHeight,
        width: viewportWidth
    };

    manifest.pages.forEach( (page, pageIndex) =>
    {
        if (!showNonPagedPages && manifest.paged && !page.paged)
            return;

        // Calculate the width, height and horizontal placement of this page
        const pageDimens = getGridPageDimensions(page);
        let leftOffset = Math.floor(currentPages.length * (fixedPadding + gridPageWidth) + fixedPadding);

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
