var elt = require('./utils/elt');
var diva = require('./diva-global');
var DocumentRendering = require('./document-rendering');

module.exports = GridRendering;

function GridRendering(viewer)
{
    var self = this;
    var settings = viewer.getSettings();

    self.gridPageWidth = 0;
    self.firstRowLoaded = -1;
    self.lastRowLoaded = -1;
    self.numRows = 0;
    self.rowHeight = 0;

    var loadGrid = function ()
    {
        if (self.documentRendering)
            self.documentRendering.destroy();

        self.documentRendering = new DocumentRendering({
            element: settings.innerElement,
            ID: settings.ID
        });

        var horizontalPadding = settings.fixedPadding * (settings.pagesPerRow + 1);
        var pageWidth = (settings.panelWidth - horizontalPadding) / settings.pagesPerRow;
        self.gridPageWidth = pageWidth;

        // Calculate the row height depending on whether we want to fix the width or the height
        self.rowHeight = (settings.fixedHeightGrid) ? settings.fixedPadding + settings.manifest.minRatio * pageWidth : settings.fixedPadding + settings.manifest.maxRatio * pageWidth;
        self.numRows = Math.ceil(settings.numPages / settings.pagesPerRow);
        var totalHeight = self.numRows * self.rowHeight + settings.fixedPadding;

        self.documentRendering.setDocumentSize({
            height: Math.round(totalHeight) + 'px'
        });

        // First scroll directly to the row containing the current page
        gridScroll();

        var i, rowIndex;
        settings.pageTopOffsets = [];
        settings.pageLeftOffsets = [];

        // Figure out the row each page is in
        var np = settings.numPages;
        for (i = 0; i < np; i += settings.pagesPerRow)
        {
            rowIndex = Math.floor(i / settings.pagesPerRow);

            if (isRowVisible(rowIndex))
            {
                self.firstRowLoaded = (self.firstRowLoaded < 0) ? rowIndex : self.firstRowLoaded;
                loadRow(rowIndex);
                self.lastRowLoaded = rowIndex;
            }
        }
    };

    // Check if a row index is valid
    var isRowValid = function (rowIndex)
    {
        return rowIndex >= 0 && rowIndex < self.numRows;
    };

    var isPageVisible = function (pageIndex)
    {
        return isRowVisible(Math.floor(pageIndex / settings.pagesPerRow));
    };

    // Check if a row should be visible in the viewport
    var isRowVisible = function (rowIndex)
    {
        var topOfRow = self.rowHeight * rowIndex;
        var bottomOfRow = topOfRow + self.rowHeight + settings.fixedPadding;

        return settings.viewport.hasVerticalOverlap({
            top: topOfRow,
            bottom: bottomOfRow
        });
    };

    // Check if a row (in grid view) is present in the DOM
    var isRowLoaded = function (rowIndex)
    {
        return !!document.getElementById(settings.ID + 'row-' + rowIndex);
    };

    var loadRow = function (rowIndex)
    {
        // If the row has already been loaded, don't attempt to load it again
        if (isRowLoaded(rowIndex))
            return;

        // Load some data for this and initialise some variables
        var heightFromTop = (self.rowHeight * rowIndex) + settings.fixedPadding;

        // Create the row div
        var rowDiv = elt('div', {
            id: settings.ID + 'row-' + rowIndex,
            class: 'diva-row',
            style: {
                height: self.rowHeight + 'px',
                top: heightFromTop + 'px'
            }
        });

        settings.innerElement.appendChild(rowDiv);

        // Declare variables used in the loop
        var i, pageIndex, filename, pageDimens, leftOffset, imageURL;

        // Load each page within that row
        var ppr = settings.pagesPerRow;
        for (i = 0; i < ppr; i++)
        {
            pageIndex = rowIndex * settings.pagesPerRow + i;

            // If this page is the last row, don't try to load a nonexistent page
            if (!settings.manifest.isPageValid(pageIndex))
                break;

            filename = settings.manifest.pages[pageIndex].f;

            // Calculate the width, height and horizontal placement of this page
            pageDimens = getPageDimensions(pageIndex);
            leftOffset = parseInt(i * (settings.fixedPadding + self.gridPageWidth) + settings.fixedPadding, 10);

            // Center the page if the height is fixed (otherwise, there is no horizontal padding)
            leftOffset += (settings.fixedHeightGrid) ? (self.gridPageWidth - pageDimens.width) / 2 : 0;
            imageURL = settings.manifest.getPageImageURL(pageIndex, { width: pageDimens.width });

            settings.pageTopOffsets[pageIndex] = heightFromTop;
            settings.pageLeftOffsets[pageIndex] = leftOffset;

            var pageDiv = elt('div', {
                id: settings.ID + 'page-' + pageIndex,
                class: 'diva-page diva-grid-page',
                style: {
                    width: pageDimens.width + 'px',
                    height: pageDimens.height + 'px',
                    left: leftOffset + 'px'
                },
                'data-index': pageIndex,
                'data-filename': filename
            });

            if (settings.enableImageTitles) pageDiv.title = "Page " + (pageIndex + 1);

            rowDiv.appendChild(pageDiv);

            var pageSelector = settings.selector + 'page-' + pageIndex;
            diva.Events.publish("PageWillLoad", [pageIndex, filename, pageSelector], viewer);

            // Add each image to a queue so that images aren't loaded unnecessarily
            addPageToQueue(rowIndex, pageIndex, imageURL, pageDimens.width, pageDimens.height);
        }
    };

    var getPageDimensions = function (pageIndex)
    {
        var pageData = settings.manifest.pages[pageIndex];

        // Calculate the width, height and horizontal placement of this page
        // Get dimensions at max zoom level, although any level should be fine
        var pageDimenData = pageData.d[pageData.d.length - 1];
        var heightToWidthRatio = pageDimenData.h / pageDimenData.w;

        var pageWidth, pageHeight;

        if (settings.fixedHeightGrid)
        {
            pageWidth = (self.rowHeight - settings.fixedPadding) / heightToWidthRatio;
            pageHeight = self.rowHeight - settings.fixedPadding;
        }
        else
        {
            pageWidth = self.gridPageWidth;
            pageHeight = pageWidth * heightToWidthRatio;
        }

        return {
            width: Math.round(pageWidth),
            height: Math.round(pageHeight)
        };
    };

    var deleteRow = function (rowIndex)
    {
        var theNode = document.getElementById(settings.ID + 'row-' + rowIndex);
        if (theNode === null)
            return;

        while (theNode.firstChild)
        {
            theNode.removeChild(theNode.firstChild);
        }
        theNode.parentNode.removeChild(theNode);
    };

    // Check if the bottom of a row is above the top of the viewport (scrolling down)
    var rowAboveViewport = function (rowIndex)
    {
        var bottomOfRow = self.rowHeight * (rowIndex + 1);
        return (bottomOfRow < settings.viewport.top);
    };

    // Check if the top of a row is below the bottom of the viewport (scrolling up)
    var rowBelowViewport = function (rowIndex)
    {
        var topOfRow = self.rowHeight * rowIndex;
        return (topOfRow > settings.viewport.bottom);
    };

    // Same thing as attemptPageShow only with rows
    var attemptRowShow = function (rowIndex, direction)
    {
        if (direction > 0)
        {
            if (isRowValid(rowIndex))
            {
                if (isRowVisible(rowIndex))
                {
                    loadRow(rowIndex);
                    self.lastRowLoaded = rowIndex;

                    attemptRowShow(self.lastRowLoaded + 1, direction);
                }
                else if (rowAboveViewport(rowIndex))
                {
                    attemptRowShow(rowIndex + 1, direction);
                }
            }
        }
        else
        {
            if (isRowValid(rowIndex))
            {
                if (isRowVisible(rowIndex))
                {
                    loadRow(rowIndex);
                    self.firstRowLoaded = rowIndex;

                    attemptRowShow(self.firstRowLoaded - 1, direction);
                }
                else if (rowBelowViewport(rowIndex))
                {
                    attemptRowShow(rowIndex - 1, direction);
                }
            }
        }
    };

    var attemptRowHide = function (rowIndex, direction)
    {
        if (direction > 0)
        {
            if (isRowValid(rowIndex) && rowAboveViewport(rowIndex))
            {
                deleteRow(rowIndex);
                self.firstRowLoaded++;

                attemptRowHide(self.firstRowLoaded, direction);
            }
        }
        else
        {
            if (isRowValid(rowIndex) && rowBelowViewport(rowIndex))
            {
                deleteRow(rowIndex);
                self.lastRowLoaded--;

                attemptRowHide(self.lastRowLoaded, direction);
            }
        }
    };

    var adjustRows = function (direction)
    {
        if (direction < 0)
        {
            attemptRowShow(self.firstRowLoaded, -1);
            setCurrentRow(-1);
            attemptRowHide(self.lastRowLoaded, -1);
        }
        else if (direction > 0)
        {
            attemptRowShow(self.lastRowLoaded, 1);
            setCurrentRow(1);
            attemptRowHide(self.firstRowLoaded, 1);
        }
    };

    // Used to delay loading of page images in grid view to prevent unnecessary loads
    var addPageToQueue = function (rowIndex, pageIndex, imageURL, pageWidth, pageHeight)
    {
        // FIXME: why define this inline?
        var loadFunction = function (rowIndex, pageIndex, imageURL, pageWidth, pageHeight)
        {
            if (self.documentRendering.isPageLoaded(pageIndex))
            {
                var imgEl = elt('img', {
                    src: imageURL,
                    style: {
                        width: pageWidth + 'px',
                        height: pageHeight + 'px'
                    }
                });

                document.getElementById(settings.ID + 'page-' + pageIndex).appendChild(imgEl);
            }
        };

        self.documentRendering.setPageTimeout(loadFunction, settings.rowLoadTimeout, [rowIndex, pageIndex, imageURL, pageWidth, pageHeight]);
    };

    // Sets the current page in grid view
    var setCurrentRow = function (direction)
    {
        var currentRow = Math.floor(settings.currentPageIndex / settings.pagesPerRow);
        var rowToConsider = currentRow + parseInt(direction, 10);
        var topScroll = settings.viewport.top;
        var middleOfViewport = topScroll + (settings.panelHeight / 2);
        var changeCurrentRow = false;

        if (direction < 0)
        {
            if (rowToConsider >= 0 && (self.rowHeight * currentRow >= middleOfViewport || self.rowHeight * rowToConsider >= topScroll))
            {
                changeCurrentRow = true;
            }
        }
        else if (direction > 0)
        {
            if ((self.rowHeight * (currentRow + 1)) < topScroll && isRowValid(rowToConsider))
            {
                changeCurrentRow = true;
            }
        }

        if (changeCurrentRow)
        {
            settings.currentPageIndex = rowToConsider * settings.pagesPerRow;

            if (direction !== 0)
            {
                if (!setCurrentRow(direction))
                {
                    var pageIndex = settings.currentPageIndex;
                    var filename = settings.manifest.pages[pageIndex].f;
                    diva.Events.publish("VisiblePageDidChange", [pageIndex, filename], viewer);
                }
            }

            return true;
        }

        return false;
    };

    // Calculates the desired row, then scrolls there
    var gotoRow = function (pageIndex)
    {
        var desiredRow = Math.floor(pageIndex / settings.pagesPerRow);

        settings.viewport.top = desiredRow * self.rowHeight;

        // Pretend that this is the current page (it probably isn't)
        settings.currentPageIndex = pageIndex;
        var filename = settings.manifest.pages[pageIndex].f;
        diva.Events.publish("VisiblePageDidChange", [pageIndex, filename], viewer);
    };

    // Don't call this when not in grid mode please
    // Scrolls to the relevant place when in grid view
    var gridScroll = function ()
    {
        // Figure out and scroll to the row containing the current page
        gotoRow(settings.goDirectlyTo);
    };

    var isPageLoaded = function (pageIndex)
    {
        return self.documentRendering.isPageLoaded(pageIndex);
    };

    var getPageToViewportOffset = function ()
    {
        // Not supported
        return null;
    };

    var destroy = function ()
    {
        self.documentRendering.destroy();
    };

    this.load = loadGrid;
    this.adjust = adjustRows;
    this.goto = gotoRow;
    this.preload = function () { /* No-op */ };
    this.isPageVisible = isPageVisible;
    this.isPageLoaded = isPageLoaded;
    this.getPageDimensions = getPageDimensions;
    this.getPageToViewportOffset = getPageToViewportOffset;
    this.destroy = destroy;
}

GridRendering.getCompatibilityErrors = function ()
{
    return null;
};
