/*
Diva.JS pagealias plugin
Author: Andrew Horwitz

Lets pages be set up with custom aliases to allow for sections with different numbering schemas.
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
                if(divaSettings.pageAliases === undefined)
                {
                    console.warn("You've enabled the pagealias plugin but did not include a pageAliases object on instantiating Diva. The plugin will continue to work but no aliases are currently mapped.");
                }
            },
            pluginName: 'pagealias',
            titleText: 'Re-alias page indexes'
        };
        return retval;
    })());
})(jQuery);