This is useful because there may be more than one page load timeout (set
using `setTimeout`) at any given time, and all these timeout IDs need to be
stored so that they can be cleared if it becomes necessary to stop loading a
page (for instance, if the zoom level changes).
