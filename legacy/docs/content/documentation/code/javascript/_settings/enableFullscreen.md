{% load extras %}

Enable or disable the appearance of the fullscreen icon, which toggles
fullscreen mode. If set to false, the icon will not appear, but it will still
be possible to toggle fullscreen mode through the public functions
({% public_link "toggleMode" %}, {% public_link "enterFullscreen" %},
{% public_link "leaveFullscreen" %}) and the `f` {% link "hash parameter" %}.
