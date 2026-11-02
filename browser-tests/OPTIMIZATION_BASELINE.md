# Optimization baseline

This is Step 0 of `OPTIMIZATION_PLAN.md`. No production implementation changes
are part of this step.

## Repeatable run

Install dependencies as usual, then run:

```sh
make build
PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/optimization-baseline.json yarn -s playwright test browser-tests/optimization-baseline.spec.ts --workers=1 --reporter=list,json
```

The suite always loads the **optimized production IIFE**, regardless of whether a
debug bundle exists. The isolated filter test bundles the actual `src/filters.ts`
module using esbuild; its timings are for that test bundle, not the production
IIFE. Compare like-for-like configurations. Run each revision several times on
the same machine/browser, without other CPU-intensive checks running concurrently.

The JSON report includes base64-encoded JSON attachments on each test result:

- `navigation-baseline.json`: timed navigation and a subsequent animation frame,
  after one warmup, plus browser/OSD identification.
- `annotation-baseline.json`: three synchronous batch samples after warmup,
  layout API completion plus a frame, overlay update calls, and retained pages.
- `distributed-baseline.json`: three synchronous distributed batch samples after
  warmup, plus the resulting annotation count.
- `filter-generation-baseline.json`: generation changes after real Page View
  brightness, rotation, and mirror interactions.
- `filter-baseline.json`: canvas reads for each correctness chain and five warmed
  throughput samples of a four-filter chain on a 256 × 256 image.

Attachments are measurements, not timing thresholds. Counts of unnecessary work
are deliberately not asserted, so improving them will not fail the baseline.
Keep reports outside source control; `test-results/` is ignored and may be
replaced by subsequent Playwright runs. Copy a report elsewhere before another
run if it is needed for a comparison.

The suite wraps an overlay method and the canvas read method only within its own
page, restoring them in `finally` blocks. No production instrumentation is added.
Overlay counts include asynchronous page-loading effects and are diagnostic, not
an invariant or a measurement of a memory leak. Navigation measurements include
local route handling, page loading, and frame scheduling, not just Elm rendering.
Synchronous annotation timings include API normalization and DOM work performed
before return, but do not measure completion of all deferred painting.

## Fixture corpus and behavior checks

`helpers/optimization-fixtures.ts` creates deterministic local routes with no
remote manifest, image, or annotation requests:

| Fixture | Purpose |
| --- | --- |
| `small` | Four canvases; embedded annotations; a final static image without an Image API service |
| `large` | 1,000 canvases, thumbnail DOM, distant navigation, and distributed annotations |
| `nested` | 64 canvases, a 64-level range chain, and 16 sibling ranges |
| Concentrated annotations | 300 annotations on one canvas, alternating rectangle/plain-text and SVG/HTML |
| Distributed annotations | 1,000 annotations across 100 canvases |
| Pixel corpus | 8 × 4 pixels, channel boundary values and alpha 0/1/127/255 |

Regression assertions cover annotation ordering/replacement, atomic rejection of
an invalid batch, manifest/API merging, clear/re-add behavior, duplicate IDs
across canvases, missing-service `null`, page/range navigation, overlay presence,
and Page View rotation/mirror/reopen behavior.

`fixtures/optimization-filter-pixels.json` records exact pre-optimization Chromium
output, shared by both OSD projects. It covers tone filters, grayscale/threshold,
convolution/unsharp, and the PCA local fallback. Review any proposed golden
changes as behavior changes, not as routine snapshot updates. The tiny pixel
corpus is a correctness test, not a throughput benchmark. Global PCA convergence,
additional filters, and lifecycle edge cases need focused coverage when those
implementation steps begin.

Existing `public-api.spec.ts`, `auth.spec.ts`, and Elm tests remain complementary
coverage for annotation alignment/interactions, auth/CORS, HTML parsing, and model
behavior. This baseline does not replace the focused regression tests required by
each later optimization step.

## Initial baseline — 2026-10-28

Environment: macOS, headless Chromium 149.0.7827.55, one Playwright worker, OSD
5.0.1 and 6.0.2. Production bundles were generated with `make build` from unchanged
application sources. These are illustrative local measurements, not performance
targets; repeat the procedure before making comparisons.

| Production artifact | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| `build/diva.js` | 287,285 | 84,415 |
| `build/diva.esm.js` | 287,312 | 84,437 |

The first passing measurement run confirmed the same behavior in both projects:

- Rotation alone increments the pixel-filter generation once.
- Mirror alone increments the pixel-filter generation once.
- The four-stage tone chain performs four canvas pixel reads; the two-stage
  threshold chain performs two; the three-stage neighborhood chain performs three.
- Exact filter pixel outputs match across both OSD projects.

Representative samples from that run (other checks were running concurrently, so
these are smoke measurements only):

| Workload | OSD 5.0.1 | OSD 6.0.2 |
| --- | --- | --- |
| 1,000-page navigation, three samples | 6.0 / 7.7 / 8.7 ms | 7.8 / 9.4 / 7.3 ms |
| 300-annotation replacement, three samples | 4.5 / 7.5 / 4.8 ms | 4.6 / 5.4 / 5.2 ms |
| 256 × 256 tone chain, five samples | 2.3 / 2.0 / 2.1 / 2.3 / 2.4 ms | 2.1 / 2.0 / 2.1 / 2.0 / 2.1 ms |

No before/after speedup is claimed: implementation has not been optimized yet.

## Step 1 comparison — 2026-10-28

After implementing pixel-filter invalidation caching, the existing Page View
measurement reports the following on both OSD 5.0.1 and 6.0.2:

| Operation | Initial baseline | After Step 1 |
| --- | ---: | ---: |
| Rotation-only pixel-filter invalidations | 1 | 0 |
| Mirror-only pixel-filter invalidations | 1 | 0 |

The generation remains at 2 across brightness enablement followed by rotation
and mirror, instead of advancing from 2 to 3 to 4. These measurements were
captured with the production IIFE and one worker, using:

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/filter-invalidation-baseline.json yarn -s playwright test browser-tests/optimization-baseline.spec.ts --grep "rotation and mirror" --workers=1 --reporter=list,json
```

`filter-invalidation.spec.ts` additionally asserts processor identity and unchanged
pixel output across transforms, tests active/disabled inputs across all filter
families, and checks reset paths. A global PCA basis survives transforms but is
discarded when its active upstream inputs or image source change. Pixel fixtures
are unchanged. This comparison claims avoided work, not a measured wall-clock
speedup.

| Production artifact | Minified bytes before → after | Gzip bytes before → after |
| --- | ---: | ---: |
| `build/diva.js` | 287,285 → 287,121 | 84,415 → 84,385 |
| `build/diva.esm.js` | 287,312 → 287,148 | 84,437 → 84,408 |

Full browser validation after Step 1: 119 passed, one existing OSD-5-specific skip.

## Step 2 comparison — 2026-10-28

Primary-image selection, model thumbnail fallbacks, and thumbnail authorization
now share one selection rule. The change removes filtered-list construction and
the sidebar's dummy image record without changing the recorded behavior.

| Production artifact | Minified bytes before → after | Gzip bytes before → after |
| --- | ---: | ---: |
| `build/diva.js` | 287,121 → 286,941 | 84,385 → 84,334 |
| `build/diva.esm.js` | 287,148 → 286,968 | 84,408 → 84,356 |

This is a maintenance/duplication improvement with a smaller bundle, not a claimed
wall-clock speedup. Added model tests cover empty and ambiguous image lists;
`primary-image.spec.ts` verifies thumbnail fallback and protected-primary behavior
on both OSD versions. The complete suite passes: 121 browser cases, one existing
skip, and 46 Elm tests. Test-only synchronization fixes also harden the Step 1
filter regressions against pending Elm renders and asynchronous image reloads.

## Step 3 comparison — 2026-11-01

`setAnnotations` now uses per-canvas ID-keyed maps instead of filtering and copying
an expanding array at every insertion. Duplicate replacement deletes before
reinsertion to retain move-to-end ordering. Cross-canvas duplicates remain distinct.

Reproduce with the production IIFE, one worker:

```sh
yarn -s playwright test browser-tests/annotation-batch.spec.ts --workers=1
```

The benchmark warms up once, then captures five synchronous samples per workload.
Only `applyAnnotationsForCanvas` is temporarily replaced with a no-op (restored in
`finally`), isolating normalization, accumulation and storage from DOM/OSD rendering
and the canvas/page scans deferred to later steps. Inputs are unique rectangle
annotations. Retained counts are asserted; timings are measurements, not CI limits.
The separate behavior test and existing baseline exercise real overlay application.

Median milliseconds from focused runs before/after this change on the same local
Chromium environment (subject to timing/GC variation):

| Canvases | Annotations | OSD 5.0.1 before → after | OSD 6.0.2 before → after |
| ---: | ---: | ---: | ---: |
| 1 | 2,000 | 17.4 → 1.7 | 17.2 → 1.2 |
| 1 | 8,000 | 138.0 → 5.4 | 140.3 → 5.6 |
| 100 | 2,000 | 1.4 → 1.4 | 1.7 → 1.8 |
| 100 | 8,000 | 7.9 → 5.3 | 7.7 → 5.6 |

These demonstrate the concentrated-batch improvement, not an end-to-end viewer
speedup. Accumulation now performs constant expected-time map operations per input,
then one array conversion per canvas, apart from annotation normalization costs.

| Production artifact | Minified bytes before → after | Gzip bytes before → after |
| --- | ---: | ---: |
| `build/diva.js` | 286,941 → 286,959 | 84,334 → 84,336 |
| `build/diva.esm.js` | 286,968 → 286,986 | 84,356 → 84,359 |

The small bundle increase is accepted for the batch-scaling improvement. Complete
validation: 125 browser tests passed, one existing skip; 46 Elm tests and the
TypeDoc, TypeScript, public-type and Elm review checks passed.

## Step 4 comparison — 2026-11-01

Annotation ID indexes now restrict lookups and single-annotation replacement to
canvases containing that ID. Stable insertion ranks preserve the bridge's and
viewer's distinct duplicate-selection rules. Canvas-to-page-index collections
replace viewer tile-source scans and handle multiple entries for one canvas.
Same-canvas replacement applies the final annotations once, rather than applying
an intermediate removal followed by insertion. Moving an ID applies each affected
canvas once, in the original source-canvas order.

Reproduce the correctness, operation-count, and lookup measurements with:

```sh
yarn -s playwright test browser-tests/annotation-index.spec.ts --workers=1
```

The lookup benchmark stores 8,000 unique rectangle annotations across 100 canvases,
then performs 1,000 lookups alternating a final-canvas ID and a missing ID. It runs
the former full-scan algorithm and the new indexed algorithm in the same browser,
with one warmup and three timed samples each. Batch setup temporarily disables
overlay application; lookup timings exclude rendering and public snapshot copying.
There are no timing-based CI assertions. The original algorithm is also used as a
correctness oracle throughout single/batch replacement and clear operations.

| Lookup work for 1,000 queries | Former algorithm | Indexed algorithm |
| --- | ---: | ---: |
| Candidate work | 100,000 canvas collection visits | 500 matching ID candidates |
| OSD 5.0.1 median, final full run | 125.3 ms | 0.1 ms |
| OSD 6.0.2 median, final full run | 129.3 ms | 0.1 ms |

Sub-millisecond results are near browser timer resolution; the avoided collection
visits are the stronger evidence. No end-to-end speedup is claimed. Lookups still
consider all canvases sharing an ID; single updates still filter/reindex affected
canvas collections and sort duplicate source canvases by insertion rank. Index
maintenance adds linear storage and some batch setup cost, while Step 3's batch
accumulation remains linear. Overlay rebuilding is deferred to Step 5.

| Production artifact | Minified bytes before → after | Gzip bytes before → after |
| --- | ---: | ---: |
| `build/diva.js` | 286,959 → 289,612 | 84,336 → 84,954 |
| `build/diva.esm.js` | 286,986 → 289,639 | 84,359 → 84,974 |

The bundle increase is accepted for indexed lookups and coalesced applications.
Final validation: 133 browser tests passed, one existing skip; 46 Elm tests,
TypeDoc, strict TypeScript, public types, Elm review, formatting, and diff checks
passed. An initial command timeout left an unresponsive orphaned test server;
after restarting it, the two initially timed-out cases passed five repetitions
per OSD version and complete-suite reruns passed with a longer command limit.

## Step 5 comparison — 2026-11-01

Annotation content construction and overlay placement are now separate. Layout and
aspect changes update the OSD rectangle and SVG `viewBox` without replacing content
or detaching the overlay. Equivalent ordered annotation inputs also retain their
nodes and handlers; comparisons include bodies, selector geometry and image service
because event handlers depend on all three. Changed inputs rebuild only the
affected canvas. No additional content cache is needed.

The baseline instruments `replaceChildren` on the already-loaded first-canvas
annotation overlay, restoring the method after three layout changes. This directly
counts content replacement rather than equating every overlay-method call with a
rebuild. It works against both the Step 4 and Step 5 production bundles.

```sh
yarn -s playwright test browser-tests/optimization-baseline.spec.ts --grep "annotation batches" --workers=1
yarn -s playwright test browser-tests/public-api.spec.ts --grep "keeps annotations aligned" --workers=1
yarn -s playwright test browser-tests/annotation-overlay.spec.ts --workers=1
```

| Work on an existing 300-annotation canvas | OSD 5.0.1 before → after | OSD 6.0.2 before → after |
| --- | ---: | ---: |
| Content rebuilds during spread / shifted-spread / single | 5 → 0 | 5 → 0 |
| Equivalent-batch median, three focused samples | 5.3 → 0.4 ms | 4.8 → 0.5 ms |

The pre-change layout count includes aspect/layout work beyond the three explicit
layout commands. Newly loaded canvases may still build their initial content, so
the existing global `overlayUpdates` counter can vary independently. The retained
canvas's zero replacements and the identity assertions are the stable evidence;
timings are smoke measurements, not a general end-to-end speedup or CI threshold.
Bridge normalization/index maintenance still runs for repeated public batches.

Regression tests preserve rectangle/SVG alignment, selected state, focus, open
panel content, hover and keyboard/pointer handlers across LTR/RTL layouts. Position
changes hide tooltips with obsolete coordinates; annotation visibility toggles
still close panels. Changed or removed selected content now closes and empties the
panel rather than retaining obsolete details and event handlers. Resource reset
and teardown do the same. Missing image services still return `null`.

| Production artifact | Minified bytes before → after | Gzip bytes before → after |
| --- | ---: | ---: |
| `build/diva.js` | 289,612 → 290,567 | 84,954 → 85,192 |
| `build/diva.esm.js` | 289,639 → 290,594 | 84,974 → 85,212 |

The 238-byte gzip increase per bundle is accepted for avoiding repeated selector
parsing, DOM construction and handler registration, and releasing stale panel
content. Full validation: 137 browser tests passed with one existing skip; 46 Elm
tests, TypeDoc, strict TypeScript, public types, Elm review, formatting, and diff
checks passed. No browser environment limitations encountered.

## Step 8 comparison — 2026-11-02

Reused the existing canvas transaction rather than introducing a new pipeline:
`withImageData` calls the shared snapshot reader, and the generic pixel transform
uses `withImageData`. RGB and single-channel LUT processors now write directly to
the pixel buffer without a per-pixel transform callback/output array. Tables stay
as `number[]`; conversion still happens on assignment to `Uint8ClampedArray`.
Canvas boundaries, stage ordering, alpha policies, PCA state, and callbacks remain
unchanged. There is no batching or LUT composition in this change.

### Correctness and operation counts

The new `filter-processing.spec.ts` compares individual LUTs and chains with an
independent pre-Step-8 canvas/transform reference, including fractional/clipped
values, alpha 0/1/127/255, and dimensions 1×1, 3×7, 19×2, 256×4, and 2×1.
Each active LUT stage still performs **one read, one put, two clears, and two
draws**, and completes synchronously after writeback. No-op filters avoid reads;
read exceptions propagate without completion. Two actual canvas-drawer OSD
viewers are exercised with interleaved tile-drawing events and varying dimensions,
including convolution/morphology, source restoration, and reapplication. The new
spec passes against the unchanged pre-Step-8 source as well as the optimized one.

Existing deterministic golden pixels were not changed. Existing filter lifecycle
and auth suites cover source/settings replacement, PCA, credentials, and non-CORS
blocking. A new Page View export smoke test checks that the save action exports
the live drawer's PNG and expected filename; exact filter output is checked
separately rather than relying on tile-load/animation timing in that smoke test.

### Matched measurements

Browser: HeadlessChrome **149.0.7827.55**, macOS; one worker. Both source versions
were bundled directly with esbuild, minification enabled, IIFE, target ES2019.
The workload is a deterministic **256×256** RGBA canvas, **10 warmups and 15
recorded samples** per chain; numbers below are medians in milliseconds. Standalone
processing uses no OSD APIs; the project columns are repeated runs under the two
configured projects, not a comparison of OSD processing implementations.

| Chain | OSD-5 project before → after | OSD-6 project before → after |
| --- | ---: | ---: |
| Brightness → contrast → gamma → invert | 2.1 → 0.8 | 2.2 → 0.8 |
| Red gamma → green sigmoid → blue vibrance | 1.6 → 0.4 | 1.6 → 0.4 |
| Brightness → saturation → invert | 1.8 → 0.6 | 1.8 → 0.7 |
| Brightness → convolution → unsharp mask | 2.9 → 2.6 | 2.8 → 2.5 |

Boundary consolidation was measured independently before LUT specialization
(three warmups, ten samples): median RGB time 2.1 → 2.0–2.05 ms, channel 1.5 →
1.5 ms, mixed 1.7 → 1.7 ms, neighborhood 2.9–3.15 → 2.9–3.5 ms. That short
diagnostic run was noisy, especially during neighborhood-filter JIT warmup; no
boundary-only speedup is claimed. The longer final matched runs above support
keeping the combined change. These microbenchmarks do not establish an
end-to-end Page View speedup and have no wall-clock test assertions.

Reproduce from a source snapshot without replacing working-tree files:

```sh
# Choose an approved temporary path outside the repository.
git show 3fa1e9a:src/filters.ts > "$BASELINE_FILTER_SOURCE"
DIVA_FILTER_SOURCE="$BASELINE_FILTER_SOURCE" yarn -s playwright test browser-tests/filter-processing.spec.ts --workers=1
yarn -s playwright test browser-tests/filter-processing.spec.ts --workers=1
yarn -s playwright test browser-tests/filter-invalidation.spec.ts browser-tests/optimization-baseline.spec.ts --workers=1
```

The focused spec attaches raw timing samples and browser information to the
Playwright results. Run baseline and current builds sequentially with identical
settings, and repeat if host load changes substantially.

| Production artifact | Minified bytes before → after | Gzip bytes before → after |
| --- | ---: | ---: |
| `build/diva.js` | 290,628 → 290,222 | 85,324 → 85,322 |
| `build/diva.esm.js` | 290,655 → 290,249 | 85,344 → 85,343 |

Full validation: **151 browser tests passed, one existing OSD-5-specific skip**;
50 Elm tests, TypeDoc, strict TypeScript, public type tests, Elm review, source
formatting, and diff checks passed. Production/debug bundles were rebuilt. No
browser environment limitations encountered. Decision: keep; Step 9 remains
separate.

## Step 9 comparison — 2026-11-02

`buildFilterOptions` now groups adjacent known pointwise processors after its
existing effective-settings comparison. A private `WeakMap` associates built-in
processors with their buffer transforms; unknown processors are never assumed
synchronous or batchable. PCA, neighborhood filters, colormaps, and no-ops remain
separate. Individual processors still use the original canvas/callback interface.

For fully opaque tiles in normal tile-context drawing state, each compatible run
reads and writes once. Separate buffer passes preserve order and every intermediate
`Uint8ClampedArray` conversion. If any pixel has alpha below 255, all stage
boundaries in that run are retained; the opacity-check read is reused for its
first stage, so fallback does not add a canvas read. Non-default global alpha,
compositing, transform, filter, or shadow state also takes the original path.
This internal optimization assumes the unclipped contexts used for Page View
tile imagery; it is not a general canvas-state optimizer. There is no LUT
composition or cross-stage loop fusion.

### Correctness and operation counts

`filter-batching.spec.ts` compares batched and directly invoked stages for RGB
LUTs, channel LUTs, arithmetic/colour pointwise transforms, alpha-forcing filters,
and chains separated by convolution, morphology, colormaps, or PCA. It covers
half-values/clipping, alpha 0/1/2/63/127/128/254/255, changing dimensions, and a
single non-opaque final pixel (the worst-case opacity scan). Additional tests
cover custom processors/drawing state, exceptions and partial-stage output,
PCA fallback/learned basis streams, and generation cancellation while an
asynchronous custom stage holds a tile callback. Two actual OSD viewers exercise
interleaved opaque/transparent chains, original restoration, and reapplication.

The four-stage brightness → contrast → gamma → invert chain performs:

| Input | Reads before → after | Writes before → after |
| --- | ---: | ---: |
| Fully opaque tile | 4 → 1 | 4 → 1 |
| Tile containing transparency | 4 → 4 | 4 → 4 |

Page View integration asserts these counts using its real configured processors
and compares transparent output to the unchanged Step 0 golden fixture.
Processor-count expectations were adjusted only where adjacent stages now share
a wrapper; orientation changes still reuse wrappers and PCA instances.

### Matched measurements

HeadlessChrome **149.0.7827.55**, macOS, one worker; real filter module bundled by
esbuild with minification, IIFE, ES2019. Each chain gets **10 warmups and 20
recorded samples**. Within each run, staged and batched order alternates on the
same deterministic canvas/seed. Standalone processing uses no OSD APIs; the two
configured projects repeat the same workload. Medians in milliseconds:

| Tone-chain input | OSD-5 project staged → batch | OSD-6 project staged → batch |
| --- | ---: | ---: |
| 256×256 opaque | 0.90 → 0.60 | 0.85 → 0.60 |
| 512×512 opaque | 3.30 → 2.20 | 3.30 → 2.20 |
| 256×256 mixed alpha | 0.80 → 0.90 | 0.80 → 0.80 |
| 512×512 mixed alpha | 3.20 → 3.30 | 3.30 → 3.30 |
| 256×256 non-opaque final pixel | 0.80 → 0.80 | 0.80 → 0.80 |
| 512×512 non-opaque final pixel | 3.25 → 3.40 | 3.30 → 3.40 |

Only opaque runs show a benefit. Transparent fallback can cost a little more,
particularly when the scan reaches the final pixel (about 3–5% at 512×512 in this
sample); the 0.1 ms timer resolution also makes tiny differences noisy. No
end-to-end Page View speedup is claimed, and no wall-clock threshold is asserted.
The test attaches raw samples and browser information for repeat comparisons:

```sh
yarn -s playwright test browser-tests/filter-batching.spec.ts --workers=1
yarn -s playwright test browser-tests/filter-invalidation.spec.ts browser-tests/filter-processing.spec.ts --workers=1
```

| Production artifact | Minified bytes before → after | Gzip bytes before → after |
| --- | ---: | ---: |
| `build/diva.js` | 290,222 → 290,829 | 85,322 → 85,612 |
| `build/diva.esm.js` | 290,249 → 290,856 | 85,343 → 85,632 |

The 607-byte minified / 289–290-byte gzip increase buys reduced canvas traffic
and measured opaque-chain throughput. Production/debug artifacts and internal
declarations were regenerated.

Full validation: **165 browser tests passed, one existing OSD-5-specific skip**;
50 Elm tests, TypeDoc, strict TypeScript, public type tests, Elm review, source
formatting, and diff checks passed. The first full run hit the previously seen
nearby-thumbnail request-count transient on OSD 5; six focused repetitions and
the full rerun passed. No browser environment limitations encountered. Decision:
keep; optional PCA cleanup and page-retention investigation remain separate.
