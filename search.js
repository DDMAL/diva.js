$('#highlight-button').click(function() {
    // Fire off an ajax request
    console.log("starting ajax request");
    $.getJSON('search/many', function(data) {
        
        // If the highlight div already exists, remove it
        var box = $('#highlight');
        if (box.length > 0) {
            box.remove();
        }
        
        var numBoxes = data.length;
        var i, pageTopOffset, width, height, xStart, yStart, toAppend;
        var stringBuilder = [];
        for (var i = 0; i < numBoxes; i++) {
            page = data[i].p;
            console.log('page:' + page);
            pageTopOffset = $('#page-' + page).position().top;

            xStart = data[i].x;
            yStart = data[i].y + pageTopOffset;
            width = data[i].w;
            height = data[i].h;
            // Make the div that should be appended
            toAppend = '<div id="highlight" style="width: ' + width + '; height: ' + height + '; left: ' + xStart + '; top: ' + yStart + ';"></div>';
            stringBuilder.push(toAppend);
        }
        $('#documentpanel').append(stringBuilder.join(''));
    });
});
