Used for determining the width of the `.diva-inner` element. At lower zoom
levels, the widest page is usually less wide than the document viewer itself,
in which case the width of the `.diva-inner` element will just be set to the
width of the document viewer. Otherwise, the width of the widest page (plus the
horizontal padding on either side, if any) will be the width of the inner
element.
