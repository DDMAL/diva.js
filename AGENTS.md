# Diva.js contributor instructions

## Project overview

Diva.js is an Elm application hosted by a TypeScript/browser bridge. Elm owns
manifest parsing, viewer state, ports, and UI updates. TypeScript owns the
custom elements, OpenSeadragon integration, browser authentication, image
filters, annotation overlays, and the public `Diva` API.

Important areas:

- `src/*.elm`: Elm application, model/update/view, and port definitions.
- `src/View/HtmlRenderer.elm`: the deliberately small `elm/parser` HTML parser.
- `src/diva.ts`: public API and Elm/OpenSeadragon port bridge.
- `src/viewer-element.ts`: OpenSeadragon viewer and custom elements.
- `src/auth.ts`: IIIF Auth 2 browser integration and tile-source resolution.
- `src/filters.ts`: Page View pixel filters.
- `src/public-api.ts`: exported TypeScript API types and TSDoc.
- `tests/`: Elm tests; `browser-tests/`: Playwright tests for OSD 5 and 6.

The repository may be developed alongside `../elm-iiif`. Treat changes in
that package as a separate dependency change unless the task explicitly asks
for synchronized edits or temporary vendoring.

## Build and generated files

Install JavaScript dependencies with `yarn install`. The project uses Elm
0.19.1, TypeScript, esbuild, SWC, and locally installed OpenSeadragon 5.0.1
and 6.0.2.

There is a Makefile in this project that handles most building, testing, and packaging tasks.

Build optimized distributable bundles, declarations, and report their sizes:

```sh
make build
```

Build the unminified/debug IIFE used by local testing:

```sh
make build-dev
```

`make build` clears and regenerates `cache/`; `elm-stuff/`, `cache/`, and
`public/` are ignored. The distributable files under `build/` are package
artifacts and should be regenerated when source changes require them.

## Tests and checks

Run the standard Elm and TypeDoc checks:

```sh
make test
```

Run strict TypeScript checks, including unused locals and parameters:

```sh
yarn -s tsc --noEmit --noUnusedLocals --noUnusedParameters --pretty false
yarn test:types
```

Validate generated API documentation without writing it:

```sh
make docs-check
```

Run the configured Elm review rules against the application source:

```sh
make review
```

The review configuration lives in `review/`; use `elm-review --fix` only after
reviewing the proposed changes, since it can rewrite Elm source files.

Run browser regressions against both supported OpenSeadragon versions:

```sh
make test-browser
```

The Playwright configuration starts a local HTTP server on port 4173. If a
browser launch fails with macOS sandbox/Chromium permission errors, rerun the
focused test in an approved environment and record that limitation separately
from product failures.

Use focused tests while iterating, for example:

```sh
yarn -s playwright test browser-tests/public-api.spec.ts --grep annotation --workers=1
elm-test-rs --seed <seed>
```

## Review guidance

- Start with `rg`/`rg --files` and inspect the actual call graph before removing
  code. TypeScript compilation currently does not imply that browser event
  paths are unused.
- Preserve the public API and both IIFE/ESM distribution formats unless the
  task explicitly authorizes a loading or deployment change.
- Measure bundle changes with `make build`; compare both minified and gzip
  sizes. Do not keep a refactor that increases the production bundle without
  a clear behavior or maintenance benefit.
- Keep Elm state changes in Elm and browser/DOM side effects in TypeScript;
  communicate through the existing ports rather than duplicating state.
- For annotation changes, test rectangle and SVG selectors, HTML/plain-text
  bodies, manifest and API-supplied annotations, visibility toggling, image
  extract URLs, and missing-service behavior (`null`).
- For image loading/auth changes, test anonymous, credentialed, static-image
  CORS fallback, cancellation, resource replacement, and teardown paths.
- Avoid broad formatter or generated-file churn. Run `git diff --check`, review
  the final diff, and preserve unrelated working-tree changes.

## Documentation

TSDoc in the exported TypeScript sources is the canonical API reference. Run
`yarn docs` to generate the local searchable docs under `build/docs/`.
User-facing examples live in the sibling `../diva.simssa.ca` repository. That
site's published API docs are generated from its pinned npm `diva.js` version;
update that dependency and regenerate the site docs when publishing a new API
release.
