// from http://forrst.com/posts/jQuery_element_ID_generator-RoM
(function( $ ) {
    var counter = 1;
    $.generateId = function(suffix) {
        var generatedId;
        do {
          generatedId = (counter++) + (suffix ? '-' + suffix : '');
        } while(document.getElementById(generatedId));
        
        return generatedId;
    };
})( jQuery );

// From http://www.alexandre-gomes.com/?p=115, modified slightly
(function( $ ) {
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
})( jQuery);

// For executing callback functions with one parameter (maybe allow more later)
(function( $ ) {
    $.executeCallback = function(callback, parameter) {
        // If it's not a function, it just won't execute it
        if (typeof callback == 'function') {
            callback.call(this, parameter);
            return true;
        } else {
            return false;
        }
    };
})( jQuery );

// For getting the #key values from the URL. For specifying a page and zoom level
// Look into caching, because we only need to get this during the initial load
// Although for the tests I guess we would need to override caching somehow
(function( $ ) {
    $.getHashParam = function(key) {
        var hash = window.location.hash;
        if (hash != '') {
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
})( jQuery );

(function( $ ) {
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
                var startThing = (startIndex == 0) ? '#' : '&';
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
})( jQuery );

/* iPad one finger scroll from http://forrst.com/posts/jQuery_iPad_one_finger_scroll-B30 */
jQuery.fn.oneFingerScroll = function() {
    var scrollStartPos = 0;
    var scrollStartY;
    var scrollStartX;
    $(this).bind('touchstart', function(event) {
        // jQuery clones events, but only with a limited number of properties for perf reasons. Need the original event to get 'touches'
        var e = event.originalEvent;
        scrollStartY = $(this).scrollTop() + e.touches[0].pageY;
        // Need horizontal scrolling too
        scrollStartX = $(this).scrollLeft() + e.touches[0].pageX;
        e.preventDefault();
    });
    $(this).bind('touchmove', function(event) {
        var e = event.originalEvent;
        $(this).scrollTop(scrollStartY- e.touches[0].pageY);
        $(this).scrollLeft(scrollStartX - e.touches[0].pageX);
        e.preventDefault();
    });
    return this;
};

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
(function($){ // secure $ jQuery alias

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

