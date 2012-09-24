Some organizations may wish to present their documents online for viewing to
the wider internet, but prevent users from downloading high-quality versions of
these images. This page explains some of the tradeoffs and techniques for
enhancing document security, and is provided so that our users can understand
their options for viewing their image collections online.

In short, it is not possible to completely "protect" your images while
maintaining full functionality in Diva. Many functions in Diva depend on having
access to the full image. Since Diva is simply Javascript and HTML operating in
browser, it is always possible to reconstruct how it accesses the images, and
replicate that.

It is possible, however, to put in place measures to discourage this. This page
presents information on how Diva serves its images, and some things that may be
done to prevent access.

[TOC]

How Diva serves images
----------------------

High-resolution images in Diva are served by requesting smaller image regions
("tiles") of the larger page, and serving only the regions of the image that
the user is currently viewing. This means that all other pages, or even regions
of a large image, are not downloaded until the user scrolls to that part of the
document.

The tiled image serving is accomplished using the IIP Image Server, which takes
a URL from the client and serves out an image corresponding to that request.
Consider the following URL:

```text
http://example.com/fcgi-bin/iipsrv.fcgi?FIF=/images/book/001.tif&JTL=3,3
```

This URL gives the path to the IIP Image Server software
(`/fcgi-bin/iipsrv.fcg`), with the path to the pre-tiled image
(`FIF=/images/book/001.tif`) and the tile region of the image to serve
(`JTL=3,3`). This region corresponds to the fourth zoom level, fourth tile
(zoom levels and images are numbered beginning at zero).

This means that the images that Diva serves as tiled images (in scroll and zoom
mode) are "chopped up" versions of the full image, which makes it difficult
(but not impossible) to download the full image. A person wanting access to the
full image would have to re-assemble it from all the tiles.

However, IIP also allows serving non-tiled versions of the same images.
Consider this URL:

```text
http://example.com/fcgi-bin/iipsrv.fcgi?FIF=/images/book/001.tif&HEI=291&CVT=JPG
```

Note the `HEI=291&CVT=JPG` arguments. This instructs IIP to serve out the full
image, resize it to 291 pixels high, and serve it as a JPEG image. This will
load the full, untiled image in the user's browser, giving them access to the
full page image. In Diva, this is used extensively in the grid view, canvas
view, and download plugins.

For site administrators wanting users to view their images, but not download
them, this opens up a means of accessing the full quality image. While users
will need to do this one at a time for the full document, it is possible to
write a "scraper" that will automatically harvest all the images from a
document.

Preventing access
-----------------

### Disabling 

Disabling the grid view, canvas view, and download options are not a means of
preventing image downloads. This may "hide" the link to the full image a little
better, but users can still access them. That said, if you do wish to disable
these features (possibly in addition to the other methods listed below), you
can do so in the following ways:

* Disabling grid view: set
  [`enableGrid`](../code/javascript/settings#enableGrid) to false to disable
  the grid icon. Note that this doesn't completely prevent users from accessing
  grid view; it only hides the icon for it.
* Disabling the canvas plugin: set
  [`enableCanvas`](../code/javascript/settings#enableCanvas) to false.
* Disabling the download plugin: set
  [`enableDownload`](../code/javascript/settings#enableDownload) to false.

### Check incoming referrer

Perhaps the easiest method of discouraging downloads is to proxy your image
server and place a special rule to prevent direct access to the files. For
example, in our test server we have the following setup for our Nginx web
server:

```nginx
location /fcgi-bin/ {
  if ($http_referer !~ ^(http://mydomain.com) ) {
    return 405;
  }
  proxy_pass http://localhost:9000/fcgi-bin/;
}
```

The `if` block checks the incoming referral header of the request against the
domain that is set. If the user is using the Diva viewer on a web page hosted
at `mydomain.com`, it will pass through to the image server, proxied at
`http://localhost:9000`. If, however, the user attempts to view the image by
directly accessing the IIP image server (as in the examples in the previous
section), the "Referer" header will not be set to `mydomain.com` and the server
will return a 405 (Not Allowed) HTTP error.

While this is an effective deterrent for viewing the images in the browser,
this can also be "spoofed" by a script, adding in the referrer in the request
header and therefore bypassing the check.

### Proxy IIP URLs through a script

An even more effective means would be to proxy the incoming IIP URL through a
server-side script that contains a special key appended to the request. For
example, instead of setting the IIP Image Server URL in the Diva settings to go
directly to the IIP Image Server, e.g.:

```javascript
iipServerBaseUrl: "http://example.com/fcgi-bin/iipsrv.fcgi?FIF=/images/book/"
```

you could proxy it through a PHP or Python script running on the server:

```javascript
iipServerBaseUrl: "http://example.com/fcgi-bin/imageserve.php?FIF=/images/book/"
```

This `imageserve.php` could then pass all IIP arguments transparently through
to the image server, but append a "secret" key to the request. So the actual
request to the image server would be:

```text
"http://example.com/fcgi-bin/iipsrv.fcgi?FIF=/images/book/&HEI=291&CVT=JPG&SECRET=mysecretword"
```

Then, employing the same method used to check the incoming Referrer header
shown above, the webserver can be configured to only accept requests that
contain the SECRET query parameter.

```nginx
location /fcgi-bin/ {
   if ($args !~ "SECRET=mysecretword" ) {
      return 405;
   }
   proxy_pass http://localhost:9000/fcgi-bin/;
}
```

To bypass this the user would need to know the correct value for the SECRET
parameter; however, since the PHP or Python proxy script is executed on the
server, the SECRET parameter will not be exposed to the public and IIP will
ignore it. 

While this method is more effective, it means that every incoming request will
need to be processed by a script, thereby injecting the PHP or Python
interpreter in the "middle" and potentially slowing down response time. The
effect of this, however, should be minimal.
