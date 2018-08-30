export default class ValidationRunner
{
    constructor (options)
    {
        this.whitelistedKeys = options.whitelistedKeys || [];
        this.additionalProperties = options.additionalProperties || [];
        this.validations = options.validations;
    }

    isValid (key, value, settings)
    {
        // Get the validation index
        let validationIndex = null;

        this.validations.some((validation, index) =>
        {
            if (validation.key !== key)
            {
                return false;
            }

            validationIndex = index;
            return true;
        });

        if (validationIndex === null)
        {
            return true;
        }

        // Run the validation
        const dummyChanges = {};
        dummyChanges[key] = value;
        const proxier = createSettingsProxier(settings, dummyChanges, this);

        return !this._runValidation(validationIndex, value, proxier);
    }

    validate (settings)
    {
        this._validateOptions({}, settings);
    }

    getValidatedOptions (settings, options)
    {
        const cloned = Object.assign({}, options);
        this._validateOptions(settings, cloned);
        return cloned;
    }

    _validateOptions (settings, options)
    {
        const settingsProxier = createSettingsProxier(settings, options, this);
        this._applyValidations(options, settingsProxier);
    }

    _applyValidations (options, proxier)
    {
        this.validations.forEach((validation, index) =>
        {
            if (!options.hasOwnProperty(validation.key))
            {
                return;
            }

            const input = options[validation.key];
            const corrected = this._runValidation(index, input, proxier);

            if (corrected)
            {
                if (!corrected.warningSuppressed)
                {
                    emitWarning(validation.key, input, corrected.value);
                }

                options[validation.key] = corrected.value;
            }
        }, this);
    }

    _runValidation (index, input, proxier)
    {
        const validation = this.validations[index];

        proxier.index = index;

        let warningSuppressed = false;
        const config = {
            suppressWarning: () =>
            {
                warningSuppressed = true;
            }
        };

        const outputValue = validation.validate(input, proxier.proxy, config);

        if (outputValue === undefined || outputValue === input)
        {
            return null;
        }

        return {
            value: outputValue,
            warningSuppressed: warningSuppressed
        };
    }
}

/**
 * The settings proxy wraps the settings object and ensures that
 * only values which have previously been validated are accessed,
 * throwing a TypeError otherwise.
 *
 * FIXME(wabain): Is it worth keeping this? When I wrote it I had
 * multiple validation stages and it was a lot harder to keep track
 * of everything, so this was more valuable.
 */
function createSettingsProxier (settings, options, runner)
{
    const proxier = {
        proxy: {},
        index: null
    };

    const lookup = lookupValue.bind(null, settings, options);

    const properties = {};

    runner.whitelistedKeys.forEach((whitelisted) =>
    {
        properties[whitelisted] = {
            get: lookup.bind(null, whitelisted)
        };
    });

    runner.additionalProperties.forEach((additional) =>
    {
        properties[additional.key] = {
            get: additional.get
        };
    });

    runner.validations.forEach( (validation, validationIndex) =>
    {
        properties[validation.key] = {
            get: () =>
            {
                if (validationIndex < proxier.index)
                {
                    return lookup(validation.key);
                }

                const currentKey = runner.validations[proxier.index].key;
                throw new TypeError('Cannot access setting ' + validation.key + ' while validating ' + currentKey);
            }
        };
    });

    Object.defineProperties(proxier.proxy, properties);

    return proxier;
}

function emitWarning (key, original, corrected)
{
    console.warn('Invalid value for ' + key + ': ' + original + '. Using ' + corrected + ' instead.');
}

function lookupValue (base, extension, key)
{
    if (key in extension)
    {
        return extension[key];
    }

    return base[key];
}
