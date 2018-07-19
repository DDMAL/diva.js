export default class IIIFSourceAdapter
{
    getPageImageURL (manifest, pageIndex, size)
    {
        let dimens;

        if (!size || (size.width == null && size.height == null))
        {
            dimens = 'full';
        }
        else
        {
            dimens = (size.width == null ? '' : size.width) + ',' + (size.height == null ? '' : size.height);
        }

        const page = manifest.pages[pageIndex];
        const quality = (page.api > 1.1) ? 'default' : 'native';

        return encodeURI(page.url + 'full/' + dimens + '/0/' + quality + '.jpg');
    }

    getTileImageURL (manifest, pageIndex, params)
    {
        const page = manifest.pages[pageIndex];

        let height, width;

        if (params.row === params.rowCount - 1)
        {
            height = page.d[params.zoomLevel].h - (params.rowCount - 1) * params.tileDimensions.height;
        }
        else
        {
            height = params.tileDimensions.height;
        }

        if (params.col === params.colCount - 1)
        {
            width = page.d[params.zoomLevel].w - (params.colCount - 1) * params.tileDimensions.width;
        }
        else
        {
            width = params.tileDimensions.width;
        }

        const zoomDifference = Math.pow(2, manifest.maxZoom - params.zoomLevel);

        let x = params.col * params.tileDimensions.width * zoomDifference;
        let y = params.row * params.tileDimensions.height * zoomDifference;

        if (page.hasOwnProperty('xoffset'))
        {
            x += page.xoffset;
            y += page.yoffset;
        }

        const region = [x, y, width * zoomDifference, height * zoomDifference].join(',');

        const quality = (page.api > 1.1) ? 'default' : 'native';

        return encodeURI(page.url + region + '/' + width + ',' + height + '/0/' + quality + '.jpg');
    }
}
