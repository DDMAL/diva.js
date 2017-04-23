import getBookLayoutGroups from './book-layout';
import getSinglesLayoutGroups from './singles-layout';
import getGridLayoutGroups from './grid-layout';

/** Get the relative positioning of pages for the current view */
export default function getPageLayouts (settings)
{
    if (settings.inGrid)
    {
        return getGridLayoutGroups(pluck(settings, [
            'manifest',
            'viewport',
            'pagesPerRow',
            'fixedHeightGrid',
            'fixedPadding',
            'showNonPagedPages'
        ]));
    }
    else
    {
        const config = pluck(settings, ['manifest', 'verticallyOriented', 'showNonPagedPages']);

        if (settings.inBookLayout)
            return getBookLayoutGroups(config);
        else
            return getSinglesLayoutGroups(config);
    }
}

function pluck (obj, keys)
{
    const out = {};
    keys.forEach(function (key)
    {
        out[key] = obj[key];
    });
    return out;
}
