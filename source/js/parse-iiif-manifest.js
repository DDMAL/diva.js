/* jshint unused: true */

module.exports = parseIIIFManifest;

/**
 * Parses a IIIF Presentation API Manifest and converts it into a Diva.js-format object
 * (See https://github.com/DDMAL/diva.js/wiki/Development-notes#data-received-through-ajax-request)
 * (This is a client-side re-implementation of generate_json.py)
 *
 * @param {Object} manifest - an object that represents a valid IIIF manifest
 * @returns {Object} divaServiceBlock - the data needed by Diva to show a view of a single document
 */
function parseIIIFManifest(manifest)
{

    var incorporateZoom = function (imageDimension, zoomDifference)
    {
        return imageDimension / (Math.pow(2, zoomDifference));
    };

    var getMaxZoomLevel = function (width, height)
    {
        var largestDimension = Math.max(width, height);
        return Math.ceil(Math.log((largestDimension + 1) / (256 + 1)) / Math.log(2));
    };

    var createArrayWithValue = function (length, value)
    {
        var array = new Array(length);
        var i = length;

        while (i--)
        {
            array[i] = value;
        }

        return array;
    };

    var sequence = manifest.sequences[0];

    //@TODO choose a sequence intelligently
    var canvases = sequence.canvases;

    var zoomLevels = [];
    var images = [];
    var imageIndex = 0;

    var width;
    var height;
    var url;
    var filename;
    var info;
    var maxZoom;
    var label;
    var context;
    var resource;
    var imageAPIVersion;

    var title = manifest.label;

    for (var i = 0, numCanvases = canvases.length; i < numCanvases; i++)
    {
        resource = canvases[i].images[0].resource;
        width = resource.width || canvases[i].width;
        height = resource.height || canvases[i].height;

        info = parseImageInfo(resource);
        url = info.url;
        filename = url; // For IIIF, the url is the filename

        //append trailing / from url if it's not there
        if (url.slice(-1) !== '/')
        {
            url = url + '/';
        }

        maxZoom = getMaxZoomLevel(width, height);

        // get filenames from service block (@TODO should this be changed to 'identifiers?')
        // get label from canvas block ('filename' is legacy)
        label = canvases[i].label;

        // indicate whether canvas has viewingHint of non-paged
        var paged = canvases[i].viewingHint !== 'non-paged';
        var facingPages = canvases[i].viewingHint === 'facing-pages';

        context = resource.service['@context'];
        if (context === 'http://iiif.io/api/image/2/context.json')
        {
            imageAPIVersion = 2.0;
        }
        else if (context === 'http://library.stanford.edu/iiif/image-api/1.1/context.json')
        {
            imageAPIVersion = 1.1;
        }
        else
        {
            imageAPIVersion = 1.0;
        }

        images[imageIndex] = {
            'mx_w': width,
            'mx_h': height,
            'mx_z': maxZoom,
            'label': label,
            'fn': filename,
            'url': url,
            'api': imageAPIVersion,
            'paged': paged,
            'facingPages': facingPages
        };

        if (info.hasOwnProperty('x'))
        {
            images[imageIndex].xoffset = info.x;
            images[imageIndex].yoffset = info.y;
        }

        zoomLevels[imageIndex] = maxZoom;
        imageIndex++;
    }

    var lowestMaxZoom = Math.min.apply(Math, zoomLevels);

    // ratio calculations
    var maxRatio = 0;
    var minRatio = 100; // initialize high so we can get the minimum later

    var totalWidths = createArrayWithValue(lowestMaxZoom + 1, 0);
    var totalHeights = createArrayWithValue(lowestMaxZoom + 1, 0);
    var maxWidths = createArrayWithValue(lowestMaxZoom + 1, 0);
    var maxHeights = createArrayWithValue(lowestMaxZoom + 1, 0);

    var pages = [];
    var currentPageZoomData; // dimensions per zoomlevel

    var widthAtCurrentZoomLevel;
    var heightAtCurrentZoomLevel;

    var numImages = images.length;

    // for each page image:
    for (i = 0; i < numImages; i++)
    {
        currentPageZoomData = [];

        // construct 'd' key. for each zoom level:
        for (var j = 0; j < lowestMaxZoom + 1; j++)
        {
            // calculate current page zoom data
            widthAtCurrentZoomLevel = Math.floor(incorporateZoom(images[i].mx_w, lowestMaxZoom - j));
            heightAtCurrentZoomLevel = Math.floor(incorporateZoom(images[i].mx_h, lowestMaxZoom - j));
            currentPageZoomData[j] = {
                h: heightAtCurrentZoomLevel,
                w: widthAtCurrentZoomLevel
            };

            // add width of image at current zoom level to total widths/heights
            totalWidths[j] += widthAtCurrentZoomLevel;
            totalHeights[j] += heightAtCurrentZoomLevel;
            maxWidths[j] = Math.max(widthAtCurrentZoomLevel, maxWidths[j]);
            maxHeights[j] = Math.max(heightAtCurrentZoomLevel, maxHeights[j]);

            // calculate max/min ratios
            var ratio = images[i].mx_h / images[i].mx_w;
            maxRatio = Math.max(ratio, maxRatio);
            minRatio = Math.min(ratio, minRatio);
        }

        pages[i] = {
            d: currentPageZoomData,
            m: images[i].mx_z,
            l: images[i].label,
            f: images[i].fn,
            url: images[i].url,
            api: images[i].api,
            paged: images[i].paged,
            facingPages: images[i].facingPages
        };

        if (images[i].hasOwnProperty('xoffset'))
        {
            pages[i].xoffset = images[i].xoffset;
            pages[i].yoffset = images[i].yoffset;
        }
    }

    var averageWidths = [];
    var averageHeights = [];

    // for each zoom level, calculate average of heights/widths
    for (i = 0; i < lowestMaxZoom + 1; i++)
    {
        averageWidths.push(totalWidths[i] / images.length);
        averageHeights.push(totalHeights[i] / images.length);
    }

    var dims = {
        'a_wid': averageWidths,
        'a_hei': averageHeights,
        'max_w': maxWidths,
        'max_h': maxHeights,
        'max_ratio': maxRatio,
        'min_ratio': minRatio,
        't_hei': totalHeights,
        't_wid': totalWidths
    };


    var divaServiceBlock = {
        item_title: title,
        dims: dims,
        max_zoom: lowestMaxZoom,
        pgs: pages,
        paged: manifest.viewingHint === 'paged' || sequence.viewingHint === 'paged'
    };

    return divaServiceBlock;
}

/**
 * Takes in a resource block from a canvas and outputs the following information associated with that resource:
 * - Image URL
 * - Image region to be displayed
 *
 * @param {Object} resource - an object representing the resource block of a canvas section in a IIIF manifest
 * @returns {Object} imageInfo - an object containing image URL and region
 */
function parseImageInfo(resource)
{
    var url = resource['@id'];
    var fragmentRegex = /#xywh=([0-9]+,[0-9]+,[0-9]+,[0-9]+)/;
    var xywh = '';
    var stripURL = true;

    if (/\/([0-9]+,[0-9]+,[0-9]+,[0-9]+)\//.test(url))
    {
        // if resource in image API format, extract region x,y,w,h from URL (after 4th slash from last)
        // matches coordinates in URLs of the form http://www.example.org/iiif/book1-page1/40,50,1200,1800/full/0/default.jpg
        var urlArray = url.split('/');
        xywh = urlArray[urlArray.length - 4];
    }
    else if (fragmentRegex.test(url))
    {
        // matches coordinates of the style http://www.example.org/iiif/book1/canvas/p1#xywh=50,50,320,240
        var result = fragmentRegex.exec(url);
        xywh = result[1];
    }
    else if (resource.service && resource.service['@id'])
    {
        // assume canvas size based on image size
        url = resource.service['@id'];
        // this URL excludes region parameters so we don't need to remove them
        stripURL = false;
    }

    if (stripURL)
    {
        // extract URL up to identifier (we eliminate the last 5 parameters: /region/size/rotation/quality.format)
        url = url.split('/').slice(0, -4).join('/');
    }

    var imageInfo = {
        url: url
    };

    if (xywh.length)
    {
        // parse into separate components
        var dimensions = xywh.split(',');
        imageInfo.x = parseInt(dimensions[0], 10);
        imageInfo.y = parseInt(dimensions[1], 10);
        imageInfo.w = parseInt(dimensions[2], 10);
        imageInfo.h = parseInt(dimensions[3], 10);
    }

    return imageInfo;
}
