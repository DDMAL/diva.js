#!/usr/bin/env python

import codecs
import os
import shutil

os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

from django.template import Context, Template, loader
import markdown

import constants
import jsparse
import settings

data = {
    'DIVA_GITHUB_URL': settings.DIVA_GITHUB_URL,
    'STATIC_URL': settings.STATIC_URL,
    'ROOT_URL': settings.ROOT_URL,
    'configurable_settings': jsparse.get_settings('defaults'),
    'other_settings': jsparse.get_settings('globals'),
    'private_functions': jsparse.get_functions(),
    'public_functions': jsparse.get_functions(public=True),
    'doc_links': constants.doc_links,
    'LATEST_VERSION': settings.LATEST_VERSION,
}

def remove_content_dir(path):
    return path[len(settings.CONTENT_DIR) + 1:]

def get_build_path(path):
    return os.path.join(settings.BUILD_DIR, remove_content_dir(path))

def remove_template_dir(path):
    return path[len(settings.TEMPLATE_DIR) + 1:]

def get_template_path(path):
    return os.path.join(settings.TEMPLATE_DIR, path)

try:
    shutil.rmtree(settings.BUILD_DIR)
except OSError:
    pass

base_template_dirs = (
    '',
    'documentation/',
)

os.mkdir(settings.BUILD_DIR)

content_files = []

loader.add_to_builtins('generator.templatetags.extras')

for root, dirnames, filenames in os.walk(settings.CONTENT_DIR):
    for dirname in dirnames:
        dir_path = os.path.join(root, dirname)
        os.mkdir(get_build_path(dir_path))

    # Figure out the files in this dir (the build dir)
    html_files = [filename + '.html' for filename in filenames]

    for filename in filenames:
        data['dirnames'] = dirnames
        file_path = os.path.join(root, filename)
        relative_path = remove_content_dir(file_path)
        data['relative_path'] = relative_path

        if '/_' not in relative_path and relative_path.endswith('.md'):
            # Get rid of the 'documentation/' and the '.md'
            page_name = relative_path[14:-3]
            if page_name.endswith('index'):
                page_name = page_name[:-6]
            print page_name
            data['doc_section'] = constants.doc_titles.get(page_name)
            data['doc_children'] = constants.doc_children.get(page_name)
            data['doc_next'] = constants.doc_next_pages.get(page_name)
            data['doc_prev'] = constants.doc_prev_pages.get(page_name)

            content_files.append(relative_path)

            possible_base = os.path.join(os.path.dirname(get_template_path(relative_path)), "base.html")
            if os.path.isfile(possible_base):
                base_template = remove_template_dir(possible_base)

            for base_template_dir in base_template_dirs:
                if relative_path.startswith(base_template_dir):
                    base_template = os.path.join(base_template_dir, "base.html")

            print relative_path
            print " base: " + base_template

            file = codecs.open(file_path, encoding='utf-8')
            file_contents = markdown.markdown(file.read(), extensions=['pilcrow_toc', 'tables', 'codehilite', 'fenced_code'])
            contents = "{%% extends \"%s\" %%}{%% block content %%}\n%s\n{%% endblock %%}" % (base_template, file_contents)
            template = Template(contents)
            context = Context(data)
            page = template.render(context)
            output_filename, _ = os.path.splitext(get_build_path(file_path))
            output_filename += '.html'
            output_file = open(output_filename, 'wt')
            output_file.write(page)
