/*
 * Plugin for diva.js
 * Adds a little "tools" icon next to each image
 * When clicked, brings up a fullscreen panel, where you can adjust the image
 * , contrast, rotation, RBG
 */

var divaCanvas = (function() {
    var canvas = {},
        map = {},
        settings = {},
        oldLevels = { // fix this later
            c: 1,
            b: 0,
            r: 0
        },
        levels = {
            c: 1,
            b: 0,
            r: 0
        },
        image;

    // Set up some default settings (can be overridden the normal way)
    var defaults = {
        contrastStep: 0.05,
        maxBrightness: 150,
        maxContrast: 3,
        minBrightness: -100,
        minContrast: -1
    }

    // Define the main functions here
    var toRadians = function(angle) {
        return angle * Math.PI / 180;
    };

    var getNewCenter = function(currentCenter, angle) {
        var x = currentCenter.x - canvas.centerX;
        var y = -(currentCenter.y - canvas.centerY);
        // negative because, counterclockwise
        var theta = toRadians(levels.r - angle);
        return {x: Math.cos(theta) * x - Math.sin(theta) * y + canvas.centerX, y: -(Math.sin(theta) * x + Math.cos(theta) * y) + canvas.centerY};
    };

    var rotateCanvas = function(aCanvas, angle) {
        // Do the actual rotation
        var context = aCanvas.context;
        var center = aCanvas.size / 2;
        context.clearRect(0, 0, aCanvas.size, aCanvas.size);
        context.save();
        context.translate(center, center);
        context.rotate(toRadians(angle));
        context.drawImage(image, -(aCanvas.width/2), -(aCanvas.height/2), aCanvas.width, aCanvas.height);
        context.restore();
        aCanvas.data = context.getImageData(0, 0, aCanvas.size, aCanvas.size);
    };

    var handleRotate = function(angle) {
        // Now rotate the map
        rotateCanvas(map, angle);
    };

    var updateCanvas = function() {
        var angle = levels['r'];
        var oldAngle = oldLevels['r'];
        if (angle !== oldAngle) {
            // First figure out the current center of the viewport
            var leftScroll = $('#diva-canvas-backdrop').scrollLeft();
            var topScroll = $('#diva-canvas-backdrop').scrollTop();
            var leftOffset = settings.viewport.width / 2;
            var topOffset = settings.viewport.height / 2;
            var newCenter = getNewCenter({x: leftScroll + leftOffset, y: topScroll + topOffset}, angle);

            rotateCanvas(canvas, angle);
            $('#diva-canvas-backdrop').scrollLeft(newCenter.x - leftOffset);
            $('#diva-canvas-backdrop').scrollTop(newCenter.y - topOffset);
        }

        // Only call adjustLevels again if something changed
        // Brightness, contrast, or rotation
        if (levels['b'] !== oldLevels['b'] || levels['c'] !== oldLevels['c'] || levels['r'] !== oldLevels['r']) {
            adjustLevels(canvas);
            oldLevels['b'] = levels['b'];
            oldLevels['c'] = levels['c'];
            oldLevels['r'] = angle;
        }
    };

    var handleLevelUpdate = function(key, value, slider) {
        if (levels[key] !== value) {
            if (key == 'r') {
                handleRotate(value);
            }

            levels[key] = value;
            $(slider).prev().find('i').text(value);
            adjustLevels(map);
        }
    };

    // Returns a new array with copied image data etc
    var copyImageData = function(aCanvas) {
        var oldImageData = aCanvas.data;
        var newImageData = aCanvas.context.createImageData(oldImageData);
        var pixelArray = newImageData.data;

        for (var i = 0, length = pixelArray.length; i < length; i++) {
            pixelArray[i] = oldImageData.data[i];
        }

        return newImageData;
    };

    var adjustLevels = function(aCanvas) {
        var imageData = copyImageData(aCanvas);
        var pixelArray = imageData.data;
        var x, y, width, height, offset, r, g, b, newR, newG, newB;
        var brightMul = 1 + Math.min(settings.maxBrightness, Math.max(settings.minBrightness, levels.b)) / settings.maxBrightness;

        for (x = 0, width = imageData.width; x < width; x++) {
            for (y = 0, height = imageData.height; y < height; y++) {
                offset = (y * width + x) * 4;
                r = pixelArray[offset];
                g = pixelArray[offset + 1];
                b = pixelArray[offset + 2];
                
                // Only do something if the pixel is not black originally
                if (r + g + b > 0) {
                    newR = r * brightMul * levels.c + 128 - (levels.c * 128);
                    newG = g * brightMul * levels.c + 128 - (levels.c * 128);
                    newB = b * brightMul * levels.c + 128 - (levels.c * 128);

                    pixelArray[offset] = (newR > 0) ? Math.min(newR, 255) : 0;
                    pixelArray[offset + 1] = (newG > 0) ? Math.min(newG, 255) : 0;
                    pixelArray[offset + 2] = (newB > 0) ? Math.min(newB, 255) : 0;
                }
            }
        }

        aCanvas.context.clearRect(0, 0, width, height);
        aCanvas.context.putImageData(imageData, 0, 0);
    };

    var updateViewBox = function() {
        var cornerX = $('#diva-canvas-wrapper').scrollLeft() * map.scaleFactor + 10;
        var cornerY = $('#diva-canvas-wrapper').scrollTop() * map.scaleFactor + 10;
        // Subtract 2 to compensate for the border
        var height = Math.min(settings.viewport.height * map.scaleFactor, settings.mapSize) - 2;
        var width = Math.min(settings.viewport.width * map.scaleFactor, settings.mapSize) - 2;
        $('#diva-map-viewbox').height(height).width(width).css('top', cornerY + 'px').css('left', cornerX + 'px');
    };

    var loadMap = function(image) {
        map.canvas = document.getElementById('diva-canvas-minimap');
        map.size = settings.mapSize;
        map.canvas.width = map.size;
        map.canvas.height = map.size;

        map.context = map.canvas.getContext('2d');
        map.context.fillRect(0, 0, map.size, map.size);
        map.scaleFactor = settings.mapSize / canvas.size;
        map.cornerX = canvas.cornerX * map.scaleFactor;
        map.cornerY = canvas.cornerY * map.scaleFactor;
        // Image width and height
        map.width = image.width * map.scaleFactor;
        map.height = image.height * map.scaleFactor;

        map.context.drawImage(image, map.cornerX, map.cornerY, map.width, map.height);
        map.data = map.context.getImageData(0, 0, settings.mapSize, settings.mapSize);

        updateViewBox();
    };

    var loadCanvas = function(imageURL, callback) {
        image = new Image();
        image.src = imageURL;
        image.onload = function() {
            canvas.size = Math.sqrt(image.width * image.width + image.height * image.height);

            // Resize canvas if necessary
            canvas.canvas = document.getElementById('diva-canvas');
            canvas.canvas.width = canvas.size;
            canvas.canvas.height = canvas.size;
            canvas.cornerX = (canvas.size - image.width) / 2;
            canvas.cornerY = (canvas.size - image.height) / 2;
            canvas.width = image.width;
            canvas.height = image.height;
            canvas.centerX = canvas.size / 2;
            canvas.centerY = canvas.size / 2;

            canvas.context = canvas.canvas.getContext('2d');
            canvas.context.drawImage(image, canvas.cornerX, canvas.cornerY, canvas.width, canvas.height);
            canvas.data = canvas.context.getImageData(0, 0, canvas.size, canvas.size);

            // Only load the map the first time (when there is no callback)
            if (callback == undefined) {
                loadMap(image);
            }

            $.executeCallback(callback);
        };
    };

    var getImageURL = function(zoomLevel) {
        var width = settings.zoomWidthRatio * Math.pow(2, zoomLevel);
        return settings.iipServerURL + settings.filename + '&WID=' + width + '&CVT=JPG';
    };

    var updateZoom = function(newZoomLevel) {
        settings.zoomLevel = newZoomLevel;
        $('#zoom-slider').prev().find('i').text(newZoomLevel);
        // Figure out the new width based on the old zoom level & width
        var imageURL = getImageURL(newZoomLevel);

        loadCanvas(imageURL, function() {
            // Reset oldLevels to defaults, then adjust again
            oldLevels = {c: 1, b: 0, r: 0}
            if (oldLevels['r'] !== levels['r']) {
                rotateCanvas(canvas, levels['r']);
            }
            adjustLevels(canvas);
            map.scaleFactor = map.size / canvas.size;
            updateViewBox();
        });
    };

    return {
        init: function(divaSettings) {
            // Save some settings
            settings = $.extend(settings, defaults, divaSettings);
            settings.viewport = {
                height: window.innerHeight - settings.scrollbarWidth,
                width: window.innerWidth - settings.scrollbarWidth
            };
            settings.inCanvas = false;

            // Create the DOM elements
            $('body').append('<div id="diva-canvas-backdrop"><div id="diva-canvas-tools" style="right: ' + (settings.scrollbarWidth + 20) + 'px"><div id="diva-map-viewbox"></div><canvas id="diva-canvas-minimap"></canvas><br /><span>Brightness: <i>0</i> <b id="brightness-reset">(Reset)</b></span><div id="brightness-slider"></div><span>Contrast: <i>1</i> <b id="contrast-reset">(Reset)</b></span><div id="contrast-slider"></div><span>Rotation: <i>0</i>&deg; (<b class="rotation-reset" id="rotation-reset">0</b>&deg; <b class="rotation-reset">90</b>&deg; <b class="rotation-reset">180</b>&deg; <b class="rotation-reset">270</b>&deg;)</span><div id="rotation-slider"></div><span>Zoom level: <i>0</i></span><div id="zoom-slider"></div><div id="diva-canvas-applybox"><span><button type="button" id="diva-canvas-apply">Apply</button></span><span id="diva-canvas-loading">Loading ...</span></div></div><div id="diva-canvas-wrapper"><canvas id="diva-canvas"></canvas></div><div id="diva-canvas-close" style="background: url(' + settings.iconPath + 'close.png)"></div></div>');

            // Save the size of the map, as defined in the CSS
            settings.mapSize = $('#diva-canvas-minimap').width();
            
            // Handle events (sliders, clicking, etc)
            $('#brightness-slider').slider({
                min: settings.minBrightness,
                max: settings.maxBrightness,
                step: 1,
                value: 0,
                slide: function(event, ui) {
                    handleLevelUpdate('b', ui.value, this);
                }
            });

            $('#contrast-slider').slider({
                min: settings.minContrast,
                max: settings.maxContrast,
                step: settings.contrastStep,
                value: 1,
                slide: function(event, ui) {
                    handleLevelUpdate('c', ui.value, this);
                }
            });

            $('#rotation-slider').slider({
                min: 0,
                max: 359,
                step: 1,
                value: 0,
                slide: function(event, ui) {
                    handleLevelUpdate('r', ui.value, this);
                }
            });

            $('#brightness-reset').click(function() {
                handleLevelUpdate('b', 0, $('#brightness-slider').slider('value', 0));
            });

            $('#contrast-reset').click(function() {
                handleLevelUpdate('c', 1, $('#contrast-slider').slider('value', 1));
            });

            $('.rotation-reset').click(function() {
                var angle = $(this).text();
                handleLevelUpdate('r', $(this).text(), $('#rotation-slider').slider('value', $(this).text()));
            });

            $('#diva-canvas-apply').click(function() {
                $('#diva-canvas-loading').show();
                setTimeout(function() {
                    updateCanvas()
                    $('#diva-canvas-loading').fadeOut(1000);
                }, 10);
            });

            $('#diva-canvas-close').click(function() {
                $('body').removeClass('overflow-hidden');

                // Clear the canvases
                // This needs to be improved - not done properly?
                canvas.context.clearRect(0, 0, canvas.size, canvas.size);
                map.context.clearRect(0, 0, map.size, map.size);
                $('#diva-canvas-backdrop').hide();

                // Clear the sliders ...
                $('#brightness-reset').click();
                $('#contrast-reset').click();
                $('#rotation-reset').click();
            });

            $(window).resize(function() {
                settings.viewport = {
                    height: window.innerHeight - settings.scrollbarWidth,
                    width: window.innerWidth - settings.scrollbarWidth
                };

                // Always update the settings but only redraw if in canvas
                if (settings.inCanvas) {
                    updateViewBox();
                }
            });

            $('#diva-canvas-wrapper').scroll(function() {
                if (settings.inCanvas) {
                    updateViewBox();
                }
            });

            $('#diva-canvas-minimap, #diva-map-viewbox').click(function(event) {
                // offset - the top left corner
                var offsetY = 30;
                var offsetX = settings.viewport.width - settings.mapSize - 30;
                var scaledX = (event.pageX - offsetX) / map.scaleFactor;
                var scaledY = (event.pageY - offsetY) / map.scaleFactor;
                $('#diva-canvas-wrapper').scrollTop(scaledY - settings.viewport.height / 2);
                $('#diva-canvas-wrapper').scrollLeft(scaledX - settings.viewport.width / 2);
            });

            // Drag scroll
            $('#diva-canvas').mousedown(function() {
                $(this).addClass('grabbing');
            }).mouseup(function() {
                $(this).removeClass('grabbing');
            });
            $('#diva-canvas-wrapper').dragscrollable({
                acceptPropagatedEvent: true
            });

            // Double-click to zoom in/out (with CTRL)
            $('#diva-canvas-wrapper').dblclick(function(event) {
                updateZoom(settings.zoomLevel + 1);
            });
        },
        pluginName: 'canvas',
        titleText: 'View the image on a canvas and adjust various settings',
        setupHook: function(divaSettings) {
            settings.minZoomLevel = divaSettings.minZoomLevel;
            settings.maxZoomLevel = divaSettings.maxZoomLevel;
        },
        handleClick: function(event, divaSettings) {
            var zoomLevel = divaSettings.zoomLevel;
            // Prevent scroll in body, and show the canvas backdrop
            $('body').addClass('overflow-hidden');
            $('#diva-canvas-backdrop').show();

            // Set this to true so events can be captured
            settings.inCanvas = true;

            // loadCanvas() calls all the other necessary functions to load
            var page = $(this).parent().parent();
            var filename = $(page).attr('data-filename');
            var width = $(page).width() - 1;
            settings.zoomWidthRatio = width / Math.pow(2, zoomLevel);
            settings.filename = filename;
            var imageURL = getImageURL(zoomLevel);

            loadCanvas(imageURL);

            $('#zoom-slider').prev().find('i').text(zoomLevel);

            $('#zoom-slider').slider({
                min: settings.minZoomLevel,
                max: settings.maxZoomLevel,
                step: 1,
                value: zoomLevel,
                slide: function(event, ui) {
                    updateZoom(ui.value);
                }
            });

            // Figure out the multiplier for width/zoomLevel ratio etc
        }
    }
})();
