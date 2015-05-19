#!/usr/bin/env python

# Copyright (C) 2011, 2012 by Wendy Liu, Andrew Hankinson
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

import sys
import os
import re
import tempfile
import subprocess
import shutil
import generate_json
from optparse import OptionParser

"""
This is a python script/module that will process all the images in a directory
and try to convert them into the JPEG2000 or Pyramid TIFF image formats. You 
must have the ImageMagick "convert" executable installed to run this script.
We assume the location of this executable to be "/usr/local/bin/convert" unless
otherwise specified with the "-i" option/convert_location parameter.

To convert files to JPEG2000, specify the "-t jpeg" option when running this 
script or set the image_type parameter to "jpeg" when creating a DivaConverter 
object. This requires the "kdu_compress" executable included with the Kakadu 
JPEG2000 library; we assume the location of this executable to be 
"/usr/local/bin/kdu_compress" unless otherwise specified with the "-k" 
option/kdu_compress_location parameter.

You can download this library for free at:
http://www.kakadusoftware.com/index.php?option=com_content&task=view&id=26&Itemid=22

To convert files to Pyramid TIFF, specify the "-t tiff" option when running this
script or set the image_type parameter to "tiff" when creating a DivaConverter 
object. This requires the "vipsCC" Python module included with an installation 
of the VIPS image processing suite. If you are installing VIPS using Homebrew 
on Mac OS X, make sure to run "brew install vips --with-imagemagick".

Dependencies:
    Python (version < 3.0)
    Kakadu Command-line Utilities
    ImageMagick convert utility

Usage:
    Either run it with
        python process.py [input_directory] [output_directory] [data_output_directory]
    or chmod it to executable (chmod +x process.py) and run it with
        ./process.py [input_directory] [output_directory] [data_output_directory]

    You can also use this as a Python module:

        import process
        c = DivaConverter(input_directory, output_directory, data_output_directory)
        c.convert()
"""

VALID_INPUT_EXTENSIONS = [".jpg", ".jpeg", ".tif", ".tiff", ".JPG", ".JPEG", ".TIF", ".TIFF", '.png', '.PNG']

class DivaConverter(object):
    def __init__(self, input_directory, output_directory, data_output_directory, **kwargs):
        self.input_directory = os.path.abspath(input_directory)
        self.output_directory = os.path.abspath(output_directory)
        self.data_output_directory = os.path.abspath(data_output_directory)
        self.verbose = True
        self.image_type = kwargs['image_type']
        self.compression = "none"
        self.convert_location = kwargs['convert_location']
        self.kdu_compress_location = kwargs['kdu_compress_location']

        if not os.path.exists(self.convert_location):
            print(("You do not have the ImageMagick 'convert' executable installed at {0}.").format(self.convert_location))
            print("If this path is incorrect, please specify an alternate location using the '-i (location)' command line option for this script.")
            sys.exit(-1)

        if self.image_type == "tiff":
            try:
                from vipsCC import VImage
            except ImportError as e:
                print("You have specified TIFF as the output format, but do not have the VIPS Python library installed.")
                sys.exit(-1)

        elif self.image_type == "jpeg":
            # JPEG2000 uses the .JP2 extension
            self.image_type = "jp2"
            if not os.path.exists(self.kdu_compress_location):
                print(("You have specified JP2 as the output format, but do not have the kdu_compress executable installed at {0}.").format(self.kdu_compress_location))
                print("If this path is incorrect, please specify an alternate location using the '-k (location)' command line option for this script.")
                sys.exit(-1)

        else:
            print("The '-t' option must either be 'tiff' for Pyramid TIFF or 'jpeg' for JPEG2000. Omitting the '-t' option will default to 'jpeg'.")
            print("Usage: process.py -t tiff input_directory output_directory data_output_directory")
            sys.exit(-1)

    def convert(self):
        if not os.path.isdir(self.output_directory):
            os.mkdir(self.output_directory)

        to_process = [os.path.join(self.input_directory, f)
                      for f in os.listdir(self.input_directory) if self.__filter_fnames(f)]

        to_process.sort(key=self.__alphanum_key)

        for image in to_process:
            tdir = None
            name = os.path.basename(image)
            name, ext = os.path.splitext(name)
            tdir = tempfile.mkdtemp()

            input_file = os.path.join(tdir, "{0}.tiff".format(name))
            output_file = os.path.join(self.output_directory, "{0}.{1}".format(name, self.image_type))

            if self.verbose:
                print("Using ImageMagick to pre-convert {0} to TIFF".format(image))
            subprocess.call([self.convert_location,
                             "-compress", "None",
                             image,
                             input_file])

            if self.verbose:
                print("Converting {0} to {1}".format(name, self.image_type))

            if self.image_type == "tiff":
                self.__process_tiff(input_file, output_file)
            else:
                self.__process_jpeg2000(input_file, output_file)

            if self.verbose:
                print("Cleaning up")
            shutil.rmtree(tdir)

            if self.verbose:
                print("Done converting {0}".format(image))

        json_opts = {
            'input_directory': self.output_directory,
            'output_directory': self.data_output_directory
        }
        json_generator = generate_json.GenerateJson(**json_opts)
        json_generator.generate()

        return True

    def __process_jpeg2000(self, input_file, output_file):
        subprocess.call([self.kdu_compress_location,
                        "-i", input_file,
                         "-o", output_file,
                         "Clevels=5",
                         "Cblk={64,64}",
                         "Cprecincts={256,256},{256,256},{128,128}",
                         "Creversible=yes",
                         "Cuse_sop=yes",
                         "Corder=LRCP",
                         "ORGgen_plt=yes",
                         "ORGtparts=R",
                         "-rate", "-,1,0.5,0.25"])

    def __process_tiff(self, input_file, output_file):
        from vipsCC import VImage
        vimage = VImage.VImage(input_file)
        vimage.vips2tiff('{0}:{1},tile:256x256,pyramid'.format(output_file, self.compression))
        del vimage

    def __filter_fnames(self, fname):
        if fname.startswith('.'):
            return False
        if fname.startswith('_'):
            return False
        if fname == "Thumbs.db":
            return False
        if os.path.splitext(fname)[-1].lower() not in VALID_INPUT_EXTENSIONS:
            return False
        return True

    def __tryint(self, s):
        try:
            return int(s)
        except:
            return s

    def __alphanum_key(self, s):
        """ Turn a string into a list of string and number chunks.
            "z23a" -> ["z", 23, "a"]
            See:
            http://www.codinghorror.com/blog/2007/12/sorting-for-humans-natural-sort-order.html
        """
        return [self.__tryint(c) for c in re.split('([0-9]+)', s)]


if __name__ == "__main__":
    usage = "%prog [options] input_directory output_directory data_output_directory"
    parser = OptionParser(usage)
    parser.add_option("-t", "--type", action="store", default="jpeg", help="The type of images this script should produce. Options are 'jpeg' or 'tiff'.", dest="type")
    parser.add_option("-k", "--kdu-compress-location", action="store", default="/usr/local/bin/kdu_compress", help="The location of the 'kdu_compress' executable provided by the Kakadu JPEG2000 library.", dest="kdu_compress_location")
    parser.add_option("-i", "--imagemagick-convert-location", action="store", default="/usr/local/bin/convert", help="The location of the 'convert' executable provided by ImageMagick.", dest="convert_location")
    options, args = parser.parse_args()

    if len(args) < 3:
        print("You must specify an input, output, and data output directory.")
        print("Usage: process.py input_directory output_directory data_output_directory")
        sys.exit(-1)

    opts = {
        'input_directory': args[0],
        'output_directory': args[1],
        'data_output_directory': args[2],
        'kdu_compress_location': options.kdu_compress_location,
        'convert_location': options.convert_location,
        'image_type': options.type
    }

    c = DivaConverter(**opts)
    c.convert()

    sys.exit(0)
