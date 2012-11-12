"""
Table of Contents Extension for Python-Markdown
* * *

(c) 2008 [Jack Miller](http://codezen.org)

Dependencies:
* [Markdown 2.1+](http://www.freewisdom.org/projects/python-markdown/)

"""
import markdown
from markdown.util import etree
from markdown.extensions.headerid import slugify, unique, itertext

import re


class TocTreeprocessor(markdown.treeprocessors.Treeprocessor):
    # Iterator wrapper to get parent and child all at once
    def iterparent(self, root):
        for parent in root.getiterator():
            for child in parent:
                yield parent, child

    def run(self, doc):
        marker_found = False

        div = etree.Element("div")
        div.attrib["class"] = "toc"
        last_li = None

        # Add title to the div
        if self.config["title"]:
            header = etree.SubElement(div, "span")
            header.attrib["class"] = "toctitle"
            header.text = self.config["title"]

        level = 0
        list_stack=[div]
        header_rgx = re.compile("[Hh][123456]")

        # Get a list of id attributes
        used_ids = []
        for c in doc.getiterator():
            if "id" in c.attrib:
                used_ids.append(c.attrib["id"])

        last_numbers = [0] * 5
        last_tag_level = 1
        last_level = -1

        for (p, c) in self.iterparent(doc):
            text = ''.join(itertext(c)).strip()
            if not text:
                continue

            # To keep the output from screwing up the
            # validation by putting a <div> inside of a <p>
            # we actually replace the <p> in its entirety.
            # We do not allow the marker inside a header as that
            # would causes an endless loop of placing a new TOC
            # inside a previously generated TOC.

            if c.text and c.text.strip() == self.config["marker"] and \
               not header_rgx.match(c.tag) and c.tag not in ['pre', 'code']:
                for i in range(len(p)):
                    if p[i] == c:
                        p[i] = div
                        break
                marker_found = True

            if header_rgx.match(c.tag):
                try:
                    tag_level = int(c.tag[-1])
                    level_diff = last_tag_level - tag_level

                    if tag_level > last_tag_level:
                        this_level = last_level + 1
                        # Mimic the behaviour of the table of contents
                        if level_diff < 1:
                            tag_level = last_tag_level + 1
                    elif tag_level < last_tag_level:
                        # If the tag difference is MORE than one, go up that many
                        if level_diff > 1:
                            this_level = last_level - level_diff
                        else:
                            this_level = last_level - 1
                        for i in xrange(this_level + 1, len(last_numbers)):
                            last_numbers[i] = 0
                    else:
                        this_level = last_level

                    last_numbers[this_level] += 1
                    section_number = '.'.join(map(unicode, last_numbers[:this_level+1]))
                    placeholder = self.markdown.htmlStash.store(u'<span>%s</span>' % section_number, safe=True)
                    last_tag_level = tag_level
                    last_level = this_level

                    while tag_level < level:
                        list_stack.pop()
                        level -= 1

                    if tag_level > level:
                        newlist = etree.Element("ul")
                        if last_li:
                            last_li.append(newlist)
                        else:
                            list_stack[-1].append(newlist)
                        list_stack.append(newlist)
                        if level == 0:
                            level = tag_level
                        else:
                            level += 1

                    id = unique(self.config["slugify"](text, '-'), used_ids)

                    # List item link, to be inserted into the toc div
                    last_li = etree.Element("li")
                    link = etree.SubElement(last_li, "a")
                    link.text = c.text
                    link.attrib["href"] = '#' + id
                    pilcrow_html = u'<a class="headerlink" name="%(id)s" href="#%(id)s">&para;</a>' % {'id': id}
                    header_link = self.markdown.htmlStash.store(pilcrow_html, safe=True)

                    c.text = c.text + header_link
                    c.attrib['class'] = 'header'

                    if self.config["anchorlink"] in [1, '1', True, 'True', 'true']:
                        anchor = etree.Element("a")
                        anchor.text = c.text
                        anchor.attrib["href"] = "#" + id
                        anchor.attrib["class"] = "toclink"
                        c.text = ""
                        for elem in c.getchildren():
                            anchor.append(elem)
                            c.remove(elem)
                        c.append(anchor)

                    list_stack[-1].append(last_li)
                except IndexError:
                    # We have bad ordering of headers. Just move on.
                    pass
        if not marker_found:
            # serialize and attach to markdown instance.
            prettify = self.markdown.treeprocessors.get('prettify')
            if prettify: prettify.run(div)
            toc = self.markdown.serializer(div)
            for pp in self.markdown.postprocessors.values():
                toc = pp.run(toc)
            self.markdown.toc = toc

class TocExtension(markdown.Extension):
    def __init__(self, configs):
        self.config = { "marker" : ["[TOC]",
                            "Text to find and replace with Table of Contents -"
                            "Defaults to \"[TOC]\""],
                        "slugify" : [slugify,
                            "Function to generate anchors based on header text-"
                            "Defaults to the headerid ext's slugify function."],
                        "title" : [None,
                            "Title to insert into TOC <div> - "
                            "Defaults to None"],
                        "anchorlink" : [0,
                            "1 if header should be a self link"
                            "Defaults to 0"]}

        for key, value in configs:
            self.setConfig(key, value)

    def extendMarkdown(self, md, md_globals):
        tocext = TocTreeprocessor(md)
        tocext.config = self.getConfigs()
        # Headerid ext is set to '>inline'. With this set to '<prettify',
        # it should always come after headerid ext (and honor ids assigned
        # by the header id extension) if both are used. Same goes for
        # attr_list extension. This must come last because we don't want
        # to redefine ids after toc is created. But we do want toc prettified.
        md.treeprocessors.add("toc", tocext, "<prettify")

def makeExtension(configs={}):
    return TocExtension(configs=configs)
