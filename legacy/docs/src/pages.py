import os


class Directory:
    def __init__(self, full_path, pages):
        self.full_path = full_path
        self.dirname = os.path.basename(full_path)
        self.pages = pages

        self.title = self.dirname.replace('_', ' ').title()
        # If the index.md file has a title other than Index, use it
        for page in pages:
            if page.filename == 'index' and page.title != 'Index':
                self.title = page.title

    def __repr__(self):
        return "%s: %s. Pages:" % (self.full_path, self.title) + ", ".join(map(str, self.pages))


class Page:
    def __init__(self, full_path):
        self.full_path = full_path
        self.filename, _ = os.path.splitext(os.path.basename(full_path))

        # If an h1 is defined in the document, use that as the title
        file = open(full_path)
        first_line = file.readline()
        if first_line.startswith('# '):
            self.title = first_line[1:].strip()
        else:
            # Otherwise, fall back on the filename, unslugifed
            self.title = self.filename.replace('-', ' ').title()

    def __repr__(self):
        return "%s: %s" % (self.title, self.full_path)

