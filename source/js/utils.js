// Some simple utility methods for web storage (e.g., localStorage)
Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function (key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

// from http://forrst.com/posts/jQuery_element_ID_generator-RoM
(function ($) {
    var counter = 1;
    $.generateId = function(suffix) {
        var generatedId;
        do {
            generatedId = (counter++) + (suffix ? '-' + suffix : '');
        } while(document.getElementById(generatedId));

        return generatedId;
    };
})(jQuery);

// From http://www.alexandre-gomes.com/?p=115, modified slightly
(function ($) {
    $.getScrollbarWidth = function() {
        var inner = document.createElement('p');
        inner.style.width = '100%';
        inner.style.height = '200px';

        var outer = document.createElement('div');
        outer.style.position = 'absolute';
        outer.style.top = '0px';
        outer.style.left = '0px';
        outer.style.visibility = 'hidden';
        outer.style.width = '200px';
        outer.style.height = '150px';
        outer.style.overflow = 'hidden';
        outer.appendChild(inner);

        document.body.appendChild(outer);

        var w1 = inner.offsetWidth;
        outer.style.overflow = 'scroll';
        var w2 = inner.offsetWidth;
        if (w1 == w2) {
            w2 = outer.clientWidth; // for IE i think
        }

        document.body.removeChild(outer);
        return w1 - w2;
    };
})(jQuery);

// For getting the #key values from the URL. For specifying a page and zoom level
// Look into caching, because we only need to get this during the initial load
// Although for the tests I guess we would need to override caching somehow
(function ($) {
    $.getHashParam = function(key) {
        var hash = window.location.hash;
        if (hash !== '') {
            // Check if there is something that looks like either &key= or #key=
            var startIndex = (hash.indexOf('&' + key + '=') > 0) ? hash.indexOf('&' + key + '=') : hash.indexOf('#' + key + '=');

            // If startIndex is still -1, it means it can't find either
            if (startIndex >= 0) {
                // Add the length of the key plus the & and =
                startIndex += key.length + 2;

                // Either to the next ampersand or to the end of the string
                var endIndex = hash.indexOf('&', startIndex);
                if (endIndex > startIndex) {
                    return hash.substring(startIndex, endIndex);
                } else if (endIndex < 0) {
                    // This means this hash param is the last one
                    return hash.substring(startIndex);
                }
                // If the key doesn't have a value I think
                return '';
            } else {
                // If it can't find the key
                return false;
            }
        } else {
            // If there are no hash params just return false
            return false;
        }
    };
})(jQuery);

(function ($) {
    $.updateHashParam = function(key, value) {
        // First make sure that we have to do any work at all
        var originalValue = $.getHashParam(key);
        var hash = window.location.hash;
        if (originalValue !== value) {
            // Is the key already in the URL?
            if (typeof originalValue == 'string') {
                // Already in the URL. Just get rid of the original value
                var startIndex = (hash.indexOf('&' + key + '=') > 0) ? hash.indexOf('&' + key + '=') : hash.indexOf('#' + key + '=');
                var endIndex = startIndex + key.length + 2 + originalValue.length;
                // # if it's the first, & otherwise
                var startThing = (startIndex === 0) ? '#' : '&';
                window.location.replace(hash.substring(0, startIndex) + startThing + key + '=' + value + hash.substring(endIndex));
            } else {
                // It's not present - add it
                if (hash.length === 0) {
                    window.location.replace('#' + key + '=' + value);
                } else {
                    // Append it
                    window.location.replace(hash + '&' + key + '=' + value);
                }
            }
        }
    };
})(jQuery);

/*
 * jQuery dragscrollable Plugin
 * version: 1.0 (25-Jun-2009)
 * Copyright (c) 2009 Miquel Herrera
 * http://plugins.jquery.com/project/Dragscrollable
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 */
(function ($) { // secure $ jQuery alias

/**
 * Adds the ability to manage elements scroll by dragging
 * one or more of its descendant elements. Options parameter
 * allow to specifically select which inner elements will
 * respond to the drag events.
 *
 * options properties:
 * ------------------------------------------------------------------------
 *  dragSelector         | jquery selector to apply to each wrapped element
 *                       | to find which will be the dragging elements.
 *                       | Defaults to '>:first' which is the first child of
 *                       | scrollable element
 * ------------------------------------------------------------------------
 *  acceptPropagatedEvent| Will the dragging element accept propagated
 *                       | events? default is yes, a propagated mouse event
 *                       | on a inner element will be accepted and processed.
 *                       | If set to false, only events originated on the
 *                       | draggable elements will be processed.
 * ------------------------------------------------------------------------
 *  preventDefault       | Prevents the event to propagate further effectivey
 *                       | dissabling other default actions. Defaults to true
 * ------------------------------------------------------------------------
 *
 *  usage examples:
 *
 *  To add the scroll by drag to the element id=viewport when dragging its
 *  first child accepting any propagated events
 *  $('#viewport').dragscrollable();
 *
 *  To add the scroll by drag ability to any element div of class viewport
 *  when dragging its first descendant of class dragMe responding only to
 *  evcents originated on the '.dragMe' elements.
 *  $('div.viewport').dragscrollable({dragSelector:'.dragMe:first',
 *                                    acceptPropagatedEvent: false});
 *
 *  Notice that some 'viewports' could be nested within others but events
 *  would not interfere as acceptPropagatedEvent is set to false.
 *
 */
$.fn.dragscrollable = function( options ){

    var settings = $.extend(
        {
            dragSelector:'>:first',
            acceptPropagatedEvent: true,
            preventDefault: true
        },options || {});


    var dragscroll= {
        mouseDownHandler : function(event) {
            // mousedown, left click, check propagation
            if (event.which!=1 ||
                (!event.data.acceptPropagatedEvent && event.target != this)){
                return false;
            }

            // Initial coordinates will be the last when dragging
            event.data.lastCoord = {left: event.clientX, top: event.clientY};

            $.event.add( document, "mouseup",
                         dragscroll.mouseUpHandler, event.data );
            $.event.add( document, "mousemove",
                         dragscroll.mouseMoveHandler, event.data );
            if (event.data.preventDefault) {
                event.preventDefault();
                return false;
            }
        },
        mouseMoveHandler : function(event) { // User is dragging
            // How much did the mouse move?
            var delta = {left: (event.clientX - event.data.lastCoord.left),
                         top: (event.clientY - event.data.lastCoord.top)};

            // Set the scroll position relative to what ever the scroll is now
            event.data.scrollable.scrollLeft(
                            event.data.scrollable.scrollLeft() - delta.left);
            event.data.scrollable.scrollTop(
                            event.data.scrollable.scrollTop() - delta.top);

            // Save where the cursor is
            event.data.lastCoord={left: event.clientX, top: event.clientY};
            if (event.data.preventDefault) {
                event.preventDefault();
                return false;
            }

        },
        mouseUpHandler : function(event) { // Stop scrolling
            $.event.remove( document, "mousemove", dragscroll.mouseMoveHandler);
            $.event.remove( document, "mouseup", dragscroll.mouseUpHandler);
            if (event.data.preventDefault) {
                event.preventDefault();
                return false;
            }
        }
    };

    // set up the initial events
    this.each(function() {
        // closure object data for each scrollable element
        var data = {scrollable : $(this),
                    acceptPropagatedEvent : settings.acceptPropagatedEvent,
                    preventDefault : settings.preventDefault };
        // Set mouse initiating event on the desired descendant
        $(this).find(settings.dragSelector).
                        bind('mousedown', data, dragscroll.mouseDownHandler);
    });
}; //end plugin dragscrollable

})( jQuery ); // confine scope

/*!
    jQuery.kinetic v1.8.2
    Dave Taylor http://the-taylors.org/jquery.kinetic

    The MIT License (MIT)
    Copyright (c) <2011> <Dave Taylor http://the-taylors.org>
*/
/*global define,require */
(function($){
    'use strict';

    var DEFAULT_SETTINGS = {
            cursor: 'move',
            decelerate: true,
            triggerHardware: false,
            y: true,
            x: true,
            slowdown: 0.9,
            maxvelocity: 40,
            throttleFPS: 60,
            movingClass: {
                up: 'kinetic-moving-up',
                down: 'kinetic-moving-down',
                left: 'kinetic-moving-left',
                right: 'kinetic-moving-right'
            },
            deceleratingClass: {
                up: 'kinetic-decelerating-up',
                down: 'kinetic-decelerating-down',
                left: 'kinetic-decelerating-left',
                right: 'kinetic-decelerating-right'
            }
        },
        SETTINGS_KEY = 'kinetic-settings',
        ACTIVE_CLASS = 'kinetic-active';
    /**
     * Provides requestAnimationFrame in a cross browser way.
     * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
     */
    if ( !window.requestAnimationFrame ) {

        window.requestAnimationFrame = ( function() {

            return window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
                window.setTimeout( callback, 1000 / 60 );
            };

        }());

    }

    // add touch checker to jQuery.support
    $.support = $.support || {};
    $.extend($.support, {
        touch: "ontouchend" in document
    });
    var selectStart = function() { return false; };

    var decelerateVelocity = function(velocity, slowdown) {
        return Math.floor(Math.abs(velocity)) === 0 ? 0 // is velocity less than 1?
               : velocity * slowdown; // reduce slowdown
    };

    var capVelocity = function(velocity, max) {
        var newVelocity = velocity;
        if (velocity > 0) {
            if (velocity > max) {
                newVelocity = max;
            }
        } else {
            if (velocity < (0 - max)) {
                newVelocity = (0 - max);
            }
        }
        return newVelocity;
    };

    var setMoveClasses = function(settings, classes) {
        this.removeClass(settings.movingClass.up)
            .removeClass(settings.movingClass.down)
            .removeClass(settings.movingClass.left)
            .removeClass(settings.movingClass.right)
            .removeClass(settings.deceleratingClass.up)
            .removeClass(settings.deceleratingClass.down)
            .removeClass(settings.deceleratingClass.left)
            .removeClass(settings.deceleratingClass.right);

        if (settings.velocity > 0) {
            this.addClass(classes.right);
        }
        if (settings.velocity < 0) {
            this.addClass(classes.left);
        }
        if (settings.velocityY > 0) {
            this.addClass(classes.down);
        }
        if (settings.velocityY < 0) {
            this.addClass(classes.up);
        }

    };

    var stop = function($scroller, settings) {
        settings.velocity = 0;
        settings.velocityY = 0;
        settings.decelerate = true;
        if (typeof settings.stopped === 'function') {
            settings.stopped.call($scroller, settings);
        }
    };

    /** do the actual kinetic movement */
    var move = function($scroller, settings) {
        var scroller = $scroller[0];
        // set scrollLeft
        if (settings.x && scroller.scrollWidth > 0){
            scroller.scrollLeft = settings.scrollLeft = scroller.scrollLeft + settings.velocity;
            if (Math.abs(settings.velocity) > 0) {
                settings.velocity = settings.decelerate ?
                    decelerateVelocity(settings.velocity, settings.slowdown) : settings.velocity;
            }
        } else {
            settings.velocity = 0;
        }

        // set scrollTop
        if (settings.y && scroller.scrollHeight > 0){
            scroller.scrollTop = settings.scrollTop = scroller.scrollTop + settings.velocityY;
            if (Math.abs(settings.velocityY) > 0) {
                settings.velocityY = settings.decelerate ?
                    decelerateVelocity(settings.velocityY, settings.slowdown) : settings.velocityY;
            }
        } else {
            settings.velocityY = 0;
        }

        setMoveClasses.call($scroller, settings, settings.deceleratingClass);

        if (typeof settings.moved === 'function') {
            settings.moved.call($scroller, settings);
        }

        if (Math.abs(settings.velocity) > 0 || Math.abs(settings.velocityY) > 0) {
            // tick for next movement
            window.requestAnimationFrame(function(){ move($scroller, settings); });
        } else {
            stop($scroller, settings);
        }
    };

    var callOption = function(method, options) {
        var methodFn = $.kinetic.callMethods[method],
            args = Array.prototype.slice.call(arguments)
        ;
        if (methodFn) {
            this.each(function(){
                var opts = args.slice(1), settings = $(this).data(SETTINGS_KEY);
                opts.unshift(settings);
                methodFn.apply(this, opts);
            });
        }
    };

    var attachListeners = function($this, settings) {
        var element = $this[0];
        if ($.support.touch) {
            $this.bind('touchstart', settings.events.touchStart)
                .bind('touchend', settings.events.inputEnd)
                .bind('touchmove', settings.events.touchMove)
            ;
        } else {
            $this
                .mousedown(settings.events.inputDown)
                .mouseup(settings.events.inputEnd)
                .mousemove(settings.events.inputMove)
            ;
        }
        $this
            .click(settings.events.inputClick)
            .scroll(settings.events.scroll)
            .bind("selectstart", selectStart) // prevent selection when dragging
            .bind('dragstart', settings.events.dragStart);
    };
    var detachListeners = function($this, settings) {
        var element = $this[0];
        if ($.support.touch) {
            $this.unbind('touchstart', settings.events.touchStart)
                .unbind('touchend', settings.events.inputEnd)
                .unbind('touchmove', settings.events.touchMove);
        } else {
            $this
            .unbind('mousedown', settings.events.inputDown)
            .unbind('mouseup', settings.events.inputEnd)
            .unbind('mousemove', settings.events.inputMove)
            .unbind('scroll', settings.events.scroll);
        }
        $this.unbind('click', settings.events.inputClick)
        .unbind("selectstart", selectStart); // prevent selection when dragging
        $this.unbind('dragstart', settings.events.dragStart);
    };

    var initElements = function(options) {
        this
        .addClass(ACTIVE_CLASS)
        .each(function(){

            var self = this,
                $this = $(this);

            if ($this.data(SETTINGS_KEY)){
                return;
            }

            var settings = $.extend({}, DEFAULT_SETTINGS, options),
                xpos,
                prevXPos = false,
                ypos,
                prevYPos = false,
                mouseDown = false,
                scrollLeft,
                scrollTop,
                throttleTimeout = 1000 / settings.throttleFPS,
                lastMove,
                elementFocused
            ;

            settings.velocity = 0;
            settings.velocityY = 0;

            // make sure we reset everything when mouse up
            var resetMouse = function() {
                xpos = false;
                ypos = false;
                mouseDown = false;
            };
            $(document).mouseup(resetMouse).click(resetMouse);

            var calculateVelocities = function() {
                settings.velocity    = capVelocity(prevXPos - xpos, settings.maxvelocity);
                settings.velocityY   = capVelocity(prevYPos - ypos, settings.maxvelocity);
            };
            var useTarget = function(target) {
                if ($.isFunction(settings.filterTarget)) {
                    return settings.filterTarget.call(self, target) !== false;
                }
                return true;
            };
            var start = function(clientX, clientY) {
                mouseDown = true;
                settings.velocity = prevXPos = 0;
                settings.velocityY = prevYPos = 0;
                xpos = clientX;
                ypos = clientY;
            };
            var end = function() {
                if (xpos && prevXPos && settings.decelerate === false) {
                    settings.decelerate = true;
                    calculateVelocities();
                    xpos = prevXPos = mouseDown = false;
                    move($this, settings);
                }
            };
            var inputmove = function(clientX, clientY) {
                if (!lastMove || new Date() > new Date(lastMove.getTime() + throttleTimeout)) {
                    lastMove = new Date();

                    if (mouseDown && (xpos || ypos)) {
                        if (elementFocused) {
                            $(elementFocused).blur();
                            elementFocused = null;
                            $this.focus();
                        }
                        settings.decelerate = false;
                        settings.velocity   = settings.velocityY  = 0;
                        $this[0].scrollLeft = settings.scrollLeft = settings.x ? $this[0].scrollLeft - (clientX - xpos) : $this[0].scrollLeft;
                        $this[0].scrollTop  = settings.scrollTop  = settings.y ? $this[0].scrollTop - (clientY - ypos)  : $this[0].scrollTop;
                        prevXPos = xpos;
                        prevYPos = ypos;
                        xpos = clientX;
                        ypos = clientY;

                        calculateVelocities();
                        setMoveClasses.call($this, settings, settings.movingClass);

                        if (typeof settings.moved === 'function') {
                            settings.moved.call($this, settings);
                        }
                    }
                }
            };

            // Events
            settings.events = {
                touchStart: function(e){
                    var touch;
                    if (useTarget(e.target)) {
                        touch = e.originalEvent.touches[0];
                        start(touch.clientX, touch.clientY);
                        e.stopPropagation();
                    }
                },
                touchMove: function(e){
                    var touch;
                    if (mouseDown) {
                        touch = e.originalEvent.touches[0];
                        inputmove(touch.clientX, touch.clientY);
                        if (e.preventDefault) {e.preventDefault();}
                    }
                },
                inputDown: function(e){
                    if (useTarget(e.target)) {
                        start(e.clientX, e.clientY);
                        elementFocused = e.target;
                        if (e.target.nodeName === 'IMG'){
                            e.preventDefault();
                        }
                        e.stopPropagation();
                    }
                },
                inputEnd: function(e){
                    end();
                    elementFocused = null;
                    if (e.preventDefault) {e.preventDefault();}
                },
                inputMove: function(e) {
                    if (mouseDown){
                        inputmove(e.clientX, e.clientY);
                        if (e.preventDefault) {e.preventDefault();}
                    }
                },
                scroll: function(e) {
                    if (typeof settings.moved === 'function') {
                        settings.moved.call($this, settings);
                    }
                    if (e.preventDefault) {e.preventDefault();}
                },
                inputClick: function(e){
                    if (Math.abs(settings.velocity) > 0) {
                        e.preventDefault();
                        return false;
                    }
                },
                // prevent drag and drop images in ie
                dragStart: function(e) {
                    if (elementFocused) {
                        return false;
                    }
                }
            };

            attachListeners($this, settings);
            $this.data(SETTINGS_KEY, settings)
                .css("cursor", settings.cursor);

            if (settings.triggerHardware) {
                $this.css({
                    '-webkit-transform': 'translate3d(0,0,0)',
                    '-webkit-perspective': '1000',
                    '-webkit-backface-visibility': 'hidden'
                });
            }
        });
    };

    $.kinetic = {
        settingsKey: SETTINGS_KEY,
        callMethods: {
            start: function(settings, options){
                var $this = $(this);
                settings = $.extend(settings, options);
                if (settings) {
                    settings.decelerate = false;
                    move($this, settings);
                }
            },
            end: function(settings, options){
                var $this = $(this);
                if (settings) {
                    settings.decelerate = true;
                }
            },
            stop: function(settings, options){
                var $this = $(this);
                stop($this, settings);
            },
            detach: function(settings, options) {
                var $this = $(this);
                detachListeners($this, settings);
                $this
                .removeClass(ACTIVE_CLASS)
                .css("cursor", "");
            },
            attach: function(settings, options) {
                var $this = $(this);
                attachListeners($this, settings);
                $this
                .addClass(ACTIVE_CLASS)
                .css("cursor", "move");
            }
        }
    };
    $.fn.kinetic = function(options) {
        if (typeof options === 'string') {
            callOption.apply(this, arguments);
        } else {
            initElements.call(this, options);
        }
        return this;
    };

}(window.jQuery || window.Zepto));

/**
*      Events. Pub/Sub system for Loosely Coupled logic.
*      Based on Peter Higgins' port from Dojo to jQuery
*      https://github.com/phiggins42/bloody-jquery-plugins/blob/master/pubsub.js
*
*      Re-adapted to vanilla Javascript
*
*      @class Events
*/
var diva = (function() {
    var cache = {};
    var pub = {
        Events: {
            /**
             *      diva.Events.publish
             *      e.g.: diva.Events.publish("PageDidLoad", [pageIndex, filename, pageSelector], this);
             *
             *      @class Events
             *      @method publish
             *      @param topic {String}
             *      @param args     {Array}
             *      @param scope {Object} Optional
             */
            publish: function (topic, args, scope)
            {
                if (cache[topic])
                {
                    var thisTopic = cache[topic],
                        i = thisTopic.length;

                    while (i--)
                        thisTopic[i].apply( scope || this, args || []);
                }
            },
            /**
             *      diva.Events.subscribe
             *      e.g.: diva.Events.subscribe("PageDidLoad", highlight)
             *
             *      @class Events
             *      @method subscribe
             *      @param topic {String}
             *      @param callback {Function}
             *      @return Event handler {Array}
             */
            subscribe: function (topic, callback)
            {
                if (!cache[topic])
                    cache[topic] = [];

                cache[topic].push(callback);
                return [topic, callback];
            },
            /**
             *      diva.Events.unsubscribe
             *      e.g.: var handle = Events.subscribe("PageDidLoad", highlight);
             *              Events.unsubscribe(handle);
             *
             *      @class Events
             *      @method unsubscribe
             *      @param handle {Array}
             *      @param completely {Boolean} - Unsubscribe all events for a given topic.
             *      @return success {Boolean}
             */
            unsubscribe: function (handle, completely)
            {
                var t = handle[0];

                if (cache[t])
                {
                    var i = cache[t].length;
                    while (i--)
                    {
                        if (cache[t][i] === handle[1])
                        {
                            cache[t].splice(i, 1);
                            if (completely)
                                delete cache[t];
                            return true;
                        }
                    }
                }
                return false;
            },
            /**
             *      diva.Events.unsubscribeAll
             *      e.g.: diva.Events.unsubscribeAll();
             *
             *      @class Events
             *      @method unsubscribe
             */
            unsubscribeAll: function ()
            {
                cache = {};
            }
        }
    };
    return pub;
}());

//Used to keep track of whether Diva was last clicked or which Diva was last clicked when there are multiple
var activeDivaController = function ()
{
    var active;

    //global click listener
    $(document).on('click', function(e)
    {
        updateActive($(e.target));
    });

    //parameter should already be a jQuery selector
    var updateActive = function (target)
    {
        var nearestOuter;

        //these will find 0 or 1 objects, never more
        var findOuter = target.find('.diva-outer');
        var closestOuter = target.closest('.diva-outer');
        var outers = document.getElementsByClassName('diva-outer');
        var outerLen = outers.length;
        var idx;

        //clicked on something that was not either a parent or sibling of a diva-outer
        if (findOuter.length > 0) 
        {
            nearestOuter = findOuter;
        }
        //clicked on something that was a child of a diva-outer
        else if (closestOuter.length > 0)
        {
            nearestOuter = closestOuter;
        }
        //clicked on something that was not in any Diva tree
        else 
        {
            //deactivate everything and return            
            for (idx = 0; idx < outerLen; idx++)
            {
                $(outers[idx].parentElement).data('diva').deactivate();
            }
            return;
        }

        //if we found one, activate it...
        nearestOuter.parent().data('diva').activate();
        active = nearestOuter.parent();

        //...and deactivate all the others
        outers = document.getElementsByClassName('diva-outer');
        for(idx = 0; idx < outerLen; idx++)
        {
            //getAttribute to attr - comparing DOM element to jQuery element
            if (outers[idx].getAttribute('id') != nearestOuter.attr('id'))
                $(outers[idx].parentElement).data('diva').deactivate();
        }
    };

    //public accessor in case. Will return a jQuery selector.
    this.getActive = function()
    {
        return active;
    };
};

var activeDiva = new activeDivaController();