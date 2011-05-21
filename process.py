#!/usr/bin/env python

# Copyright (C) 2011 by Wendy Liu
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
from vipsCC import *
from optparse import OptionParser

"""
This is a python script that will process all the images in a directory and 
try to convert them into pyramidal tiff format using the vips image processing
library. The converted images will then be moved into a subdirectory named
"processed" within the specified directory.

Dependencies:
    PIL (python imaging library)
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
    directory = opts['outd']
    resize_images = opts['resz']
    
    # Create a directory called "processed" within that directory
    # If that directory already exists, fail
    if os.path.isdir(os.path.join(directory, 'processed')):
        print 'There already is a processed directory! Delete it and try again.'
        return 1
    else:
        os.mkdir(os.path.join(directory, 'processed'))
        
    # Store the zooms of the files in a list
    # Use another list to store filenames (same indices etc)
    max_zoom_list = []
    filename_list = []
    dimensions_list = []
    for dirpath, dirnames, filenames in os.walk(directory): 
        for filename in filenames:
            if filename.startswith("."):
                continue
            max_zoom, dimensions = get_image_info(os.path.join(directory, filename))
            print 'file: ' + filename + ' has max zoom of: ' + str(max_zoom - 1) + ' (' + str(max_zoom) + ' zoom levels)'
            max_zoom_list.append(max_zoom)
            filename_list.append(filename)
            dimensions_list.append(dimensions)

    # Now get the absolute lowest and highest max zoom
    lowest_max_zoom = min(max_zoom_list)

    # Now figure out which files have a zoom larger than that
    for i,filename in enumerate(filename_list):
        input_file = os.path.join(directory, filename)
        output_file = os.path.join(directory, 'processed', filename + '_' + str(i+1) + '.tif')
        
        vimage = VImage.VImage(input_file)
        
        # If the image needs to be resized
        if max_zoom_list[i] > lowest_max_zoom and resize_images:
            print filename + ' needs to be resized, resizing and converting now'
            # Resize this image to the proper size ... prepend resized_
            width, height = dimensions_list[i]
            new_width, new_height = resize_image(lowest_max_zoom, width, height)
            vimage.resize_linear(new_width, new_height).vips2tiff(output_file + ':jpeg:75,tile:256x256,pyramid')
        else:
            vimage.vips2tiff(output_file + ':jpeg:75,tile:256x256,pyramid')
        
    # Now print out the max_zoom this document has
    print "This document has a max zoom of: ",
    print lowest_max_zoom

# Calculate the maximum zoom of an image given its filepath
def get_image_info(filepath):
    # First, find the largest dimension of the image
    image = VImage.VImage(filepath)
    width = image.Xsize()
    height = image.Ysize()
    largest_dim = width if width > height else height

    # Now figure out the number of zooms
    zoom_levels = math.ceil(math.log((largest_dim + 1) / (257.0), 2)) + 1
    return (int(zoom_levels), (width, height))

# Resize an image to the desired zoom
def resize_image(desired_zoom, width, height):
    # Figure out the maximum dimensions we can give it with this zoom
    max_dim = (2**(desired_zoom-1) * 257) - 1
    
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
    usage = "%prog [options] directory"
    parser = OptionParser(usage)
    parser.add_option("-r", "--resize", action="store_true", default=False, help = "Resizes all images so that they have the same number of zoom levels", dest="resize")
    options, args = parser.parse_args()
    
    opts = {
        'outd': args[0],
        'resz': options.resize,
    }
    
    sys.exit(main(opts))
