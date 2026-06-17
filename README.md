# Diva.js

Diva.js is a web viewer for IIIF manifests and collections. It combines a document-style scrolling interface with OpenSeadragon-based zooming, collection browsing, table-of-contents navigation, and support for multiple images on a canvas.

## Links

- Website: https://diva.simssa.ca/
- Documentation: https://diva.simssa.ca/docs/
- Getting started: https://diva.simssa.ca/docs/getting-started/
- npm package: https://www.npmjs.com/package/diva.js
- GitHub repository: https://github.com/DDMAL/diva.js

## Getting Started

Include OpenSeadragon and Diva.js in your page:

```html
<script src="https://cdn.jsdelivr.net/npm/openseadragon@6.0.1/build/openseadragon/openseadragon.min.js"></script>
<script src="path/to/diva.js"></script>
```

Create a container and initialize the viewer with a IIIF manifest or collection URL:

```html
<div id="diva-wrapper"></div>

<script>
  const viewer = new Diva("diva-wrapper", {
    objectData: "https://example.org/iiif/manifest.json"
  });
</script>
```

Give the container a height so the viewer can render correctly:

```css
#diva-wrapper {
  display: flex;
  width: 100%;
  height: 80vh;
}
```

All CSS and image assets are bundled into the built library.

## Install From npm

```sh
npm install diva.js
```

The package publishes browser and ESM builds. For detailed integration guidance, configuration options, and examples, use the documentation site:

- https://diva.simssa.ca/docs/getting-started/

## Features

- IIIF Presentation API v2 and v3 support
- Manifest and collection viewing
- Range-based table of contents navigation
- Multiple image choices per canvas
- OpenSeadragon-powered zooming and panning

## Development

Build the production bundles:

```sh
make build
```

Serve the repo locally for testing:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/testing/index.html` or `http://localhost:8000/testing/testing.html`.
