DOCS_URL = '/diva/documentation/'

doc_sections = [
    ('using', 'Using the viewer', [
        ('desktop', 'Desktop usage instructions', []),
        ('mobile', 'Mobile/tablet usage instructions', []),
        ('plugins', 'Using the plugins', []),
        ('browser-support', 'Browser/platform support', []),
    ]),
    ('image-preprocessing', 'Image pre-processing', [
        ('tiled-images', 'Introduction to tiled images', []),
        ('image-formats', 'Image formats', []),
        ('using-processing-scripts', 'Using the processing scripts', []),
    ]),
    ('setup', 'Setup and installation', [
        ('backend', 'Backend', [
            ('iipimage', 'Installing IIPImage', []),
            ('data-server', 'The data server', []),
        ]),
        ('frontend', 'Frontend', [
            ('html', 'The HTML', []),
            ('javascript', 'The Javascript', []),
            ('multiple-viewers', 'Multiple viewer setups', []),
            ('integrated', 'Integrated viewer setups', []),
        ]),
    ]),
    ('customising', 'Customising the viewer', [
        ('look-and-feel', 'Changing the look and feel', []),
        ('configuring-plugins', 'Configuring the default plugins', []),
        ('writing-plugins', 'Writing plugins', []),
        ('performance', 'Performance optimisations', []),
        ('security', 'Security tips', []),
    ]),
    ('code', 'Code documentation', [
        ('build-process', 'The build process', []),
        ('stylesheets', 'Stylesheets', [
            ('how-less-works', 'How LESS works', []),
            ('organisation', 'Stylesheet organisation', []),
            ('variables', 'Variables', []),
            ('mixins', 'Mixins', []),
        ]),
        ('javascript', 'Javascript', [
            ('minification', 'The minification process', []),
            ('loading', 'Loading a viewer', []),
            ('settings', 'Setting reference', []),
            ('functions', 'Function reference', []),
            ('miscellaneous', 'Miscellaneous', []),
        ]),
    ])
]

doc_links = []
doc_titles = {}
doc_children = {}

def make_link(section, title, subsections):
    doc_titles[section] = title

    link = '<a href="%s">%s</a>' % (DOCS_URL + section, title)
    links = []

    for subsection, subtitle, subsubsections in subsections:
        new_section = section + '/' + subsection
        links.extend(make_link(new_section, subtitle, subsubsections))

    if links:
        # Only the direct descendants (no grandchildren)
        doc_children[section] = filter(lambda x: isinstance(x, basestring), links)

        return [link, links] 
    else:
        return [link]

for section, title, subsections in doc_sections:
    doc_links.extend(make_link(section, title, subsections))

# Depth-first search to build the next/prev pages things
doc_next_pages = {}
doc_prev_pages = {}

def set_next_page(section, subsections, previous=None):
    if previous:
        url = DOCS_URL + section
        doc_next_pages[previous] = url
        doc_prev_pages[section] = DOCS_URL + previous

    next_section = section
    for child_section, _, child_subsections in subsections:
        if section:
            child_section = section + '/' + child_section

        next_section = set_next_page(child_section, child_subsections, previous=next_section)

    return next_section

set_next_page('', doc_sections)
