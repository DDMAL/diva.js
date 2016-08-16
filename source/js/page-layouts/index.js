var getBookLayoutGroups = require('./book-layout');
var getSinglesLayoutGroups = require('./singles-layout');
var getGridLayoutGroups = require('./grid-layout');

module.exports = getPageLayouts;

/** Get the relative positioning of pages for the current view */
function getPageLayouts(settings)
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
        var config = pluck(settings, ['manifest', 'verticallyOriented', 'showNonPagedPages']);

        if (settings.inBookLayout)
            return getBookLayoutGroups(config);
        else
            return getSinglesLayoutGroups(config);
    }
}

function pluck(obj, keys)
{
    var out = {};
    keys.forEach(function (key)
    {
        out[key] = obj[key];
    });
    return out;
}
