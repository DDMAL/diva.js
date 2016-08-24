module.exports = createSettingsView;

function createSettingsView(sources)
{
    var obj = {};

    sources.forEach(function (source)
    {
        registerMixin(obj, source);
    });

    return obj;
}

function registerMixin(obj, mixin)
{
    Object.keys(mixin).forEach(function (key)
    {
        Object.defineProperty(obj, key, {
            get: function ()
            {
                return mixin[key];
            },
            set: function ()
            {
                // TODO: Make everything strict mode so this isn't needed
                throw new TypeError('Cannot set settings.' + key);
            }
        });
    });
}
