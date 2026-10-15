# Viewer validation evidence

Recorded 2026-10-13. Browser fixture servers are development-only, no production backend. Source lives entirely in `viewer.html`; temporary tooling/results/screenshots belong to `/DMOD/christopher.tubbs/tmp`.

## Passed

- Packaging/syntax/strict JSDoc: `VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools node tests/viewer-check.cjs`; checks the actual inline module with Node and TypeScript 6.0.3, review contracts on every function, explicit if/loop braces, no local script dependency or inline event attributes. Function count is reported by the harness, not inferred. No `@ts-ignore`/broad `any` suppression.
- Pure helpers: `node tests/viewer-pure.test.cjs`, 31 boundary assertions: records/columns, null/nonfinite/date/bigint normalization, fields literally named data/columns, unsafe keys, malformed shapes, stable projection/filter/sort and missing semantics, source immutability, packed fill/scale/offset, N-D guards/stride, extrema-preserving sampling, date/integer inference, grid shape, all four missing-aware reductions and invalid reduction rejection.
- Chromium 156 under `/project/viewer.html`: 14 core scenarios, zero uncaught page errors. All phase-1 Plotly types, date selector/slider, log rejection; quoted/multiline/missing/malformed/duplicate-header CSV and JSON; derived visual filters and zero-result UI; independent dataset/trace/chart bindings and escaped hover templates; 100003-row Parquet and full Arrow SQL; HTTPS range success, ignored-range refusal, real CORS denial; packed classic slices, reduction, heatmap/surface; compressed public and local Zarr; session references/settings/reselection, regenerated sample chart settings and disabled imported JS; cancel/offline/retry; actual PNG/SVG/config/standalone-HTML/CSV/JSON downloads; explicit script execution and copied Float64Array API; 100k CSV peak preservation and shared-axis subplots; keyboard focus and 390px layout without horizontal page overflow.
- Separate Chromium headless-shell configuration: MapLibre blank point map, invalid coordinates counted, GeoJSON lines/polygons, and compressed HDF5 real hyperslab. Zero uncaught page errors. Map tested separately from full Chromium's forced software 3D flags because this host's GL contexts differ between configurations.
- Reproducible PyArrow Snappy Parquet fixture: projection/metadata and complete SQL count 100003, sum(value) 4242816, nulls, UTC timestamps, int64/double/string/boolean. Row groups 10000. No native Parquet predicate pushdown claimed.
- Public Blosc Zarr: `https://raw.githubusercontent.com/zarr-developers/zarr_implementations/5dc998ac72/examples/zarr.zr/blosc`, source 512×512×3, selected 2×3×1 values `[154,109,63,177,144,113]`. Reads selected chunks rather than the whole array.
- Classic packed fixture in `tests/viewer-fixtures/viewer-packed.nc`: shape 1×3×4, raw `[0,2,-9999,6,8,10,12,14,16,18,20,22]`, fill -9999, scale .5, offset 10 → `[10,11,null,13,14,15,16,17,18,19,20,21]`; mean over X → `[34/3,15.5,19.5]`.
- Experimental compressed HDF5 fixture: selected 1×2×3 real hyperslab → `[10,11,null,14,15,16]`. This proves the numeric HDF5 slice path, not full NetCDF-4 semantics.
- Firefox 142.0.1, isolated ingestion: quoted/missing/malformed CSV/JSON, duplicate filenames/headers and unsafe JSON keys passed, no page errors. An isolated real Snappy Parquet/complete Arrow SQL worker test also passed (count 100003, sum 4242816, ~10.2 seconds). Broader rendering acceptance has not passed.

## Performance observations

Native local-file input for the 100k-row CSV: approximately 1.8–2.7 seconds metadata/preview elapsed including cold reader/worker work; no observed main-thread long task ≥50 ms in the final native-file runs. Plotly loading/rendering adds separate cold work: one isolated cold run had a ~1.27-second main-thread task, warm runs ~75–89 ms. These are shared-host observations, not universal performance guarantees.

An earlier test passed large fixture text via Playwright's in-memory transport and observed 413–449 ms during ingestion. Switching to a real temporary file path removed that automation overhead; the reader remains worker-based. The test records the metadata and renderer phases separately.

## Incomplete / constrained acceptance

- Current Firefox binary requires NSS_3.126, unavailable in this host's conda packages. Firefox 142 can ingest data but its full rendering/pointer test stalled even with WebGL disabled; stalled harnesses were stopped. Do not claim Firefox chart/map/graphics acceptance. Safari not tested.
- No actual GitHub Pages deployment or direct `file://` acceptance run; project-subpath/static-host behavior is verified on a local static development server using real CDN libraries.
- NetCDF-4 remains explicitly experimental. No representative full NetCDF-4 dimension-scale/calendar/group/codec acceptance fixture has passed. Numeric HDF5 root hyperslabs are verified.
- CSV/JSON and classic NetCDF read whole inputs. Remote Parquet requires HEAD/Range/CORS; no full-download fallback. Some Parquet row groups/codecs/nested schemas may be unsuitable. SQL uses bounded materialization rather than native Parquet extension/pushdown.
- Local uncompressed Zarr and remote Blosc v2 are tested; v3/all-codec compatibility, consolidated group discovery and bounded reusable cross-query chunk cache are not proven/implemented.
- Shared axis zoom via matching/subplots is implemented; linked hover across panels, a basemap/style service selector, PMTiles and reusable standalone chart templates are deferred. Sessions carry reproducible chart specs/references. No phase-3 editor/caching framework was added.
- Browser memory/resource limits remain finite. Session references cannot recreate local files or magically rerun derived datasets. Imported scripts/URLs never execute/fetch automatically. Expert/user synchronous JS cannot be hard canceled.

## Reproduce

See `viewer-README.md` for exact environment variables, npm/conda-only tooling and fixture generation. Core suite: `node tests/viewer-browser.test.cjs`. Separate map/HDF5 suite: `VIEWER_MAP_ONLY=1 node tests/viewer-browser.test.cjs`. Focused checks use `VIEWER_TEST_FILTER`. Results/screenshots/downloads are viewer-prefixed in the temporary tooling directory. The test-only module hook is injected by the development server and does not exist in the deployed page.

## Follow-up verification — 2026-10-14

Strict packaging/JSDoc checker (224 functions), 31 pure assertions and focused Chromium scenarios passed after the limit/reset/error changes. `settings recovery and increased file size` verifies query defaults, independent source binding, cleared optional size/color/group/hover/template fields after trace rebinding, actionable date/grid messages, real 65 MiB JSON load and rejection at 300,000,001 bytes. `packed NetCDF3 slices/grid/reduction` verifies intact valid heatmap/surface rendering and reduced nongrid automatic scatter plus explicit-grid recovery error. Both reports have zero page errors. Reports remain under the designated temporary viewer-tools directory with filter-specific filenames. No full 300 MB parse/peak-memory benchmark, full historical suite, user-file reproduction, Firefox or Safari rerun is claimed for this follow-up.
