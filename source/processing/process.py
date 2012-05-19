#!/usr/bin/env python

# Copyright (C) 2011 by Wendy Liu, Andrew Hankinson
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

import sys, os
import math
from vipsCC import VImage
from optparse import OptionParser

"""
This is a python script that will process all the images in a directory and 
try to convert them into pyramidal tiff format using the vips image processing
library. The converted images will then be moved into a subdirectory named
"processed" within the specified directory.

Dependencies:
    Python (version < 3.0)
    vips (http://www.vips.ecs.soton.ac.uk/index.php?title=VIPS)

Usage:
    Either run it with
        python process.py [directory]
    or chmod it to executable (chmod +x process.py) and run it with
        ./process.py directory

Options:
    If you want to resize all the images so that they have the same number
    of zoom levels, add the -r or --resize switch. This is not necessary, 
    but will result in all the images being closer to the same size than 
    processing without the switch. 
"""

def main(opts):
    directory = opts['idir']
    processed = opts['odir']
    resize_images = opts['resz']
    quality = opts['qual']
    tilesize = opts['tsze']
    compression = opts['comp']
    
    twid = float(tilesize)

    # set the compression options. We only need to munge it 
    # for jpeg -- all the other options we don't need a quality
    # declaration. If one is specified, we ignore it.
    if compression == "jpeg":
        compression = "{0}:{1}".format(compression, quality)
    
    # Create a directory called "processed" within that directory
    # If that directory already exists, fail
    if processed:
        # set the output directory to the supplied directory:
        outputdir = processed
        if not os.path.isdir(outputdir):
            os.mkdir(outputdir)
    else:
        if os.path.isdir(os.path.join(directory, 'processed')):
            print 'There already is a processed directory! Delete it and try again.'
            sys.exit(1)
        else:
            outputdir = os.path.join(directory, 'processed')
            os.mkdir(outputdir)
        
    # Store the zooms of the files in a list
    # Use another list to store filenames (same indices etc)
    max_zoom_list = []
    filename_list = []
    dimensions_list = []
    for dirpath, dirnames, filenames in os.walk(directory): 
        for filename in filenames:
            if filename.startswith("."):
                continue
            max_zoom, dimensions = get_image_info(os.path.join(directory, filename), twid)
            print "file: {0} has a maximum zoom of {1} ({2} zoom levels).".format(filename, (max_zoom - 1), max_zoom)
            max_zoom_list.append(max_zoom)
            filename_list.append(filename)
            dimensions_list.append(dimensions)

    # Now get the absolute lowest and highest max zoom
    lowest_max_zoom = min(max_zoom_list)

    # Store the number of images to figure out how many 0s we need
    num_images = len(filename_list)
    num_zeroes = len(str(num_images))

    # Now figure out which files have a zoom larger than that
    for i,filename in enumerate(filename_list):
        fn,ext = os.path.splitext(filename)
        input_file = os.path.join(directory, filename)
        new_fn = fn.replace(' ', '_')  # Replaces all spaces with _ because spaces can cause problems in the long run
        output_file = os.path.join(outputdir, "{0}.tif".format(new_fn))
        
        print "Processing {0}".format(input_file)
        vimage = VImage.VImage(input_file)
        
        # If the image needs to be resized
        if max_zoom_list[i] > lowest_max_zoom and resize_images:
            print '{0} needs to be resized, resizing and converting now'.format(filename)
            # Resize this image to the proper size ... prepend resized_
            width, height = dimensions_list[i]
            new_width, new_height = resize_image(lowest_max_zoom, width, height, twid)
            vimage.resize_linear(new_width, new_height).vips2tiff('{0}:{1},tile:{2}x{2},pyramid'.format(output_file, compression, tilesize))
        else:
            vimage.vips2tiff('{0}:{1},tile:{2}x{2},pyramid'.format(output_file, compression, tilesize))
        del vimage
        
    # Now print out the max_zoom this document has
    print "This document has a max zoom of: {0}".format(lowest_max_zoom)

# Calculate the maximum zoom of an image given its filepath
def get_image_info(filepath, tilewidth):
    # First, find the largest dimension of the image
    image = VImage.VImage(filepath)
    width = image.Xsize()
    height = image.Ysize()
    largest_dim = width if width > height else height

    # Now figure out the number of zooms
    zoom_levels = math.ceil(math.log((largest_dim + 1) / (tilewidth), 2)) + 1

    del image
    return (int(zoom_levels), (width, height))

# Resize an image to the desired zoom
def resize_image(desired_zoom, width, height, tilewidth):
    # Figure out the maximum dimensions we can give it with this zoom
    max_dim = (2 ** (desired_zoom - 1) * tilewidth) - 1
    
    if width > height:
        largest_dim = width
        width_largest = True
    else:
        largest_dim = height
        width_largest = False

    # Now figure out the new dimensions
    if width_largest:
        # imagemagick will figure out the aspect ratio stuff
        new_dimensions = max_dim, height
    else:
        new_dimensions = width, max_dim
    return new_dimensions
    
if __name__ == "__main__":
    usage = "%prog [options] directory [output directory]"
    parser = OptionParser(usage)
    parser.add_option("-r", "--resize", action="store_true", default=False, help = "Resizes all images so that they have the same number of zoom levels", dest="resize")
    parser.add_option("-q", "--quality", action="store", default="75", type="string", help="JPEG Image Quality level for vips (0-100, Default: 75)", dest="quality")
    parser.add_option("-s", "--tilesize", action="store", default="256", type="string", help="Pyramid TIFF tile size (square, default 256)", dest="tilesize")
    parser.add_option("-m", "--compression", action="store", default="jpeg", choices=["jpeg", "none", "deflate"], help="The type of compression to use. Choose jpeg (default), none, or deflate", dest="compression")
    options, args = parser.parse_args()
    
    if len(args) < 1:
        parser.print_help()
        parser.error("You must specify a directory to process.")
    
    opts = {
        'idir': args[0],
        'odir': args[1],
        'resz': options.resize,
        'qual': options.quality,
        'tsze': options.tilesize,
        'comp': options.compression
    }
    sys.exit(main(opts))
