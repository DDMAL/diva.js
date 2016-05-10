var diva = require('../source/js/diva');

module.exports = EventTracker;

function EventTracker(assert, viewer)
{
    this._assert = assert;
    this._viewer = viewer;
    this._queue = [];

    this._subscribedEvents = [];
}

/**
 * Track events of the given type and make sure they aren't called unexpectedly.
 * Event types are also watched if expect() is called for an event of that type.
 *
 * @param {string} eventName
 */
EventTracker.prototype.watchEvent = function (eventName)
{
    if (this._subscribedEvents.indexOf(eventName) === -1)
    {
        var handler = this._handleEvent.bind(this, eventName);

        diva.Events.subscribe(eventName, handler, this._viewer.getInstanceId());
        this._subscribedEvents.push(eventName);
    }
};

/**
 * Assert that the next event of a watched type published by the viewer will
 * have these arguments.
 *
 * @param {string} eventName
 * @param {...any} args
 */
EventTracker.prototype.expect = function (eventName)
{
    var args = Array.prototype.slice.call(arguments, 1);

    this._queue.push({
        expected: {
            event: eventName,
            args: args
        },
        done: this._assert.async()
    });

    this.watchEvent(eventName);
};

EventTracker.prototype._handleEvent = function (eventName)
{
    var args = Array.prototype.slice.call(arguments, 1);
    var queued = this._queue.shift();

    if (!queued)
    {
        this._assert.deepEqual({ event: eventName, args: args }, null, 'Unexpected event triggered');
        return;
    }

    var argString = queued.expected.args.map(function (arg)
    {
        return arg + '';
    }).join(', ');

    var description = 'Expected event ' + queued.expected.event + ': ' + argString;
    this._assert.deepEqual({ event: eventName, args: args }, queued.expected, description);

    queued.done();
};
