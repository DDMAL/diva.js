import parseLabelValue from '../../source/js/utils/parse-label-value';

describe('Parse Label Value', function ()
{
    it('Should parse object -> array -> objects', function ()
    {
        let key = {
            "label" : "Date",
            "value" : [ 
                {
                    "@value" : "1101-1125"
                }, {
                    "@value" : "1301-1400"
                } 
            ]
        };

        let obj = parseLabelValue(key);

        assert.strictEqual(obj.label, 'Date', 'Label should be "Date"');
        assert.strictEqual(obj.value, '1101-1125, 1301-1400', 'Value should be the date string');
    });

    it('Should parse object -> array', function ()
    {
        let key = {
            "label": {
                "en": [
                    "Date Statement"
                ]
            },
            "value": {
                "en": [
                    "1401",
                    "1500"
                ]
            }
        };

        let obj = parseLabelValue(key);

        assert.strictEqual(obj.label, 'Date Statement', 'Label should be "Date Statement"');
        assert.strictEqual(obj.value, '1401, 1500', 'Value should be the date string');
    });
});