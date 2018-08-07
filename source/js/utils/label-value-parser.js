
export default function parseLabelValue (key)
{
    let l = key.label; 
    let label = (typeof l === 'object') 
        ? l[Object.keys(l)[0]][0]
        : l;

    let v = key.value;
    let value = (typeof v === 'object') 
        ? v[Object.keys(v)[0]]
        : v;

    if (Array.isArray(value))
    {
        value = value.join(', ');
    }

    return {
        label: label,
        value: value
    }
}