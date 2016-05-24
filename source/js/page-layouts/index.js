var getBookLayoutGroups = require('./book-layout');
var getSinglesLayoutGroups = require('./singles-layout');

module.exports = getPageLayouts;

/** Get the relative positioning of pages for the current view */
function getPageLayouts(viewerConfig)
{
    if (viewerConfig.inBookLayout)
        return getBookLayoutGroups(viewerConfig);
    else
        return getSinglesLayoutGroups(viewerConfig);
}
