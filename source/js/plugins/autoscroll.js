/*
Diva.JS autoscroll plugin
Author: Andrew Horwitz

Lets Diva scroll in the primary direction (as determined by 
settings.horizontallyOriented) automatically at a given/changeable rate.

Relevant settings:
    -scrollSpeed: pixels per second (defaults to 10)
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
                var disableManualScroll;
                var autoScrollRefresh;
                var scrollSpeed;

                divaInstance.startScrolling = function()
                {
                    if(divaSettings.currentlyAutoScrolling)
                    {
                        console.warn("Diva is already autoscrolling!");
                        return;
                    }

                    if(disableManualScroll)
                    {
                        divaInstance.disableScrollable();
                    }

                    divaSettings.currentlyAutoScrolling = true;
                    if(divaSettings.horizontallyOriented)
                    {
                        divaSettings.autoScrollInterval = setInterval(function(){
                            divaSettings.outerObject.scrollLeft(divaSettings.outerObject.scrollLeft() + pixelsPerScroll);
                        }, autoScrollRefresh);
                    }
                    else
                    {
                        divaSettings.autoScrollInterval = setInterval(function(){
                            divaSettings.outerObject.scrollTop(divaSettings.outerObject.scrollTop() + pixelsPerScroll);
                        }, autoScrollRefresh);
                    }
                };

                divaInstance.stopScrolling = function()
                {
                    if(!divaSettings.currentlyAutoScrolling)
                    {
                        console.warn("Diva isn't autoscrolling!");
                        return;
                    }

                    if(disableManualScroll)
                    {
                        divaInstance.enableScrollable();
                    }

                    divaSettings.currentlyAutoScrolling = false;
                    clearInterval(divaSettings.autoScrollInterval);
                };

                divaInstance.changeRefresh = function(newRefresh)
                {
                    autoScrollRefresh = newRefresh;
                    updatePixelsPerScroll();
                };

                divaInstance.changeScrollSpeed = function(newSpeed)
                {
                    scrollSpeed = newSpeed;
                    updatePixelsPerScroll();      
                };

                var updatePixelsPerScroll = function()
                {
                    pixelsPerScroll = scrollSpeed / (1000 / autoScrollRefresh);  
                    
                    //should be minimum of one otherwise it won't change the actual value
                    if(pixelsPerScroll < 1)
                    {
                        autoScrollRefresh = autoScrollRefresh * (1 / pixelsPerScroll);
                        pixelsPerScroll = scrollSpeed / (1000 / autoScrollRefresh); 
                    }
                };

                divaInstance.disableManualScroll = function()
                {
                    disableManualScroll = true;
                    if(divaSettings.currentlyAutoScrolling)
                    {
                        divaInstance.disableScrollable();
                    }
                };

                divaInstance.enableManualScroll = function()
                {
                    disableManualScroll = false;
                    if(divaSettings.currentlyAutoScrolling)
                    {
                        divaInstance.enableScrollable();
                    }
                };

                divaInstance.disableScrollEvents = function()
                {
                    disableScrollEvents = true;
                };

                divaInstance.enableScrollEvents = function()
                {
                    disableScrollEvents = false;
                };

                divaSettings.currentlyAutoScrolling = false;
                divaSettings.autoScrollInterval = "";

                disableManualScroll = divaSettings.disableManualScroll || false;
                disableScrollEvents = divaSettings.disableScrollEvents || false;
                autoScrollRefresh = divaSettings.autoScrollRefresh || 50;
                
                divaInstance.changeScrollSpeed((divaSettings.scrollSpeed || 10));

            },
            pluginName: 'autoscroll',
            titleText: 'Automatically scrolls page along primary axis'
        };
        return retval;
    })());
})(jQuery);