import markdown
from django import template

import settings


register = template.Library()

@register.simple_tag
def show(filename):
    try:
        file = open(filename)
        contents = markdown.markdown(file.read(), extensions=['codehilite', 'fenced_code', 'tables'])
        output = template.Template(contents).render(template.Context({}))
        return output
    except IOError:
        return ""


@register.simple_tag
def docs_image(filename):
    """
    Pass it a filename (without the .PNG extension) and it will load it from
    static/img/docs/{{ filename }}.png.
    """
    return '<img src="' + settings.STATIC_URL + 'img/docs/' + filename + '.png" alt="Screenshot" />'
