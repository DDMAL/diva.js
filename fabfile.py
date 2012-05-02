from fabric.api import *

# Path to the Closure Compiler .jar file
CLOSURE_COMPILER_PATH = '/usr/lib/closure/compiler.jar'

def less():
    """
    Builds the CSS files from the LESS source files.
    Creates a minified version called diva.min.css in build/css
        and a non-minified version called diva.css.
    See build/css/readme.md for more information.
    """
    local('lessc source/css/imports.less > build/css/diva.css')
    local('lessc source/css/imports.less > build/css/diva.min.css -x')

def minify():
    """
    Builds the minified Javascript files from the source files.
    Creates a minified file called diva.min.js in build/js which contains
        all the relevant Javascript (except for jQuery, which must
        be included separately).
    See build/js/readme.md for more information.
    """
    source_files = ['utils.js', 'diva.js', 'plugins/*']
    local("cd source/js && java -jar " + CLOSURE_COMPILER_PATH + " --js " + " ".join(source_files) + " --js_output_file ../../build/js/diva.min.js")

def build():
    less()
    minify()
