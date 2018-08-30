import getPageDimensions from './page-dimensions';

export default function getSinglesLayoutGroups (viewerConfig)
{
    const manifest = viewerConfig.manifest;

    // Render each page alone in a group
    const pages = [];
    manifest.pages.forEach( (page, index) =>
    {
        if (!viewerConfig.showNonPagedPages && manifest.paged && !page.paged)
            return;

        const pageDims = getPageDimensions(index, manifest);

        pages.push({
            dimensions: pageDims,
            pages: [{
                index: index,
                groupOffset: { top: 0, left: 0 },
                dimensions: pageDims
            }]
        });
    });

    return pages;
}
