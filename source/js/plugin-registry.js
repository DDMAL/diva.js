/**
 * @module
 * @private
 * The global plugin registry.
 */

var plugins = [];

module.exports = {
    register: function (plugin)
    {
        plugins.push(plugin);
    },
    getAll: function ()
    {
        return plugins;
    }
};
