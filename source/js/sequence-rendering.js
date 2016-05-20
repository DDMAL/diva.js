var extend = require('jquery').extend;
var maxBy = require('lodash.maxby');
var elt = require('./utils/elt');
var diva = require('./diva-global');
var DocumentRendering = require('./document-rendering');
var TiledImageRenderer = require('./tiled-image-renderer');

module.exports = SequenceRendering;

function SequenceRendering(viewer)
{
    var self = this;
    var settings = viewer.getSettings();

    self.tileDimensions = {
        width: settings.tileWidth,
        height: settings.tileHeight
    };
    self.tiledImageRenderers = {};

    self.documentRendering = null;
    self.pageGroups = null;
    self.pageLookup = null;
    self.renderedPages = null;

    // FIXME(wabain): Temporarily copied from the Diva core
    var getPageData = function (pageIndex, attribute)
    {
        return settings.manifest.pages[pageIndex].d[settings.zoomLevel][attribute];
    };

    // Check if a page is in or near the viewport and thus should be loaded
    var isPageVisible = function (pageIndex)
    {
        var offset = getPageOffset(pageIndex);

        var topOfPage = offset.top;
        var bottomOfPage = topOfPage + getPageData(pageIndex, 'h') + settings.verticalPadding;

        var leftOfPage = offset.left;
        var rightOfPage = leftOfPage + getPageData(pageIndex, 'w') + settings.horizontalPadding;

        return settings.viewport.intersectsRegion({
            top: topOfPage,
            bottom: bottomOfPage,
            left: leftOfPage,
            right: rightOfPage
        });
    };

    // Appends the page directly into the document body, or loads the relevant tiles
    var loadPage = function (pageIndex)
    {
        var pageElement = self.documentRendering.getPageElement(pageIndex);

        if (!pageElement)
            pageElement = renderPageElement(pageIndex);

        var tileRenderer = getTiledImageRenderer(pageIndex);

        tileRenderer.updateZoomLevel(settings.zoomLevel);

        var canvasElement = tileRenderer.getImageRendering();

        // Place the canvas in the DOM if it is new
        // FIXME(wabain): There should be a nicer way to handle this
        if (!canvasElement.parentNode)
        {
            var canvasId = settings.ID + 'canvas-' + pageIndex;
            var oldCanvas = document.getElementById(canvasId);

            if (oldCanvas)
                oldCanvas.parentNode.removeChild(oldCanvas);

            elt.setAttributes(canvasElement, {
                id: canvasId,
                class: 'diva-canvas'
            });

            pageElement.appendChild(canvasElement);
        }

        if (!tileRenderer.fullImageIsLoading())
        {
            self.documentRendering.setPageTimeout(function ()
            {
                var renderer = self.tiledImageRenderers[pageIndex];

                // The page is no longer visible
                // FIXME(wabain): Should the timeout just be cancelled in that case?
                if (!renderer)
                    return;

                renderer.load(getImageOffset(pageIndex));
            }, settings.pageLoadTimeout, []);
        }
    };

    var renderPageElement = function (pageIndex)
    {
        // Load some data for this page
        var filename = settings.manifest.pages[pageIndex].f;
        var dims = getPageDimensions(pageIndex);
        var width = dims.width;
        var height = dims.height;
        var pageSelector = settings.selector + 'page-' + pageIndex;

        var groupOffset = self.pageLookup[pageIndex].groupOffset;

        var pageLeft = groupOffset.left;
        var pageTop = groupOffset.top;

        if (settings.verticallyOriented)
            pageTop += settings.verticalPadding;
        else
            pageLeft += settings.horizontalPadding;

        var pageElement = elt('div', {
            id: settings.ID + 'page-' + pageIndex,
            class: 'diva-page diva-document-page',
            style: {
                left: pageLeft + 'px',
                top: pageTop + 'px',
                width: width + 'px',
                height: height + 'px'
            },
            'data-index': pageIndex,
            'data-filename': filename
        });

        if (settings.enableImageTitles) pageElement.title = "Page " + (pageIndex + 1);

        // Append page tools
        pageElement.innerHTML = settings.pageTools;

        if (settings.verticallyOriented)
        {
            if (settings.inBookLayout)
            {
                if (pageIndex % 2)
                {
                    pageElement.classList.add('diva-page-book-left');
                }
                else
                {
                    if (pageIndex === 0)
                        attachOpeningPlaceholder(pageElement, dims);

                    pageElement.classList.add('diva-page-book');
                }
            }
        }

        var groupElement = renderPageGroup(pageIndex);
        groupElement.appendChild(pageElement);

        diva.Events.publish("PageWillLoad", [pageIndex, filename, pageSelector], viewer);

        return pageElement;
    };

    var renderPageGroup = function (pageIndex)
    {
        var group = self.pageLookup[pageIndex].group;

        var groupId = settings.ID + 'page-group-' + group.index;
        var groupElement = document.getElementById(groupId);

        if (groupElement)
            return groupElement;

        var style = {
            width: (group.region.right - group.region.left) + 'px',
            height: (group.region.bottom - group.region.top) + 'px'
        };

        if (settings.verticallyOriented)
            style.top = group.region.top + 'px';
        else
            style.left = group.region.left + 'px';

        groupElement = elt('div', {
            id: groupId,
            class: 'diva-page-group diva-page-group-' + (settings.verticallyOriented ? 'vertical' : 'horizontal'),
            style: style
        });

        settings.innerElement.appendChild(groupElement);

        return groupElement;
    };

    var attachOpeningPlaceholder = function (pageElement, dimensions)
    {
        // create a placeholder div for the left side of the first opening
        var placeholderElement = elt('div', {
            id: settings.ID + 'page-placeholder',
            class: 'diva-page diva-document-page',
            style: {
                width: dimensions.width + 'px',
                height: dimensions.height + 'px',
                top: 0,
                left: (-dimensions.width) + 'px',
                border: '1px solid #ccc',
                background: '#fdfdfd',
                mozBoxSizing: 'border-box',
                webkitBoxSizing: 'border-box',
                boxSizing: 'border-box'
            }
        });

        // append the placeholder element to page as first child
        pageElement.appendChild(placeholderElement);
    };

    var getTiledImageRenderer = function (pageIndex)
    {
        var renderer = self.tiledImageRenderers[pageIndex];

        if (renderer)
            return renderer;

        renderer = new TiledImageRenderer({
            viewport: settings.viewport,
            manifest: settings.manifest,
            pageIndex: pageIndex,
            tileDimensions: self.tileDimensions,
            initialZoomLevel: settings.zoomLevel
        });

        self.tiledImageRenderers[pageIndex] = renderer;

        return renderer;
    };

    var preloadPage = function (pageIndex)
    {
        var renderer = getTiledImageRenderer(pageIndex);

        renderer.updateZoomLevel(settings.zoomLevel);
        renderer.load(getImageOffset(pageIndex));

        var filename = settings.manifest.pages[pageIndex].f;
        var pageSelector = settings.selector + 'page-' + pageIndex;
        diva.Events.publish("PageDidLoad", [pageIndex, filename, pageSelector], viewer);
    };

    // Delete a page from the DOM; will occur when a page is scrolled out of the viewport
    var deletePage = function (pageIndex)
    {
        var theNode = document.getElementById(settings.ID + 'page-' + pageIndex);

        if (theNode === null)
            return;

        while (theNode.firstChild)
        {
            theNode.removeChild(theNode.firstChild);
        }

        if (self.tiledImageRenderers[pageIndex])
        {
            self.tiledImageRenderers[pageIndex].destroy();
            self.tiledImageRenderers[pageIndex] = null;
        }

        var pageGroup = theNode.parentNode;

        if (pageGroup.childElementCount === 1)
        {
            pageGroup.parentNode.removeChild(pageGroup);
        }
        else
        {
            pageGroup.removeChild(theNode);
        }
    };

    // Handles showing and hiding pages when the user scrolls
    // FIXME(wabain): Remove the direction argument if it doesn't end up being needed.
    var adjustPages = function (direction) // jshint ignore:line
    {
        var newRenderedPages = [];

        self.pageGroups.forEach(function (group)
        {
            if (!settings.viewport.intersectsRegion(group.region))
                return;

            group.layout.pageOffsets.forEach(function (pageOffset)
            {
                var index = pageOffset.index;

                if (isPageVisible(index))
                {
                    loadPage(index);
                    newRenderedPages.push(index);
                }
            });
        });

        if (self.renderedPages)
        {
            self.renderedPages.forEach(function (pageIndex)
            {
                if (newRenderedPages.indexOf(pageIndex) === -1)
                    deletePage(pageIndex);
            });
        }

        self.renderedPages = newRenderedPages;

        updateCurrentPage();
    };

    var updateCurrentPage = function ()
    {
        // FIXME(wabain): Should this happen?
        if (!self.renderedPages || self.renderedPages.length === 0)
            return;

        var centerY = settings.viewport.top + (settings.viewport.height / 2);
        var centerX = settings.viewport.left + (settings.viewport.width / 2);

        // Find the minimum distance from the viewport center to a page.
        // Compute minus the squared distance from viewport center to the page's border.
        // http://gamedev.stackexchange.com/questions/44483/how-do-i-calculate-distance-between-a-point-and-an-axis-aligned-rectangle
        var closestPage = maxBy(self.renderedPages, function (index)
        {
            var dims = getPageDimensions(index);

            var imageOffset = getImageOffset(index);

            var midX = imageOffset.left + (dims.height / 2);
            var midY = imageOffset.top + (dims.width / 2);

            var dx = Math.max(Math.abs(centerX - midX) - (dims.width / 2), 0);
            var dy = Math.max(Math.abs(centerY - midY) - (dims.height / 2), 0);

            return -(dx * dx + dy * dy);
        });

        if (closestPage !== settings.currentPageIndex)
        {
            settings.currentPageIndex = closestPage;
            diva.Events.publish("VisiblePageDidChange", [closestPage, settings.manifest.pages[closestPage].f], viewer);
        }
    };

    var calculateDesiredScroll = function(pageIndex, verticalOffset, horizontalOffset)
    {
        // convert offsets to 0 if undefined
        horizontalOffset = (typeof horizontalOffset !== 'undefined') ? horizontalOffset : 0;
        verticalOffset = (typeof verticalOffset !== 'undefined') ? verticalOffset : 0;

        var pageOffset = getPageOffset(pageIndex);

        var desiredVerticalCenter = pageOffset.top + verticalOffset;
        var desiredTop = desiredVerticalCenter - parseInt(settings.panelHeight / 2, 10);

        var desiredHorizontalCenter = pageOffset.left + horizontalOffset;
        var desiredLeft = desiredHorizontalCenter - parseInt(settings.panelWidth / 2, 10);

        return {
            top: desiredTop,
            left: desiredLeft
        };
    };

    // Helper function for going to a particular page
    // Vertical offset: from center of diva element to top of current page
    // Horizontal offset: from the center of the page; can be negative if to the left
    var gotoPage = function (pageIndex, verticalOffset, horizontalOffset)
    {
        var desiredScroll = calculateDesiredScroll(pageIndex, verticalOffset, horizontalOffset);

        settings.viewport.top = desiredScroll.top;
        settings.viewport.left = desiredScroll.left;

        // Pretend that this is the current page
        if (pageIndex !== settings.currentPageIndex)
        {
            settings.currentPageIndex = pageIndex;
            var filename = settings.manifest.pages[pageIndex].f;

            diva.Events.publish("VisiblePageDidChange", [pageIndex, filename], viewer);
        }

        diva.Events.publish("ViewerDidJump", [pageIndex], viewer);
    };

    var calculateDocumentLayout = function()
    {
        var docLayout = getDocumentLayout();

        self.documentDimensions = docLayout.dimensions;
        self.pageGroups = docLayout.pageGroups;

        var pages = {};

        self.pageGroups.forEach(function (group)
        {
            group.layout.pageOffsets.forEach(function (groupOffset)
            {
                pages[groupOffset.index] = {
                    group: group,
                    groupOffset: groupOffset
                };
            });
        });

        self.pageLookup = pages;
    };

    var getDocumentLayout = function ()
    {
        // Get layout groups for the current view
        var layouts;

        if (settings.inBookLayout)
            layouts = getBookLayoutGroups();
        else
            layouts = getSinglesLayoutGroups();

        // Now turn layouts into concrete regions

        var documentSecondaryExtent = getExtentAlongSecondaryAxis(layouts);

        // The current position in the document along the primary axis
        var primaryDocPosition = 0;

        var pageGroups = [];

        layouts.forEach(function (layout, index)
        {
            var region;

            if (settings.verticallyOriented)
            {
                var left = (documentSecondaryExtent - layout.width) / 2;

                region = {
                    top: primaryDocPosition,
                    bottom: primaryDocPosition + layout.height + settings.verticalPadding,
                    left: left,
                    right: left + layout.width
                };

                primaryDocPosition = region.bottom;
            }
            else
            {
                var top = (documentSecondaryExtent - layout.height) / 2;

                region = {
                    top: top,
                    bottom: top + layout.height,
                    left: primaryDocPosition,
                    right: primaryDocPosition + layout.width + settings.horizontalPadding
                };

                primaryDocPosition = region.right;
            }

            pageGroups.push({
                index: index,
                layout: layout,
                region: region
            });
        });

        var height, width;

        if (settings.verticallyOriented)
        {
            height = primaryDocPosition + settings.verticalPadding;
            width = documentSecondaryExtent;
        }
        else
        {
            height = documentSecondaryExtent;
            width = primaryDocPosition + settings.horizontalPadding;
        }

        return {
            dimensions: {
                height: height,
                width: width
            },
            pageGroups: pageGroups
        };
    };

    var getSinglesLayoutGroups = function ()
    {
        // Render each page alone in a group
        return settings.manifest.pages.map(function (_, i)
        {
            var pageDims = getPageDimensions(i);

            return extend({
                pageOffsets: [
                    {index: i, top: 0, left: 0}
                ]
            }, pageDims);
        });
    };

    var getBookLayoutGroups = function ()
    {
        var groups = [];
        var leftPage = null;

        settings.manifest.pages.forEach(function (page, index)
        {
            // Skip non-paged canvases in a paged manifest.
            // NB: If there is currently a pending left page, then it will form
            // an opening with the following page. This seems to be desired behaviour.
            if (settings.manifest.paged && !page.paged)
                return;

            var pageDims = getPageDimensions(index, { round: false });

            if (settings.verticallyOriented && index === 0)
            {
                // The first page is placed on its own to the right
                groups.push({
                    height: pageDims.height,
                    width: pageDims.width * 2,
                    pageOffsets: [{
                        index: 0,
                        top: 0,
                        left: pageDims.width
                    }]
                });

                return;
            }

            if (leftPage === null)
            {
                leftPage = extend({
                    index: index
                }, pageDims);

                return;
            }

            groups.push(getFacingPageGroup(leftPage, extend({
                index: index
            }, pageDims)));

            leftPage = null;
        });

        // Flush a final left page
        if (leftPage !== null)
        {
            // We need to left-align the page in vertical orientation, so we double
            // the group width
            groups.push({
                height: leftPage.height,
                width: settings.verticallyOriented ? leftPage.width * 2 : leftPage.width,
                pageOffsets: [{
                    index: leftPage.index,
                    top: 0,
                    left: 0
                }]
            });
        }

        return groups;
    };

    var getFacingPageGroup = function (leftPage, rightPage)
    {
        var height = Math.max(leftPage.height, rightPage.height);

        var width, firstLeftOffset, secondLeftOffset;

        if (settings.verticallyOriented)
        {
            var midWidth = Math.max(leftPage.width, rightPage.width);

            width = midWidth * 2;

            firstLeftOffset = midWidth - leftPage.width;
            secondLeftOffset = midWidth;
        }
        else
        {
            width = leftPage.width + rightPage.width;
            firstLeftOffset = 0;
            secondLeftOffset = leftPage.width;
        }

        return {
            height: height,
            width: width,
            pageOffsets: [
                {
                    index: leftPage.index,
                    top: 0,
                    left: firstLeftOffset
                },
                {
                    index: rightPage.index,
                    top: 0,
                    left: secondLeftOffset
                }
            ]
        };
    };

    var getExtentAlongSecondaryAxis = function (layouts)
    {
        // Get the extent of the document along the secondary axis
        var secondaryDim, secondaryPadding;

        if (settings.verticallyOriented)
        {
            secondaryDim = 'width';
            secondaryPadding = settings.horizontalPadding;
        }
        else
        {
            secondaryDim = 'width';
            secondaryPadding = settings.verticalPadding;
        }

        return (2 * secondaryPadding) + layouts.reduce(function (maxDim, layout)
        {
            return Math.max(layout[secondaryDim], maxDim);
        }, 0);
    };

    // Called every time we need to load document view (after zooming, fullscreen, etc)
    var loadDocument = function ()
    {
        diva.Events.publish('DocumentWillLoad', [settings], viewer);

        if (self.documentRendering)
            self.documentRendering.destroy();

        self.documentRendering = new DocumentRendering({
            element: settings.innerElement,
            ID: settings.ID
        });

        // FIXME(wabain): Optimize case where this was computed in preloadCanvases
        // Calculate page layout (self.documentDimensions, self.pageGroups, self.pageLookup)
        calculateDocumentLayout();

        var dims = self.documentDimensions;

        var documentSize = {
            height: Math.round(dims.height) + 'px',
            width: Math.round(dims.width) + 'px'
        };

        if (settings.verticallyOriented)
            documentSize.minWidth = settings.panelWidth + 'px';
        else
            documentSize.minHeight = settings.panelHeight + 'px';

        self.documentRendering.setDocumentSize(documentSize);

        // FIXME(wabain): Remove this when there's more confidence the check shouldn't be needed
        if (!self.pageLookup[settings.goDirectlyTo])
            throw new Error('invalid page: ' + settings.goDirectlyTo);

        // Scroll to the proper place using stored y/x offsets (relative to the center of the page)
        gotoPage(settings.goDirectlyTo, settings.verticalOffset, settings.horizontalOffset);

        // Load the visible pages
        adjustPages(0);

        // If this is not the initial load, trigger the zoom events
        if (settings.oldZoomLevel >= 0)
        {
            var zoomLevel = settings.zoomLevel;

            if (settings.oldZoomLevel < settings.zoomLevel)
            {
                diva.Events.publish("ViewerDidZoomIn", [zoomLevel], viewer);
            }
            else
            {
                diva.Events.publish("ViewerDidZoomOut", [zoomLevel], viewer);
            }

            diva.Events.publish("ViewerDidZoom", [zoomLevel], viewer);
        }
        else
        {
            settings.oldZoomLevel = settings.zoomLevel;
        }

        // For the iPad - wait until this request finishes before accepting others
        if (settings.scaleWait)
            settings.scaleWait = false;

        var fileName = settings.manifest.pages[settings.currentPageIndex].f;
        diva.Events.publish("DocumentDidLoad", [settings.currentPageIndex, fileName], viewer);
    };

    var preloadPages = function()
    {
        //1. determine visible pages at new zoom level
        //    a. recalculate page layout at new zoom level
        calculateDocumentLayout();

        //    b. for all pages (see loadDocument)
        //        i) if page coords fall within visible coords, add to visible page block
        var pageBlockFound = false;

        for (var i = 0; i < settings.numPages; i++)
        {
            // FIXME(wabain): This doesn't fully account for viewport changes
            if (self.pageLookup[i] && isPageVisible(i))
            {
                preloadPage(i);
                pageBlockFound = true;
            }
            else if (pageBlockFound) // There will only be one consecutive block of pages to load; once we find a page that's invisible, we can terminate this loop.
            {
                break;
            }
        }
    };

    var isPageLoaded = function (pageIndex)
    {
        return self.documentRendering.isPageLoaded(pageIndex);
    };

    var getPageDimensions = function (pageIndex, options)
    {
        // FIXME(wabain): These are always rounded! Does rounding really need to be optional?
        var width = Math.floor(getPageData(pageIndex, 'w'));
        var height = Math.floor(getPageData(pageIndex, 'h'));

        var round = !options || options.round;

        if (round)
        {
            return {
                width: Math.floor(width),
                height: Math.floor(height)
            };
        }

        return {
            width: width,
            height: height
        };
    };

    // Note: getImageOffset() mutates the object returned from here
    var getPageOffset = function (pageIndex)
    {
        var page = self.pageLookup[pageIndex];

        if (!page)
            return null;

        return {
            top: page.group.region.top + page.groupOffset.top,
            left: page.group.region.left + page.groupOffset.left
        };
    };

    var getImageOffset = function (pageIndex)
    {
        var offset = getPageOffset(pageIndex);

        if (settings.verticallyOriented)
            offset.top += settings.verticalPadding;
        else
            offset.left += settings.horizontalPadding;

        return offset;
    };

    var getPageToViewportOffset = function ()
    {
        var scrollLeft = settings.viewport.left;
        var elementWidth = settings.panelWidth;

        var offset = getPageOffset(settings.currentPageIndex);

        var x = scrollLeft - offset.left + parseInt(elementWidth / 2, 10);

        var scrollTop = settings.viewport.top;
        var elementHeight = settings.panelHeight;

        var y = scrollTop - offset.top + parseInt(elementHeight / 2, 10);

        return {
            x: x,
            y: y
        };
    };

    var destroy = function ()
    {
        // FIXME(wabain): Kind of duplicates documentRendering.destroy
        self.renderedPages.forEach(function (index)
        {
            deletePage(index);
        });

        self.documentRendering.destroy();
    };

    this.load = loadDocument;
    this.adjust = adjustPages;
    this.goto = gotoPage;
    this.preload = preloadPages;
    this.isPageVisible = isPageVisible;
    this.isPageLoaded = isPageLoaded;
    this.getPageDimensions = getPageDimensions;
    this.getPageOffset = getPageOffset;
    this.getPageToViewportOffset = getPageToViewportOffset;
    this.destroy = destroy;
}

SequenceRendering.getCompatibilityErrors = function ()
{
    if (supportsCanvas())
        return null;

    return ['Your browser lacks support for the ', elt('pre', 'canvas'), ' element. Please upgrade your browser.'];
};

var supportsCanvas = (function ()
{
    var isSupported = null;

    function getSupport()
    {
        var canvas = elt('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
    }

    return function ()
    {
        if (isSupported === null)
            isSupported = getSupport();

        return isSupported;
    };
})();
