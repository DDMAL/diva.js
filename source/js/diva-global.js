var $ = require('jquery');

var Events = require('./utils/events');
var PluginRegistry = require('./plugin-registry');

var diva = module.exports = {
    Events: new Events(),

    registerPlugin: function (plugin)
    {
        PluginRegistry.register(plugin);
    },

    /**
     * Create a new Diva instance at the given element
     *
     * @param element {Element}
     * @param options {Object}
     * @returns {Diva}
     */
    create: function (element, options)
    {
        if (diva.find(element))
            throw new Error('Diva is already initialized on ' + reprElem(element));

        var $elem = $(element);
        $elem.diva(options);

        return $elem.data('diva');
    },

    /**
     * Return the Diva instance attached to the
     * element, if any.
     *
     * @param element
     * @returns {Diva|null}
     */
    find: function (element)
    {
        return $(element).data('diva') || null;
    }
};

function reprElem(elem)
{
    var id = elem.id ? '#' + elem.id : elem.id;
    var classes = elem.className ? '.' + elem.className.split(/\s+/g).join('.') : '';

    return (id ? id : elem.tagName.toLowerCase()) + classes;
}
