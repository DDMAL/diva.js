from fabric.api import *

# Path to the Closure Compiler .jar file
CLOSURE_COMPILER_PATH = '~/compiler.jar'

def less():
    # Creates a minified version in css/diva.min.css
    # and a non-minified version in css/diva.css
    local('lessc css/styles.less css/diva.min.css --yui-compress')
    local('lessc css/styles.less css/diva.css')

def minify():
    local("cat js/diva-utils.js js/diva.js > js/diva-full.js && java -jar " + CLOSURE_COMPILER_PATH + " --js js/diva-full.js --js_output_file js/diva-min.js && rm js/diva-full.js")
