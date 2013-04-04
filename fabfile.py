import os
from fabric.api import *

# Path to the Closure Compiler .jar file
CLOSURE_COMPILER_PATH = '/usr/local/Cellar/closure-compiler/20121212/libexec/build/compiler.jar'


def less():
    """
    Builds the CSS files from the LESS source files.
    Creates a minified version called diva.min.css in build/css
        and a non-minified version called diva.css.
    See build/css/readme.md for more information.
    """
    if not os.path.exists("build/css"):
        local("mkdir -p build/css")

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
    if not os.path.exists("build/js"):
        local("mkdir -p build/js")

    source_files = ['utils.js', 'diva.js', 'plugins/*']
    local("cd source/js && java -jar " + CLOSURE_COMPILER_PATH + " --js " + " ".join(source_files) + " --js_output_file ../../build/js/diva.min.js")


def build():
    if os.path.exists("build"):
        print "Removing old build directory"
        local("rm -r build")

    local("mkdir -p build")
    local("cp -R source/img build/")
    local("cp -R source/divaserve build/")
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
    import shutil

    print "Building a release version of Diva"
    build()

    files = {
        'readme.md': 'readme.md',
        'AUTHORS': 'AUTHORS',
        'LICENSE': 'LICENSE',
        'build/js': 'diva.js/js/',
        'build/css': 'diva.js/css/',
        'build/img': 'diva.js/img/',
        'build/divaserve': 'dataservers/',
        'source/processing': 'processing/',
        'demo': 'examples/',
    }

    release_dir = "diva-%s" % version

    if os.path.exists(release_dir):
        print "Release Path Exists. Removing."
        shutil.rmtree(release_dir)

    os.mkdir(release_dir)

    # Copy all the files over
    for source, dest in files.iteritems():
        build_path = os.path.join(release_dir, dest)
        # if not os.path.exists(build_path):
        #     os.makedirs(build_path)
        if os.path.isfile(source):
            shutil.copy(source, build_path)
        elif os.path.isdir(source):
            shutil.copytree(source, build_path)
        else:
            print "Skipping {0}".format(build_path)

        # local("cp -R %s %s/%s" % (source, release_dir, dest))

    shutil.make_archive("%s" % (release_dir,), "gztar", release_dir)
    shutil.make_archive("%s" % (release_dir,), "zip", release_dir)
