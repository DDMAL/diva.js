var debug = require('debug')('diva:ImageRequestHandler');

module.exports = ImageRequestHandler;

/**
 * Handler for the request for an image tile
 *
 * @param url
 * @param callback
 * @constructor
 */
function ImageRequestHandler(url, callback)
{
    this._url = url;
    this._callback = callback;
    this._aborted = this._complete = false;

    // Initiate the request
    this._image = new Image();
    this._image.crossOrigin = "anonymous";
    this._image.onload = this._handleLoad.bind(this);
    this._image.src = url;

    debug('Requesting image %s', url);
}

ImageRequestHandler.prototype.abort = function ()
{
    debug('Aborting request to %s', this._url);

    // FIXME
    // People on the Internet say that doing this {{should/should not}} abort the request. I believe
    // it corresponds to what the WHATWG HTML spec says should happen when the UA
    // updates the image data if selected source is null.
    //
    // Sources:
    //
    // https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element
    // http://stackoverflow.com/questions/7390888/does-changing-the-src-attribute-of-an-image-stop-the-image-from-downloading
    this._image.onload = null;
    this._aborted = true;

    this._image.src = '';
};

ImageRequestHandler.prototype._handleLoad = function ()
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
};
