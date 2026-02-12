# Diva.js

Version 7.0

## Build

```sh
make build
```

## Run

```sh
cd public
python3 -m http.server 8000
```

Open http://localhost:8000 in a browser.

## Notes
- Build output is a single `public/diva.min.js` bundle (Elm + TS) plus the OpenSeadragon CDN script.
- Initialize the viewer in `public/index.html` with `new Diva("diva-wrapper", { objectData, acceptHeaders })`.
- `src/viewer-element.ts` defines the `osd-viewer` custom element used by the Elm view.
- `src/diva.ts` owns the Elm ports and the filter preview OpenSeadragon instance.
- `make clean` removes generated artifacts in `build/` and `public/`.
