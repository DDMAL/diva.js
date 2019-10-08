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
        this._crossOrigin = options.settings.imageCrossOrigin;

        //Use a timeout to allow the requests to be debounced (as they are in renderer)
        this.timeout = setTimeout(() => {
            // Initiate the request
            this._image = new Image();
            this._image.crossOrigin = this._crossOrigin;
            this._image.onload = this._handleLoad.bind(this);
            this._image.onerror = this._handleError.bind(this);
            this._image.src = options.url;

        }, this.timeoutTime);
    }

    abort ()
    {
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

        this._callback(this._image);
    }

    _handleError ()
    {
        this._errorCallback(this._image);
    }
}
