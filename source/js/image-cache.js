'use strict';

var debug = require('debug')('diva:ImageCache');

module.exports = ImageCache;

/* FIXME(wabain): The caching strategy here is completely
 * arbitrary and the implementation isn't especially efficient.
 */

var DEFAULT_MAX_KEYS = 100;

function ImageCache(options)
{
    options = options || { maxKeys: DEFAULT_MAX_KEYS };
    this.maxKeys = options.maxKeys || DEFAULT_MAX_KEYS;
    this._urls = {};
    this._lru = [];
}

ImageCache.prototype.get = function (url)
{
    var record = this._urls[url];
    return record ? record.img : null;
};

ImageCache.prototype.has = function (url)
{
    return !!this._urls[url];
};

ImageCache.prototype.put = function (url, img)
{
    var record = this._urls[url];
    if (record)
    {
        // FIXME: Does this make sense for this use case?
        record.img = img;

        var index = this._lru.indexOf(record);
        this._lru.splice(index, 1);
        this._lru.unshift(record);
    }
    else
    {
        record = {
            img: img,
            url: url
        };

        this._urls[url] = record;

        if (this._lru.length === this.maxKeys)
        {
            var evicted = this._lru.pop();
            delete this._urls[evicted.url];
            debug('Evicting image %s', evicted.url);
        }

        this._lru.unshift(record);
    }
};
