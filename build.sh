#!/bin/bash

# Path to the Closure Compiler .jar file
CLOSURE_COMPILER_PATH="/usr/local/bin/closure-compiler"

# If running in Travis CI, use local compiler.jar
if [ "$TRAVIS" = "true" ]; then
    CLOSURE_COMPILER_PATH="java -jar ../../compiler.jar"
fi

less ()
{
    # Builds the CSS files from the LESS source files.
    # Creates a minified version called diva.min.css in build/css
    #     and a non-minified version called diva.css.
    # See build/css/readme.md for more information.
    echo "Compiling CSS."
    mkdir -p build/css
    lessc source/css/imports.less > build/css/diva.css
    lessc source/css/imports.less > build/css/diva.min.css -x
}

minify ()
{
    # Builds the minified Javascript files from the source files.
    # Creates a minified file called diva.min.js in build/js which contains
    #     all the relevant Javascript (except for jQuery, which must
    #     be included separately).
    # See build/js/readme.md for more information.
    echo "Compiling JS using Closure path:" $CLOSURE_COMPILER_PATH

    source_files=( "utils.js" "diva.js" "plugins/*" )

    mkdir -p build/js
    cd source/js && eval $CLOSURE_COMPILER_PATH" --js "${source_files[@]:0}" --js_output_file ../../build/js/diva.min.js"
    cd ../../
    cp -R source/js/ build/js/
}

all ()
{
    if [ -d "build" ]; then
        echo "Removing old build directory"
        rm -r build/*
    fi

    mkdir -p build/demo
    cp -R source/img build/
    cp -R source/processing build/
    less
    minify
    cp demo/index.html build/
    cp demo/diva/* build/demo
    cp demo/beromunster.json build/demo/
    cp readme.md build/
}

test ()
{
    if [ "$TEST_DIVA" = "source" ]; then
        echo "Testing source"
        phantomjs tests/run.js tests/source.html
    else
        echo "Testing build"
        phantomjs tests/run.js
    fi
}

release()
{
    # Creates a zip file containing just the files we need for the release.
    VERSION=$1
    if [ -z "$1"]; then
        echo "Syntax: ./build.sh release VERSION"
        exit 1
    fi

    all
    release_dir="diva-"$VERSION

    if [ -d $release_dir ]; then
        echo "Release Path exists. Removing."
        rm -r $release_dir
    fi

    mkdir -p $release_dir

    # Copy all the files over (within loop, $1==source_file, $2==dest_file)
    for file in "readme.md readme.md" "AUTHORS AUTHORS"  "LICENSE LICENSE" "build/js/ diva.js/js" "build/css/ diva.js/css" "build/img/ diva.js/img" "source/processing/ processing"
    do
        # parameterize each $file. nb: global positional params get overwritten.
        set -- $file
        build_path=$release_dir"/"$2

        if [ -f $1 ]; then
            cp $1 $build_path
        elif [ -d $1 ]; then
            mkdir -p $build_path
            cp -R $1 $build_path
        else echo "Skipping "$build_path
        fi
    done
    tar -zvcf $release_dir".tar.gz" $release_dir
    zip -r $release_dir".zip" $release_dir
}

case "$1" in
    "less" ) less;;
    "minify" ) minify;;
    "test" ) test;;
    "all" ) all;;
    "release" ) release $2;;
    * )
        echo "Build options:"
        echo "  all              - Builds CSS and Javascript, copies source to build directory"
        echo "  less             - Compiles CSS from the LESS source"
        echo "  minify           - Builds Javascript source"
        echo "  test             - Runs unit tests with PhantomJS"
        echo "  release VERSION  - Builds release package"
    ;;
esac

