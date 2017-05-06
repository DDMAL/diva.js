export default {
    get: getHashParam,
    update: updateHashParam
};


// For getting the #key values from the URL. For specifying a page and zoom level
// Look into caching, because we only need to get this during the initial load
// Although for the tests I guess we would need to override caching somehow
function getHashParam (key)
{
    const hash = window.location.hash;

    if (hash !== '')
    {
        // Check if there is something that looks like either &key= or #key=
        let startIndex = (hash.indexOf('&' + key + '=') > 0) ? hash.indexOf('&' + key + '=') : hash.indexOf('#' + key + '=');

        // If startIndex is still -1, it means it can't find either
        if (startIndex >= 0)
        {
            // Add the length of the key plus the & and =
            startIndex += key.length + 2;

            // Either to the next ampersand or to the end of the string
            const endIndex = hash.indexOf('&', startIndex);
            if (endIndex > startIndex)
            {
                return decodeURIComponent(hash.substring(startIndex, endIndex));
            }
            else if (endIndex < 0)
            {
                // This means this hash param is the last one
                return decodeURIComponent(hash.substring(startIndex));
            }
            // If the key doesn't have a value I think
            return '';
        }
        else
        {
            // If it can't find the key
            return false;
        }
    }
    else
    {
        // If there are no hash params just return false
        return false;
    }
}

function updateHashParam (key, value)
{
    // First make sure that we have to do any work at all
    const originalValue = getHashParam(key);
    const hash = window.location.hash;

    if (originalValue !== value)
    {
        // Is the key already in the URL?
        if (typeof originalValue === 'string')
        {
            // Already in the URL. Just get rid of the original value
            const startIndex = (hash.indexOf('&' + key + '=') > 0) ? hash.indexOf('&' + key + '=') : hash.indexOf('#' + key + '=');
            const endIndex = startIndex + key.length + 2 + originalValue.length;
            // # if it's the first, & otherwise
            const startThing = (startIndex === 0) ? '#' : '&';
            window.location.replace(hash.substring(0, startIndex) + startThing + key + '=' + value + hash.substring(endIndex));
        }
        else
        {
            // It's not present - add it
            if (hash.length === 0)
            {
                window.location.replace('#' + key + '=' + value);
            }
            else
            {
                // Append it
                window.location.replace(hash + '&' + key + '=' + value);
            }
        }
    }
}
