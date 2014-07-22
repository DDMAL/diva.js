var isInView = function($el)
{
    var elemTop = $el.getBoundingClientRect().top;
    var elemBottom = $el.getBoundingClientRect().bottom;

    var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);
    return isVisible;
};

var checkView = function ()
{
    if (isInView(document.getElementById('feature-picture')))
        document.getElementById('feature-picture').play();
    else
        document.getElementById('feature-picture').pause();

    if (isInView(document.getElementById('feature-speed')))
        document.getElementById('feature-speed').play();
    else
        document.getElementById('feature-speed').pause();

    if (isInView(document.getElementById('feature-others')))
        document.getElementById('feature-others').play();
    else
        document.getElementById('feature-others').pause();
};

window.addEventListener('scroll', checkView, false);
window.addEventListener('resize', checkView, false);
