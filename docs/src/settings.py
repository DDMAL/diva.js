import os

# The root docs/ directory
base_dir = os.path.join(os.path.dirname(__file__), '..')

# Directories for things
CONTENT_DIR = os.path.join(base_dir, 'content')
BUILD_DIR = os.path.join(base_dir, '..', 'diva')
TEMPLATE_DIR = os.path.join(base_dir, 'templates')

# URLs
ROOT_URL = '/diva/'
STATIC_URL = ROOT_URL + 'static/'
DOCS_URL = ROOT_URL + 'documentation/'

COMMON_LINKS = {
    'hash parameter': DOCS_URL + 'using/desktop#manipulating-the-url-hash-parameters'
}

# Stuff that might change
DIVA_GITHUB_URL = 'https://github.com/DDMAL/diva.js/blob/develop/source/js/diva.js'
LATEST_VERSION = '2.0.0'

# Stuff that Django needs (don't change)
INSTALLED_APPS = (
    'django.contrib.markup',
    'generator',
)

TEMPLATE_DIRS = (TEMPLATE_DIR,)
