module.exports = (function() {
    var cache = {};
    var pub = {
        /**
         *      Events. Pub/Sub system for Loosely Coupled logic.
         *      Based on Peter Higgins' port from Dojo to jQuery
         *      https://github.com/phiggins42/bloody-jquery-plugins/blob/master/pubsub.js
         *
         *      Re-adapted to vanilla Javascript
         *
         *      @class Events
         */
        Events: {
            /**
             *      diva.Events.publish
             *      e.g.: diva.Events.publish("PageDidLoad", [pageIndex, filename, pageSelector], this);
             *
             *      @class Events
             *      @method publish
             *      @param topic {String}
             *      @param args  {Array}
             *      @param scope {Object=} Optional - Subscribed functions will be executed with the supplied object as `this`.
             *          It is necessary to supply this argument with the self variable when within a Diva instance.
             *          The scope argument is matched with the instance ID of subscribers to determine whether they
             *              should be executed. (See instanceID argument of subscribe.)
             */
            publish: function (topic, args, scope)
            {
                if (cache[topic])
                {
                    var thisTopic = cache[topic];

                    if (typeof thisTopic.global !== 'undefined')
                    {
                        var thisTopicGlobal = thisTopic.global;
                        var i = thisTopicGlobal.length;

                        while (i--)
                        {
                            thisTopicGlobal[i].apply(scope || this, args || []);
                        }
                    }

                    if (scope && typeof scope.getInstanceId !== 'undefined')
                    {
                        // get publisher instance ID from scope arg, compare, and execute if match
                        var instanceID = scope.getInstanceId();

                        if (cache[topic][instanceID])
                        {
                            var thisTopicInstance = cache[topic][instanceID];
                            var j = thisTopicInstance.length;

                            while (j--)
                            {
                                thisTopicInstance[j].apply(scope || this, args || []);
                            }
                        }
                    }
                }
            },
            /**
             *      diva.Events.subscribe
             *      e.g.: diva.Events.subscribe("PageDidLoad", highlight, settings.ID)
             *
             *      @class Events
             *      @method subscribe
             *      @param topic {String}
             *      @param callback {Function}
             *      @param instanceID {String=} Optional - String representing the ID of a Diva instance; if provided,
             *                                            callback only fires for events published from that instance.
             *      @return Event handler {Array}
             */
            subscribe: function (topic, callback, instanceID)
            {
                if (!cache[topic])
                {
                    cache[topic] = {};
                }

                if (typeof instanceID === 'string')
                {
                    if (!cache[topic][instanceID])
                    {
                        cache[topic][instanceID] = [];
                    }

                    cache[topic][instanceID].push(callback);
                }
                else
                {
                    if (!cache[topic].global)
                    {
                        cache[topic].global = [];
                    }

                    cache[topic].global.push(callback);
                }

                var handle = instanceID ? [topic, callback, instanceID] : [topic, callback];

                return handle;
            },
            /**
             *      diva.Events.unsubscribe
             *      e.g.: var handle = Events.subscribe("PageDidLoad", highlight);
             *              Events.unsubscribe(handle);
             *
             *      @class Events
             *      @method unsubscribe
             *      @param handle {Array}
             *      @param completely {Boolean=} - Unsubscribe all events for a given topic.
             *      @return success {Boolean}
             */
            unsubscribe: function (handle, completely)
            {
                var t = handle[0];

                if (cache[t])
                {
                    var topicArray;
                    var instanceID = (handle.length === 3 && typeof cache[t][handle[2]] !== 'undefined') ? handle[2] : 'global';

                    topicArray = cache[t][instanceID];
                    var i = topicArray.length;

                    while (i--)
                    {
                        if (topicArray[i] === handle[1])
                        {
                            cache[t][instanceID].splice(i, 1);

                            if (completely)
                            {
                                delete cache[t][instanceID];
                            }

                            return true;
                        }
                    }
                }

                return false;
            },
            /**
             *      diva.Events.unsubscribeAll
             *      e.g.: diva.Events.unsubscribeAll('global');
             *
             *      @class Events
             *      @param {String=} Optional - instance ID to remove subscribers from or 'global' (if omitted,
             *                                 subscribers in all scopes removed)
             *      @method unsubscribe
             */
            unsubscribeAll: function (instanceID)
            {
                if (instanceID)
                {
                    var topics = Object.keys(cache);
                    var i = topics.length;
                    var topic;

                    while (i--)
                    {
                        topic = topics[i];

                        if (cache[topic][instanceID] !== 'undefined')
                        {
                            delete cache[topic][instanceID];
                        }
                    }
                }
                else
                {
                    cache = {};
                }
            }
        }
    };

    return pub;
}());
