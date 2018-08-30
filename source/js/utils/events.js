/**
 * Events. Pub/Sub system for Loosely Coupled logic.
 * Based on Peter Higgins' port from Dojo to jQuery
 * https://github.com/phiggins42/bloody-jquery-plugins/blob/master/pubsub.js
 *
 * Re-adapted to vanilla Javascript
 *
 * @class Events
 */

class DivaEvents
{
    constructor()
    {
        this._cache = {};
    }

    /**
     * diva.Events.publish
     * e.g.: diva.Events.publish("PageDidLoad", [pageIndex, filename, pageSelector], this);
     *
     * @class Events
     * @method publish
     * @param topic {String}
     * @param args  {Array}
     * @param scope {Object=} Optional - Subscribed functions will be executed with the supplied object as `this`.
     *     It is necessary to supply this argument with the self variable when within a Diva instance.
     *     The scope argument is matched with the instance ID of subscribers to determine whether they
     *         should be executed. (See instanceID argument of subscribe.)
     */
    publish(topic, args, scope)
    {
        if (this._cache[topic])
        {
            const thisTopic = this._cache[topic];

            if (typeof thisTopic.global !== 'undefined')
            {
                const thisTopicGlobal = thisTopic.global;
                const globalCount = thisTopicGlobal.length;

                for (let i=0; i < globalCount; i++)
                {
                    thisTopicGlobal[i].apply(scope || null, args || []);
                }
            }

            if (scope && typeof scope.getInstanceId !== 'undefined')
            {
                // get publisher instance ID from scope arg, compare, and execute if match
                const instanceID = scope.getInstanceId();

                if (this._cache[topic][instanceID])
                {
                    const thisTopicInstance = this._cache[topic][instanceID];
                    const scopedCount = thisTopicInstance.length;

                    for (let j=0; j < scopedCount; j++)
                    {
                        thisTopicInstance[j].apply(scope, args || []);
                    }
                }
            }
        }
    }

    /**
     * diva.Events.subscribe
     * e.g.: diva.Events.subscribe("PageDidLoad", highlight, settings.ID)
     *
     * @class Events
     * @method subscribe
     * @param {string} topic
     * @param {function} callback
     * @param {string=} instanceID  Optional - String representing the ID of a Diva instance; if provided,
     *                                       callback only fires for events published from that instance.
     * @return Event handler {Array}
     */
    subscribe(topic, callback, instanceID)
    {
        if (!this._cache[topic])
        {
            this._cache[topic] = {};
        }

        if (typeof instanceID === 'string')
        {
            if (!this._cache[topic][instanceID])
            {
                this._cache[topic][instanceID] = [];
            }

            this._cache[topic][instanceID].push(callback);
        }
        else
        {
            if (!this._cache[topic].global)
            {
                this._cache[topic].global = [];
            }

            this._cache[topic].global.push(callback);
        }

        return instanceID ? [topic, callback, instanceID] : [topic, callback];
    }

    /**
     * diva.Events.unsubscribe
     * e.g.: var handle = Events.subscribe("PageDidLoad", highlight);
     *         Events.unsubscribe(handle);
     *
     * @class Events
     * @method unsubscribe
     * @param {array} handle
     * @param {boolean=} completely - Unsubscribe all events for a given topic.
     * @return {boolean} success
     */
    unsubscribe(handle, completely)
    {
        const t = handle[0];

        if (this._cache[t])
        {
            let topicArray;
            const instanceID = handle.length === 3 ? handle[2] : 'global';

            topicArray = this._cache[t][instanceID];

            if (!topicArray)
            {
                return false;
            }

            if (completely)
            {
                delete this._cache[t][instanceID];
                return topicArray.length > 0;
            }

            let i = topicArray.length;

            while (i--)
            {
                if (topicArray[i] === handle[1])
                {
                    this._cache[t][instanceID].splice(i, 1);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * diva.Events.unsubscribeAll
     * e.g.: diva.Events.unsubscribeAll('global');
     *
     * @class Events
     * @param {string=} instanceID Optional - instance ID to remove subscribers from or 'global' (if omitted,
     *                              subscribers in all scopes removed)
     * @method unsubscribeAll
     */
    unsubscribeAll(instanceID)
    {
        if (instanceID)
        {
            const topics = Object.keys(this._cache);
            let i = topics.length;
            let topic;

            while (i--)
            {
                topic = topics[i];

                if (typeof this._cache[topic][instanceID] !== 'undefined')
                {
                    delete this._cache[topic][instanceID];
                }
            }
        }
        else
        {
            this._cache = {};
        }
    }
}

export let Events = new DivaEvents();
