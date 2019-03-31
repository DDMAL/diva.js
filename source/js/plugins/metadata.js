/**
 * A simple plugin that implements a button to view the IIIF manifest metadata block. Plugins
 * should register themselves as a class in the global Diva namespace, e.g., global.Diva.MetadataPlugin.
 * Plugins are then included as *uninstantiated* references within a plugin configuration. To enable them, simply include
 * plugins: [Diva.MetadataPlugin] when creating a Diva instance.
 * When the viewer is instantiated it will also instantiate the plugin, which
 * will then configure itself.
 *
 * Plugin constructors should take one argument, which is an instance of a ViewerCore object.
 *
 *
 * Plugins should implement the following interface:
 *
 * {boolean} isPageTool - Added to the class prototype. Whether the plugin icon should be included for each page as a page tool
 * {string} pluginName - Added to the class prototype. Defines the name for the plugin.
 *
 * @method createIcon - A div representing the icon. This *should* be implemented using SVG.
 * @method handleClick - The click handler for the icon.
 *
 * Toolbar plugins must have a toolbarIcon and toolbarSide attribute, with toolbarSide being either 'left' or 'right'
 **/

import parseLabelValue from '../utils/parse-label-value';

export default class MetadataPlugin
{
    constructor (core)
    {
        this.core = core;
        this.toolbarIcon;
        this.toolbarSide = 'right';

        // helpers for handleClick
        this.firstClick = true;
        this.isVisible = false;
    }

    /**
     * Display a modal with the IIIF manifest metadata.
     **/
    handleClick () 
    {
        // if first click create div elements
        let metadataDiv;

        let metadata = this.core.viewerState.manifest.metadata;

        if (this.firstClick)
        {
            metadataDiv = document.createElement('div');
            metadataDiv.id = 'metadata-modal';
            metadataDiv.className = 'diva-modal';

            let metadataHeaderBlock = document.createElement('div');

            let metadataTitle = document.createElement('h2');
            metadataTitle.innerText = "About this item";
            metadataTitle.id = "metadata-title";

            let closeButton = document.createElement('button');
            closeButton.innerHTML = '&#10006';
            closeButton.classList.add('close-button');
            closeButton.onclick = () => 
            {
                metadataDiv.style.display = 'none';            
                this.isVisible = false;
            };

            let contentDiv = document.createElement('div');
            contentDiv.id = 'metadata-content';

            let contentDefinitionList = document.createElement('dl');

            for (let i = 0, len = metadata.length; i < len; i++) 
            {
                let key = metadata[i];

                let header = document.createElement('dt');
                header.innerHTML = parseLabelValue(key).label;

                let value = document.createElement('dd');
                value.innerHTML = parseLabelValue(key).value;

                contentDefinitionList.appendChild(header);
                contentDefinitionList.appendChild(value);
            }

            contentDiv.appendChild(contentDefinitionList);

            // add link to manifest
            let linkToManifest = document.createElement('p');
            let manifestAnchor = document.createElement('a');
            manifestAnchor.setAttribute("target", "_blank");
            manifestAnchor.setAttribute("href", `${this.core.settings.objectData}`);
            manifestAnchor.innerHTML = "IIIF Manifest";
            linkToManifest.appendChild(manifestAnchor);
            contentDiv.appendChild(linkToManifest);

            metadataHeaderBlock.appendChild(closeButton);
            metadataHeaderBlock.appendChild(metadataTitle);
            metadataDiv.appendChild(metadataHeaderBlock);
            metadataDiv.appendChild(contentDiv);
            document.body.appendChild(metadataDiv);

            this.firstClick = false;
        }
        else
        {
            metadataDiv = document.getElementById('metadata-modal');
        }

        if (this.isVisible)
        {
            metadataDiv.style.display = 'none';            
            this.isVisible = false;
        }
        else
        {
            metadataDiv.style.display = 'block';
            this.isVisible = true;
        }

        // attach drag listeners
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        metadataDiv.onmousedown = (e) => 
        {
            pos3 = e.clientX;
            pos4 = e.clientY;

            document.onmousemove = (e) =>
            {
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                metadataDiv.style.top = `${(metadataDiv.offsetTop - pos2)}px`;
                metadataDiv.style.left = `${(metadataDiv.offsetLeft - pos1)}px`;
            };

            document.onmouseup = () =>
            {
                document.onmouseup = null;
                document.onmousemove = null;
            };
        };
    }

    /**
     * See img/metadata.svg for the standalone source code for this.
     **/
    createIcon ()
    {
        if (!this.core.viewerState.manifest.metadata)
            return;

        const toolbarIcon = document.createElement('div');
        toolbarIcon.classList.add('diva-metadata-icon', 'diva-button');

        let root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        root.setAttribute("viewBox", "0 0 20 20");
        root.setAttribute('style', 'display: block; padding: 7%');
        root.id = `${this.core.settings.selector}metadata-icon`;

        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.id = `${this.core.settings.selector}metadata-icon-glyph`;
        g.setAttribute("class", "diva-toolbar-icon");

        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M5.379,0.681 L5.289,0.771 L5.255,0.736 C4.401,-0.118 2.98,-0.082 2.082,0.816 L1.827,1.07 C0.931,1.967 0.894,3.388 1.749,4.243 L1.783,4.277 L1.619,4.442 C0.846,5.214 0.818,6.441 1.559,7.18 L9.884,15.508 C10.626,16.248 11.851,16.22 12.626,15.447 L16.384,11.689 C17.156,10.916 17.185,9.69 16.445,8.95 L8.117,0.622 C7.377,-0.118 6.15,-0.091 5.379,0.681 L5.379,0.681 Z M4.523,5.108 C3.645,5.108 2.931,4.393 2.931,3.508 C2.931,2.627 3.645,1.911 4.523,1.911 C5.404,1.911 6.115,2.627 6.119,3.508 C6.115,4.395 5.404,5.108 4.523,5.108 L4.523,5.108 Z");

        g.appendChild(path);
        root.appendChild(g);

        toolbarIcon.appendChild(root);

        return toolbarIcon;
    }
}

MetadataPlugin.prototype.pluginName = "metadata";
MetadataPlugin.prototype.isPageTool = false;

/**
 * Make this plugin available in the global context
 * as part of the 'Diva' namespace.
 **/
(function (global)
{
    global.Diva.MetadataPlugin = MetadataPlugin;
})(window);
