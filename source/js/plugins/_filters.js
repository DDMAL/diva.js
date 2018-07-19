
let _filterQueue = {};

export function addFilterToQueue (filter)
{
    let fname = filter.name;

    if (_filterQueue.hasOwnProperty(fname))
    {
        // update existing filter
    }
    else
    {
        // add new filter to the queue
    }
}

/**
 * Pre-paints the adjustment to an offscreen canvas before moving it to the on-screen canvas.
 **/
function _getOffscreenCanvasData (w, h)
{
    let tmpCanvas = document.createElement('canvas');
    let tmpCtx = tmpCanvas.getContext('2d');

    return tmpCtx.createImageData(w, h);
}

function _manipulateImage (data, func, adjustment)
{
    let len = data.length;

    for (let i = 0; i < len; i += 4)
    {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        let newPixelValue = func(r, g, b, adjustment);

        data[i] = newPixelValue[0];
        data[i + 1] = newPixelValue[1];
        data[i + 2] = newPixelValue[2];
        data[i + 3] = newPixelValue[3];
    }

    return data;
}

function _apply (data, pixelFunc, adjust)
{
    let dataArr = new Uint8ClampedArray(data.data);
    let inverted = _manipulateImage(dataArr, pixelFunc, adjust);

    let newCanvasData = _getOffscreenCanvasData(data.width, data.height);
    newCanvasData.data.set(inverted);

    return newCanvasData;
}

/**
 * Inverts the colours of a canvas.
 *
 * @params {object} data - A canvas image data object.
 * @returns {object} A new canvas data object.
 **/
export function grayscale(data)
{
    return _apply(data, _grayscale);
}

/**
 * See: https://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
 *
 * Reference: http://www.phpied.com/image-fun/ and https://github.com/meltingice/CamanJS/blob/master/src/lib/filters.coffee#L89
 *
 * @params {integer} r - the value of the red pixel
 * @params {integer} g - the value of the green pixel
 * @params {integer} b - the value of the blue pixel
 * @returns {Array} - The computed RGB values for the input, with a constant 255 for the alpha channel.
 **/
function _grayscale (r, g, b)
{
    let pixelAverage = (0.3 * r + 0.59 * g + 0.11 * b);

    return [pixelAverage, pixelAverage, pixelAverage, 255];
}

export function vibrance (data, adjust)
{
    return _apply(data, _vibrance, adjust);
}

/**
 * Similar to saturation, but adjusts the saturation levels in a slightly smarter, more subtle way.
 * Vibrance will attempt to boost colors that are less saturated more and boost already saturated
 * colors less, while saturation boosts all colors by the same level.
 *
 * See: https://github.com/meltingice/CamanJS/blob/master/src/lib/filters.coffee#L60
 *
 * @params {integer} r - the value of the red pixel
 * @params {integer} g - the value of the green pixel
 * @params {integer} b - the value of the blue pixel
 * @params {integer} adjust - the vibrance value for adjustment, -100 to 100
 * @returns {Array} - The computed RGB values for the input, with a constant 255 for the alpha channel.
 **/
function _vibrance (r, g, b, adjust)
{
    let adj = adjust * -1;

    let max = Math.max(r, g, b);
    let avg = r + g + b / 3;
    let amt = ((Math.abs(max - avg) * 2 / 255) * adj) / 100;

    return [
        r !== max ? r + (max - r) * amt : r,
        g !== max ? g + (max - g) * amt : g,
        b !== max ? b + (max - b) * amt : b,
        255
    ];
}

export function brightness (data, adjust)
{
    return _apply(data, _brightness, adjust);
}

function _brightness (r, g, b, adjust)
{
    let adj = Math.floor(255 * (adjust / 100));

    return [
        r + adj,
        g + adj,
        b + adj,
        255
    ];
}

export function contrast (data, adjust)
{
    return _apply(data, _contrast, adjust);
}

/**
 * Increases or decreases the color contrast of the image.
 *
 * @params {integer} r - the value of the red pixel
 * @params {integer} g - the value of the green pixel
 * @params {integer} b - the value of the blue pixel
 * @params {integer} adjust - the contrast value for adjustment, -100 to 100
 * @returns {Array} - The computed RGB values for the input, with a constant 255 for the alpha channel.
 **/
function _contrast (r, g, b, adjust)
{
    let adj = Math.pow((adjust + 100) / 100, 2);
    let rr = r, gg = g, bb = b;

    rr /= 255;
    rr -= 0.5;
    rr *= adj;
    rr += 0.5;
    rr *= 255;

    gg /= 255;
    gg -= 0.5;
    gg *= adj;
    gg += 0.5;
    gg *= 255;

    bb /= 255;
    bb -= 0.5;
    bb *= adj;
    bb += 0.5;
    bb *= 255;

    return [
        rr, gg, bb, 255
    ];
}
/**
 * Inverts the colours of a canvas.
 *
 * @params {object} data - A canvas image data object.
 * @returns {object} A new canvas data object.
 **/
export function invert(data)
{
    return _apply(data, _invert);
}

/**
 * Inverts the colours of the image.
 * See: https://github.com/meltingice/CamanJS/blob/master/src/lib/filters.coffee#L183
 *
 * @params {integer} r - the value of the red pixel
 * @params {integer} g - the value of the green pixel
 * @params {integer} b - the value of the blue pixel
 * @returns {Array} - The computed RGB values for the input, with a constant 255 for the alpha channel.
 **/
function _invert (r, g, b)
{
    return [
        255 - r,
        255 - g,
        255 - b,
        255
    ];
}

export function threshold(data, adjust)
{
    return _apply(data, _threshold, adjust);
}

/**
 * Black pixels above a certain value (0-255); otherwise white. Perceptively weighted.
 *
 * See: https://www.html5rocks.com/en/tutorials/canvas/imagefilters/
 *
 * @params {integer} r - the value of the red pixel
 * @params {integer} g - the value of the green pixel
 * @params {integer} b - the value of the blue pixel
 * @params {integer} adjust - the threshold value, 0-255
 * @returns {Array} - The computed RGB values for the input, with a constant 255 for the alpha channel.
 **/
function _threshold (r, g, b, adjust)
{
    let v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= adjust) ? 255 : 0;

    return [
        v, v, v, 255
    ];

}

export function hue (data, adjust)
{
    return _apply(data, _hue, adjust);
}

function _hue (r, g, b, adjust)
{
    let {h, s, v} = rgbToHSV(r, g, b);

    h = h * 100;
    h += Math.abs(adjust);
    h = h % 100;
    h /= 100;

    let res = hsvToRGB(h, s, v);

    return [
        res.r, res.g, res.b, 255
    ];
}


export function rgbToHSV (r, g, b)
{
    let rr = r, gg = g, bb = b;

    rr /= 255;
    gg /= 255;
    bb /= 255;

    let max = Math.max(rr, gg, bb);
    let min = Math.min(rr, gg, bb);
    let v = max;
    let d = max - min;

    let s = max === 0 ? 0 : d / max;
    let h;

    if (max === min)
        h = 0;
    else
    {
        switch (max)
        {
            case rr:
                h = (gg - bb) / d + (gg < bb ? 6 : 0);
                break;
            case gg:
                h = (bb - rr) / d + 2;
                break;
            case bb:
                h = (rr - gg) / d + 4;
                break;
        }

        h /= 6;
    }

    return {h, s, v};
}

export function hsvToRGB (h, s, v)
{
    let b, f, g, i, p, q, r, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6)
    {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }

    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}


/*********************************************
    Convolution filters
 *********************************************/

function convolve (data, weights, opaque)
{
    let side = Math.round(Math.sqrt(weights.length));
    let halfSide = Math.floor(side / 2);

    let srcData = data.data;
    let sw = data.width;
    let sh = data.height;
    let w = sw;
    let h = sh;

    let output = _getOffscreenCanvasData(w, h);
    let dst = output.data;

    let alphaFac = opaque ? 1 : 0;

    for (let y = 0; y < h; y++)
    {
        for (let x = 0; x < w; x++)
        {
            let sy = y;
            let sx = x;
            let dstOff = (y * w + x) * 4;

            let r = 0, g = 0, b = 0, a = 0;

            for (let cy = 0; cy < side; cy++)
            {
                for (let cx = 0; cx < side; cx++)
                {
                    let scy = sy + cy - halfSide;
                    let scx = sx + cx - halfSide;

                    if (scy >= 0 && scy < sh && scx >= 0 && scx < sw)
                    {
                        let srcOff = (scy * sw + scx) * 4;
                        let wt = weights[cy * side + cx];
                        r += srcData[srcOff] * wt;
                        g += srcData[srcOff + 1] * wt;
                        b += srcData[srcOff + 2] * wt;
                        a += srcData[srcOff + 3] * wt;
                    }
                }
            }

            dst[dstOff] = r;
            dst[dstOff + 1] = g;
            dst[dstOff + 2] = b;
            dst[dstOff + 3] = a + alphaFac * (255 - a);
        }
    }
    return output;
}


export function sharpen (data, adjust)
{
    let adj = adjust ? adjust : 100;
    adj /= 100;

    let weights = [
        0, -adj, 0,
        -adj, 4 * adj + 1, -adj,
        0, -adj, 0
    ];

    return convolve(data, weights);
}
