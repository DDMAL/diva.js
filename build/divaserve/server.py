import tornado.web
import tornado.ioloop
import tornado.httpserver
import divaserve
try:
    import cjson as json
except ImportError:
    import json
    json.encode = json.dumps

"""
This is a sample server.py file for incorporating the divaserve module
into the Tornado web server.
"""

diva = divaserve.DivaServe("/mnt/images/beromunster")

class DivaHandler(tornado.web.RequestHandler):
    def get(self):
        info = diva.get()
        self.set_header("Content-Type", "application/json")
        self.write(json.encode(info))

application = tornado.web.Application([
    ("/", DivaHandler),
])

if __name__ == "__main__":
    server = tornado.httpserver.HTTPServer(application)
    server.listen(8081)
    tornado.ioloop.IOLoop.instance().start()
