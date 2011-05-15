$('#highlight-button').click(function() {
    // Fire off an ajax request
    console.log("starting ajax request");
    $.getJSON('search/random', function(data) {
        
        // If the highlight div already exists, remove it
        var box = $('#highlight');
        if (box.length > 0) {
            box.remove();
        }

        var x_start = data['x'];
        var y_start = data['y'];
        var width = data['w'];
        var height = data['h'];

        var to_append = '<div id="highlight" style="width: ' + width + '; height: ' + height + '; left: ' + x_start + '; top: ' + y_start + ';"></div>';
        $('#image').append(to_append);
    });
});

$(document).ready(function() {
    //alert("WTF");
    //console.log("lol");
});
