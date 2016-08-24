// FIXME: Would be better to use a real linter like stylelint

var postcss = require('postcss');

// Try to match unprefixed classes, ids, attribute rules
var UNPREFIXED = (/([.\#\[])(?!diva-)/);

module.exports = postcss.plugin('audit-diva-css', function ()
{
    return function (css, result)
    {
        css.walkRules(UNPREFIXED, function (rule)
        {
            rule.selectors.filter(function (group)
            {
                return UNPREFIXED.test(group);
            }).forEach(function (problem)
            {
                rule.warn(result, 'Unprefixed selector ' + problem, {
                    word: problem
                });
            });
        });
    };
});
