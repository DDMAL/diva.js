var Events = require('./utils/events');
var PluginRegistry = require('./plugin-registry');

module.exports = {
    Events: new Events(),
    registerPlugin: function (plugin)
    {
        PluginRegistry.register(plugin);
    }
};
