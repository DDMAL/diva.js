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

                /*
                    Main function. Will return the first of these three that 
                        resolves to boolean true:
                    -Explicit alias as defined in pageAliases
                    -Result of pageAliasFunction
                    -originalPageIndex + 1 (to simulate the original mapping)

                    Else the function will return false.
                */
                divaInstance.getAliasForPageIndex = function(originalPageIndex)
                {
                    return divaSettings.pageAliases[originalPageIndex] || divaSettings.pageAliasFunction(originalPageIndex) || originalPageIndex + 1;
                };

                /*
                    Returns the first page index found for a given aliased number or false if not found.
                    This may cause issues if a specific alias is found for multiple page indices; use getPageIndicesForAlias and reimplement functions as necessary if this is the case.
                */
                divaInstance.getPageIndexForAlias = function(aliasedNumber)
                {
                    for(var idx = 0; idx < divaSettings.numPages; idx++)
                    {
                        if(divaInstance.getAliasForPageIndex(idx) == aliasedNumber)
                        {
                            return idx;
                        }
                    }
                    return false;
                };

                //Returns array of page indices for a given aliased number. Returns an empty array if none are found.
                divaInstance.getPageIndicesForAlias = function(aliasedNumber)
                {
                    var indexArr = [];
                    for(var idx = 0; idx < divaSettings.numPages; idx++)
                    {
                        if(divaInstance.getAliasForPageIndex(idx) == aliasedNumber)
                        {
                            indexArr.push(idx);
                        }
                    }
                    return indexArr;
                };


                //Maps the current page index to getAliasForPageIndex
                divaInstance.getCurrentAliasedPageIndex = function()
                {
                    return divaInstance.getAliasForPageIndex(divaSettings.currentPageIndex);
                };

                //Wrapper for gotoPageByIndex, keeping the aliased numbers in mind
                divaInstance.gotoPageByAliasedNumber = function(aliasedNumber, xAnchor, yAnchor)
                {
                    return divaInstance.gotoPageByIndex(divaInstance.getPageIndexForAlias(aliasedNumber), xAnchor, yAnchor);
                };

                //this function overwrites updateCurrentPage from the main diva file to update page numbers on VisiblePAgeDidChange
                updateCurrentAliasedPage = function ()
                {
                    document.getElementById(this.getSettings().ID + 'current-page').textContent = this.getCurrentAliasedPageIndex();
                };

                //various changes that need to be made once viewer is loaded
                initialChanges = function ()
                {
                    //changes total pages value in GUI
                    var tempSettings = this.getSettings();
                    var newTotalPages = tempSettings.numPages;
                    if (tempSettings.newTotalPages !== undefined)
                    {
                        newTotalPages = tempSettings.newTotalPages;
                    }

                    else if (tempSettings.totalPageOffset !== undefined)
                    {
                        newTotalPages = newTotalPages + tempSettings.totalPageOffset;
                    }

                    //actually changes values
                    document.getElementById(this.getSettings().ID + 'num-pages').textContent = newTotalPages;
                    document.getElementById(this.getSettings().ID + 'current-page').textContent = this.getCurrentAliasedPageIndex();
                    
                    //resubscribes our new update function
                    diva.Events.unsubscribe(["VisiblePageDidChange", tempSettings.toolbar.updateCurrentPage]);
                    diva.Events.subscribe("VisiblePageDidChange", updateCurrentAliasedPage);
                };

                diva.Events.subscribe("ViewerDidLoad", initialChanges);
            },
            pluginName: 'pagealias',
            titleText: 'Re-aliases page indexes'
        };
        return retval;
    })());
})(jQuery);