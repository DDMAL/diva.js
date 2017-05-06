import { Events } from './utils/events';
// import PluginRegistry from './plugin-registry';

const diva = {
    Events: Events,

    // registerPlugin: function (plugin)
    // {
    //     PluginRegistry.register(plugin);
    // },

    /**
     * Create a new Diva instance at the given element
     *
     * @param element {Element}
     * @param options {Object}
     * @returns {Diva}
     */
    // create: function (element, options)
    // {
    //     if (diva.find(element))
    //         throw new Error('Diva is already initialized on ' + reprElem(element));
    //
    //     const $elem = $(element);
    //     $elem.diva(options);
    //
    //     return $elem.data('diva');
    // },

    /**
     * Return the Diva instance attached to the
     * element, if any.
     *
     * @param element
     * @returns {Diva|null}
     */
    // find: function (element)
    // {
    //     return $(element).data('diva') || null;
    // }
};

export default diva;

// function reprElem(elem)
// {
//     const id = elem.id ? '#' + elem.id : elem.id;
//     const classes = elem.className ? '.' + elem.className.split(/\s+/g).join('.') : '';
//
//     return (id ? id : elem.tagName.toLowerCase()) + classes;
// }
