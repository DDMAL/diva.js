import os

from fabric.api import local, run, cd, put

from src import settings


def build():
    with cd(os.path.dirname(__file__)):
        # Generate the site
        print local("python src/generate.py")
        # Copy the static directory over
        print settings.BUILD_DIR
        local("cp -R static %s" % settings.BUILD_DIR)

def deploy():
    put(settings.BUILD_DIR, 'deploy')

def wc():
    local("wc -w `find content -type f`")
