/*
Diva.JS pagealias plugin
Author: Andrew Horwitz

Lets pages be set up with custom aliases to allow for sections with different 
numbering schemas.

Diva needs to be instantiated with one or both of the following settings:

1) a pageAliases dictionary attribute, structured as {(0-indexed page index): 
(aliased page index)}. For example, a document with three forward pages may be 
constructed as:

    {0: 'i', 1: 'ii', 2: 'iii'}

This object does not need to have a complete list of possible page indices. 

2) a pageAliasFunction function that takes in a 0-indexed integer value (the 
original page index) and returns either the aliased page index or the boolean
value "false". For example, the default mapping from 0-index to 1-index may be 
constructed as:

    pageAliasFunction: function(originalPageIndex)
    {
        return originalPageIndex + 1;
    }


This plugin is solely for cosmetic purposes; it will replace the "Page _ of XX" 
counter and add functions that run in parallel with their non-aliased 
equivalents instead of replacing them. When one of the aliased functions is 
called, the  plugin will first try to find the page alias in the pageAliases 
attribute. If this fails, the plugin will then pass the original page index into
the pageAliasFunction function. If this function returns a boolean "false" (NOT 
a number 0 or an undefined), the plugin will revert to the default page index.

The plugin may also be instantiated with the 'divaSettings.newTotalPages' 
attribute, which will replace the "Page 1 of __" counter.
*/

(function ($)
{
    window.divaPlugins.push((function()
    {
        var settings = {};
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                if (divaSettings.pageAliases === undefined) 
                {
                    divaSettings.pageAliases = {};
                }

                if (divaSettings.pageAliasFunction === undefined)
                {
                    divaSettings.pageAliasFunction = function(){return false;};
                } 

                if (divaSettings.newTotalPages === undefined)
                {
                    $(divaSettings.ID + 'num-pages').text(divaSettings.newTotalPages);
                }
                
                /*
                    Main function. Will return the first of these three that 
                        resolves to boolean true:
                    -Explicit alias as defined in pageAliases
                    -Result of pageAliasFunction
                    -originalPageIndex itself

                    Else the function will return the result of isPageValid, 
                        which is a safer way of returning false.
                */
                divaInstance.getAliasForPageIndex = function(originalPageIndex)
                {
                    return divaSettings.pageAliases[originalPageIndex] || divaSettings.pageAliasFunction(originalPageIndex) || originalPageIndex || divaInstance.isPageValid(originalPageIndex);
                };

                //Maps the current page index to getAliasForPageIndex
                divaInstance.getCurrentAliasedPageIndex = function()
                {
                    return divaInstance.getAliasForPageIndex(divaSettings.currentPageIndex);
                };

                //unsubscribe the default currentPage updater
                diva.Events.unsubscribe("VisiblePageDidChange", divaSettings.toolbar.updateCurrentPage);
                        
                updateCurrentAliasedPage = function ()
                {
                    document.getElementById(divaSettings.ID + 'current-page').textContent = divaInstance.getCurrentAliasedPageIndex();
                };
            },
            pluginName: 'pagealias',
            titleText: 'Re-alias page indexes'
        };
        return retval;
    })());
})(jQuery);