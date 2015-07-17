#!/usr/bin/env python

# Copyright (C) 2013 by Andrew Hankinson
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
import os
import re
import math
import sys
import json
from optparse import OptionParser


class GenerateJson(object):
    def __init__(self, input_directory, output_directory):
        self.input_directory = input_directory
        self.output_directory = output_directory
        self.title = os.path.basename(self.input_directory)

    def generate(self):
        self.__generate()
        return True

    def __generate(self):
        img_dir = self.input_directory

        files = os.listdir(img_dir)
        files.sort(key=self.__alphanum_key)  # sort alphabetical, not asciibetical
        lowest_max_zoom = 0
        zoomlevels = []
        images = []

        for i, f in enumerate(files):
            ignore, ext = os.path.splitext(f)
            if f.startswith("."):
                continue    # ignore hidden files

            if ext in ('.jp2', '.jpx'):
                width, height = self.__img_size_jp2(os.path.join(img_dir, f))
            elif ext in ('.tiff', '.tif'):
                width, height = self.__img_size_tiff(os.path.join(img_dir, f))
            else:
                continue    # ignore anything else.

            max_zoom = self.__get_max_zoom_level(width, height)
            im = {
                'mx_w': width,
                'mx_h': height,
                'mx_z': max_zoom,
                'fn': f
            }
            images.append(im)
            zoomlevels.append(max_zoom)

        lowest_max_zoom = min(zoomlevels)
        max_ratio = min_ratio = 0
        t_wid = [0] * (lowest_max_zoom + 1)
        t_hei = [0] * (lowest_max_zoom + 1)
        mx_h = [0] * (lowest_max_zoom + 1)
        mx_w = [0] * (lowest_max_zoom + 1)
        a_wid = []
        a_hei = []

        pgs = []
        max_ratio = 0
        min_ratio = 100  # initialize high so min() works

        for im in images:
            page_data = []

            for j in xrange(lowest_max_zoom + 1):
                h = self.__incorporate_zoom(im['mx_h'], lowest_max_zoom - j)
                w = self.__incorporate_zoom(im['mx_w'], lowest_max_zoom - j)
                page_data.append({
                    'h': math.floor(h),
                    'w': math.floor(w)
                })

                t_wid[j] = t_wid[j] + w
                t_hei[j] = t_hei[j] + h
                mx_h[j] = max(h, mx_h[j])
                mx_w[j] = max(w, mx_w[j])
                ratio = float(h) / float(w)
                max_ratio = max(ratio, max_ratio)
                min_ratio = min(ratio, min_ratio)

            m_z = im['mx_z']
            fn = im['fn']

            pgs.append({
                'd': page_data,
                'm': m_z,
                'f': fn
            })

        for j in xrange(lowest_max_zoom + 1):
            a_wid.append(t_wid[j] / float(len(images)))
            a_hei.append(t_hei[j] / float(len(images)))

        dims = {
            'a_wid': a_wid,
            'a_hei': a_hei,
            'max_w': mx_w,
            'max_h': mx_h,
            'max_ratio': max_ratio,
            'min_ratio': min_ratio,
            't_hei': t_hei,
            't_wid': t_wid
        }

        data = {
            'item_title': self.title,
            'dims': dims,
            'max_zoom': lowest_max_zoom,
            'pgs': pgs
        }

        # write the JSON out to a file in the output directory
        f = open(os.path.join(self.output_directory, "{0}.json".format(self.title)), 'w')
        json.dump(data, f)
        f.close()

    def __img_size_jp2(self, fn):
        # we implement our own header reader since all the existing
        # JPEG2000 libraries seem to read the entire image in, and they're
        # just tooooo sloooowww.
        f = open(fn, 'rb')
        d = f.read(100)
        startHeader = d.find('ihdr')
        hs = startHeader + 4
        ws = startHeader + 8
        height = ord(d[hs]) * 256 ** 3 + ord(d[hs + 1]) * 256 ** 2 + ord(d[hs + 2]) * 256 + ord(d[hs + 3])
        width = ord(d[ws]) * 256 ** 3 + ord(d[ws + 1]) * 256 ** 2 + ord(d[ws + 2]) * 256 + ord(d[ws + 3])
        f.close()
        return (width, height)

    def __img_size_tiff(self, fn):
        # We can use the VIPS module here for TIFF, since it can handle all the
        # ins and outs of the TIFF image format quite nicely.

        # if we're not dealing with TIFF, we don't need to import a non-core library.
        # Since jpeg2000 works by reading the header directly, we've made the choice to
        # import this with every call. It's not ideal, but it shouldn't be too bad.
        # If you are dealing with TIFF files and want to make a slight optimization you
        # can move this import statement to the top of this script.
        from vipsCC import VImage
        im = VImage.VImage(fn)
        size = (im.Xsize(), im.Ysize())
        del im
        return size

    def __get_max_zoom_level(self, width, height):
        largest_dim = max(width, height)
        zoom_levels = math.ceil(math.log((largest_dim + 1) / float(256 + 1), 2))
        return int(zoom_levels)

    def __incorporate_zoom(self, img_dim, zoom_diff):
        return img_dim / float(2 ** zoom_diff)

    def __tryint(self, s):
        try:
            return int(s)
        except:
            return s

    def __alphanum_key(self, s):
        """ Turn a string into a list of string and number chunks.
            "z23a" -> ["z", 23, "a"]
        """
        return [self.__tryint(c) for c in re.split('([0-9]+)', s)]


if __name__ == "__main__":
    usage = "%prog [options] input_directory output_directory"
    parser = OptionParser(usage)
    options, args = parser.parse_args()

    if len(args) < 1:
        parser.print_help()
        parser.error("You must specify a directory to process.")

    opts = {
        'input_directory': args[0],
        'output_directory': args[1]
    }

    gen = GenerateJson(**opts)
    sys.exit(gen.generate())
