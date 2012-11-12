{% include "normal_header.html" %}

# About Diva.js

Diva.js (Document Image Viewer with AJAX) is a Javascript frontend for viewing
documents, designed to work with digital libraries to present multi-page
documents as a single, continuous item. Only the pages that are being viewed at
any given time are actually present in the document, with the rest appended as
necessary, ensuring efficient memory usage and high loading speeds. Written as
a jQuery plugin, diva.js requires the jQuery Javascript library, along with
several jQuery plugins and the jQuery UI, all of which are included. On the
backend, the images will be served by IIPImage server after processing, and the
image information will be sent, in JSON format, through an AJAX request by a
PHP script (also included).

## Developers

Diva.js is developed by:

* [Wendy Liu](http://dellsystem.me)
* [Andrew Hankinson](http://transientstudent.net)

Project managers:

* Laurent Pugin
* [Ichiro Fujinaga](http://music.mcgill.ca/~ich)

## Feedback

If you find Diva.js useful and are using it in any deployments (large or
small), please [let us know](mailto:andrew.hankinson@mail.mcgill.ca). This work
is part of our research, and keeping in touch about pilot projects or
full-scale deployments helps us figure out what kinds of tools are valuable in
digital library communities.

## Sponsors

Diva.js didn't spring up fully formed overnight. It's been an ongoing project
at the [Distributed Digital Music Archives and Libraries Lab
(DDMAL)](http://ddmal.music.mcgill.ca), at the [Schulich School of
Music](http://www.mcgill.ca/music) of [McGill
University](http://www.mcgill.ca/). It began as a collaboration with the [Swiss
RISM](http://www.rism-ch.org/) as part of a project funded by the [Swiss
National Science Foundation](http://www.snf.ch/E). Currently it is being
developed as part of a [three-year
grant](http://ddmal.music.mcgill.ca/wiki/Optical_Music_Recognition_for_Plainchant)
from the [Social Sciences and Humanities Research Council of Canada
(SSHRC)](http://www.sshrc-crsh.gc.ca/). We're also grateful for support from
the [Canadian Foundation for Innovation](http://www.innovation.ca/en) and the
[Centre for Interdisciplinary Research in Music Media and Technology
(CIRMMT)](http://www.cirmmt.mcgill.ca/).

{% include "sponsor_logos.html" %}

{% include "normal_footer.html" %}
