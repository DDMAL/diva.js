/*

Canvas plugin for diva.js
Adds an adjustment icon next to each image

*/

(function ($)
{
    window.divaPlugins.push((function ()
    {
        var canvas = {},
            map = {},
            settings = {},
            image,
            sliders,
            sliderMode;

        // Set up some default settings (can be overridden the normal way)
        var defaults = {
            brightnessMax: 150,
            brightnessMin: -100,
            brightnessStep: 1,
            contrastMax: 3,
            contrastMin: -1,
            contrastStep: 0.05,
            localStoragePrefix: 'canvas-',
            mobileWebkitMaxZoom: 2,
            rgbMax: 50,
            rgbMin: -50,
            throbberFadeSpeed: 200,
            throbberTimeout: 100,
            buttons: [
                'contrast',
                'brightness',
                'rotation',
                'zoom'
            ]
        };

        // Convert an angle from degrees to radians
        var toRadians = function (angle)
        {
            return angle * Math.PI / 180;
        };

        // Determine the new center of the page after rotating by the given angle
        var getNewCenter = function (currentCenter, angle)
        {
            var x = currentCenter.x - canvas.centerX;
            // Take the negative because the rotation is counterclockwise
            var y = -(currentCenter.y - canvas.centerY);

            var theta = toRadians(sliders.rotation.previous - angle);
            var newX = Math.cos(theta) * x - Math.sin(theta) * y + canvas.centerX;
            var newY = -(Math.sin(theta) * x + Math.cos(theta) * y) + canvas.centerY;

            return {'x': newX, 'y': newY};
        };

        // Rotates the image on the given canvas by the given angle
        var rotateCanvas = function (aCanvas, angle)
        {
            var context = aCanvas.context;
            var center = aCanvas.size / 2;
            var startX = -(aCanvas.width / 2);
            var startY = -(aCanvas.height / 2);

            // Clear the canvas so that remnants of the old image don't show
            context.clearRect(0, 0, aCanvas.size, aCanvas.size);

            // Do the rotation
            context.save();
            context.translate(center, center);
            context.rotate(toRadians(angle));
            context.drawImage(image, startX, startY, aCanvas.width, aCanvas.height);
            context.restore();

            // Save the new pixel data so that it can later be adjusted in adjustLevels
            aCanvas.data = context.getImageData(0, 0, aCanvas.size, aCanvas.size);
        };

        // Determine if we need to update the large canvas
        var shouldAdjustLevels = function ()
        {
            var slider;

            // Returns true if something has been changed
            for (slider in sliders)
            {
                if (sliders[slider].current !== sliders[slider].previous)
                {
                    return true;
                }
            }

            return false;
        };

        // Sets the "previous" value to the "current" value for every slider
        var updatePreviousLevels = function ()
        {
            var slider;

            for (slider in sliders)
            {
                sliders[slider].previous = sliders[slider].current;
            }
        };

        // Update the thumbnail preview (called when a slider is moved/reset)
        var updateMap = function ()
        {
            rotateCanvas(map, sliders.rotation.current);
            adjustLevels(map);
        };

        // Update the large canvas (rotation, zooming, scrolling, pixel manipulation)
        var updateCanvas = function ()
        {
            var angle = sliders.rotation.current;
            var oldAngle = sliders.rotation.previous;
            var zoomLevel = sliders.zoom.current;
            var oldZoomLevel = sliders.zoom.previous;

            // Scroll the user to the desired location
            if (angle !== oldAngle || zoomLevel !== oldZoomLevel)
            {
                // First figure out the current center of the viewport
                var leftScroll = $('#diva-canvas-wrapper').scrollLeft();
                var topScroll = $('#diva-canvas-wrapper').scrollTop();
                var leftOffset = settings.viewport.width / 2;
                var topOffset = settings.viewport.height / 2;

                // Then determine the new center (the same part of the image)
                var newCenter = getNewCenter({x: leftScroll + leftOffset, y: topScroll + topOffset}, angle);

                // Incorporate the zoom change ratio (would be 1 if no change)
                var zoomChange = Math.pow(2, zoomLevel - oldZoomLevel);
                var toLeftScroll = zoomChange * newCenter.x - leftOffset;
                var toTopScroll = zoomChange * newCenter.y - topOffset;

                // Rotate the large canvas
                rotateCanvas(canvas, angle);

                // Scroll to the new center
                $('#diva-canvas-wrapper').scrollLeft(toLeftScroll);
                $('#diva-canvas-wrapper').scrollTop(toTopScroll);
            }

            // Only call adjustLevels again if we really need to (expensive)
            if (shouldAdjustLevels())
            {
                adjustLevels(canvas);
                updatePreviousLevels();
            }
        };

        // Copies the canvas' pixel array and returns the copy
        var copyImageData = function (aCanvas)
        {
            var oldImageData = aCanvas.data;
            var newImageData = aCanvas.context.createImageData(oldImageData);
            var pixelArray = newImageData.data;
            var i, length;

            for (i = 0, length = pixelArray.length; i < length; i++)
            {
                pixelArray[i] = oldImageData.data[i];
            }

            return newImageData;
        };

        // Determines whether or not we need to adjust this level - very simple
        var shouldAdjust = function (mode)
        {
            var thisChanged = sliders[mode].current !== sliders[mode].previous;
            var thisNotDefault = sliders[mode].current !== sliders[mode].initial;

            return thisChanged || thisNotDefault;
        };

        var adjustLevels = function (aCanvas)
        {
            // Copy the pixel array to avoid destructively modifying the original
            var imageData = copyImageData(aCanvas);
            var pixelArray = imageData.data;

            // Store and calculate some scale factors and offsets
            var brightness = sliders.brightness.current;
            var contrast = sliders.contrast.current;

            var brightMul = 1 + Math.min(settings.brightnessMax, Math.max(settings.brightnessMin, brightness)) / settings.brightnessMax;
            var brightTimesContrast = brightMul * contrast;
            var contrastOffset = 128 - (contrast * 128);

            var redOffset = sliders.red.current;
            var greenOffset = sliders.green.current;
            var blueOffset = sliders.blue.current;

            // Determine whether or not we need to adjust certain things
            var adjustRed = shouldAdjust('red');
            var adjustGreen = shouldAdjust('green');
            var adjustBlue = shouldAdjust('blue');

            var adjustBrightness = shouldAdjust('brightness');
            var adjustContrast = shouldAdjust('contrast');
            var adjustOthers = adjustBrightness || adjustContrast;

            var x, y, width, height, offset, r, g, b;

            for (x = 0, width = imageData.width; x < width; x++)
            {
                for (y = 0, height = imageData.height; y < height; y++)
                {
                    offset = (y * width + x) * 4;

                    r = pixelArray[offset];
                    g = pixelArray[offset + 1];
                    b = pixelArray[offset + 2];

                    // Only do something if the pixel is not black originally
                    if (r + g + b > 0)
                    {
                        // Only adjust individual colour channels if necessary
                        if (adjustRed && r)
                            r += redOffset;

                        if (adjustGreen && g)
                            g += greenOffset;

                        if (adjustBlue && b)
                            b += blueOffset;

                        // If we need to adjust brightness and/or contrast
                        if (adjustOthers)
                        {
                            if (r)
                                r = r * brightTimesContrast + contrastOffset;

                            if (g)
                                g = g * brightTimesContrast + contrastOffset;

                            if (b)
                                b = b * brightTimesContrast + contrastOffset;
                        }

                        pixelArray[offset] = r;
                        pixelArray[offset + 1] = g;
                        pixelArray[offset + 2] = b;
                    }
                }
            }

            aCanvas.context.clearRect(0, 0, width, height);
            aCanvas.context.putImageData(imageData, 0, 0);
        };

        // Update the box in the preview showing where you currently are
        var updateViewbox = function ()
        {
            // Determine the top left corner coordinates based on our current position
            var cornerX = $('#diva-canvas-wrapper').scrollLeft() * map.scaleFactor;
            var cornerY = $('#diva-canvas-wrapper').scrollTop() * map.scaleFactor;

            // Subtract 4 to compensate for the borders
            var height = Math.min(Math.round(settings.viewport.height * map.scaleFactor), settings.mapSize) - 4;
            var width = Math.min(Math.round(settings.viewport.width * map.scaleFactor), settings.mapSize) - 4;

            $('#diva-map-viewbox').height(height).width(width).css({top: cornerY, left: cornerX});
        };

        // Draw the thumbnail preview in the toolbar
        var loadMap = function (image)
        {
            map.canvas = document.getElementById('diva-canvas-minimap');
            map.size = settings.mapSize;
            map.canvas.width = map.size;
            map.canvas.height = map.size;

            // Give it a black background
            map.context = map.canvas.getContext('2d');
            map.context.fillRect(0, 0, map.size, map.size);

            // Determine the coordinates/dimensions of the preview
            map.scaleFactor = settings.mapSize / canvas.size;
            map.cornerX = canvas.cornerX * map.scaleFactor;
            map.cornerY = canvas.cornerY * map.scaleFactor;
            map.width = image.width * map.scaleFactor;
            map.height = image.height * map.scaleFactor;

            // Draw the image within the map (no adjustments) and save the pixel array
            map.context.drawImage(image, map.cornerX, map.cornerY, map.width, map.height);
            map.data = map.context.getImageData(0, 0, settings.mapSize, settings.mapSize);

            // Show the viewbox, make it reflect where we currently are
            $('#diva-map-viewbox').show();
            updateViewbox();
        };

        // Load the image within the large and small canvases
        var loadCanvas = function (imageURL, callback)
        {
            image = new Image();
            image.crossOrigin = "anonymous";

            image.onload = function ()
            {
                // Determine the size of the (square) canvas based on the hypoteneuse
                canvas.size = Math.sqrt(image.width * image.width + image.height * image.height);

                // Resize the canvas if necessary
                canvas.canvas = document.getElementById('diva-canvas');
                canvas.canvas.width = canvas.size;
                canvas.canvas.height = canvas.size;
                canvas.cornerX = (canvas.size - image.width) / 2;
                canvas.cornerY = (canvas.size - image.height) / 2;
                canvas.width = image.width;
                canvas.height = image.height;
                canvas.centerX = canvas.size / 2;
                canvas.centerY = canvas.size / 2;

                // Draw the image to the large canvas, and save the pixel array
                canvas.context = canvas.canvas.getContext('2d');
                canvas.context.drawImage(image, canvas.cornerX, canvas.cornerY, canvas.width, canvas.height);
                try
                {
                    canvas.data = canvas.context.getImageData(0, 0, canvas.size, canvas.size);
                }
                catch (error)
                {
                    var canvasError = '<div id="diva-error" class="diva-error"><p><strong>Error</strong></p><p>' + error.message + '</p>';

                    if (error.name === 'SecurityError')
                    {
                        canvasError += '<p>You may need to update your server configuration in order to use the image manipulation tools. ' +
                        'For help, see the <a href="https://github.com/DDMAL/diva.js/wiki/The-API-and-Plugins#a-note-about-' +
                        'canvas-and-cross-site-data" target="_blank">canvas cross-site data documentation</a>.</p>' +
                        '</div>';
                    }
                    else
                    {
                        throw error;
                    }

                    canvasError += '</div>';
                    $('#diva-canvas-backdrop').append(canvasError);
                    hideThrobber();
                }

                // Only load the map the first time (when there is no callback)
                if (callback === undefined) {
                    loadMap(image);
                }

                // Update the map and the canvas if necessary
                updateMap();
                updateCanvas(canvas);

                // Hide the throbber if it is visible
                hideThrobber();

                // If the callback function exists, execute it (for zooming)
                if (typeof callback === 'function')
                    callback.call(callback);
            };

            image.src = imageURL;

            // make sure the load event fires for cached images too
            if ( image.complete || image.complete === undefined ) {
                image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                image.src = imageURL;
            }
        };

        var updateSliderLabel = function ()
        {
            var thisSlider = sliders[sliderMode];
            var value = thisSlider.current;
            var stringValue = (thisSlider.transform) ? thisSlider.transform(value) : value;
            $('#diva-canvas-value').html(stringValue);
        };

        var updateSliderValue = function ()
        {
            $('#diva-canvas-slider').val(sliders[sliderMode].current);
        };

        // Returns the URL for the image at the specified zoom level
        var getImageURL = function (zoomLevel)
        {
            var width = settings.zoomWidthRatio * Math.pow(2, zoomLevel);
            var imdir = settings.imageDir + "/";
            var pageIndex = settings.selectedPageIndex;

            var imageURL;

            if (settings.isIIIF)
            {
                var quality = (settings.pages[pageIndex].api > 1.1) ? 'default' : 'native';
                imageURL = encodeURI(settings.pages[pageIndex].url + 'full/' + width + ',/0/' + quality + '.jpg');
            }
            else
            {
                imageURL = settings.iipServerURL + "?FIF=" + imdir + settings.filename + '&WID=' + width + '&CVT=JPEG';
            }

            return imageURL;
        };

        var showThrobber = function ()
        {
            // Only show the throbber if it will take a long time
            if (sliders.zoom.current > 0 || settings.mobileWebkit)
                $(settings.selector + 'throbber').addClass('canvas-throbber').show();
        };

        // Hides the loading indicator icon
        var hideThrobber = function ()
        {
            $(settings.selector + 'throbber').removeClass('canvas-throbber').hide();
        };

        // If any modifications have been applied, save them to localStorage
        var saveSettings = function ()
        {
            var sliderSettings = {};
            var changed = false;
            var storageKey = settings.localStoragePrefix + settings.filename;
            var slider;

            for (slider in sliders)
            {
                if (sliders[slider].previous !== sliders[slider].initial)
                {
                    sliderSettings[slider] = sliders[slider].previous;
                    changed = true;
                }
            }

            // If modifications need to be saved, update the canvas plugin icon
            if (changed)
            {
                settings.pluginIcon.addClass('new');
                localStorage.setObject(storageKey, sliderSettings);
            }
            else
            {
                settings.pluginIcon.removeClass('new');
                localStorage.removeItem(storageKey);
            }
        };

        // Handles zooming in when the zoom slider is changed and the change is applied
        var updateZoom = function (newZoomLevel, callback)
        {
            settings.zoomLevel = newZoomLevel;

            // Figure out the URL for the image at this new zoom level
            var imageURL = getImageURL(newZoomLevel);

            loadCanvas(imageURL, function ()
            {
                // Set the new scale factor and update the viewbox
                map.scaleFactor = map.size / canvas.size;
                updateViewbox();

                saveSettings();
            });
        };

        var bindCanvasKeyEvents = function (event)
        {
            var upArrowKey = 38,
                downArrowKey = 40,
                leftArrowKey = 37,
                rightArrowKey = 39;

            switch (event.keyCode)
            {
                case upArrowKey:
                    // Up arrow - scroll up
                    $('#diva-canvas-wrapper').scrollTop(document.getElementById('diva-canvas-wrapper').scrollTop - settings.arrowScrollAmount);
                    return false;

                case downArrowKey:
                    // Down arrow - scroll down
                    $('#diva-canvas-wrapper').scrollTop(document.getElementById('diva-canvas-wrapper').scrollTop + settings.arrowScrollAmount);
                    return false;

                case leftArrowKey:
                    // Left arrow - scroll left
                    $('#diva-canvas-wrapper').scrollLeft(document.getElementById('diva-canvas-wrapper').scrollLeft - settings.arrowScrollAmount);
                    return false;

                case rightArrowKey:
                    // Right arrow - scroll right
                    $('#diva-canvas-wrapper').scrollLeft(document.getElementById('diva-canvas-wrapper').scrollLeft + settings.arrowScrollAmount);
                    return false;
            }
        };

        var retval =
        {
            init: function (divaSettings, divaInstance)
            {
                // If the browser does not support canvas, do nothing
                // And, disable this plugin
                var canvasSupported = !!window.HTMLCanvasElement;
                if (!canvasSupported)
                    return false;

                // Override all the configurable settings defined under canvasPlugin
                $.extend(settings, defaults, divaSettings.canvasPlugin);

                settings.inCanvas = false;
                settings.iipServerURL = divaSettings.iipServerURL;
                settings.imageDir = divaSettings.imageDir;
                settings.selector = divaSettings.selector;
                settings.mobileWebkit = divaSettings.mobileWebkit;
                settings.arrowScrollAmount = divaSettings.arrowScrollAmount;

                // Set up the settings for the sliders/icons
                sliders = {
                    'contrast': {
                        'initial': 1,
                        'min': settings.contrastMin,
                        'max': settings.contrastMax,
                        'step': settings.contrastStep,
                        'transform': function (value) {
                            return value.toFixed(2);
                        },
                        'title': 'Change the contrast'
                    },
                    'brightness': {
                        'initial': 0,
                        'min': settings.brightnessMin,
                        'max': settings.brightnessMax,
                        'step': settings.brightnessStep,
                        'title': 'Adjust the brightness'
                    },
                    'rotation': {
                        'initial': 0,
                        'min': 0,
                        'max': 359,
                        'step': 1,
                        'transform': function (value) {
                            return value + '&deg;';
                        },
                        'title': 'Rotate the image'
                    },
                    'zoom': {
                        // Default, min and max values updated within setupHook
                        'initial': 0,
                        'min': 0,
                        'max': 0,
                        'step': 1,
                        'title': 'Adjust the zoom level'
                    },
                    'red': {
                        'initial': 0,
                        'min': settings.rgbMin,
                        'max': settings.rgbMax,
                        'step': 1,
                        'title': 'Adjust the red channel'
                    },
                    'green': {
                        'initial': 0,
                        'min': settings.rgbMin,
                        'max': settings.rgbMax,
                        'step': 1,
                        'title': 'Adjust the green channel'
                    },
                    'blue': {
                        'initial': 0,
                        'min': settings.rgbMin,
                        'max': settings.rgbMax,
                        'step': 1,
                        'title': 'Adjust the blue channel'
                    }
                };

                // Copy the "default" value into "value" and "previous" for each slider
                var resetSliders = function ()
                {
                    var defaultValue, thisSlider, slider;
                    for (slider in sliders)
                    {
                        thisSlider = sliders[slider];
                        defaultValue = thisSlider.initial;
                        thisSlider.current = defaultValue;
                        thisSlider.previous = defaultValue;
                    }
                };

                resetSliders();

                // Create the DOM elements if they haven't already been created
                if ($('#diva-canvas-backdrop').length)
                {
                    // Return true to keep the plugin enabled
                    return true;
                }

                var canvasButtonsList = [];
                var buttonHTML, button, buttonTitle, i;

                for (i in settings.buttons)
                {
                    button = settings.buttons[i];
                    buttonTitle = sliders[button].title;
                    buttonHTML = '<div class="' + button + '" title="' + buttonTitle + '"></div>';
                    canvasButtonsList.push(buttonHTML);
                }
                var canvasButtons = canvasButtonsList.join('');

                var canvasTools = '<div id="diva-canvas-tools">' +
                    '<div id="diva-canvas-toolbar">' +
                        '<div id="diva-canvas-close" title="Return to the document viewer"></div>' +
                        '<div id="diva-canvas-minimise" title="Minimise the toolbar"></div>' +
                        '<span id="diva-canvas-info">Test</span>' +
                    '</div>' +
                    '<div id="diva-canvas-toolwindow">' +
                        '<div id="diva-map-viewbox"></div>' +
                        '<canvas id="diva-canvas-minimap"></canvas>' +
                        '<div id="diva-canvas-buttons">' +
                            canvasButtons +
                        '</div>' +
                        '<div id="diva-canvas-pane">' +
                            '<p id="diva-canvas-tooltip">' +
                                '<span id="diva-canvas-mode">contrast</span>: ' +
                                '<span id="diva-canvas-value">0</span> ' +
                                '<span id="diva-canvas-reset" class="link">(Reset)</span>' +
                            '</p>' +
                            '<input type="range" id="diva-canvas-slider"></input>' +
                        '</div>' +
                        '<br />' +
                        '<div class="action-buttons">' +
                            '<a href="#" id="diva-canvas-reset-all">Reset all</a>' +
                            '<a href="#" id="diva-canvas-apply">Apply</a>' +
                        '</div>' +
                    '</div>' +
                '</div>';
                var canvasWrapper = '<div id="diva-canvas-wrapper">' +
                    '<canvas id="diva-canvas"></canvas>' +
                '</div>';
                var canvasString = '<div id="diva-canvas-backdrop">' +
                    canvasTools +
                    canvasWrapper +
                '</div>';

                $('body').append(canvasString);

                // Save the size of the map, as defined in the CSS
                settings.mapSize = $('#diva-canvas-minimap').width();

                // Adjust the slider when something is clicked, and make that the current mode
                $('#diva-canvas-buttons div').click(function ()
                {
                    $('#diva-canvas-buttons .clicked').removeClass('clicked');
                    updateSlider($(this).attr('class'));
                });

                var updateSlider = function (newMode)
                {
                    sliderMode = newMode;
                    var sliderData = sliders[sliderMode];

                    $('#diva-canvas-buttons .' + sliderMode).addClass('clicked');

                    $('#diva-canvas-mode').text(sliderMode);

                    var newValue = sliderData.current;
                    var newValueString = (sliderData.transform) ? sliderData.transform(newValue) : newValue;

                    var slider = document.getElementById('diva-canvas-slider');
                    slider.min = sliderData.min;
                    slider.max = sliderData.max;
                    slider.step = sliderData.step;
                    $('#diva-canvas-slider').val(newValue);
                    $('#diva-canvas-value').html(newValueString);
                };

                updateSlider('contrast');

                // Create the slider
                $('#diva-canvas-slider').on('input', function(e){
                    sliders[sliderMode].current = parseFloat(this.value);
                    updateSliderLabel();
                    updateMap();
                });

                // Reset all the sliders to the default value
                $('#diva-canvas-reset-all').click(function ()
                {
                    var slider;

                    for (slider in sliders)
                    {
                        sliders[slider].current = sliders[slider].initial;
                    }

                    // Change the value of the label
                    updateSliderLabel();
                    updateSliderValue();

                    // Update the preview
                    updateMap();
                });

                // Reset the current slider to the default value
                $('#diva-canvas-reset').click(function ()
                {
                    // Update the current value and the slider
                    sliders[sliderMode].current = sliders[sliderMode].initial;
                    updateSliderLabel();
                    updateSliderValue();

                    // Update the preview
                    updateMap();
                });

                // Update the large canvas when the apply button is clicked
                $('#diva-canvas-apply').click(function ()
                {
                    if (shouldAdjustLevels())
                    {
                        showThrobber();

                        setTimeout(function ()
                        {
                            if (sliders.zoom.current !== sliders.zoom.previous)
                            {
                                updateZoom(sliders.zoom.current);
                            }
                            else
                            {
                                updateCanvas();
                                hideThrobber();

                                // Save modifications to localSettings (also done in updateZoom callback)
                                saveSettings();
                            }
                        }, settings.throbberTimeout);
                    }
                });

                // Handle exiting canvas mode
                $('#diva-canvas-close').click(function ()
                {
                    $('body').removeClass('overflow-hidden');

                    // Clear the canvases and hide things
                    // This needs to be improved - not done properly?
                    canvas.context.clearRect(0, 0, canvas.size, canvas.size);
                    map.context.clearRect(0, 0, map.size, map.size);
                    $('#diva-canvas-wrapper').scrollTop(0).scrollLeft(0);
                    $('#diva-canvas-backdrop').hide();
                    $('#diva-map-viewbox').hide();
                    hideThrobber();

                    // Re-enable scrolling of diva when it is in the background
                    divaInstance.enableScrollable();
                    $(document).off('keydown', bindCanvasKeyEvents);

                    // Reset everything
                    resetSliders();
                    updateSliderLabel();
                    updateSliderValue();
                    $('#diva-canvas-buttons .clicked').removeClass('clicked');
                    updateSlider('contrast');

                    diva.Events.publish("CanvasViewDidHide");
                });

                // Hide the toolbar when the minimise icon is clicked
                $('#diva-canvas-minimise').click(function ()
                {
                    $('#diva-canvas-toolwindow').slideToggle('fast');
                });

                // Adjust the size of the canvas when the browser window is resized
                $(window).resize(function ()
                {
                    settings.viewport = {
                        height: window.innerHeight - divaSettings.scrollbarWidth,
                        width: window.innerWidth - divaSettings.scrollbarWidth
                    };

                    // Always update the settings but only redraw if in canvas
                    if (settings.inCanvas)
                        updateViewbox();
                });

                // Update the viewbox when the large canvas is scrolled
                $('#diva-canvas-wrapper').scroll(function ()
                {
                    if (settings.inCanvas)
                        updateViewbox();
                });

                // Handle clicking/dragging of the viewbox (should scroll the large canvas)
                $('#diva-canvas-minimap, #diva-map-viewbox').mouseup(function (event)
                {
                    // Consider caching this eventually (can't be done in init though)
                    var offset = $('#diva-canvas-minimap').offset();

                    var scaledX = (event.pageX - offset.left) / map.scaleFactor;
                    var scaledY = (event.pageY - offset.top) / map.scaleFactor;

                    $('#diva-canvas-wrapper').scrollTop(scaledY - settings.viewport.height / 2);
                    $('#diva-canvas-wrapper').scrollLeft(scaledX - settings.viewport.width / 2);
                });

                // Enable drag scroll
                $('#diva-canvas').mousedown(function ()
                {
                    $(this).addClass('grabbing');
                }).mouseup(function ()
                {
                    $(this).removeClass('grabbing');
                });

                if (settings.mobileWebkit)
                {
                    $('#diva-canvas-wrapper').kinetic();
                }
                else
                {
                    $('#diva-canvas-wrapper').dragscrollable({
                        acceptPropagatedEvent: true
                    });
                }

                diva.Events.subscribe('ObjectDidLoad', this.setupHook);
                diva.Events.subscribe('ViewerDidTerminate', this.destroy);
                diva.Events.subscribe('PageDidLoad', this.onPageLoad);

                return true;
            },

            pluginName: 'canvas',

            titleText: 'View the image on a canvas and adjust various settings',

            setupHook: function(divaSettings)
            {
                settings.viewport = {
                    height: window.innerHeight - divaSettings.scrollbarWidth,
                    width: window.innerWidth - divaSettings.scrollbarWidth
                };

                // Save the min and max zoom level, and update the zoom slider
                settings.minZoomLevel = divaSettings.minZoomLevel;
                settings.maxZoomLevel = divaSettings.maxZoomLevel;

                // If we're on the iPad, limit the max zoom level to 2
                // Can't do canvas elements that are > 5 megapixels (issue #112)
                if (settings.mobileWebkit)
                    settings.maxZoomLevel = Math.min(settings.maxZoomLevel, settings.mobileWebkitMaxZoom);

                sliders.zoom.min = settings.minZoomLevel;
                sliders.zoom.max = settings.maxZoomLevel;
            },

            handleClick: function(event, divaSettings, divaInstance)
            {
                // loadCanvas() calls all the other necessary functions to load
                var page = $(this).parent().parent();
                var filename = $(page).attr('data-filename');
                var selectedPageIndex = $(page).attr('data-index');
                var width = $(page).width() - 1;
                var zoomLevel = divaSettings.zoomLevel;
                var slider;

                settings.zoomWidthRatio = width / Math.pow(2, zoomLevel);
                settings.pluginIcon = $(this);

                settings.pages = divaSettings.pages;
                settings.isIIIF = divaSettings.isIIIF;
                settings.selectedPageIndex = selectedPageIndex;

                // Limit the max zoom level if we're on the iPad
                if (settings.mobileWebkit) {
                    zoomLevel = Math.min(settings.maxZoomLevel, zoomLevel);
                }

                settings.filename = filename;
                sliders.zoom.initial = zoomLevel;
                sliders.zoom.current = zoomLevel;

                // Find the settings stored in localStorage, if they exist
                var sliderSettings = localStorage.getObject(settings.localStoragePrefix + settings.filename);
                if (sliderSettings)
                {
                    for (slider in sliderSettings)
                    {
                        sliders[slider].current = sliderSettings[slider];

                        // If the current slider's value has changed, update it
                        if (slider === sliderMode)
                        {
                            updateSliderLabel();
                            updateSliderValue();
                        }

                        if (slider === 'zoom')
                        {
                            zoomLevel = sliderSettings[slider];
                        }
                    }
                }

                sliders.zoom.previous = zoomLevel;

                // Prevent scroll in body, and show the canvas backdrop
                $('body').addClass('overflow-hidden');
                $('#diva-canvas-backdrop').show();

                // Disable scrolling on main diva instance
                divaInstance.disableScrollable();
                // Enable canvas scrolling
                $(document).keydown(bindCanvasKeyEvents);

                // Set this to true so events can be captured
                settings.inCanvas = true;

                var imageURL = getImageURL(zoomLevel);

                // Change the title of the page
                $('#diva-canvas-info').text($(page).attr('title'));

                showThrobber();

                diva.Events.publish('CanvasViewDidActivate', [page]);

                loadCanvas(imageURL);
            },

            onPageLoad: function(pageIndex, filename, selector)
            {
                // If something exists for this page in localStorage, then change icon color
                var storageKey = settings.localStoragePrefix + filename;

                if (localStorage.getItem(storageKey) !== null)
                {
                    $(selector).find('.diva-canvas-icon').addClass('new');
                }
            },

            destroy: function(divaSettings, divaInstance)
            {
                $('#diva-canvas-backdrop').remove();
            }
        };

        // this returns an object with all of the necessary hooks and callbacks
        // embedded.
        return retval;

    })());
})(jQuery);
