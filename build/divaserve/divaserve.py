# Diva.js divaserve module

# Copyright (C) 2011, 2012 by Wendy Liu, Andrew Hankinson, Laurent Pugin

# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

import os
import math
import json
import warnings
import re

try:
    # you can set a site-wide configuration file named 'conf'
    # where you can store settings for both your web application server
    # and this module.
    import conf
except ImportError:
    # if you do not have a site-wide configuration file named
    # 'conf.py', you can adjust your settings here.
    class conf(object):
        MEMCACHED_ENABLED = True
        MEMCACHED_SERVER = '127.0.0.1:11211'
        IMG_DIR = '/mnt/images'
        TMP_DIR = '/tmp/diva.js'

memcached_enabled = conf.MEMCACHED_ENABLED
if memcached_enabled:
    try:
        import pylibmc
    except ImportError:
        warnings.warn("No Memcached module detected. Disabling Memcached support")
        memcached_enabled = False


class DivaServe(object):
    """
        This Python module provides the metadata necessary for the JavaScript
        front-end to function. It computes all of the tiled data dimensions
        on the server, which is then sent back to the client as a JSON response.

        To ensure we don't have to continually process these large images for
        every request, we cache the results in a cache directory. If the pylibmc
        Python module is installed and Memcached support is enabled, it will cache
        the image data in there as well.

        To use this module, instantiate this class. This will set up your Memcached
        connection and ensure your temporary directory exists.

        >>> img_server = divaserve.DivaServe()

        To have it serve data, call getc() with the name of the image directory. This
        must be a directory that is present in the location where you have configured your
        IMG_DIR.

        >>> json_response = img_server.getc(document_dir)
    """
    def __init__(self):
        if memcached_enabled:
            self.mc_conn = pylibmc.Client([conf.MEMCACHED_SERVER], binary=True)
            self.mc_conn.behaviors = {"tcp_nodelay": True, "ketama": True}

        self.srvdir = conf.IMG_DIR
        self.tmpdir = conf.TMP_DIR
        if not os.path.exists(self.tmpdir):
            os.mkdir(self.tmpdir)

    def getc(self, mdir):
        return self._get_or_cache(str(mdir))

    def _get_or_cache(self, mdir):
        if self._try_memcache(mdir):
            return self.mc_conn[mdir]
        elif self._try_filecache(mdir):
            f = open(os.path.join(self.tmpdir, "{0}.json".format(mdir)), 'r')
            j = json.load(f)
            f.close()
            if memcached_enabled:
                self.mc_conn.set(mdir, j)
                return self.mc_conn[mdir]
            else:
                return j
        else:
            self._cache(mdir)
            return self._get_or_cache(mdir)

    def _try_memcache(self, mdir):
        if not memcached_enabled:
            return False
        if mdir in self.mc_conn:
            return True
        else:
            return False

    def _try_filecache(self, mdir):
        if os.path.exists(os.path.join(self.tmpdir, "{0}.json".format(mdir))):
            return True
        else:
            return False

    def _cache(self, mdir):
        key = mdir
        img_dir = os.path.join(self.srvdir, mdir)

        files = os.listdir(img_dir)
        files.sort(key=alphanum_key)  # sort alphabetical, not asciibetical
        lowest_max_zoom = 0
        zoomlevels = []
        images = []

        for i, f in enumerate(files):
            ignore, ext = os.path.splitext(f)
            if f.startswith("."):
                continue    # ignore hidden files

            if ext in ('.jp2'):
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
                c = int(math.ceil(w / 256.))
                r = int(math.ceil(h / 256.))
                page_data.append({
                    'c': c,
                    'r': r,
                    'h': h,
                    'w': w
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
            'item_title': mdir,
            'dims': dims,
            'max_zoom': lowest_max_zoom,
            'pgs': pgs
        }

        # cache it to disk so we don't have to re-do it if memcached gets restarted
        if not os.path.exists(os.path.join(self.tmpdir, "{0}.json".format(mdir))):
            f = open(os.path.join(self.tmpdir, "{0}.json".format(mdir)), 'w')
            json.dump(data, f)
            f.close()

        if memcached_enabled:
            self.mc_conn.set(key, data)

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
        return (width, height)

    def __img_size_tiff(self, fn):
        # We can use the VIPS module here for TIFF, since it can handle all the
        # ins and outs of the TIFF image format quite nicely.
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


def tryint(s):
    try:
        return int(s)
    except:
        return s


def alphanum_key(s):
    """ Turn a string into a list of string and number chunks.
        "z23a" -> ["z", 23, "a"]
    """
    return [tryint(c) for c in re.split('([0-9]+)', s)]
