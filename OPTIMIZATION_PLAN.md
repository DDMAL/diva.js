# Optimization plan

## Objective and scope

Implement the opportunities identified in the source review as small,
independently testable changes. Preserve the public API, rendering behavior,
authentication behavior, and both IIFE and ESM distributions.

The findings are based on source inspection, not profiling. Establish a baseline
before claiming performance improvements. The page-retention proposal is
investigation-only until measurements justify a behavior change.

Do not combine adjacent steps merely because they touch the same files. Finish
the tests and measurements for one step before beginning the next. Existing
unrelated working-tree changes must remain untouched.

## Suggested order

| Step | Group | Change | Risk | Dependency |
| --- | --- | --- | --- | --- |
| 0 | Baseline | Add representative fixtures and record current behavior/costs | Low | None |
| 1 | Contained improvements | Separate pixel-filter invalidation from rotation/flip | Medium | 0 |
| 2 | Contained improvements | Reuse primary-image selection | Low | 0 |
| 3 | Annotation scaling | Make batch annotation construction linear | Low–medium | 0 |
| 4 | Annotation scaling | Index annotation and canvas lookups; coalesce updates | Medium | 3 |
| 5 | Annotation scaling | Separate overlay content from positioning | Medium | 4 |
| 6 | Elm rendering | Narrow thumbnail lazy-view arguments | Low–medium | 2 |
| 7 | Elm rendering | Index range membership and narrow range lazy-view arguments | Medium | 6 |
| 8 | Filter pipeline | Consolidate pixel-buffer processing scaffolding | Medium | 1 |
| 9 | Filter pipeline | Batch compatible filters into one canvas round-trip | High | 8 |
| 10 | Optional cleanup | Share PCA projection/output machinery | Medium | 9 |
| 11 | Conditional investigation | Profile retained pages and consider bounded retention | High if implemented | 0; preferably after 5 |

This order starts with contained changes, then addresses large annotation sets
and manifests, and leaves the more behavior-sensitive pixel pipeline until
regression coverage is established. Steps within a group should still be
separate commits or review units. Independent groups can be deferred without
blocking the others.

## Validation rules for every implementation step

1. Add or extend focused regression tests before changing the relevant behavior.
2. Run focused tests while iterating, using both configured OSD versions for
   browser-dependent changes.
3. Before accepting a step, run the applicable checks below. Run the complete
   browser suite at the end of each group and before merging the overall work.
4. Run `make build` and record both minified and gzip sizes for both production
   bundles. Regenerate package artifacts when required by source changes.
5. Record before/after results, review the diff, and run `git diff --check`.
6. Keep the change only if it demonstrates a performance improvement or a clear
   maintenance benefit. Bundle growth needs an explicit justification.

```sh
make test
yarn -s tsc --noEmit --noUnusedLocals --noUnusedParameters --pretty false
yarn test:types
make review
make build-dev
make test-browser
make build
git diff --check
```

`make test` includes the API documentation check. Use `make build-dev` before
browser testing so tests exercise current sources. Do not run debug and
production builds concurrently: both regenerate `cache/`. Performance comparisons
should use the same optimized build configuration on both sides, not debug versus
production builds.

If Chromium cannot launch because of macOS sandbox permissions, record that as
an environment limitation and rerun in an approved environment; do not count it
as either a passing test or a product failure.

## Step 0 — Establish baselines and regression fixtures

- Use deterministic, local fixtures where possible to avoid network timing noise.
- Include a small manifest, a large manifest, deeply nested ranges, many
  annotations on one canvas, and annotations spread across many canvases.
- Include rectangle and SVG selectors, HTML and plain-text bodies, manifest and
  API annotations, and canvases with and without image services.
- Exercise filter combinations on deterministic images with transparency and
  values near rounding/clamping boundaries.
- Record production bundle sizes and representative timings for page selection,
  annotation replacement, layout changes, and filter updates.
- Where useful, temporarily count thumbnail renders, overlay rebuilds, filter
  generations, and canvas read/write operations. Avoid shipping diagnostic
  instrumentation in production bundles.
- For browser timing measurements, warm up first, repeat runs, and report the
  browser, OSD version, fixture size, and build configuration. Prefer operation
  counts over brittle wall-clock assertions in automated tests.

**Done when:** There is a repeatable comparison procedure and baseline behavior
is covered sufficiently to distinguish optimizations from rendering changes.

## Group A — Contained improvements

### Step 1 — Avoid unnecessary pixel-filter invalidation

**Locations:** `src/diva.ts` (`applyFilterOptions`, `buildFilterOptions`),
`src/filters.ts` (`setOptions`, `GLOBAL_PCA_COLOR`).

- Separate rotation/flip updates from settings that affect pixel processors.
- Compare effective active pixel settings, not merely the complete settings
  object. Editing a disabled filter should not invalidate rendered pixels.
- Preserve processor instances when effective pixel settings are unchanged.
- Explicitly reset invalidation bookkeeping on image/source replacement, viewer
  recreation, authorization changes, and teardown.
- Preserve PCA state only when its source and upstream pixel inputs remain valid.

**Tests:** Rotation-only and flip-only changes with expensive filters enabled;
actual pixel-setting changes; disabled-setting changes; toggling all filters off;
switching sources; credentialed/static-image CORS paths; closing and reopening
Page View. Check rendered pixels and processor invalidation counts.

**Done when:** Orientation-only changes do not rebuild pixel processors, while
all changes that require fresh pixel processing still do so.

### Step 2 — Centralize primary-image selection

**Locations:** `src/Model.elm` (`primaryImage`, `canvasThumbnailUrl`),
`src/View/Sidebar.elm` (`viewThumbnail`).

- Reuse the existing primary-image helper where a `Page` is available.
- Extract a list-level helper only if needed to share the same rule elsewhere.
- Replace the sidebar's fabricated empty image with explicit `Maybe` handling.
- Preserve first-primary selection and fallback to the first image.

**Tests:** No images, one image, no explicitly primary image, multiple primary
images, and protected-image thumbnail presentation. Extend `tests/ModelTest.elm`
and relevant browser coverage.

**Done when:** Equivalent selection paths use one rule without changing
thumbnail URLs, fallback behavior, or authorization presentation.

## Group B — Annotation scaling

### Step 3 — Remove quadratic batch construction

**Location:** `src/diva.ts` (`setAnnotations`).

- Build per-canvas annotation collections with ID-keyed maps instead of filtering
  and copying an expanding array on every insertion.
- Convert to the existing storage representation once per canvas, if still needed.
- Preserve duplicate replacement and ordering behavior, including the current
  behavior for duplicate IDs across different canvases; characterize it first
  rather than silently standardizing it.
- Preserve all-or-nothing validation before mutating live annotation storage.

**Tests:** Unique and duplicate IDs, duplicate ordering, invalid canvas midway
through a batch, empty replacement, manifest/API precedence, and cleared canvases.
Measure large batches concentrated on one canvas and spread over many canvases.

**Done when:** Batch accumulation is linear in annotation count, apart from
normalization costs, and public results remain unchanged.

### Step 4 — Index lookups and apply each affected canvas once

**Locations:** `src/diva.ts` (`setAnnotation`, `findStoredAnnotation`,
`applyAnnotationsForCanvas`), `src/viewer-element.ts` (`setAnnotations`,
`selectAnnotation`, `getImageRegionForAnnotation`).

- Add narrowly scoped indexes for annotation IDs and canvas/page relationships.
- Keep indexes derived from the authoritative annotation/page collections; do not
  introduce a competing owner of viewer state.
- Use canvas-to-page-index collections if one canvas can address multiple entries.
- Coalesce removal and insertion so an existing annotation on the same canvas
  triggers one final update instead of an intermediate removal and re-addition.
- Maintain precedence, duplicate lookup behavior, and index invalidation on clear,
  manifest arrival, resource replacement, and destroy.

**Tests:** Replace an ID on the same canvas; move it between canvases; clear and
re-add; replace the manifest; select and retrieve bodies/extract URLs before and
after updates. Assert only the affected canvases are applied, once each.

**Done when:** Relevant operations avoid full-manifest scans without stale
indexes or changes to annotation visibility and precedence.

### Step 5 — Reposition overlays without rebuilding their content

**Locations:** `src/viewer-element.ts` (`updateLoadedItemPositions`,
`addOrUpdateAnnotationOverlay`).

- Separate SVG/content construction from OSD overlay placement and dimensions.
- Rebuild only when annotation content or necessary content geometry changes.
- Reuse content and event handlers for layout-only changes.
- Ensure selected annotations, tooltips, open panels, and removed annotations do
  not retain stale DOM references.

**Tests:** Rectangle/SVG alignment in single, spread, shifted-spread, LTR, and RTL
layouts; visibility toggles; keyboard/pointer selection; HTML/plain-text panels;
extract URLs; missing-service `null`; data replacement and teardown. Extend
`browser-tests/public-api.spec.ts` and count content rebuilds during layout changes.

**Done when:** Layout changes preserve overlay content nodes where appropriate,
with unchanged alignment and interaction behavior on OSD 5 and 6.

## Group C — Elm rendering and range traversal

### Step 6 — Make thumbnail lazy boundaries effective

**Location:** `src/View/Sidebar.elm` (`viewThumbnails`, `viewThumbnail`).

- Resolve per-thumbnail active state and auth presentation before the lazy view.
- Pass stable, narrow arguments instead of global `selectedIndex` and `Auth.Model`.
- Preserve lazy image loading, RTL ordering, scroll-to-selection, and image-choice
  indicators. Do not combine this step with DOM windowing.

**Tests:** Navigate through a large manifest in single and spread modes, including
shifted spreads and RTL. Verify auth changes affect the correct thumbnails,
fallback loading still works, and selection/scroll behavior is unchanged.

**Done when:** Selection changes rebuild only thumbnails whose effective inputs
changed, while accepting that the outer list still requires traversal.

### Step 7 — Precompute range relationships and narrow lazy arguments

**Locations:** `src/Main.elm` (manifest initialization and range indexing),
`src/Model.elm`, `src/View/Sidebar.elm` (range views and membership traversal).

- Build canvas-to-range membership and required range summaries once per manifest.
- Preserve parent-before-child ordering, nested membership, missing-canvas behavior,
  labels, and the existing first-page navigation rules.
- Compute visible canvas information once per relevant view update.
- Stop passing the complete model into every lazy range node. Use stable inputs
  and per-node current/expanded state where practical.
- Invalidate indexes on resource replacement, not on page selection.
- Keep index construction efficient too; avoid repeatedly copying entire descendant
  lists while walking deeply nested ranges.

**Tests:** Deep and broad trees, repeated canvas references, missing canvases,
empty ranges, expanded metadata, page navigation, manifest replacement, and spread
selection. Check both Contents views against their previous ordering and output.

**Done when:** Page changes use indexed membership rather than repeated subtree
searches, and unrelated model changes do not reconstruct every range view.

## Group D — Filter pipeline consolidation and batching

### Step 8 — Consolidate processing scaffolding without batching yet

**Locations:** `src/filters.ts` (`readImageDataFromContext`, `withImageData`,
`_applyPixelTransformInPlace`, LUT-based filters).

- Introduce a shared pixel-buffer processing boundary, preserving the existing
  callback contract and synchronous processing behavior.
- Consolidate repeated canvas access and RGB LUT application where beneficial.
- Preserve alpha, canvas clearing/compositing, intermediate byte conversion, and
  scratch-buffer ownership. Keep neighborhood filters' source copies distinct
  from their writable output.
- Leave the number and order of filter stages unchanged in this step.

**Tests:** Deterministic pixel comparisons for individual filters and combinations,
transparent pixels, varying tile dimensions, filter removal/reapplication, and
multiple viewer instances. Exercise Page View, saving filtered images, anonymous
and credentialed images, and non-CORS filter-access blocking.

**Done when:** The shared infrastructure produces equivalent output and creates
a clear extension point for batching, without a material performance regression.

### Step 9 — Batch compatible filter stages

**Locations:** `src/filters.ts` (processor pipeline), `src/diva.ts`
(`buildFilterOptions`).

- Start with adjacent pointwise filters; retain fallback boundaries for processors
  that cannot safely participate in a batch.
- Read once and write once per compatible batch. Initially, retaining separate
  in-memory pixel passes is acceptable and easier to verify than loop fusion.
- Preserve stage order, intermediate `Uint8ClampedArray` rounding/clamping, alpha
  handling, and relevant canvas premultiplication/compositing behavior.
- Do not assume eliminating canvas boundaries is pixel-equivalent for transparency;
  prove equivalence or retain boundaries where required.
- Consider LUT composition or single-pass transform fusion only as a separate
  follow-up after this batching change is validated.

**Tests:** Compare batched and baseline output for representative combinations,
clipping/rounding cases, transparency, pointwise filters separated by convolution
or morphology, PCA, and source/settings changes during tile loading.

**Done when:** Compatible chains use fewer canvas round-trips and show a measured
benefit, without unapproved visual differences or lifecycle regressions.

### Step 10 — Optional PCA duplication cleanup

**Location:** `src/filters.ts` (`applyPcaColor`, `applyPcaColorWithBasis`).

- Share projection/output machinery only where it simplifies maintenance without
  adding expensive callbacks or allocations inside pixel loops.
- Preserve the intentional difference between local min/max normalization and
  global variance-based normalization, including the existing basis lifecycle.
- Do not treat statistical accumulation algorithms as interchangeable just because
  both produce a covariance matrix.

**Tests:** All PCA modes, hue changes, uniform/near-uniform images, transition from
local fallback to global basis, settings changes, and source replacement.

**Done when:** Duplication is reduced with equivalent output and no material
throughput or bundle-size regression. Skip if the abstraction is not worthwhile.

## Group E — Conditional page-retention investigation

### Step 11 — Measure before introducing eviction

**Location:** `src/viewer-element.ts` (page loading, loaded-item maps, overlays,
waiters, and teardown).

- Scroll through a large manifest and measure OSD world item count, overlay DOM
  count, retained memory, and frame/update costs after visiting many pages.
- Separate OSD-managed tile-cache behavior from retained page objects and DOM.
- If retention is material, propose a bounded working set around visible pages
  and explicit navigation targets. Review that design before implementation.
- Account for pending page waiters, in-flight loads, auth resolution, annotation
  selection, resource tokens, revisits, and teardown before removing items.
- Treat thumbnail DOM windowing as another separately justified proposal, not
  an implicit part of page eviction or step 6.

**Tests if implemented:** Forward/backward browsing, distant jumps, rapid scrolling,
spread layouts, evicted-page revisits, pending navigation, protected/static images,
cancellation, resource replacement, and destroy on both OSD versions.

**Done when:** Either measurements justify keeping current behavior, or a
separately reviewed eviction change demonstrably bounds retention without breaking
navigation and loading contracts. This is not a confirmed memory leak.

## Per-step completion record

### Step 0 — Complete (2026-10-28)

- Added `browser-tests/optimization-baseline.spec.ts`, deterministic local fixture
  builders, and shared golden filter pixels. Application sources are unchanged.
- Reproduction commands, workload definitions, measurement limitations, initial
  timings, and bundle sizes are in `browser-tests/OPTIMIZATION_BASELINE.md`.
- The 12 baseline browser cases pass across OSD 5.0.1 and 6.0.2. The complete
  browser suite passes: 105 passed, one existing OSD-5-specific skip.
- `make test` passes (37 Elm tests and TypeDoc); strict application TypeScript,
  public type tests, and `make review` pass. Production and debug builds succeed.
- No production bundle size changes: IIFE 287,285 bytes / 84,415 gzip bytes;
  ESM 287,312 bytes / 84,437 gzip bytes.
- Rotation and mirror each currently cause one pixel-filter invalidation. The
  four-stage tone chain currently performs four canvas reads. These are measured
  costs, not regression assertions that would prevent improving them.
- No browser sandbox limitation encountered. Wall-clock measurements remain
  diagnostic and should be repeated under matched conditions before comparison.
- Decision: keep the baseline; proceed next to Step 1, with focused additional
  coverage for source replacement, disabled settings, and filter lifecycle resets.

### Step 1 — Complete (2026-10-28)

- `src/diva.ts` now describes active pixel processors and their effective arguments
  before constructing them. A stable serialized key avoids rebuilding processors
  or advancing the filter generation for rotation, mirror, identical settings,
  and disabled-setting edits. Processing order and defaults are unchanged.
- Processor instances, including a learned PCA basis, are preserved only while
  active pixel inputs and the source lifecycle remain valid. Opening an image,
  recreating/closing Page View, replacing a resource, authorization invalidation,
  and filter-access transitions reset the relevant bookkeeping.
- Removed the redundant filter-function forwarding table as part of using the
  same filter descriptions for comparison and construction.
- Added `browser-tests/filter-invalidation.spec.ts`: seven cases per OSD version,
  including an enabled/disabled/change matrix across 45 parameter inputs,
  grayscale/invert removal, pixel equivalence across transforms, PCA preservation
  and rebuilding, real disabled-slider input, source/resource replacement,
  credentialed re-resolution, non-CORS blocking/restoration, and teardown.
- New unchanged-setting tests failed against the original implementation before
  the optimization. After implementation, the full browser suite passes:
  119 passed, one existing OSD-5-specific skip. `make test` (37 Elm tests and
  TypeDoc), strict application TypeScript, public type tests, Elm review, and
  the source formatting check pass. Debug and production artifacts regenerated.
- Baseline measurements on both OSD versions: rotation invalidations **1 → 0**;
  mirror invalidations **1 → 0**. Existing exact filter-pixel fixtures still pass.
- IIFE minified/gzip: **287,285 / 84,415 → 287,121 / 84,385 bytes**.
  ESM minified/gzip: **287,312 / 84,437 → 287,148 / 84,408 bytes**.
- No browser environment limitations encountered. The credentialed re-resolution
  regression wraps the real resolver's result to change credential flags; the
  existing auth suite separately covers actual login/logout and cancellation.
- Decision: keep. Next is Step 2, primary-image selection reuse; no later
  optimization steps are implemented here.

### Step 2 — Complete (2026-10-28)

- `src/Model.elm` now delegates page selection and both thumbnail fallback paths
  to one private list-level helper: first explicitly primary image, otherwise the
  first image, otherwise `Nothing`. The helper short-circuits rather than building
  a filtered list of every primary image.
- `src/View/Sidebar.elm` uses `Model.primaryImage` and resolves authorization
  through `Maybe.andThen`, removing the fabricated empty image record. Canvas
  thumbnail precedence, fallback URLs, choice indicators, and protected-image
  presentation are unchanged. No public API or dependency changes.
- Added nine Elm regression cases for empty/single/no-primary/later-primary/
  multiple-primary selection, omitted empty canvases, promoted first choices,
  and thumbnail fallback consistency. Existing thumbnail tests also check fallback
  URLs for canvas thumbnails and static images.
- Added `browser-tests/primary-image.spec.ts` for anonymous canvas-thumbnail
  failure/fallback and a protected primary with a public alternative. These
  characterization tests passed against the original implementation too.
- The full browser run exposed two pre-existing timing assumptions in Step 1's
  tests. Test-only fixes wait for initial neighboring loads and Elm's normalized
  JSON render, and inspect auth invalidation synchronously before reload events
  can restore the source key. Both affected cases passed five repetitions on each
  OSD version (20 focused passes), followed by the complete suite.
- Validation: **121 browser tests passed, one existing OSD-5-specific skip**;
  `make test` passes with **46 Elm tests** and TypeDoc; strict application
  TypeScript, public type tests, and `make review` pass. Debug and production
  bundles regenerated; no browser environment limitations encountered.
- IIFE minified/gzip: **287,121 / 84,385 → 286,941 / 84,334 bytes**.
  ESM minified/gzip: **287,148 / 84,408 → 286,968 / 84,356 bytes**.
- Decision: keep for centralized behavior, reduced duplication, and smaller
  bundles. No wall-clock speedup claimed. Next is Step 3, linear annotation-batch
  construction; later annotation/rendering work is not included here.

### Step 3 — Complete (2026-11-01)

- `setAnnotations` now accumulates normalized annotations in per-canvas ID-keyed
  maps and converts to stored arrays once per canvas. Delete-before-set preserves
  move-to-end replacement ordering; duplicate IDs across canvases still coexist.
  All normalization and canvas validation finish before live storage is changed.
- Added `browser-tests/annotation-batch.spec.ts`: characterization passed before
  and after the refactor for duplicate ordering/content, manifest/API precedence,
  invalid canvas and malformed annotation midway through a batch, empty replacement,
  cleared canvases, restoration, and removal of stale overlays. Existing annotation
  coverage still checks rectangle/SVG bodies, visibility, selection, extract URLs,
  and missing services. No public API or dependency changes.
- Added isolated 2,000/8,000-annotation measurements on one and 100 canvases. With
  overlay application disabled only during this benchmark, median concentrated
  8,000-entry batch time fell from **138.0 → 5.4 ms** (OSD 5) and
  **140.3 → 5.6 ms** (OSD 6). Distributed medians: **7.9 → 5.3 ms** and
  **7.7 → 5.6 ms**. These measure normalization/accumulation/storage, not rendering;
  reproduction and the complete comparison table are in the baseline document.
- Validation: **125 browser tests passed, one existing OSD-5-specific skip**;
  **46 Elm tests**, TypeDoc, strict application TypeScript, public type tests,
  and `make review` pass. Production and debug bundles regenerated.
- IIFE minified/gzip: **286,941 / 84,334 → 286,959 / 84,336 bytes**.
  ESM minified/gzip: **286,968 / 84,356 → 286,986 / 84,359 bytes**.
- Decision: keep. The 18-byte minified increase is justified by removing quadratic
  batch accumulation. No environment limitations. Step 4 indexing/coalescing and
  Step 5 overlay reuse remain separate work; `testing/index.html` is untouched.

### Step 4 — Complete (2026-11-01)

- Added a shared, derived `AnnotationIndex` for ID-to-canvas lookups and stable
  canvas insertion ranks. The existing manifest/API/viewer collections remain
  authoritative. Bridge lookups retain manifest-canvas-first ordering and
  per-canvas API precedence; viewer lookups retain their own first-match rule.
- `setAnnotation` visits only API canvases containing the replaced ID, then applies
  each affected canvas once after storage is final. Same-canvas replacement drops
  from two applications to one. Source-canvas application order is preserved even
  after index refreshes. Per-canvas filtering/reindexing remains intentional.
- Viewer annotation application uses canvas-to-page-index collections, including
  repeated entries for one canvas. Selection and extract lookup no longer scan all
  annotation collections; extract lookup no longer scans tile sources.
- Index updates cover manifest arrival, single/batch replacement, clear/re-add,
  resource replacement, disconnect/reconnect, and teardown. No public entry-point
  API or dependency changes; bundles and declarations regenerated.
- Added four browser cases per OSD version in `annotation-index.spec.ts`, covering
  update counts/order, comparison with the previous lookup algorithm, duplicate
  semantics, selection/bodies/extract URLs, repeated canvases, late manifest
  arrival, clear/reset, reconnection, and teardown.
- The isolated 8,000-annotation/100-canvas lookup comparison performs 1,000 queries
  (half missing): **100,000 canvas collection visits versus 500 indexed candidates**.
  Final full-run median times for the former algorithm versus indexed lookup:
  **125.3 versus 0.1 ms** (OSD 5), **129.3 versus 0.1 ms** (OSD 6). This compares
  lookup algorithms in the same browser, not end-to-end viewer performance.
- Validation: **133 browser tests passed, one existing OSD-5-specific skip**;
  **46 Elm tests**, TypeDoc, strict application TypeScript, public type tests,
  Elm review, formatting, and diff checks pass.
- The initial full run had two timeouts and exceeded the shell command limit;
  its orphaned server then returned empty responses. After restarting that server,
  both affected tests passed five repetitions per OSD version (20 passes), and
  complete runs passed with an increased command timeout. No tests were weakened.
- IIFE minified/gzip: **286,959 / 84,336 → 289,612 / 84,954 bytes**.
  ESM minified/gzip: **286,986 / 84,359 → 289,639 / 84,974 bytes**.
- Decision: keep. The 2,653-byte minified increase (618/615 bytes gzip) and linear
  derived-index storage are justified by avoiding full-collection lookups and
  redundant canvas applications. Overlay content rebuilding remains Step 5.
  The user's `testing/index.html` changes are excluded.

### Step 5 — Complete (2026-11-01)

- Split annotation content construction from placement in `src/viewer-element.ts`.
  Layout/aspect changes now update the existing OSD overlay rectangle and SVG
  coordinate system without replacing selector nodes, tooltip nodes, or handlers.
  OSD `updateOverlay` avoids the previous remove/add cycle and preserves focus.
- Equivalent annotation updates are compared by ordered body/selector/service
  values and leave existing content, indexes, and panel references intact. Actual
  content updates still rebuild the affected canvas. No content fingerprint cache
  or duplicated authoritative annotation state was introduced.
- Layout-only changes preserve selection and open panel content. Position changes
  hide potentially stale tooltip coordinates; retained hover/focus handlers still
  work. Replacing/removing a selected canvas's content closes its panel; closing
  clears panel children and the selected data reference. Overlay reset, resource
  replacement, and teardown also close panels, avoiding stale content/handlers.
- Extended the LTR/RTL public API alignment tests with selector/SVG/tooltip node
  identity, zero tracked content builds, retained focus/panel content, hover,
  keyboard and OSD pointer selection, visibility, and image extract checks across
  single/spread/shifted layouts and direction changes.
- Added two cases per OSD version in `annotation-overlay.spec.ts` for equivalent
  data reuse, changed body/geometry invalidation, removed DOM, unrelated-canvas
  clears, selection policy, missing-service `null`, resource replacement, teardown,
  and image-coordinate changes without replacing selectors.
- The 300-annotation baseline now counts actual content replacements on its
  existing first-canvas overlay. Before/after for spread, shifted-spread, single:
  **5 → 0 content rebuilds on both OSD versions** (extra pre-change rebuilds also
  came from layout/aspect updates). Repeated equivalent-batch median time in the
  focused runs: **5.3 → 0.4 ms** (OSD 5), **4.8 → 0.5 ms** (OSD 6). Timings are
  smoke measurements; avoided construction is the primary result.
- Validation: **137 browser tests passed, one existing OSD-5-specific skip**;
  **46 Elm tests**, TypeDoc, strict application TypeScript, public type tests,
  Elm review, formatting, and diff checks pass. Production/debug bundles rebuilt.
- IIFE minified/gzip: **289,612 / 84,954 → 290,567 / 85,192 bytes**.
  ESM minified/gzip: **289,639 / 84,974 → 290,594 / 85,212 bytes**.
- Decision: keep. The 955-byte minified/238-byte gzip increase per bundle is
  justified by avoiding selector parsing/DOM/handler reconstruction and fixing
  stale panel cleanup. No environment limitations; no public API/dependency
  changes. Step 6 (thumbnail lazy boundaries) remains separate. The user's
  `testing/index.html` changes are untouched.

Append a short entry when each step is implemented:

```text
Step:
Commit/review reference:
Behavior preserved and relevant edge cases:
Focused tests and broader checks run:
Before/after operation counts or timings:
IIFE minified/gzip sizes before and after:
ESM minified/gzip sizes before and after:
Environment limitations:
Decision: keep / revise / defer
```
