/**
 * Parses a v3 manifest's label/value pair from an object & array to a string
 *
 * @public
 * @params {string} key - The key from which a label/value pair should be extracted.
 * @returns {object} - The label/value pair as strings.
 * */

export default function parseLabelValue (key)
{
    let l = key.label; 
    let label = (typeof l === 'object') ? l[Object.keys(l)[0]][0] : l;

    let v = key.value;
    let value;
    if (Array.isArray(v))
    { // is array of objects
        value = v.map(e => e[Object.keys(e)[0]]);
    }
    else
    { // is object where value is possibly an array
        value = (typeof v === 'object') ? v[Object.keys(v)[0]] : v;
    }

    if (Array.isArray(value))
    {
        value = value.join(', ');
    }

    return {
        label: label,
        value: value
    };
}