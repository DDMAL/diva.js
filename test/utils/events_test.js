'use strict';

import {Events} from '../../source/js/utils/events';

describe('Events', function ()
{
    it('subscribe(topic, callback[, instanceID])', function ()
    {
        var events = Events;

        var callback = function () {};
        assert.deepEqual(events.subscribe('Topic', callback), ['Topic', callback], 'Global callback handles should have no scope');
        assert.deepEqual(events.subscribe('Topic', callback, 'A'), ['Topic', callback, 'A'], 'Scoped callback handles should have a scope');
    });

    it('publish(topic[, args])', function ()
    {
        var events = Events;
        var calls = [];

        events.subscribe('MyTopic', function ()
        {
            calls.push(['callback 1', this, Array.prototype.slice.call(arguments)]);
        });

        events.subscribe('MyTopic', function ()
        {
            calls.push(['callback 2', this, Array.prototype.slice.call(arguments)]);
        });

        events.subscribe('MyTopic', function ()
        {
            calls.push(['scoped callback', this, Array.prototype.slice.call(arguments)]);
        }, 'some scope');

        events.publish('OtherTopic', []);
        events.publish('MyTopic', [1, 2, 3]);
        events.publish('MyTopic');

        assert.deepEqual(calls, [
            ['callback 1', null, [1, 2, 3]],
            ['callback 2', null, [1, 2, 3]],
            ['callback 1', null, []],
            ['callback 2', null, []]
        ], 'Global callbacks should be called for the topic with the arguments in the order subscribed');
    });

    it('publish(topic, args, scope)', function ()
    {
        var scopeID = '1000';

        var scopeObject = {
            getInstanceId: function ()
            {
                return scopeID;
            }
        };

        var events = Events;
        var calls = [];

        events.subscribe('MyTopic', function ()
        {
            calls.push(['global callback', this, Array.prototype.slice.call(arguments)]);
        });

        events.subscribe('MyTopic', function ()
        {
            calls.push(['scoped callback', this, Array.prototype.slice.call(arguments)]);
        }, scopeID);

        events.subscribe('MyTopic', function ()
        {
            calls.push(['global callback after scoped', this, Array.prototype.slice.call(arguments)]);
        });

        events.subscribe('MyTopic', function ()
        {
            calls.push(['irrelevant callback', this, Array.prototype.slice.call(arguments)]);
        }, 'irrelevant');

        events.publish('OtherTopic', ['should not be called'], scopeObject);
        events.publish('MyTopic', [1, 2, 3], scopeObject);
        events.publish('MyTopic', null, scopeObject); // Null arguments should work

        assert.deepEqual(calls, [
            ['global callback', scopeObject, [1, 2, 3]],
            ['global callback after scoped', scopeObject, [1, 2, 3]],
            ['scoped callback', scopeObject, [1, 2, 3]],
            ['global callback', scopeObject, []],
            ['global callback after scoped', scopeObject, []],
            ['scoped callback', scopeObject, []]
        ], 'Global and relevant scoped callbacks should be called, with globals first');

        calls = [];

        var invalidScope = null;

        events.publish('MyTopic', [3, 2, 1], invalidScope);

        // I don't know if this is really desirable behaviour, but it's what happens
        assert.deepEqual(calls, [
            ['global callback', invalidScope, [3, 2, 1]],
            ['global callback after scoped', invalidScope, [3, 2, 1]]
        ], 'Only global callbacks should be called for invalid scope objects');
    });

    it('unsubscribe(Array<topic, callback[, instanceId]>[, completely])', function ()
    {
        var events = Events;
        events.unsubscribeAll();

        var callback = function () {};
        var otherCallback = function () {};

        events.subscribe('MyTopic', callback);
        events.subscribe('MyTopic', otherCallback);
        events.subscribe('MyTopic', callback, 'some scope');
        events.subscribe('MyTopic', otherCallback, 'some scope');
        events.subscribe('MyTopic', callback, 'another scope');
        events.subscribe('MyTopic', otherCallback, 'another scope');

        assert.deepEqual(getTestSubscriptions(), {
            'global': [callback, otherCallback],
            'some scope': [callback, otherCallback],
            'another scope': [callback, otherCallback]
        }, 'The callbacks should be subscribed (sanity check)');

        assert.ok(events.unsubscribe(['MyTopic', callback]), 'It should return true if events are unsubscribed');
        assert.ok(!events.unsubscribe(['MyTopic', callback, 'unknown']), 'It should return false if the scope is unknown');
        assert.ok(!events.unsubscribe(['Blueberries', callback]), 'It should return false if the topic is unknown');

        assert.deepEqual(getTestSubscriptions(), {
            'global': [otherCallback],
            'some scope': [callback, otherCallback],
            'another scope': [callback, otherCallback]
        }, 'The global callback should be removed');

        assert.ok(!events.unsubscribe(['MyTopic', callback]), 'It should return false if no events are unsubscribed');

        events.unsubscribe(['MyTopic', callback, 'some scope']);

        assert.deepEqual(getTestSubscriptions(), {
            'global': [otherCallback],
            'some scope': [otherCallback],
            'another scope': [callback, otherCallback]
        }, 'The relevant scoped callback should be removed');

        assert.ok(events.unsubscribe(['MyTopic', callback, 'another scope'], true), 'It should return true if events are unsubscribed (completely)');
        assert.ok(!events.unsubscribe(['MyTopic', callback, 'another scope'], true), 'It should return false if no events are unsubscribed (completely)');

        assert.deepEqual(getTestSubscriptions(), {
            'global': [otherCallback],
            'some scope': [otherCallback],
            'another scope': []
        }, 'All scoped callbacks should be removed when `completely` is true');

        events.unsubscribe(['MyTopic', callback], true);

        assert.deepEqual(getTestSubscriptions(), {
            'global': [],
            'some scope': [otherCallback],
            'another scope': []
        }, 'All global callbacks should be removed when `completely` is true');

        function getTestSubscriptions()
        {
            return {
                'global': subscriptions(events, 'MyTopic'),
                'some scope': subscriptions(events, 'MyTopic', 'some scope'),
                'another scope': subscriptions(events, 'MyTopic', 'another scope')
            };
        }
    });

    it('unsubscribeAll([instanceID])', function ()
    {
        var events = Events;
        events.unsubscribeAll();

        var callback = function () {};

        events.subscribe('MyTopic', callback);
        events.subscribe('MyTopic', callback, 'some scope');
        events.subscribe('MyTopic', callback, 'another scope');

        assert.deepEqual(getTestSubscriptions(), {
            'global': [callback],
            'some scope': [callback],
            'another scope': [callback]
        }, 'The callbacks should be subscribed (sanity check)');

        events.unsubscribeAll('some scope');

        assert.deepEqual(getTestSubscriptions(), {
            'global': [callback],
            'some scope': [],
            'another scope': [callback]
        }, 'All topics for the scope should be unsubscribed');

        events.unsubscribeAll('this is not actually a scope');

        assert.deepEqual(getTestSubscriptions(), {
            'global': [callback],
            'some scope': [],
            'another scope': [callback]
        }, 'Unsubscribing from an unknown topic should not blow things up');

        events.unsubscribeAll();

        assert.deepEqual(getTestSubscriptions(), {
            'global': [],
            'some scope': [],
            'another scope': []
        }, 'Unsubscribing without a topic should clear everything');

        function getTestSubscriptions()
        {
            return {
                'global': subscriptions(events, 'MyTopic'),
                'some scope': subscriptions(events, 'MyTopic', 'some scope'),
                'another scope': subscriptions(events, 'MyTopic', 'another scope')
            };
        }
    });

    /** Reach into an events instance to check private state **/
    function subscriptions(events, topic, instanceID)
    {
        if (typeof instanceID === 'undefined')
            instanceID = 'global';

        var topicSubs = events._cache[topic];

        if (!topicSubs)
            return [];

        var instanceSubs = topicSubs[instanceID];

        if (!instanceSubs)
            return [];

        return instanceSubs.slice();
    }
});