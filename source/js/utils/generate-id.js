// Adapted from http://forrst.com/posts/jQuery_element_ID_generator-RoM

module.exports = generateId;

var counter = 1;

function generateId(suffix) {
    var generatedId;

    do
    {
        generatedId = (counter++) + (suffix ? '-' + suffix : '');
    }
    while(document.getElementById(generatedId));

    return generatedId;
}
