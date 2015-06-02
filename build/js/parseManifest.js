var parseManifest = function(manifest, iiifURL) {
    /*
     * Diva IIIF Manifest translator
     * Parses a IIIF Manifest and converts it into a Diva.js-format JSON string
     * (See https://github.com/DDMAL/diva.js/wiki/Development-notes#data-received-through-ajax-request)
     * (This is a client-side re-implementation of generate_json.py with IIIF Manifest input)
     *
     * @param {Object} manifest - an object that represents a valid IIIF manifest
     * @param {String} iiifURL - the IIIF Image API URL prefix for the images (everything before the image's unique identifier)
     * @returns {Object} divaServiceBlock - the data needed by Diva to show a view of a single document
     */

    incorporateZoom = function(imageDimension, zoomDifference)
    {
        return imageDimension / (Math.pow(2, zoomDifference));
    }

    getMaxZoomLevel = function(width, height)
    {
        var largestDimension = Math.max(width, height);
        return Math.ceil(Math.log((largestDimension + 1) / (256 + 1)) / Math.log(2));
    }

    initializeArrayWithValue = function(array, value)
    {
        var i = array.length;
        while (i--)
            array[i] = value;
    }

    //@TODO choose a sequence intelligently
    var canvases = manifest.sequences[0].canvases;

    var zoomLevels = new Array(canvases.length);
    var images = new Array(canvases.length);

    var width;
    var height;
    var url;
    var maxZoom;
    var filename;

    var prefixLength = iiifURL.length;

    for (var i = 0;i < canvases.length; i++)
    {
        width = canvases[i].width; //canvas width (@TODO should it be image width if there is one?)
        height = canvases[i].height; //canvas height (@TODO ")
        var resource = canvases[i].images[0].resource;
        url = resource['@id']; //image url for primary canvas resource

        maxZoom = getMaxZoomLevel(width, height);

        // get filenames from service block (@TODO should this be changed to 'identifiers?')
        filename = resource.service['@id'].substring(prefixLength);

        im = {
            'mx_w': width,
            'mx_h': height,
            'mx_z': maxZoom,
            'fn': filename
        }

        images[i] = im;
        zoomLevels[i] = maxZoom;
    }

    var lowestMaxZoom = Math.min.apply(Math, zoomLevels);

    // ratio calculations
    var maxRatio = 0;
    var minRatio = 100; // initialize high so we can get the minimum later

    // dimensions calculations @TODO rename to plurals for arrays with multiple zoom levels
    var totalWidths = new Array(lowestMaxZoom + 1);
    var totalHeights = new Array(lowestMaxZoom + 1);
    var maxWidths = new Array(lowestMaxZoom + 1);
    var maxHeights = new Array(lowestMaxZoom + 1);

    initializeArrayWithValue(totalWidths, 0);
    initializeArrayWithValue(totalHeights, 0);
    initializeArrayWithValue(maxWidths, 0);
    initializeArrayWithValue(maxHeights, 0);

    var pages = [];
    var currentPageZoomData; // dimensions per zoomlevel

    var widthAtCurrentZoomLevel;
    var heightAtCurrentZoomLevel;

    // for each page image:
    for (var i = 0; i < images.length; i++)
    {
        currentPageZoomData = [];

        // construct 'd' key. for each zoom level:
        for (j = 0; j < lowestMaxZoom + 1; j++)
        {
            // calculate current page zoom data
            widthAtCurrentZoomLevel = incorporateZoom(images[i].mx_w, lowestMaxZoom - j);
            heightAtCurrentZoomLevel = incorporateZoom(images[i].mx_h, lowestMaxZoom - j);
            //@TODO performance: can we use index rather than push here?
            currentPageZoomData.push({
                h: heightAtCurrentZoomLevel,
                w: widthAtCurrentZoomLevel
            });

            // add width of image at current zoom level to total widths/heights
            totalWidths[j] += widthAtCurrentZoomLevel;
            totalHeights[j] += heightAtCurrentZoomLevel;
            maxWidths[j] = Math.max(widthAtCurrentZoomLevel, maxWidths[j]);
            maxHeights[j] = Math.max(heightAtCurrentZoomLevel, maxHeights[j]);

            // calculate max/min ratios
            ratio = images[i].mx_h / images[i].mx_w;
            maxRatio = Math.max(ratio, maxRatio);
            minRatio = Math.min(ratio, minRatio);
        }

        pages[i] = {
            d: currentPageZoomData,
            m: images[i].mx_z,
            f: images[i].fn
        }
    }

    var averageWidths = [];
    var averageHeights = [];

    // for each zoom level, calculate average of heights/widths
    for (var i = 0; i < lowestMaxZoom + 1; i++)
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
        item_title: 'item_title', //@TODO manifest/sequence label?
        dims: dims,
        max_zoom: lowestMaxZoom,
        pgs: pages
    };

    return divaServiceBlock;
}

var mfst;
var iiifServerURL = 'http://dev-diva.simssa.ca/iiif/srv/images/beromunster/'
var parsed = {};

$.ajax( "/demo/bero_manifestparsed.json" )
    .done(function(data) {
        mfst = data;
        parsed = parseManifest(mfst, iiifServerURL);
        console.log(parsed);
});

