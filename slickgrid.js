var firstPageLoaded; 
var lastPageLoaded;
var verticalScroll;
var tempScrollTop = 0;
var panelHeight;
var panelWidth;
var totalHeightOfPages;
var heightAbovePages = [10, 320, 580, 940, 1100, 1310, 1620, 1880]
var numPages = 7;
var randomArray = [{'id': 0, 'height': 300, 'width': 400, 'text': 'FIRST PAGE'}, {'id': 1, 'height': 250, 'width': 300, 'text': 'SECOND PAGE'}, {'id': 2, 'height': 350, 'width': 250, 'text': 'THIRD PAGE'}, {'id': 3, 'height': 150, 'width': 350, 'text': 'FOURTH PAGE'}, {'id': 4, 'height': 200, 'width': 200, 'text': 'FIFTH PAGE'}, {'id': 5, 'height': 300, 'width': 400, 'text': 'SIXTH PAGE'}, {'id': 6, 'height': 250, 'width': 300, 'text': 'SEVENTH PAGE'}];

function initialLoad() {
    // includes padding
    // Find out which ones are in the viewport
    // If the heightAbovePages is less than height of document panel
    var stringBuilder = [];
    firstPageLoaded = 0;
    // Set the height and width now because we can't do it before
    panelHeight = $('#documentpanel').height();
    panelWidth = $('#documentpanel').width();
    console.log("loading pages");
    for (var i = 0; i < numPages; i++) {
        console.log('height above pages: ' + heightAbovePages[i] + 'panel height: ' + panelHeight);
        if (heightAbovePages[i] < panelHeight) {
            // Left offset
            var thisHeight = randomArray[i]['height'];
            var thisWidth = randomArray[i]['width'];
            var leftOffset = (panelWidth - thisWidth) / 2;
            // Push them to a string
            var theString = '<div id="page-' + i + '" style="width: ' + thisWidth + 'px; height: ' + thisHeight  + 'px; top: ' + heightAbovePages[i] + 'px; left: ' + leftOffset + 'px;">' + randomArray[i]['text'] + '</div>';
            stringBuilder.push(theString);
            lastPageLoaded = i;
        } else {
        break;
        }
    }

    // now actually do the appending
    var stringToAppend = stringBuilder.join('\n');
    $('#pages').html(stringToAppend);
    // Edit the height of the pages div ... a little shortcut
    totalHeightOfPages = heightAbovePages[numPages-1] + randomArray[numPages-1]['height'] + 10;
    $('#pages').height(totalHeightOfPages);
}

    
/*
OUTLINE OF PROCESS
    
-if you're scrolling down:
    -check if the first one is no longer in the viewport
        -this occurs when heightAbovePages[pageID]+pageHeight < verticalScroll
        -if so, REMOVE IT
        -keep doing this until you hit a div that is in the viewport
        -use a helper function for this
    -check if the next one should be visible
        -this occurs when the heightAbovePages for the last page + pageHeight < verticalScroll+panelHeight
        -if so, ADD IT TO THE DOM
        -keep doing this until you hit a div that is NOT in the viewport
-if you're scrolling up
    -check if the last one is no longer in the viewport
        -same as above but backwards etc
    */
function isPageLoaded(pageID) {
    var thisID = '#page-' + pageID;
    if ($(thisID).length === 0) {
        return false;
    } else {
        return true;
    }
}

function nearViewport(pageID) {
    console.log('checking if page ' + pageID + ' is near the viewport');
    var topOfPage = heightAbovePages[pageID];
    var bottomOfPage = topOfPage + randomArray[pageID]['height'];
    var topOfViewport = verticalScroll;
    var bottomOfViewport = topOfViewport + panelHeight;

    // If top of the page is near the viewport
    if (topOfPage > topOfViewport - 100 && topOfPage < bottomOfViewport + 100) {
        return true;
    } else if (bottomOfPage > topOfViewport - 100 && bottomOfPage < bottomOfViewport + 100) {
        // If bottom of the page is near the viewport
        return true;
    } else if (topOfPage < topOfViewport && bottomOfPage > bottomOfViewport) {
        // Top of the page is above, bottom is below
        return true;
    } else {
        // Nowhere near the viewport, return false
        return false;
    }
}

// If a page is in the range of the array of pages lol
function inRange(pageID) {
    if (pageID >= 0 && pageID < numPages) {
        return true;
    } else {
        return false;
    }
}

function deletePage(pageID) {
    console.log('deleting page ' + pageID + ' from the dom');
    if (isPageLoaded(pageID)) {
        $('#page-' + pageID).remove();
    }
}

function appendPage(pageID) {
    console.log('adding page ' + pageID + ' to the dom');
    var thisWidth = randomArray[pageID]['width'];
    var thisHeight = randomArray[pageID]['height'];
    var leftOffset = (panelWidth - thisWidth) / 2;
    // the heightabovepages array must be created initially
    // shouldn't affect performance ... appending is the expensive part
    if (!isPageLoaded(pageID)) {
        var theString = '<div id="page-' + pageID + '" style="width: ' + thisWidth + 'px; height: ' + thisHeight + 'px; top: ' + heightAbovePages[pageID] + 'px; left: ' + leftOffset + 'px;">' + randomArray[pageID]['text'] + '</div>';
        $('#pages').append(theString); // or prepend
    }
}

function attemptPageHide(pageID) {
    if (inRange(pageID) && !nearViewport(pageID)) {
        // Needs to be hidden. Delete it from the DOM
        deletePage(pageID);
        // reset firstpageloaded/lastpageloaded
        if (pageID === firstPageLoaded) {
            firstPageLoaded = firstPageLoaded + 1;
        } else {
            lastPageLoaded = lastPageLoaded - 1;
        }
    } else {
        // Nothing to hide ... do nothing
        return;
    }
}

function attemptPageShow(pageID) {
    console.log('attempting to show page ' + pageID);
    // If it returns true, try to call it again, on the next one
    // Will only try to call nearViewport if inRange returns true
    if (inRange(pageID) && nearViewport(pageID)) {
        // append the page to the document
        appendPage(pageID);
        // Reset the first page loaded
        if (pageID < firstPageLoaded) {
            firstPageLoaded = pageID;
            // recursively call this function
            attemptPageShow(firstPageLoaded-1);
        } else {
            // otherwise, this is the last page loaded (scrolling down)
            lastPageLoaded = pageID;
            attemptPageShow(lastPageLoaded+1);
        }
    } else {
        return;
    }
}

function adjustPages(direction) {
    // Direction is -1, so we're scrolling up
    if (direction < 0) {
        console.log("SCROLLING UP");
        attemptPageShow(firstPageLoaded-1);
        attemptPageHide(lastPageLoaded);
    } else if (direction > 0) {
        // Direction is 1, so we're scrolling down
        console.log("SCROLLING DOWN");
        attemptPageHide(firstPageLoaded);
        attemptPageShow(lastPageLoaded+1);
    }
}
    
// Upon scrolling ...
function handleScroll() {
    verticalScroll = $('#documentpanel').scrollTop();

    adjustPages(verticalScroll - tempScrollTop);
    tempScrollTop = verticalScroll;
}
