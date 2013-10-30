"""
Parse the various JS scripts using regular expressions etc
"""

import re
import json

path_to_js = "/home/wliu/public_html/source/js/diva.js"

def get_js_lines():
    js_file = open(path_to_js)
    js_lines = [line.strip('\n') for line in js_file.readlines()]

    return js_lines

def get_settings(var_name):
    js = [line.strip() for line in get_js_lines()]

    first_line = js.index('var %s = {' % var_name)
    last_line = first_line + js[first_line:].index('};')
    settings = js[first_line + 1:last_line]

    real_settings = []

    for setting in settings:
        # Get the name (everything until the first colon)
        colon_i = setting.index(':')
        name = setting[:colon_i]

        # Get the comment (everything after the //)
        comment_i = setting.index('// ')
        comment = setting[comment_i + 3:]

        # Get the default value
        default_value = setting[colon_i + 2:comment_i].strip()
        # Get rid of the comma, if there is one
        if default_value.endswith(','):
            default_value = default_value[:-1]

        mandatory = comment.endswith('*MANDATORY*')

        real_settings.append({
            'name': name,
            'default': default_value,
            'comment': comment,
            'mandatory': mandatory,
            'filename': 'content/documentation/code/javascript/_settings/%s.md' % name,
        })

    return real_settings


def get_functions(public=False):
    js = get_js_lines() 

    prefix = 'this\.' if public else 'var '
    re_string = '^[ ]{8}%s(?P<name>[a-z0-9A-Z]+) = function.*$' % prefix
    function_re = re.compile(re_string)

    directory = 'public' if public else 'private'

    functions = []

    for i, line in enumerate(js):
        function_match = function_re.match(line)

        if function_match is not None:
            function_name = function_match.group('name')
            if public:
                function_name = 'this.' + function_name

            if function_name != 'Diva':
                functions.append({
                    # It's fine that it's 0-based indexing because of the comment
                    'i': i,
                    'name': function_name,
                    'filename': 'content/documentation/code/javascript/_%s_functions/%s.md' % (directory, function_name),
                })

    return functions
