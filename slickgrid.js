var firstPageLoaded; 
var lastPageLoaded;
var verticalScroll;
var tempScrollTop = 0;
var panelHeight = $('#documentpanel').height();

function initialLoad() {
    // includes padding
    var heightAbovePages = [10, 320, 590, 950, 1110];
    var numPages = 5;
    var randomArray = [{'id': 0, 'height': 300, 'width': 400, 'text': 'FIRST PAGE'}, {'id': 1, 'height': 250, 'width': 300, 'text': 'SECOND PAGE'}, {'id': 2, 'height': 350, 'width': 250, 'text': 'THIRD PAGE'}, {'id': 3, 'height': 150, 'width': 50, 'text': 'FOURTH PAGE'}, {'id': 4, 'height': 100, 'width': 100, 'text': 'FIFTH PAGE'}];
    // Find out which ones are in the viewport
    // If the heightAbovePages is less than height of document panel
    var panelHeight = $('#documentpanel').height();
    var panelWidth = $('#documentpanel').width()
    var stringBuilder = [];
    firstPageLoaded = 1;
    for (var i = 0; i < numPages; i++) {
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

function nearViewport(pageID) {
    console.log('checking if page ' + pageID + ' is near the viewport');
    // work on this later
}

function deletePage(pageID) {
    console.log('deleting page ' + pageID + ' from the dom');
}

function appendPage(pageID) {
    console.log('adding page ' + pageID + ' to the dom');
}

function attemptPageHide(pageID) {
    if (nearViewport(pageID)) {
        // Do nothing - nothing to hide
        return;
    } else {
        // Needs to be hidden. Delete it from the DOM
        deletePage(pageID);
        // reset firstpageloaded/lastpageloaded
        if (pageID === firstPageLoaded) {
            firstPageLoaded = firstPageLoaded + 1;
        } else {
            lastPageLoaded = lastPageLoaded + 1;
        }
    }
}

function attemptPageShow(pageID) {
    // If it returns true, try to call it again, on the next one
    if (nearViewport(pageID)) {
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
