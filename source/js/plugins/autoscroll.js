/*
Diva.JS autoscroll plugin
Author: Andrew Horwitz

Lets Diva scroll in the primary direction (as determined by 
settings.verticallyOriented) automatically at a given/changeable rate.

Relevant settings:
    -scrollSpeed: pixels per second (defaults to 10)
    -disableManualScroll: disables manual scroll while automatic scroll is on (defaults to false)
    -currentlyAutoScrolling: whether or not autoscroll is currently on
    -autoScrollRefresh: ms between scrolling actions
    -disableAutoscrollPrefs: disables the autoscroll preferences panel

Relevant methods:
    -startScrolling, stopScrolling, toggleScrolling
    -changeRefresh, changeScrollSpeed (setters for respective options)
    -disableManualScroll, enableManualScroll
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
                var defaultAutoRefresh;
                var scrollSpeed;

                function log10(x)
                {
                    return Math.log(x) / Math.log(10);
                }

                divaInstance.startScrolling = function()
                {
                    if (divaSettings.currentlyAutoScrolling)
                    {
                        console.warn("You are trying to start autoscrolling, but it is already scrolling.");
                        return;
                    }

                    $("#" + divaSettings.ID + "autoscroll-toggle").text("Turn off");
                    if (disableManualScroll)
                    {
                        divaInstance.disableScrollable();
                    }

                    divaSettings.currentlyAutoScrolling = true;
                    restartScrollingInterval();
                };

                restartScrollingInterval = function()
                {
                    clearInterval(divaSettings.autoScrollInterval);
                    if (divaSettings.verticallyOriented)
                    {
                        divaSettings.autoScrollInterval = setInterval(function(){
                            divaSettings.outerObject.scrollTop(divaSettings.outerObject.scrollTop() + pixelsPerScroll);
                        }, autoScrollRefresh);
                    }
                    else
                    {
                        divaSettings.autoScrollInterval = setInterval(function(){
                            divaSettings.outerObject.scrollLeft(divaSettings.outerObject.scrollLeft() + pixelsPerScroll);
                        }, autoScrollRefresh);
                    }
                };

                divaInstance.stopScrolling = function()
                {
                    if (!divaSettings.currentlyAutoScrolling)
                    {
                        console.warn("You are trying to stop autoscrolling, but it is not currently active.");
                        return;
                    }

                    $("#" + divaSettings.ID + "autoscroll-toggle").text("Turn on");
                    if (disableManualScroll)
                    {
                        divaInstance.enableScrollable();
                    }

                    divaSettings.currentlyAutoScrolling = false;
                    clearInterval(divaSettings.autoScrollInterval);
                };

                divaInstance.toggleScrolling = function()
                {
                    divaSettings.currentlyAutoScrolling ? divaInstance.stopScrolling() : divaInstance.startScrolling();
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

                    $("#" + divaSettings.ID + "autoscroll-pps").val(log10(scrollSpeed));  
                    if (divaSettings.currentlyAutoScrolling)
                    {
                        restartScrollingInterval();
                    }
                };

                var updatePixelsPerScroll = function()
                {
                    autoScrollRefresh = defaultAutoRefresh;
                    pixelsPerScroll = scrollSpeed / (1000 / autoScrollRefresh);  
                    
                    //should be minimum of one otherwise it won't change the actual value
                    //user can change autoscrollrefresh or scrollspeed; this may overwrite autoScrollRefresh
                    if (pixelsPerScroll < 1)
                    {
                        autoScrollRefresh = autoScrollRefresh * (1 / pixelsPerScroll);
                        pixelsPerScroll = scrollSpeed / (1000 / autoScrollRefresh); 
                    }
                };

                divaInstance.disableManualScroll = function()
                {
                    disableManualScroll = true;
                    if (divaSettings.currentlyAutoScrolling)
                    {
                        divaInstance.disableScrollable();
                    }
                };

                divaInstance.enableManualScroll = function()
                {
                    disableManualScroll = false;
                    if (divaSettings.currentlyAutoScrolling)
                    {
                        divaInstance.enableScrollable();
                    }
                };

                divaSettings.currentlyAutoScrolling = false;
                divaSettings.autoScrollInterval = "";

                disableManualScroll = divaSettings.disableManualScroll || false;
                autoScrollRefresh = divaSettings.autoScrollRefresh || 50;
                defaultAutoRefresh = autoScrollRefresh;
                
                divaInstance.changeScrollSpeed((divaSettings.scrollSpeed || 10));

                $(window).on('keyup', function(e)
                {
                    if (e.shiftKey && e.keyCode === 32)
                    {
                        divaInstance.toggleScrolling();
                    }
                });
                
                if (!divaSettings.disableAutoscrollPrefs)
                {
                    diva.Events.subscribe('ViewerDidLoad', function(s)
                    {
                        var autoscrollPrefsString = 
                        "<div id='" + divaSettings.ID + "autoscroll-prefs' class='diva-autoscroll-prefs diva-popup'>" +
                            "<b>Autoscrolling options:</b><br>" +
                            "<span class='diva-autoscroll-prefs-text'>Pixels per second:</span>" +
                            "<input type='range' id='" + divaSettings.ID + "autoscroll-pps' class='diva-autoscroll-pps diva-autoscroll-prefs-input' value='" + log10(scrollSpeed) + "' min='0' max='3' step='0.1'><br>" +
                            "<span class='diva-autoscroll-prefs-text'>Allow manual scroll:</span>" +
                            "<input type='checkbox' id='" + divaSettings.ID + "autoscroll-manual' class='diva-autoscroll-manual diva-autoscroll-prefs-input' checked='checked'><br>" +
                            "<button id='" + divaSettings.ID + "autoscroll-toggle' class='diva-autoscroll-prefs-toggle diva-autoscroll-prefs-input'> Turn on </button>" + 
                        "</div>";
                        $("#" + divaSettings.ID + "page-nav").before("<div id='" + divaSettings.ID + "autoscroll-icon' class='button diva-autoscroll-icon' title='Expand autoscroll options'></div>");
                        $("body").prepend(autoscrollPrefsString);
                        
                        $("#" + divaSettings.ID + "autoscroll-pps").on('change', function(e)
                        {
                            divaInstance.changeScrollSpeed(Math.pow(10, e.target.value));
                        });

                        $("#" + divaSettings.ID + "autoscroll-manual").on('change', function(e)
                        {
                            e.target.checked ? divaInstance.enableManualScroll() : divaInstance.disableManualScroll();
                        });

                        $("#" + divaSettings.ID + "autoscroll-toggle").on('click', divaInstance.toggleScrolling);

                        $("#" + divaSettings.ID + "autoscroll-icon").on('click', function(e)
                        {
                            var jqObj = $("#" + divaSettings.ID + "autoscroll-prefs");
                            if (jqObj.css('display') === 'none')
                            {
                                jqObj.css({
                                    'display': 'block',
                                    'right': $(window).width() - (divaSettings.outerObject.offset().left + divaSettings.outerObject.outerWidth()) + divaSettings.scrollbarWidth
                                });
                                jqObj.offset({'top': divaSettings.outerObject.offset().top + 1});
                            }
                            else
                            {
                                jqObj.css('display', 'none');
                            }
                        });
                    });
                }
            },
            pluginName: 'autoscroll',
            titleText: 'Automatically scrolls page along primary axis'
        };
        return retval;
    })());
})(jQuery);