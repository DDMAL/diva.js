import markdown
from django import template
from django.conf import settings


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


@register.simple_tag
def settings_link(setting):
    """
    Pass it the name of a setting, it will return the absolute URL to it
    """
    return "<a href=\"%scode/javascript/settings#%s\"><code>settings.%s</code></a>" % (
        settings.DOCS_URL, setting, setting)


@register.simple_tag
def private_link(function):
    """
    Pass it the name of a private function, it will return the absolute URL to it
    """
    return '<a href="%scode/javascript/functions#%s"><code>%s()</code></a>' % (
        settings.DOCS_URL, function, function)


@register.simple_tag
def public_link(function):
    return private_link('this.' + function)


@register.simple_tag
def link(key):
    """
    For commonly-used links
    """
    return '<a href="%s">%s</a>' % (settings.COMMON_LINKS[key], key)
