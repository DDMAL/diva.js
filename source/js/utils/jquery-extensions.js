var jQuery = require('jquery');

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
                    return decodeURIComponent(hash.substring(startIndex, endIndex));
                } else if (endIndex < 0) {
                    // This means this hash param is the last one
                    return decodeURIComponent(hash.substring(startIndex));
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

/**
 jQuery.kinetic v2.2.1
 Dave Taylor http://davetayls.me

 @license The MIT License (MIT)
 @preserve Copyright (c) 2012 Dave Taylor http://davetayls.me
 */
(function ($){
    'use strict';

    var ACTIVE_CLASS = 'kinetic-active';

    /**
     * Provides requestAnimationFrame in a cross browser way.
     * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
     */
    if (!window.requestAnimationFrame){

        window.requestAnimationFrame = ( function (){

            return window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element){
                    window.setTimeout(callback, 1000 / 60);
                };

        }());

    }

    // add touch checker to jQuery.support
    $.support = $.support || {};
    $.extend($.support, {
        touch: 'ontouchend' in document
    });


    // KINETIC CLASS DEFINITION
    // ======================

    var Kinetic = function (element, settings) {
        this.settings = settings;
        this.el       = element;
        this.$el      = $(element);

        this._initElements();

        return this;
    };

    Kinetic.DATA_KEY = 'kinetic';
    Kinetic.DEFAULTS = {
        cursor: 'move',
        decelerate: true,
        triggerHardware: false,
        threshold: 0,
        y: true,
        x: true,
        slowdown: 0.9,
        maxvelocity: 40,
        throttleFPS: 60,
        invert: false,
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
    };


    // Public functions

    Kinetic.prototype.start = function (options){
        this.settings = $.extend(this.settings, options);
        this.velocity = options.velocity || this.velocity;
        this.velocityY = options.velocityY || this.velocityY;
        this.settings.decelerate = false;
        this._move();
    };

    Kinetic.prototype.end = function (){
        this.settings.decelerate = true;
    };

    Kinetic.prototype.stop = function (){
        this.velocity = 0;
        this.velocityY = 0;
        this.settings.decelerate = true;
        if ($.isFunction(this.settings.stopped)){
            this.settings.stopped.call(this);
        }
    };

    Kinetic.prototype.detach = function (){
        this._detachListeners();
        this.$el
            .removeClass(ACTIVE_CLASS)
            .css('cursor', '');
    };

    Kinetic.prototype.attach = function (){
        if (this.$el.hasClass(ACTIVE_CLASS)) {
            return;
        }
        this._attachListeners(this.$el);
        this.$el
            .addClass(ACTIVE_CLASS)
            .css('cursor', this.settings.cursor);
    };


    // Internal functions

    Kinetic.prototype._initElements = function (){
        this.$el.addClass(ACTIVE_CLASS);

        $.extend(this, {
            xpos: null,
            prevXPos: false,
            ypos: null,
            prevYPos: false,
            mouseDown: false,
            throttleTimeout: 1000 / this.settings.throttleFPS,
            lastMove: null,
            elementFocused: null
        });

        this.velocity = 0;
        this.velocityY = 0;

        // make sure we reset everything when mouse up
        $(document)
            .mouseup($.proxy(this._resetMouse, this))
            .click($.proxy(this._resetMouse, this));

        this._initEvents();

        this.$el.css('cursor', this.settings.cursor);

        if (this.settings.triggerHardware){
            this.$el.css({
                '-webkit-transform': 'translate3d(0,0,0)',
                '-webkit-perspective': '1000',
                '-webkit-backface-visibility': 'hidden'
            });
        }
    };

    Kinetic.prototype._initEvents = function(){
        var self = this;
        this.settings.events = {
            touchStart: function (e){
                var touch;
                if (self._useTarget(e.target, e)){
                    touch = e.originalEvent.touches[0];
                    self.threshold = self._threshold(e.target, e);
                    self._start(touch.clientX, touch.clientY);
                    e.stopPropagation();
                }
            },
            touchMove: function (e){
                var touch;
                if (self.mouseDown){
                    touch = e.originalEvent.touches[0];
                    self._inputmove(touch.clientX, touch.clientY);
                    if (e.preventDefault){
                        e.preventDefault();
                    }
                }
            },
            inputDown: function (e){
                if (self._useTarget(e.target, e)){
                    self.threshold = self._threshold(e.target, e);
                    self._start(e.clientX, e.clientY);
                    self.elementFocused = e.target;
                    if (e.target.nodeName === 'IMG'){
                        e.preventDefault();
                    }
                    e.stopPropagation();
                }
            },
            inputEnd: function (e){
                if (self._useTarget(e.target, e)){
                    self._end();
                    self.elementFocused = null;
                    if (e.preventDefault){
                        e.preventDefault();
                    }
                }
            },
            inputMove: function (e){
                if (self.mouseDown){
                    self._inputmove(e.clientX, e.clientY);
                    if (e.preventDefault){
                        e.preventDefault();
                    }
                }
            },
            scroll: function (e){
                if ($.isFunction(self.settings.moved)){
                    self.settings.moved.call(self, self.settings);
                }
                if (e.preventDefault){
                    e.preventDefault();
                }
            },
            inputClick: function (e){
                if (Math.abs(self.velocity) > 0){
                    e.preventDefault();
                    return false;
                }
            },
            // prevent drag and drop images in ie
            dragStart: function (e){
                if (self._useTarget(e.target, e) && self.elementFocused){
                    return false;
                }
            },
            // prevent selection when dragging
            selectStart: function (e){
                if ($.isFunction(self.settings.selectStart)){
                    return self.settings.selectStart.apply(self, arguments);
                } else if (self._useTarget(e.target, e)) {
                    return false;
                }
            }
        };

        this._attachListeners(this.$el, this.settings);

    };

    Kinetic.prototype._inputmove = function (clientX, clientY){
        var $this = this.$el;
        var el = this.el;

        if (!this.lastMove || new Date() > new Date(this.lastMove.getTime() + this.throttleTimeout)){
            this.lastMove = new Date();

            if (this.mouseDown && (this.xpos || this.ypos)){
                var movedX = (clientX - this.xpos);
                var movedY = (clientY - this.ypos);
                if (this.settings.invert) {
                    movedX *= -1;
                    movedY *= -1;
                }
                if(this.threshold > 0){
                    var moved = Math.sqrt(movedX * movedX + movedY * movedY);
                    if(this.threshold > moved){
                        return;
                    } else {
                        this.threshold = 0;
                    }
                }
                if (this.elementFocused){
                    $(this.elementFocused).blur();
                    this.elementFocused = null;
                    $this.focus();
                }

                this.settings.decelerate = false;
                this.velocity = this.velocityY = 0;

                var scrollLeft = this.scrollLeft();
                var scrollTop = this.scrollTop();

                this.scrollLeft(this.settings.x ? scrollLeft - movedX : scrollLeft);
                this.scrollTop(this.settings.y ? scrollTop - movedY : scrollTop);

                this.prevXPos = this.xpos;
                this.prevYPos = this.ypos;
                this.xpos = clientX;
                this.ypos = clientY;

                this._calculateVelocities();
                this._setMoveClasses(this.settings.movingClass);

                if ($.isFunction(this.settings.moved)){
                    this.settings.moved.call(this, this.settings);
                }
            }
        }
    };

    Kinetic.prototype._calculateVelocities = function (){
        this.velocity = this._capVelocity(this.prevXPos - this.xpos, this.settings.maxvelocity);
        this.velocityY = this._capVelocity(this.prevYPos - this.ypos, this.settings.maxvelocity);
        if (this.settings.invert) {
            this.velocity *= -1;
            this.velocityY *= -1;
        }
    };

    Kinetic.prototype._end = function (){
        if (this.xpos && this.prevXPos && this.settings.decelerate === false){
            this.settings.decelerate = true;
            this._calculateVelocities();
            this.xpos = this.prevXPos = this.mouseDown = false;
            this._move();
        }
    };

    Kinetic.prototype._useTarget = function (target, event){
        if ($.isFunction(this.settings.filterTarget)){
            return this.settings.filterTarget.call(this, target, event) !== false;
        }
        return true;
    };

    Kinetic.prototype._threshold = function (target, event){
        if ($.isFunction(this.settings.threshold)){
            return this.settings.threshold.call(this, target, event);
        }
        return this.settings.threshold;
    };

    Kinetic.prototype._start = function (clientX, clientY){
        this.mouseDown = true;
        this.velocity = this.prevXPos = 0;
        this.velocityY = this.prevYPos = 0;
        this.xpos = clientX;
        this.ypos = clientY;
    };

    Kinetic.prototype._resetMouse = function (){
        this.xpos = false;
        this.ypos = false;
        this.mouseDown = false;
    };

    Kinetic.prototype._decelerateVelocity = function (velocity, slowdown){
        return Math.floor(Math.abs(velocity)) === 0 ? 0 // is velocity less than 1?
            : velocity * slowdown; // reduce slowdown
    };

    Kinetic.prototype._capVelocity = function (velocity, max){
        var newVelocity = velocity;
        if (velocity > 0){
            if (velocity > max){
                newVelocity = max;
            }
        } else {
            if (velocity < (0 - max)){
                newVelocity = (0 - max);
            }
        }
        return newVelocity;
    };

    Kinetic.prototype._setMoveClasses = function (classes){
        // FIXME: consider if we want to apply PL #44, this should not remove
        // classes we have not defined on the element!
        var settings = this.settings;
        var $this = this.$el;

        $this.removeClass(settings.movingClass.up)
            .removeClass(settings.movingClass.down)
            .removeClass(settings.movingClass.left)
            .removeClass(settings.movingClass.right)
            .removeClass(settings.deceleratingClass.up)
            .removeClass(settings.deceleratingClass.down)
            .removeClass(settings.deceleratingClass.left)
            .removeClass(settings.deceleratingClass.right);

        if (this.velocity > 0){
            $this.addClass(classes.right);
        }
        if (this.velocity < 0){
            $this.addClass(classes.left);
        }
        if (this.velocityY > 0){
            $this.addClass(classes.down);
        }
        if (this.velocityY < 0){
            $this.addClass(classes.up);
        }

    };


    // do the actual kinetic movement
    Kinetic.prototype._move = function (){
        var $scroller = this._getScroller();
        var scroller = $scroller[0];
        var self = this;
        var settings = self.settings;

        // set scrollLeft
        if (settings.x && scroller.scrollWidth > 0){
            this.scrollLeft(this.scrollLeft() + this.velocity);
            if (Math.abs(this.velocity) > 0){
                this.velocity = settings.decelerate ?
                    self._decelerateVelocity(this.velocity, settings.slowdown) : this.velocity;
            }
        } else {
            this.velocity = 0;
        }

        // set scrollTop
        if (settings.y && scroller.scrollHeight > 0){
            this.scrollTop(this.scrollTop() + this.velocityY);
            if (Math.abs(this.velocityY) > 0){
                this.velocityY = settings.decelerate ?
                    self._decelerateVelocity(this.velocityY, settings.slowdown) : this.velocityY;
            }
        } else {
            this.velocityY = 0;
        }

        self._setMoveClasses(settings.deceleratingClass);

        if ($.isFunction(settings.moved)){
            settings.moved.call(this, settings);
        }

        if (Math.abs(this.velocity) > 0 || Math.abs(this.velocityY) > 0){
            if (!this.moving) {
                this.moving = true;
                // tick for next movement
                window.requestAnimationFrame(function (){
                    self.moving = false;
                    self._move();
                });
            }
        } else {
            self.stop();
        }
    };

    // get current scroller to apply positioning to
    Kinetic.prototype._getScroller = function(){
        var $scroller = this.$el;
        if (this.$el.is('body') || this.$el.is('html')){
            $scroller = $(window);
        }
        return $scroller;
    };

    // set the scroll position
    Kinetic.prototype.scrollLeft = function(left){
        var $scroller = this._getScroller();
        if (typeof left === 'number'){
            $scroller.scrollLeft(left);
            this.settings.scrollLeft = left;
        } else {
            return $scroller.scrollLeft();
        }
    };
    Kinetic.prototype.scrollTop = function(top){
        var $scroller = this._getScroller();
        if (typeof top === 'number'){
            $scroller.scrollTop(top);
            this.settings.scrollTop = top;
        } else {
            return $scroller.scrollTop();
        }
    };

    Kinetic.prototype._attachListeners = function (){
        var $this = this.$el;
        var settings = this.settings;

        if ($.support.touch){
            $this
                .bind('touchstart', settings.events.touchStart)
                .bind('touchend', settings.events.inputEnd)
                .bind('touchmove', settings.events.touchMove);
        }

        $this
            .mousedown(settings.events.inputDown)
            .mouseup(settings.events.inputEnd)
            .mousemove(settings.events.inputMove);

        $this
            .click(settings.events.inputClick)
            .scroll(settings.events.scroll)
            .bind('selectstart', settings.events.selectStart)
            .bind('dragstart', settings.events.dragStart);
    };

    Kinetic.prototype._detachListeners = function (){
        var $this = this.$el;
        var settings = this.settings;
        if ($.support.touch){
            $this
                .unbind('touchstart', settings.events.touchStart)
                .unbind('touchend', settings.events.inputEnd)
                .unbind('touchmove', settings.events.touchMove);
        }

        $this
            .unbind('mousedown', settings.events.inputDown)
            .unbind('mouseup', settings.events.inputEnd)
            .unbind('mousemove', settings.events.inputMove);

        $this
            .unbind('click', settings.events.inputClick)
            .unbind('scroll', settings.events.scroll)
            .unbind('selectstart', settings.events.selectStart)
            .unbind('dragstart', settings.events.dragStart);
    };


    // EXPOSE KINETIC CONSTRUCTOR
    // ==========================
    $.Kinetic = Kinetic;

    // KINETIC PLUGIN DEFINITION
    // =======================

    $.fn.kinetic = function (option, callOptions) {
        return this.each(function () {
            var $this    = $(this);
            var instance = $this.data(Kinetic.DATA_KEY);
            var options  = $.extend({}, Kinetic.DEFAULTS, $this.data(), typeof option === 'object' && option);

            if (!instance) {
                $this.data(Kinetic.DATA_KEY, (instance = new Kinetic(this, options)));
            }

            if (typeof option === 'string') {
                instance[option](callOptions);
            }

        });
    };

}(jQuery));

// jQuery.kinetic core modifications for diva.js (compatible with jQuery.kinetic 2.2.1)
// use jQuery.kinetic for touch handlers only since we are using dragscrollable for mouse handlers
//    - (kinetic provides inertial scrolling [ease into stopped state on release] for touch events and dragscrollable
//      allows non-inertial scrolling which we like for mice)

(function($)
{
    $.Kinetic.prototype._attachListeners = function()
    {
        // attach only touch listeners
        var $this = this.$el;
        var settings = this.settings;

        if ($.support.touch)
        {
            $this
                .bind('touchstart', settings.events.touchStart)
                .bind('touchend', settings.events.inputEnd)
                .bind('touchmove', settings.events.touchMove);
        }

        $this
            .click(settings.events.inputClick)
            .scroll(settings.events.scroll)
            .bind('selectstart', settings.events.selectStart)
            .bind('dragstart', settings.events.dragStart);
    };

    $.Kinetic.prototype._detachListeners = function()
    {
        // detach only touch listeners
        var $this = this.$el;
        var settings = this.settings;

        if ($.support.touch)
        {
            $this
                .unbind('touchstart', settings.events.touchStart)
                .unbind('touchend', settings.events.inputEnd)
                .unbind('touchmove', settings.events.touchMove);
        }

        $this
            .unbind('click', settings.events.inputClick)
            .unbind('scroll', settings.events.scroll)
            .unbind('selectstart', settings.events.selectStart)
            .unbind('dragstart', settings.events.dragStart);
    };
})(jQuery);
