/*
Diva.JS autoscroll plugin
Author: Andrew Horwitz

Lets Diva scroll in the primary direction (as determined by 
settings.horizontallyOriented) automatically at a given/changeable rate.

Relevant settings:
    -scrollSpeed: seconds to move 1000 pixels
    -disableManualScroll: disables manual scroll while automatic scroll is on (defaults to false)
    -disableScrollEvents: automatic scroll will not trigger scrolling events (defaults to false)
    -currentlyAutoScrolling: whether or not autoscroll is currently on
    -autoScrollRefresh: ms between scrolling actions

Notes for Andrew:
    -spacebar to turn scroll on/off?
    -add counter to toolbar
    -add "slow", "medium", "fast" options for scroll speed
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
                var pixelsPerScroll;

                divaInstance.startScrolling = function()
                {
                    if(divaSettings.currentlyAutoScrolling)
                    {
                        console.warn("Diva is already autoscrolling!");
                        return;
                    }

                    divaSettings.currentlyAutoScrolling = true;
                    if(divaSettings.horizontallyOriented)
                    {
                        divaSettings.autoScrollInterval = setInterval(function(){
                            divaSettings.outerObject.scrollLeft(divaSettings.outerObject.scrollLeft() + pixelsPerScroll);
                        }, divaSettings.autoScrollRefresh);
                    }
                    else
                    {
                        divaSettings.autoScrollInterval = setInterval(function(){
                            divaSettings.outerObject.scrollTop(divaSettings.outerObject.scrollTop() + pixelsPerScroll);
                        }, divaSettings.autoScrollRefresh);
                    }
                };

                divaInstance.stopScrolling = function()
                {
                    if(!divaSettings.currentlyAutoScrolling)
                    {
                        console.warn("Diva isn't autoscrolling!");
                        return;
                    }

                    divaSettings.currentlyAutoScrolling = false;
                    clearInterval(divaSettings.autoScrollInterval);
                };

                divaInstance.changeScrollSpeed = function(newSpeed)
                {
                    divaSettings.scrollSpeed = newSpeed;
                    pixelsPerScroll = 1000 / divaSettings.scrollSpeed / divaSettings.autoScrollRefresh;
                            
                };

                divaSettings.currentlyAutoScrolling = false;
                divaSettings.autoScrollInterval = "";

                if(divaSettings.disableManualScroll === undefined)
                    divaSettings.disableManualScroll = false;

                if(divaSettings.disableScrollEvents === undefined)
                    divaSettings.disableScrollEvents = false;

                if(divaSettings.autoScrollRefresh === undefined)
                    divaSettings.autoScrollRefresh = 10;

                if(divaSettings.scrollSpeed === undefined)
                    divaInstance.changeScrollSpeed(100);

            },
            pluginName: 'autoscroll',
            titleText: 'Automatically scrolls page along primary axis'
        };
        return retval;
    })());
})(jQuery);