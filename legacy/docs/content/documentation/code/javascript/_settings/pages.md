{% load extras %}

The format of this array is identical to the format of the `pgs` array returned
in the JSON response by the divaserve script. The data for each page is stored
in an object, and all the zoom-level-specific data is stored in the under the
`d` key, with one object per zoom level. The {% private_link "getPageData" %}
function is a shortcut for looking up an attribute in the `d` object of a given
page at the current zoom level.

The format is given below (only the first page is shown, and only the data for
the first two zoom levels):

```json
[
    {
        "d": [
            {
                "c": 1,
                "r": 2,
                "h": 300,
                "w": 200
            },
            {
                "c": 2,
                "r": 3,
                "h": 600,
                "w": 400
            }
        ],
        "m": 5,
        "f": "1.tif"
    }
]
```
