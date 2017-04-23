const debug = require('debug')('diva:ImageRequestHandler');
/**
 * Handler for the request for an image tile
 *
 * @param url
 * @param callback
 * @constructor
 */
export default class ImageRequestHandler
{
    constructor (options)
    {
        this._url = options.url;
        this._callback = options.load;
        this._errorCallback = options.error;
        this.timeoutTime = options.timeoutTime || 0;
        this._aborted = this._complete = false;

        //Use a timeout to allow the requests to be debounced (as they are in renderer)
        this.timeout = setTimeout(() => {
            // Initiate the request
            this._image = new Image();
            this._image.crossOrigin = "anonymous";
            this._image.onload = this._handleLoad.bind(this);
            this._image.onerror = this._handleError.bind(this);
            this._image.src = options.url;

            debug('Requesting image %s', options.url);
        }, this.timeoutTime);
    }

    abort ()
    {
        debug('Aborting request to %s', this._url);

        clearTimeout(this.timeout);

        // FIXME
        // People on the Internet say that doing this {{should/should not}} abort the request. I believe
        // it corresponds to what the WHATWG HTML spec says should happen when the UA
        // updates the image data if selected source is null.
        //
        // Sources:
        //
        // https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element
        // http://stackoverflow.com/questions/7390888/does-changing-the-src-attribute-of-an-image-stop-the-image-from-downloading
        if (this._image)
        {
            this._image.onload = this._image.onerror = null;

            this._image.src = '';
        }

        this._aborted = true;
    }

    _handleLoad ()
    {
        if (this._aborted)
        {
            console.error('ImageRequestHandler invoked on cancelled request for ' + this._url);
            return;
        }

        if (this._complete)
        {
            console.error('ImageRequestHandler invoked on completed request for ' + this._url);
            return;
        }

        this._complete = true;

        debug('Received image %s', this._url);
        this._callback(this._image);
    }

    _handleError ()
    {
        debug('Failed to load image %s', this._url);
        this._errorCallback(this._image);
    }
}
