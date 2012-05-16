import os
import sys
import math
import tempfile
try:
    from vipsCC import VImage
    def image_size(fn):
        img = VImage.VImage(fn)
        size = (img.Xsize(), img.Ysize())
        del img
        return size
except ImportError:
    try:
        from PIL import Image
    except ImportError:
        import Image
    def image_size(fn):
        print fn
        img = Image.open(fn)
        size = img.size
        del img
        return size

try:
    import pylibmc
    memcached_enabled = True
except ImportError:
    memcached_enabled = False

class DivaException(BaseException):
    def __init__(self, message):
        self.message = message
    def __str__(self):
        return repr(self.message)

class DivaServe(object):
    def __init__(self, directory, tilesize=256, mode="memory", verbose=False, cachedir=None):

        if mode not in ("disk", "memory", "memcached"):
            raise DivaException("You must specify either 'memory', 'disk' or 'memcached' for the caching mode")

        if directory.endswith("/"):
            directory = directory.rstrip("/")

        if mode == "disk":
            if cachedir is None:
                cachedir = os.path.join(tempfile.gettempdir(), "diva")

            if not os.path.exists(cachedir):
                os.mkdir(cachedir)

        self.basename = os.path.basename(directory)
        self.cachedir = cachedir
        self.imgdir = directory
        self.tilesize = tilesize
        self.images = []
        self.zoomlevels = []

        if verbose:
            print >> sys.stderr, "Loading Images..."

        files = os.listdir(self.imgdir)
        files.sort()

        for i,f in enumerate(files):
            if verbose:
                print >> sys.stderr, "Loading {0}".format(f)

            if os.path.splitext(f)[1] not in (".tif", ".tiff", ".jpg", ".jpeg", ".jp2"):
                continue

            img_wid, img_hei = image_size(os.path.join(self.imgdir, f))
            max_zoom = self._get_max_zoom_level(img_wid, img_hei, tilesize)

            im = {
                'mx_w': img_wid,
                'mx_h': img_hei,
                'mx_z': max_zoom,
                'fn': f
            }

            self.images.append(im)

            self.zoomlevels.append(max_zoom)

        self.lowest_max_zoom = min(self.zoomlevels)
        self.num_pages = i + 1

        self.cache = {}

        # From 0 to lowest max zoom, inclusive
        for zoom in range(self.lowest_max_zoom + 1):
            pgs = []
            dim = {}
            pgh = []
            pgw = []
            rat = []
            for img in self.images:
                h = self._incorporate_zoom(img['mx_h'], self.lowest_max_zoom - zoom)
                w = self._incorporate_zoom(img['mx_w'], self.lowest_max_zoom - zoom)
                pg = {
                    'h': h,
                    'w': w,
                    'c': int(math.ceil(w / float(self.tilesize))),
                    'r': int(math.ceil(h / float(self.tilesize))),
                    'm_z': img['mx_z'],
                    'fn': img['fn']
                }

                pgs.append(pg)
                pgh.append(pg['h'])
                pgw.append(pg['w'])
                rat.append(float(pg['h']) / float(pg['w']))

            t_wid = sum(pgw)
            t_hei = sum(pgh)
            dim = {
                't_wid': t_wid,
                't_hei': t_hei,
                'max_w': max(pgw),
                'max_h': max(pgh),
                'a_wid': float(t_wid) / len(pgw),
                'a_hei': float(t_hei) / len(pgh),
                'max_ratio': max(rat),
                'min_ratio': min(rat),
            }

            self.cache[zoom] = {
                'dims': dim,
                'pgs': pgs,
                'item_title': "",
                'max_zoom': self.lowest_max_zoom
            }

            # other caching mechanisms will use different keys
            if mode == 'memory':
                pass
            elif mode == 'disk':
                cachekey = "docdata_{0}.txt".format(zoom)
            elif mode == 'memcached':
                cachekey = "{0}-{1}".format(self.imgdir, zoom)

        if verbose:
            print >> sys.stderr, "images loaded"

        dims = {
            'a_wid': [],
            'a_hei': [],
            'max_w': [],
            'max_h': [],
            'max_ratio': self.cache[0]['dims']['max_ratio'],
            'min_ratio': self.cache[0]['dims']['min_ratio'],
            't_hei': [],
            't_wid': [],
        }
        pgs = []

        for z in range(self.lowest_max_zoom + 1):
            heights = [page['h'] for page in self.cache[z]['pgs']]
            widths = [page['w'] for page in self.cache[z]['pgs']]
            t_hei = sum(heights)
            t_wid = sum(widths)
            dims['a_wid'].append(t_wid / self.num_pages)
            dims['a_hei'].append(t_hei / self.num_pages)
            dims['t_wid'].append(t_wid)
            dims['t_hei'].append(t_hei)
            dims['max_w'].append(max(widths))
            dims['max_h'].append(max(heights))

        for i in range(self.num_pages):
            dim_data = []
            for z in range(self.lowest_max_zoom + 1):
                zoom_data = {
                    'c': self.cache[z]['pgs'][i]['c'],
                    'r': self.cache[z]['pgs'][i]['r'],
                    'h': self.cache[z]['pgs'][i]['h'],
                    'w': self.cache[z]['pgs'][i]['w'],
                }
                dim_data.append(zoom_data)
            page_data = {
                'm': self.cache[0]['pgs'][i]['m_z'],
                'f': self.cache[0]['pgs'][i]['fn'],
                'd': dim_data
            }
            pgs.append(page_data)

        self.cache = {
            "item_title": self._get_item_title(),
            "dims": dims,
            "max_zoom": self.lowest_max_zoom,
            "pgs": pgs,
        }

    def get(self):
        return self.cache


    def _get_max_zoom_level(self, wid, hei, tilesize):
        largest_dim = max(wid, hei)
        zoom_levels = math.ceil(math.log((largest_dim + 1) / float(tilesize + 1), 2))
        return int(zoom_levels)

    def _incorporate_zoom(self, img_dim, zoom_diff):
        return img_dim / float(2**zoom_diff)

    def _get_item_title(self):
        """
        Take the name of the directory, replace hyphens and underscores with
        spaces, and title-case it.
        """
        title = self.imgdir
        return title[title.rfind("/")+1:].replace('-', ' ').replace('_', ' ').title()
