/* global performance */

// TODO: requestAnimationFrame fallback

module.exports = {
    animate: animate,
    easing: {
        linear: linearEasing
    }
};

function animate(options)
{
    var durationMs = options.duration;
    var parameters = options.parameters;
    var onUpdate = options.onUpdate;
    var onEnd = options.onEnd;

    // Setup
    // Times are in milliseconds from a basically arbitrary start
    var start = now();
    var end = start + durationMs;

    var tweenFns = {};
    var values = {};
    var paramKeys = Object.keys(parameters);

    paramKeys.forEach(function (key)
    {
        var config = parameters[key];
        tweenFns[key] = interpolate(config.from, config.to, config.easing || linearEasing);
    });

    // Run it!
    var requestId = requestAnimationFrame(update);

    return {
        cancel: function ()
        {
            if (requestId !== null)
            {
                cancelAnimationFrame(requestId);
                handleAnimationCompletion({
                    interrupted: true
                });
            }
        }
    };

    function update()
    {
        var current = now();
        var elapsed = Math.min((current - start) / durationMs, 1);

        updateValues(elapsed);
        onUpdate(values);

        if (current < end)
            requestId = requestAnimationFrame(update);
        else
            handleAnimationCompletion({
                interrupted: false
            });
    }

    function updateValues(elapsed)
    {
        paramKeys.forEach(function (key)
        {
            values[key] = tweenFns[key](elapsed);
        });
    }

    function handleAnimationCompletion(info)
    {
        requestId = null;

        if (onEnd)
            onEnd(info);
    }
}

function interpolate(start, end, easing)
{
    return function (elapsed)
    {
        return start + (end - start) * easing(elapsed);
    };
}

function linearEasing(e)
{
    return e;
}

var now;

if (typeof performance !== 'undefined' && performance.now)
{
    now = function ()
    {
        return performance.now();
    };
}
else
{
    now = function ()
    {
        return Date.now();
    };
}
