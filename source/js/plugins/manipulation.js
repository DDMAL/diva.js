import {
    grayscale,
    vibrance,
    brightness,
    contrast,
    hue,
    invert,
    threshold,
    sharpen
} from "./_filters";

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 be triggered. The function will be called after it stops being called for
 N milliseconds. If `immediate` is passed, trigger the function on the
 leading edge, instead of the trailing.
 */
function debounce(func, wait, immediate)
{
    let timeout;
    return function ()
    {
        let context = this, args = arguments;
        let later = function ()
        {
            timeout = null;
            if (!immediate)
            {
                func.apply(context, args);
            }
        };
        let callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow)
        {
            func.apply(context, args);
        }
    };
}

/**
 * A Diva.js plugin that allows users to manipulate images by adjusting their
 * brightness, contrast, and other parameters.
 **/
export default class ManipulationPlugin
{
    constructor(core)
    {
        this._core = core;
        this.pageToolsIcon = this.createIcon();
        this._backdrop = null;
        this._page = null;
        this._mainImage = null;
        this._canvas = null;
        this._filters = {
            brightness: null,
            contrast: null
        };

        // store the data for the original main image so that we
        // do the processing on that, not on a previously-processed image.
        this._originalData = null;

        this.boundEscapeListener = this.escapeListener.bind(this);
    }

    handleClick(event, settings, publicInstance, pageIndex)
    {
        document.body.style.overflow = 'hidden';
        this._backdrop = document.createElement('div');
        this._backdrop.classList.add('manipulation-fullscreen');

        this._sidebar = document.createElement('div');
        this._sidebar.classList.add('manipulation-sidebar');

        this._mainArea = document.createElement('div');
        this._mainArea.classList.add('manipulation-main-area');

        this._tools = document.createElement('div');
        this._tools.classList.add('manipulation-tools');

        this._backdrop.appendChild(this._sidebar);
        this._backdrop.appendChild(this._mainArea);
        this._backdrop.appendChild(this._tools);

        this._core.parentObject.appendChild(this._backdrop);
        document.addEventListener('keyup', this.boundEscapeListener);

        this._page = settings.manifest.pages[pageIndex];

        this._canvas = document.createElement('canvas');
        this._ctx = this._canvas.getContext('2d');
        this._mainArea.appendChild(this._canvas);

        this._initializeSidebar();
        this._initializeTools();
    }

    /*
    *  Returns an SVG object representing the icon for the project. Implemented in code
    *  here so that the entire Diva object can be passed to the client with no external
    *  dependencies.
    **/
    createIcon()
    {
        const manipulationIcon = document.createElement('div');
        manipulationIcon.classList.add('diva-manipulation-icon');

        let root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        root.setAttribute("x", "0px");
        root.setAttribute("y", "0px");
        root.setAttribute("viewBox", "0 0 25 25");
        root.id = `${this._core.settings.selector}manipulation-icon`;

        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.id = `${this._core.settings.selector}manipulation-icon-glyph`;
        g.setAttribute("transform", "matrix(1, 0, 0, 1, -11.5, -11.5)");
        g.setAttribute("class", "diva-pagetool-icon");

        let path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path1.setAttribute("d", "M27,21h-1v-9h-3v9h-1c-0.55,0-1,0.45-1,1v3c0,0.55,0.45,1,1,1h1h3h1c0.55,0,1-0.45,1-1v-3C28,21.45,27.55,21,27,21z M27,24h-5v-0.5h5V24z");

        let path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path2.setAttribute("d", "M35,16h-1v-4h-3v4h-1c-0.55,0-1,0.45-1,1v3c0,0.55,0.45,1,1,1h1h3h1c0.55,0,1-0.45,1-1v-3C36,16.45,35.55,16,35,16z M35,19h-5v-0.5h5V19z");

        let path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path3.setAttribute("d", "M19,26h-1V12h-3v14h-1c-0.55,0-1,0.45-1,1v3c0,0.55,0.45,1,1,1h1h3h1c0.55,0,1-0.45,1-1v-3C20,26.45,19.55,26,19,26zM19,29h-5v-0.5h5V29z");

        let rect1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect1.setAttribute('x', '23');
        rect1.setAttribute('y', '27');
        rect1.setAttribute('width', '3');
        rect1.setAttribute('height', '9');

        let rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect2.setAttribute('x', '31');
        rect2.setAttribute('y', '22');
        rect2.setAttribute('width', '3');
        rect2.setAttribute('height', '14');

        let rect3 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect3.setAttribute('x', '15');
        rect3.setAttribute('y', '32');
        rect3.setAttribute('width', '3');
        rect3.setAttribute('height', '4');

        g.appendChild(path1);
        g.appendChild(path2);
        g.appendChild(rect1);
        g.appendChild(path3);
        g.appendChild(rect2);
        g.appendChild(rect3);
        root.appendChild(g);

        manipulationIcon.appendChild(root);

        return manipulationIcon;
    }

    escapeListener(event)
    {
        if (event.keyCode === 27)
        {
            document.removeEventListener('keyup', this.boundEscapeListener);
            document.body.style.overflow = 'auto';
            this._core.parentObject.removeChild(this._backdrop);
        }
    }

    _initializeSidebar()
    {
        // 150px wide images for the sidebar.
        let thumbnailSize = "150";
        let mainPageSidebarImageURL = `${this._page.url}full/${thumbnailSize},/0/default.jpg`;

        let otherImageURLs = this._page.otherImages.map((img) =>
        {
            return `${img.url}full/${thumbnailSize},/0/default.jpg`;
        });

        let primaryImgDiv = document.createElement('div');
        primaryImgDiv.classList.add('manipulation-sidebar-primary-image');

        let primaryImg = document.createElement('img');
        primaryImg.setAttribute('src', mainPageSidebarImageURL);

        let primaryImgLabel = document.createElement('div');
        primaryImgLabel.textContent = this._page.il;

        primaryImgDiv.appendChild(primaryImg);
        primaryImgDiv.appendChild(primaryImgLabel);

        this._sidebar.appendChild(primaryImgDiv);

        primaryImgDiv.addEventListener('click', () =>
        {
            this._loadImageInMainArea.call(this, event, this._page.url);
        });

        otherImageURLs.map((url, idx) =>
        {
            let othDiv = document.createElement('div');
            othDiv.classList.add('manipulation-sidebar-secondary-image');

            let othImg = document.createElement('img');
            othImg.setAttribute('src', url);

            let othImgLabel = document.createElement('div');
            othImgLabel.textContent = this._page.otherImages[idx].il;

            othDiv.appendChild(othImg);
            othDiv.appendChild(othImgLabel);

            this._sidebar.appendChild(othDiv);

            othDiv.addEventListener('click', () => this._loadImageInMainArea.call(this, event, this._page.otherImages[idx].url));
        });
    }

    _initializeTools()
    {
        let bwDiv = document.createElement('div');
        let blackWhiteButton = document.createElement('button');
        blackWhiteButton.textContent = "Grayscale";
        blackWhiteButton.addEventListener('click', (e) => this._applyTransformationToImageData(e, grayscale));
        bwDiv.appendChild(blackWhiteButton);

        let vibDiv = document.createElement('div');
        let vibranceAdjust = document.createElement('input');
        vibranceAdjust.setAttribute('type', 'range');
        vibranceAdjust.setAttribute('max', 100);
        vibranceAdjust.setAttribute('min', -100);
        vibranceAdjust.setAttribute('value', 0);

        vibranceAdjust.addEventListener('change', debounce((e) => this._applyTransformationToImageData(e, vibrance, e.target.value), 250));
        vibDiv.appendChild(vibranceAdjust);

        let brightDiv = document.createElement('div');
        let brightnessAdjust = document.createElement('input');
        brightnessAdjust.setAttribute('type', 'range');
        brightnessAdjust.setAttribute('max', 100);
        brightnessAdjust.setAttribute('min', -100);
        brightnessAdjust.setAttribute('value', 0);

        brightnessAdjust.addEventListener('change', debounce((e) => this._applyTransformationToImageData(e, brightness, e.target.value), 250));
        brightDiv.appendChild(brightnessAdjust);

        let contrastDiv = document.createElement('div');
        let contrastAdjust = document.createElement('input');
        contrastAdjust.setAttribute('type', 'range');
        contrastAdjust.setAttribute('max', 100);
        contrastAdjust.setAttribute('min', -100);
        contrastAdjust.setAttribute('value', 0);

        contrastAdjust.addEventListener('change', debounce((e) => this._applyTransformationToImageData(e, contrast, e.target.value), 250));
        contrastDiv.appendChild(contrastAdjust);

        let invDiv = document.createElement('div');
        let invertButton = document.createElement('button');
        invertButton.textContent = "Invert Colours";
        invertButton.addEventListener('click', (e) => this._applyTransformationToImageData(e, invert));
        invDiv.appendChild(invertButton);

        let threshDiv = document.createElement('div');
        let thresholdAdjust = document.createElement('input');
        thresholdAdjust.setAttribute('type', 'range');
        thresholdAdjust.setAttribute('max', 255);
        thresholdAdjust.setAttribute('min', 64);
        thresholdAdjust.setAttribute('value', 0);

        thresholdAdjust.addEventListener('change', debounce((e) => this._applyTransformationToImageData(e, threshold, e.target.value), 250));
        threshDiv.appendChild(thresholdAdjust);

        let sharpDiv = document.createElement('div');
        let sharpenAdjust = document.createElement('input');
        sharpenAdjust.setAttribute('type', 'range');
        sharpenAdjust.setAttribute('max', 100);
        sharpenAdjust.setAttribute('min', 0);
        sharpenAdjust.setAttribute('value', 0);

        sharpenAdjust.addEventListener('change', debounce((e) => this._applyConvolutionFilter(e, sharpen, e.target.value), 250));
        sharpDiv.appendChild(sharpenAdjust);

        let hueDiv = document.createElement('div');
        let hueAdjust = document.createElement('input');
        hueAdjust.setAttribute('type', 'range');
        hueAdjust.setAttribute('max', 100);
        hueAdjust.setAttribute('min', 0);
        hueAdjust.setAttribute('value', 0);

        hueAdjust.addEventListener('change', debounce((e) => this._applyConvolutionFilter(e, hue, e.target.value), 250));
        hueDiv.appendChild(hueAdjust);

        this._tools.appendChild(bwDiv);
        this._tools.appendChild(invDiv);
        this._tools.appendChild(vibDiv);
        this._tools.appendChild(brightDiv);
        this._tools.appendChild(contrastDiv);
        this._tools.appendChild(threshDiv);
        this._tools.appendChild(sharpDiv);
        this._tools.appendChild(hueDiv);
    }

    _loadImageInMainArea(event, imageURL)
    {
        let url = `${imageURL}full/full/0/default.jpg`;

        this._mainImage = new Image();
        this._mainImage.crossOrigin = "anonymous";

        this._mainImage.addEventListener('load', () =>
        {
            // Determine the size of the (square) canvas based on the hypoteneuse
            this._canvas.size = Math.sqrt(this._mainImage.width * this._mainImage.width + this._mainImage.height * this._mainImage.height);
            this._canvas.width = this._mainImage.width;
            this._canvas.height = this._mainImage.height;
            this._canvas.cornerX = (this._canvas.size - this._mainImage.width) / 2;
            this._canvas.cornerY = (this._canvas.size - this._mainImage.height) / 2;

            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            this._ctx.drawImage(this._mainImage, 0, 0, this._canvas.width, this._canvas.height);
            this._originalData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);

            // clean up the image data since it's been painted to the canvas
            this._mainImage = null;
        });

        this._mainImage.src = url;
    }

    _applyTransformationToImageData(event, func, value)
    {
        let cw = this._canvas.width;
        let ch = this._canvas.height;
        let adjustment;

        if (value)
        {
            adjustment = parseInt(value, 10);
        }

        let newData = func(this._originalData, adjustment);

        this._ctx.clearRect(0, 0, cw, ch);
        this._ctx.putImageData(newData, 0, 0);
    }

    _applyConvolutionFilter(event, func, value)
    {
        let cw = this._canvas.width;
        let ch = this._canvas.height;
        let adjustment;

        if (value)
        {
            adjustment = parseInt(value, 10);
        }

        let newData = func(this._originalData, adjustment);

        this._ctx.clearRect(0, 0, cw, ch);
        this._ctx.putImageData(newData, 0, 0);
    }

}

ManipulationPlugin.prototype.pluginName = "manipulation";
ManipulationPlugin.prototype.isPageTool = true;

/**
 * Make this plugin available in the global context
 * as part of the 'Diva' namespace.
 **/
(function (global)
{
    global.Diva.ManipulationPlugin = ManipulationPlugin;
})(window);
