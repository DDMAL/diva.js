export default function getPageDimensions (pageIndex, manifest)
{
    const dims = manifest.getMaxPageDimensions(pageIndex);

    return {
        width: Math.floor(dims.width),
        height: Math.floor(dims.height)
    };
}
