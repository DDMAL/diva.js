
export default function createSettingsView(sources)
{
    const obj = {};

    sources.forEach( (source) =>
    {
        registerMixin(obj, source);
    });

    return obj;
}

function registerMixin(obj, mixin)
{
    Object.keys(mixin).forEach( (key) =>
    {
        Object.defineProperty(obj, key, {
            get: () =>
            {
                return mixin[key];
            },
            set: () =>
            {
                // TODO: Make everything strict mode so this isn't needed
                throw new TypeError('Cannot set settings.' + key);
            }
        });
    });
}
