diva.js uses a number of variables that behave like instance variables but are
instead stored in a private `settings` object. Some can be set by the user, as
explained in the [User-configurable settings](#user-configurable settings)
section below. Others cannot be modified by the user when creating the document
viewer, as their default values may be necessary for the document viewer for
work; these settings are listed in the [Other settings](#other-settings)
section.

These settings are all referenced in the form `settings.variableName` within
the actual code. For instance, to access or change the fixedPadding while in
diva.js (or from a plugin), use `settings.fixedPadding`.

[TOC]

User-configurable settings
--------------------------

These are settings that can be specified by the user when creating the diva.js
instance. They are found in the `defaults` array. All of them have values that
they default to if they are not specified by the user; however, some settings
need to be configured for the document viewer to function properly.

These settings can be set upon instantiating the document viewer, in the
following format:

```javascript
$('#diva-wrapper').diva({
    // ...
    settingName: 'Some string',
    anotherSettingName: false,
    // ...
});
```

The full list of such settings is below.

{% include "documentation/configurable_settings.html" %}

Other settings
--------------

These are members of the `settings` object that can't be changed when
initialising a viewer. They can, however, be changed in a callback
function (i.e. [`settings.onReady`](#onReady)) or from within a plugin.

{% include "documentation/other_settings.html" %}
