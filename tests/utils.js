// Utility methods for testing

(function () {
    // Allows you to clone, create a document viewer on, then remove an element
    $.tempDiva = function (settings) {
        settings = settings || {};
        // If the divaserveURL, imageDir, iconPath and iipServerURL settings aren't defined, define them
        settings.imageDir = settings.imageDir || "/srv/images/beromunster";
        settings.iipServerURL = settings.iipServerURL || "http://diva.simssa.ca/fcgi-bin/iipsrv.fcgi";
        settings.objectData = settings.objectData || "../demo/beromunster.json";
        settings.enableCanvas = settings.enableCanvas || true;
        settings.enableDownload = settings.enableDownload || true;

        return $('#diva-temp').diva(settings).data('diva');
    };
})(jQuery);

var clearTempDiva = function()
{
        // Clear globally subscribed events (i.e. test callbacks)
        diva.Events.unsubscribeAll();

        // First, empty it in case something else has been using it
        var dv = $('#diva-temp').data('diva');
        if (dv)
        {
            dv.destroy();
        }
};

/*! jQuery Simulate v@1.0.1 http://github.com/jquery/jquery-simulate | jquery.org/license */!function(a,b){function c(b){var c,d=a(b.ownerDocument);return b=a(b),c=b.offset(),{x:c.left+b.outerWidth()/2-d.scrollLeft(),y:c.top+b.outerHeight()/2-d.scrollTop()}}function d(b){var c,d=a(b.ownerDocument);return b=a(b),c=b.offset(),{x:c.left-d.scrollLeft(),y:c.top-d.scrollTop()}}var e=/^key/,f=/^(?:mouse|contextmenu)|click/;a.fn.simulate=function(b,c){return this.each(function(){new a.simulate(this,b,c)})},a.simulate=function(b,c,d){var e=a.camelCase("simulate-"+c);this.target=b,this.options=d,this[e]?this[e]():this.simulateEvent(b,c,d)},a.extend(a.simulate,{keyCode:{BACKSPACE:8,COMMA:188,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,NUMPAD_ADD:107,NUMPAD_DECIMAL:110,NUMPAD_DIVIDE:111,NUMPAD_ENTER:108,NUMPAD_MULTIPLY:106,NUMPAD_SUBTRACT:109,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SPACE:32,TAB:9,UP:38},buttonCode:{LEFT:0,MIDDLE:1,RIGHT:2}}),a.extend(a.simulate.prototype,{simulateEvent:function(a,b,c){var d=this.createEvent(b,c);this.dispatchEvent(a,b,d,c)},createEvent:function(a,b){return e.test(a)?this.keyEvent(a,b):f.test(a)?this.mouseEvent(a,b):void 0},mouseEvent:function(c,d){var e,f,g,h;return d=a.extend({bubbles:!0,cancelable:"mousemove"!==c,view:window,detail:0,screenX:0,screenY:0,clientX:1,clientY:1,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,button:0,relatedTarget:b},d),document.createEvent?(e=document.createEvent("MouseEvents"),e.initMouseEvent(c,d.bubbles,d.cancelable,d.view,d.detail,d.screenX,d.screenY,d.clientX,d.clientY,d.ctrlKey,d.altKey,d.shiftKey,d.metaKey,d.button,d.relatedTarget||document.body.parentNode),0===e.pageX&&0===e.pageY&&Object.defineProperty&&(f=e.relatedTarget.ownerDocument||document,g=f.documentElement,h=f.body,Object.defineProperty(e,"pageX",{get:function(){return d.clientX+(g&&g.scrollLeft||h&&h.scrollLeft||0)-(g&&g.clientLeft||h&&h.clientLeft||0)}}),Object.defineProperty(e,"pageY",{get:function(){return d.clientY+(g&&g.scrollTop||h&&h.scrollTop||0)-(g&&g.clientTop||h&&h.clientTop||0)}}))):document.createEventObject&&(e=document.createEventObject(),a.extend(e,d),e.button={0:1,1:4,2:2}[e.button]||(-1===e.button?0:e.button)),e},keyEvent:function(c,d){var e;if(d=a.extend({bubbles:!0,cancelable:!0,view:window,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,keyCode:0,charCode:b},d),document.createEvent)try{e=document.createEvent("KeyEvents"),e.initKeyEvent(c,d.bubbles,d.cancelable,d.view,d.ctrlKey,d.altKey,d.shiftKey,d.metaKey,d.keyCode,d.charCode)}catch(f){e=document.createEvent("Events"),e.initEvent(c,d.bubbles,d.cancelable),a.extend(e,{view:d.view,ctrlKey:d.ctrlKey,altKey:d.altKey,shiftKey:d.shiftKey,metaKey:d.metaKey,keyCode:d.keyCode,charCode:d.charCode})}else document.createEventObject&&(e=document.createEventObject(),a.extend(e,d));return(/msie [\w.]+/.exec(navigator.userAgent.toLowerCase())||"[object Opera]"==={}.toString.call(window.opera))&&(e.keyCode=d.charCode>0?d.charCode:d.keyCode,e.charCode=b),e},dispatchEvent:function(a,b,c){a[b]?a[b]():a.dispatchEvent?a.dispatchEvent(c):a.fireEvent&&a.fireEvent("on"+b,c)},simulateFocus:function(){function b(){d=!0}var c,d=!1,e=a(this.target);e.bind("focus",b),e[0].focus(),d||(c=a.Event("focusin"),c.preventDefault(),e.trigger(c),e.triggerHandler("focus")),e.unbind("focus",b)},simulateBlur:function(){function b(){d=!0}var c,d=!1,e=a(this.target);e.bind("blur",b),e[0].blur(),setTimeout(function(){e[0].ownerDocument.activeElement===e[0]&&e[0].ownerDocument.body.focus(),d||(c=a.Event("focusout"),c.preventDefault(),e.trigger(c),e.triggerHandler("blur")),e.unbind("blur",b)},1)}}),a.extend(a.simulate.prototype,{simulateDrag:function(){var e=0,f=this.target,g=f.ownerDocument,h=this.options,i="corner"===h.handle?d(f):c(f),j=Math.floor(i.x),k=Math.floor(i.y),l={clientX:j,clientY:k},m=h.dx||(h.x!==b?h.x-j:0),n=h.dy||(h.y!==b?h.y-k:0),o=h.moves||3;for(this.simulateEvent(f,"mousedown",l);o>e;e++)j+=m/o,k+=n/o,l={clientX:Math.round(j),clientY:Math.round(k)},this.simulateEvent(g,"mousemove",l);a.contains(g,f)?(this.simulateEvent(f,"mouseup",l),this.simulateEvent(f,"click",l)):this.simulateEvent(g,"mouseup",l)}})}(jQuery);

