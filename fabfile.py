import os

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

def test():
    with settings(warn_only=True):
        print local("phantomjs tests/run.js"),

def release(version):
    """
    Creates a zip file containing just the files we need for the release.
    Also adds the "latest version" text to diva.min.js.
    """
    files = {
        'readme.md': 'readme.md',
        'AUTHORS': 'AUTHORS',
        'LICENSE': 'LICENSE',
        'build/js/*': 'diva.js/js/',
        'build/css/*': 'diva.js/css/',
        'build/img/*': 'diva.js/img/',
        'build/divaserve/*': 'dataservers/',
        'source/processing/*': 'processing/',
        'demo/*': 'examples/',
    }

    release_dir = "diva-%s" % version
    try:
        os.mkdir(release_dir)
    except OSError:
        # Empty the directory
        try:
            local("rm -r %s/*" % release_dir)
        except OSError:
            pass

    # Copy all the files over
    for source, dest in files.iteritems():
        if dest.endswith('/'):
            try:
                os.makedirs(os.path.join(release_dir, dest))
            except OSError:
                # Already been created
                pass

        local("cp -R %s %s/%s" % (source, release_dir, dest))

    local("tar czf %s.tar.gz %s" % (release_dir, release_dir))
    local("zip %s.zip %s" % (release_dir, release_dir))
