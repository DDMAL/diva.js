/**
 * Transition support detection, adapted from
 * http://stackoverflow.com/a/9090128
 */

var property = (function getTransitionProperty()
{
    var el = document.createElement('div');
    var transitions = ['transition', 'OTransition', 'MozTransition', 'WebkitTransition'];

    for (var i=0; i < transitions.length; i++)
    {
        if (typeof el.style[transitions[i]] !== 'undefined')
        {
            return transitions[i];
        }
    }

    return null;
})();

var supported = property !== null;

var endEvent;

if (supported)
{
    endEvent = {
        'transition': 'transitionend',
        'OTransition': 'otransitionend',
        'MozTransition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd'
    }[property];
}
else
{
    endEvent = null;
}

module.exports = {
    supported: supported,
    property: property,
    endEvent: endEvent
};
