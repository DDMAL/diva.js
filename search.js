var highlightArray = [];
var lastBoxLoaded = -1;
var firstBoxLoaded = -1;

function inRange(boxID) {
    if (boxID >= 0 && boxID < highlightArray.length) {
        return true;
    } else {
        return false;
    }
}

// Give it the index of the page that needs a box and it will append it
// Index of the page in pagesArray ... not the actual page number or anything
function appendBox(boxID) {
    // First make sure the pageID is in range
    if (!inRange(boxID)) {
        return false;
    }
    var thisBox = highlightArray[boxID];
    var pageNumber = thisBox.p;

    var xStart = thisBox.x;
    var yStart = thisBox.y;
    var width = thisBox.w;
    var height = thisBox.h;

    console.log('trying to append a box to page ' + pageNumber);

    var toAppend = '<div id="box-' + boxID + '" style="width: ' + width + '; height: ' + height + '; left: ' + xStart + '; top: ' + yStart + ';"></div>';
    if ($('#page-' + pageNumber).length > 0) {
        console.log('yay found it!');
        $('#page-' + pageNumber).append(toAppend);
        // Figure out if we need to update the first/last pages loaded
        if (boxID > lastBoxLoaded) {
            lastBoxLoaded = boxID;
        }
        if (boxID < firstBoxLoaded || firstBoxLoaded === -1) {
            firstBoxLoaded = boxID;
        }
        return true;
    } else {
        console.log("DOES NOT EXIST");
        return false;
    }
    
    // Return true if it is able to append it
    // False if it is not
}

$('#highlight-button').click(function() {
    // Fire off an ajax request
    console.log("starting ajax request");
    $.getJSON('search/many', function(data) {
        // First remove all the existing highlight boxes
        $('[id^=box-]').remove();

        var numBoxes = data.length;
        for (var i = 0; i < numBoxes; i++) {
            highlightArray.push(data[i]);

            // Try to append the box no matter what
            appendBox(i);
        }
    });
});

function attemptBoxShow(boxID, direction) {
    
}

function attemptBoxHide(boxID, direction) {
    // Don't have to actually hide it, just update the firstBoxLoaded parameter

}

function adjustBoxes(direction) {
    console.log('direction is: ' + direction);
    var nextBox;
    if (direction > 0) {
        // Scrolling down
        // Try to append the next page down
        nextBox = lastBoxLoaded + 1;
    } else if (direction < 0) {
        // Scrolling up
        nextBox = firstBoxLoaded - 1;
    }

    console.log('adjustBoxes now trying to append ' + nextBox);
    if (appendBox(nextBox)) {
        // keep trying to call it recursively
        adjustBoxes(direction);
    } else {
        return;
    }
    
}

var tempScrollTop = 0;

// Now handle the scrolling ...
$('#outerdrag').scroll(function() {
    var scrollSoFar = $('#outerdrag').scrollTop();
    adjustBoxes(scrollSoFar - tempScrollTop);
    tempScrollTop = scrollSoFar;
});


// Jumping to the next and previous boxes
$('#next-highlight').click(function() {
    var nextBoxID = lastBoxLoaded + 1;
    if (inRange(nextBoxID)) {
        var nextPage = highlightArray[nextBoxID].p;
        dv.gotoPage(nextPage+1); // because it subtracts one
        adjustBoxes(1);
    } else {
        // We've reached the end of the highlighted results - change value of button
        $('#next-highlight').val('End of search results');
        $('#next-highlight').attr('disabled', 'disabled');
    }
});
