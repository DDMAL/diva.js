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
<script src="https://cdn.jsdelivr.net/npm/openseadragon@6.0.2/build/openseadragon/openseadragon.min.js"></script>
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

Diva is tested against OpenSeadragon 5.0.1 and 6.0.2. The browser regression
suite runs the same authorization, loading, and lifecycle scenarios against
both versions using local npm packages.

## Image access and CORS

Diva supports the IIIF Authorization Flow API 2.0 `active` access profile, including optional logout services. Logging out clears the associated local access tokens and re-resolves affected images anonymously. Other Auth 2 profiles and flows—including `kiosk`, `external`, redirects, substitutes, and tiered access—are intentionally unsupported.

Static image resources must opt into cross-origin access with an appropriate CORS response header. Diva does not use a non-CORS fallback because doing so would break canvas-based image processing and could expose inconsistent behavior. Consequently, [GitHub issue #564](https://github.com/DDMAL/diva.js/issues/564) remains unresolved by policy.

## Development

Build the production bundles:

```sh
make build
```

Serve the repo locally for testing:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/testing/index.html` or
`http://localhost:8000/testing/testing.html`. Both pages use the locally
installed OpenSeadragon 6.0.2 by default; append `?osd=5` to use 5.0.1. The
simple viewer also accepts a URL-encoded `manifest` query parameter.

Run the local OpenSeadragon matrix with:

```sh
yarn test:browser
```
