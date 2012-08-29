import tornado.web
import tornado.ioloop
import tornado.httpserver
import divaserve
import json

"""
This is a sample server.py file for incorporating the divaserve module
into the Tornado web server. By default, this is configured to
handle a request for:

  http://example.com/divaserve?d=my_document_images

and assumes that "/divaserve" is set as your divaserveURL in your diva.js
instantiation.

"""

img_server = divaserve.DivaServe()


class DivaHandler(tornado.web.RequestHandler):
    def get(self):
        """
        Grab the document directory. This is passed as a ?d argument, e.g.,
           'http://www.example.com/divaserve?d=my_document_images'
        This assumes that the folder:
           /path/to/image/collections/my_document_images
        exists, and that:
           /path/to/image/collections
         is set as your conf.IMG_DIR variable in the divaserve module.
        """
        docdir = self.get_argument('d')
        self.set_header("Content-Type", "application/json")
        js = img_server.getc(docdir)
        self.write(json.dumps(js))

application = tornado.web.Application([
    ("/divaserve", DivaHandler),
])

if __name__ == "__main__":
    server = tornado.httpserver.HTTPServer(application)
    server.listen(8081)
    tornado.ioloop.IOLoop.instance().start()
