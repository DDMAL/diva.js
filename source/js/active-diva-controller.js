var jQuery = require('jquery');

//Used to keep track of whether Diva was last clicked or which Diva was last clicked when there are multiple
var ActiveDivaController = (function ($)
{
    return function ()
    {
        var active;

        //global click listener
        $(document).on('click', function(e)
        {
            updateActive($(e.target));
        });

        //parameter should already be a jQuery selector
        var updateActive = function (target)
        {
            var nearestOuter;

            //these will find 0 or 1 objects, never more
            var findOuter = target.find('.diva-outer');
            var closestOuter = target.closest('.diva-outer');
            var outers = document.getElementsByClassName('diva-outer');
            var outerLen = outers.length;
            var idx;

            //clicked on something that was not either a parent or sibling of a diva-outer
            if (findOuter.length > 0)
            {
                nearestOuter = findOuter;
            }
            //clicked on something that was a child of a diva-outer
            else if (closestOuter.length > 0)
            {
                nearestOuter = closestOuter;
            }
            //clicked on something that was not in any Diva tree
            else
            {
                //deactivate everything and return
                for (idx = 0; idx < outerLen; idx++)
                {
                    $(outers[idx].parentElement.parentElement).data('diva').deactivate();
                }
                return;
            }

            //if we found one, activate it...
            nearestOuter.parent().parent().data('diva').activate();
            active = nearestOuter.parent();

            //...and deactivate all the others
            outers = document.getElementsByClassName('diva-outer');
            for(idx = 0; idx < outerLen; idx++)
            {
                //getAttribute to attr - comparing DOM element to jQuery element
                if (outers[idx].getAttribute('id') != nearestOuter.attr('id'))
                    $(outers[idx].parentElement.parentElement).data('diva').deactivate();
            }
        };

        //public accessor in case. Will return a jQuery selector.
        this.getActive = function()
        {
            return active;
        };
    };
})(jQuery);

module.exports = ActiveDivaController;
