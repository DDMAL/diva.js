The number of milliseconds to wait before loading a page after first
determining that the page should be loaded. This timeout is useful in
preventing unnecessary page loads, such as when a user is scrolling quickly
through a document and doesn't wish to load all the intermediate pages that are
being scrolled past.

A longer timeout results in fewer pages unnecessarily loaded, but can result in
scrolling that feels less smooth and pages taking longer to load (from a user's
point of view). A shorter timeout results in pages loading more immediately,
but scrolling through the document can lead to many more images being
downloaded than is necessary, and since the downloads are queued up, subsequent
page loads can be significantly slower. The default value has been tested on
faster connections and seems to be a good middle ground, but it may not be
optimal for slower connections, or for particular documents; in that case, you
may wish to play around with the value until you can find one that seems
optimal.
