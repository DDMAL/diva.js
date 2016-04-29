var extend = require('jquery').extend;

module.exports = ValidationRunner;

function ValidationRunner(options)
{
    this.validations = options.validations;
}

ValidationRunner.prototype.isValid = function (key, value, settings)
{
    // Get the validation index
    var validationIndex = null;

    this.validations.some(function (validation, index)
    {
        if (validation.key !== key)
            return false;

        validationIndex = index;
        return true;
    });

    if (validationIndex === null)
        return true;

    // Run the validation
    var dummyChanges = {};
    dummyChanges[key] = value;
    var proxier = createSettingsProxier(settings, dummyChanges, this.validations);

    return !this._runValidation(validationIndex, value, proxier);
};

ValidationRunner.prototype.validate = function (settings)
{
    this._validateOptions({}, settings);
};

ValidationRunner.prototype.getValidatedOptions = function (settings, options)
{
    var cloned = extend({}, options);
    this._validateOptions(settings, cloned);
    return cloned;
};

ValidationRunner.prototype._validateOptions = function (settings, options)
{
    var settingsProxier = createSettingsProxier(settings, options, this.validations);
    this._applyValidations(options, settingsProxier);
};

ValidationRunner.prototype._applyValidations = function (options, proxier)
{
    this.validations.forEach(function (validation, index)
    {
        if (!options.hasOwnProperty(validation.key))
            return;

        var input = options[validation.key];
        var corrected = this._runValidation(index, input, proxier);

        if (corrected)
        {
            if (!corrected.warningSuppressed)
                emitWarning(validation.key, input, corrected.value);

            options[validation.key] = corrected.value;
        }
    }, this);
};

ValidationRunner.prototype._runValidation = function (index, input, proxier)
{
    var validation = this.validations[index];

    proxier.index = index;

    var warningSuppressed = false;
    var config = {
        suppressWarning: function ()
        {
            warningSuppressed = true;
        }
    };

    var outputValue = validation.validate(input, proxier.proxy, config);

    if (outputValue === undefined || outputValue === input)
        return null;

    return {
        value: outputValue,
        warningSuppressed: warningSuppressed
    };
};

/**
 * The settings proxy wraps the settings object and ensures that
 * only values which have previously been validated are accessed,
 * throwing a TypeError otherwise.
 *
 * FIXME(wabain): Is it worth keeping this? When I wrote it I had
 * multiple validation stages and it was a lot harder to keep track
 * of everything, so this was more valuable.
 */
function createSettingsProxier(settings, options, validations)
{
    var proxier = {
        proxy: {},
        index: null
    };

    var properties = {
        manifest: {
            get: function ()
            {
                return options.manifest || settings.manifest;
            }
        }
    };

    validations.forEach(function (validation, validationIndex)
    {
        properties[validation.key] = {
            get: function ()
            {
                if (validationIndex < proxier.index)
                    return (validation.key in options) ? options[validation.key] : settings[validation.key];

                throw new TypeError('Cannot access setting ' + validation.key + ' while validating ' + validations[proxier.index].key);
            }
        };
    }, this);

    Object.defineProperties(proxier.proxy, properties);

    return proxier;
}

function emitWarning(key, original, corrected)
{
    console.warn('Invalid value for ' + key + ': ' + original + '. Using ' + corrected + ' instead.');
}
