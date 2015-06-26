
// IIIF Metadata plugin for diva.js
// Displays object metadata from a IIIF manifest
(function ($)
{
    window.divaPlugins.push((function()
    {
        var settings = {
            metadataModal: ''
        };

        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                var _displayMetadata = function(manifest)
                {
                    var showMetadata = function(label, value)
                    {
                        var labelProper = label.charAt(0).toUpperCase() + label.slice(1);
                        var labelFormatted = labelProper.replace('_', ' ');

                        if (value.indexOf('http://') === 0)
                        {
                            value = '<a href="' + value + '" target="_blank">' + value + '</a>';
                        }

                        return '<div class="metadata-row"><span class="metadata-label">' + labelFormatted + ':</span> <span class="metadata-value">' +
                            value  + '</span></div>';
                    };

                    var getDataForLanguage = function(data, language)
                    {
                        for (var i = 0; i < data.length; i++)
                        {
                            if (data[i]['@language'] === language)
                            {
                                return data[i]['@value'];
                            }
                        }
                    };

                    /**
                     * Shows metadata from label names (if the metadata exists).
                     * @param names {Array} - An array of strings representing field names to display.
                     */
                    var showMetadataFromLabelNames = function(names)
                    {
                        var elements = '';

                        for (var i = 0; i < names.length; i++)
                        {
                            var field = names[i];

                            if (manifest.hasOwnProperty(field))
                            {
                                if (manifest[field].constructor === Array)
                                {
                                    //multiple languages
                                    var localizedData = getDataForLanguage(manifest[field], 'en');
                                    elements += showMetadata(field, localizedData);
                                }
                                else
                                {
                                    elements += showMetadata(field, manifest[field]);
                                }
                            }
                        }

                        return elements;
                    };

                    var metadataElement = '<div id="' + divaSettings.ID + 'metadata" class="diva-modal">';
                    metadataElement += showMetadataFromLabelNames(['label']);

                    if (manifest.hasOwnProperty('metadata'))
                    {
                        var metadataField = manifest.metadata;

                        for (var i = 0; i < metadataField.length; i++)
                        {
                            if (metadataField[i].value.constructor === Array)
                            {
                                var canonicalData = getDataForLanguage(metadataField[i].value, 'en');
                                metadataElement += showMetadata(metadataField[i].label, canonicalData);
                            }
                            else
                            {
                                metadataElement += showMetadata(metadataField[i].label, metadataField[i].value);
                            }
                        }
                    }

                    metadataElement += showMetadataFromLabelNames([
                        'description',
                        'within',
                        'see_also',
                        'service',
                        'license',
                        'attribution'
                    ]);

                    metadataElement += '</div>';

                    divaSettings.parentObject.prepend(metadataElement);
                    $(divaSettings.selector + 'metadata').hide();
                };

                //subscribe to ManifestDidLoad event, get the manifest
                diva.Events.subscribe('ManifestDidLoad', _displayMetadata);

                divaSettings.parentObject.prepend('<div style="text-align: center; clear: both"><a href="#" id="' + divaSettings.ID + 'metadata-link" class="diva-metadata-link">Details</a></div>');
                // $(divaSettings.selector + 'title').append('<div><a href="#" id="' + divaSettings.ID + 'metadata-link" class="diva-metadata-link">Details</a></div>');

                $(divaSettings.selector + 'metadata-link').on('click', function(e)
                {
                    $(divaSettings.selector + 'metadata').fadeToggle('fast');
                });

                return true;
            },
            destroy: function (divaSettings, divaInstance)
            {
            },
            pluginName: 'IIIFMetadata',
            titleText: 'Show metadata from a IIIF manifest'
        };
        return retval;
    })());
})(jQuery);
