const debug = require('debug')('diva:ImageCache');

/* FIXME(wabain): The caching strategy here is completely
 * arbitrary and the implementation isn't especially efficient.
 */
const DEFAULT_MAX_KEYS = 100;

export default class ImageCache
{
    constructor (options)
    {
        options = options || { maxKeys: DEFAULT_MAX_KEYS };
        this.maxKeys = options.maxKeys || DEFAULT_MAX_KEYS;

        this._held = {};
        this._urls = {};
        this._lru = [];
    }

    get (url)
    {
        const record = this._urls[url];
        return record ? record.img : null;
    }

    has (url)
    {
        return !!this._urls[url];
    }

    put (url, img)
    {
        let record = this._urls[url];
        if (record)
        {
            // FIXME: Does this make sense for this use case?
            record.img = img;
            this._promote(record);
        }
        else
        {
            record = {
                img: img,
                url: url
            };

            this._urls[url] = record;
            this._tryEvict(1);
            this._lru.unshift(record);
        }
    }

    _promote (record)
    {
        const index = this._lru.indexOf(record);
        this._lru.splice(index, 1);
        this._lru.unshift(record);
    }

    _tryEvict (extraCapacity)
    {
        const allowedEntryCount = this.maxKeys - extraCapacity;

        if (this._lru.length <= allowedEntryCount)
            return;

        let evictionIndex = this._lru.length - 1;

        for (;;)
        {
            const target = this._lru[evictionIndex];

            if (!this._held[target.url])
            {
                debug('Evicting image %s', target.url);
                this._lru.splice(evictionIndex, 1);
                delete this._urls[target.url];

                if (this._lru.length <= allowedEntryCount)
                    break;
            }

            if (evictionIndex === 0)
            {
                /* istanbul ignore next */
                debug.enabled && debug('Cache overfull by %s (all entries are being held)',
                    this._lru.length - allowedEntryCount);

                break;
            }

            evictionIndex--;
        }
    }

    acquire (url)
    {
        this._held[url] = (this._held[url] || 0) + 1;
        this._promote(this._urls[url]);
    }

    release (url)
    {
        const count = this._held[url];

        if (count > 1)
            this._held[url]--;
        else
            delete this._held[url];

        this._tryEvict(0);
    }
}
