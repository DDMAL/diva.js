export default {
    onDoubleClick,
    onPinch,
    onDoubleTap
};

const DOUBLE_CLICK_TIMEOUT = 500;
const DOUBLE_TAP_DISTANCE_THRESHOLD = 50;
const DOUBLE_TAP_TIMEOUT = 250;

function onDoubleClick(elem, callback)
{
    elem.addEventListener('dblclick', function (event)
    {
        if (!event.ctrlKey)
        {
            callback(event, getRelativeOffset(event.currentTarget, event));
        }
    });

    // Handle the control key for macs (in conjunction with double-clicking)
    // FIXME: Does a click get handled with ctrl pressed on non-Macs?
    const tracker = createDoubleEventTracker(DOUBLE_CLICK_TIMEOUT);

    elem.addEventListener('contextmenu', function (event)
    {
        event.preventDefault();

        if (event.ctrlKey)
        {
            if (tracker.isTriggered())
            {
                tracker.reset();
                callback(event, getRelativeOffset(event.currentTarget, event));
            }
            else
            {
                tracker.trigger();
            }
        }
    });
}

function onPinch(elem, callback)
{
    let startDistance = 0;

    elem.addEventListener('touchstart', function (event)
    {
        // Prevent mouse event from firing
        event.preventDefault();

        if (event.originalEvent.touches.length === 2)
        {
            startDistance = distance(
                event.originalEvent.touches[0].clientX,
                event.originalEvent.touches[0].clientY,
                event.originalEvent.touches[1].clientX,
                event.originalEvent.touches[1].clientY
            );
        }
    });

    elem.addEventListener('touchmove', function(event)
    {
        // Prevent mouse event from firing
        event.preventDefault();

        if (event.originalEvent.touches.length === 2)
        {
            const touches = event.originalEvent.touches;

            const moveDistance = distance(
                touches[0].clientX,
                touches[0].clientY,
                touches[1].clientX,
                touches[1].clientY
            );

            const zoomDelta = moveDistance - startDistance;

            if (Math.abs(zoomDelta) > 0)
            {
                const touchCenter = {
                    pageX: (touches[0].clientX + touches[1].clientX) / 2,
                    pageY: (touches[0].clientY + touches[1].clientY) / 2
                };

                callback(event, getRelativeOffset(event.currentTarget, touchCenter), startDistance, moveDistance);
            }
        }
    });
}

function onDoubleTap(elem, callback)
{
    const tracker = createDoubleEventTracker(DOUBLE_TAP_TIMEOUT);
    let firstTap = null;

    elem.addEventListener('touchend', (event) =>
    {
        // Prevent mouse event from firing
        event.preventDefault();

        if (tracker.isTriggered())
        {
            tracker.reset();

            // Doubletap has occurred
            const secondTap = {
                pageX: event.originalEvent.changedTouches[0].clientX,
                pageY: event.originalEvent.changedTouches[0].clientY
            };

            // If first tap is close to second tap (prevents interference with scale event)
            const tapDistance = distance(firstTap.pageX, firstTap.pageY, secondTap.pageX, secondTap.pageY);

            // TODO: Could give something higher-level than secondTap to callback
            if (tapDistance < DOUBLE_TAP_DISTANCE_THRESHOLD)
                callback(event, getRelativeOffset(event.currentTarget, secondTap));

            firstTap = null;
        }
        else
        {
            firstTap = {
                pageX: event.originalEvent.changedTouches[0].clientX,
                pageY: event.originalEvent.changedTouches[0].clientY
            };

            tracker.trigger();
        }
    });
}

// Pythagorean theorem to get the distance between two points (used for
// calculating finger distance for double-tap and pinch-zoom)
function distance(x1, y1, x2, y2)
{
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

// Utility to keep track of whether an event has been triggered twice
// during a a given duration
function createDoubleEventTracker(timeoutDuration)
{
    let triggered = false;
    let timeoutId = null;

    return {
        trigger()
        {
            triggered = true;
            resetTimeout();
            timeoutId = setTimeout(function ()
            {
                triggered = false;
                timeoutId = null;
            }, timeoutDuration);
        },
        isTriggered()
        {
            return triggered;
        },
        reset()
        {
            triggered = false;
            resetTimeout();
        }
    };

    function resetTimeout()
    {
        if (timeoutId !== null)
        {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }
}

function getRelativeOffset(elem, pageCoords)
{
    const bounds = elem.getBoundingClientRect();

    return {
        left: pageCoords.pageX - bounds.left,
        top: pageCoords.pageY - bounds.top
    };
}
