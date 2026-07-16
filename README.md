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

## Public API

Wait for the initial IIIF resource before reading page state or issuing viewer commands:

```js
const viewer = new Diva("diva-wrapper", { objectData: manifestUrl });
await viewer.ready;

const pages = viewer.getPages();
const current = viewer.getCurrentPage();
console.log(current?.canvasId, current?.primaryImage.id);
```

Navigation follows the current layout, so `next()` and `previous()` advance by an opening in a spread layout:

```js
await viewer.setLayoutMode("spread");
await viewer.next();

viewer.addEventListener("pagechange", (event) => {
  console.log(event.detail.pageIndex, event.detail.visiblePages);
});
```

### URL deep links

Diva leaves browser URL and history ownership to the host application: it does not read or write
`window.location` or listen for `hashchange`. One useful convention is a `p` hash parameter with
`canvas:`, `label:`, or one-based `page:` values. Always construct such hashes with
`URLSearchParams` so identifiers and labels are encoded safely.

```js
function pageTargetFromHash(hash) {
  const value = new URLSearchParams(hash.slice(1)).get("p");
  if (value?.startsWith("canvas:")) {
    return { by: "canvasId", value: value.slice("canvas:".length) };
  }
  if (value?.startsWith("label:")) {
    return { by: "label", value: value.slice("label:".length) };
  }
  if (value?.startsWith("page:")) {
    const pageNumber = Number(value.slice("page:".length));
    return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber - 1 : undefined;
  }
  return undefined;
}

const initialPage = pageTargetFromHash(location.hash);
const viewer = new Diva("diva-wrapper", { objectData: manifestUrl, initialPage });

// Example when creating a link:
const hash = new URLSearchParams({ p: `canvas:${canvasId}` });
history.replaceState(null, "", `#${hash}`);
```

Numeric Diva API indexes are zero-based; only the documented `page:` URL convention is one-based.
Invalid or unmatched initial targets fall back to index 0. Applications can also control later
navigation explicitly. Canvas IDs match exactly; labels match the complete localized display label
case-insensitively, with the first manifest page winning when labels are duplicated.

```js
const page = viewer.findPage({ by: "label", value: "Folio 12r" });
if (page) {
  await viewer.goToPage({ by: "canvasId", value: page.canvasId });
}
```

Image regions use full-resolution image pixels with their origin at the upper-left corner. Diva handles navigation, authorization, and waiting for the OpenSeadragon item:

```js
await viewer.zoomToRegion(12, {
  x: 840,
  y: 1250,
  width: 460,
  height: 180
}, { padding: 0.08 });
```

Replace the current manifest or collection without replacing the `Diva` instance or its event listeners, and destroy the viewer when it is no longer needed:

```js
await viewer.setResource(nextManifestUrl);
viewer.destroy();
```

The ESM build exports `Diva` as both its default and named export, along with the public TypeScript types. OpenSeadragon objects, Elm ports, authentication state, and tile-loading internals are not public API.

### API reference documentation

The TSDoc comments on the exported TypeScript class and types are the canonical public API documentation. Generate the searchable TypeDoc site with:

```sh
yarn docs
```

Open `build/docs/index.html` to browse the generated reference. The generated site is a build artifact and is not committed.

Documentation completeness is enforced with:

```sh
yarn docs:check
```

This command fails when an exported class, constructor, interface, type, property, method, nested event field, or API link is undocumented or invalid.

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
