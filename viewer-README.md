# Data Viewer

Open **[viewer.html](viewer.html)** on static HTTPS hosting, including a GitHub Pages project path. Deploy only that file. All authored CSS and executable JavaScript are inline; no backend, build, Node/Python runtime, local scripts, stylesheets, or WASM files are required. The existing landing page is unchanged. Help includes a configurable workspace name and the pinned dependency registry.

## Explore

1. Open/drop local files, paste CSV/TSV/JSON, select a Zarr array folder, connect a public HTTPS URL, or generate the sample.
2. Inspect fields, metadata and the 50-record paginated preview. Array sources expose variables, explicit index ranges/steps and pre-read shape estimates.
3. Visual filtering supports AND/OR, sorting, projection, first/uniform row selection. Queries produce separate datasets. SQL uses stable `viewer_data_N` identifiers shown beside source labels.
4. Choose a trace source, fields, chart type and styling, then **Apply & render**. Trace bindings survive switching the active dataset. Add independent traces/charts for comparisons. Confirm WGS84 longitude/latitude fields when choosing a map.
5. Download PNG/SVG, Plotly configuration, standalone chart HTML, bounded CSV/columnar JSON, or session JSON. Session import restores references/settings without fetching URLs or running code. Reselect matching local files; explicitly reconnect URLs and rerun derived operations.

Supported views: scatter, bubble, line, 3D scatter/line, grouped/stacked horizontal/vertical bar, box, histogram, table, blank MapLibre point/GeoJSON map, explicit 2D-slice heatmap and surface. 2D subplots support 2×1, 1×2, 2×2, per-trace panels and matched axes. Eligible date-X scatter/bubble/line charts support a range selector/slider. Axis modes/ranges/reversal/grid/tick formats, units, legends, marker/line styles, numeric/categorical colors and hover selection/precision are configurable. Hover text templates use `{field}` placeholders; freeform labels and values are escaped; placeholders refer to bound/selected fields.

## Formats and limitations

- CSV/TSV: UTF-8, unique headers, quoted commas/newlines/quotes, dynamic finite scalars, missing cells → null. Papa Parse streams rows into columns in a disposable worker. Malformed/mismatched rows reject. JSON supports record arrays, `{data: records}`, `{columns: {field: array}}` and equal-length column dictionaries. Nested cells become JSON text. Date objects become UTC ISO strings; source timezone semantics should be checked in metadata.
- Parquet: hyparquet reads metadata, requested columns and bounded row ranges. Remote URLs require exposed Content-Length and CORS-accessible HEAD/Range responses. Ignored Range is refused, never silently replaced with a huge download. A row-range request may still decode entire physical row groups/pages; codec support is conditional; nested/duplicate leaf schemas require an external flat projection.
- SQL: single-threaded DuckDB `mvp`, no COOP/COEP/SharedArrayBuffer requirement. Native Parquet extension loading was unavailable on the test host. The verified path materializes Parquet/resident columns into Arrow before querying; **no predicate pushdown is claimed**. Registration is bounded to one million rows and a 300 MB decoded estimate. Normalized datetime/integer strings may need explicit SQL casts. SELECT/WITH only, one statement; results capped at 100,000. Cancel terminates the owning worker and its nested engine.
- Classic NetCDF: netcdfjs, CDF-1/CDF-2 signatures only. Full file and full selected variable decoding is required before bounded extraction; estimated oversized variables reject. Fill/missing masks precede scale/offset. Character variables are metadata-only. Coordinates/calendars stay raw; unusual CF calendars are not converted into ordinary Dates. Bounded coordinate arrays allow nearest-index selection when present.
- HDF5/NetCDF-4: **experimental**, via h5wasm, acknowledging the National Institute of Standards and Technology as its source. Real numeric root-dataset hyperslabs and common packing/fill transforms were tested on compressed HDF5. Full NetCDF dimension scales, groups, custom codecs, calendars and representative NetCDF-4 semantics are not verified. Input and conservative decoded-variable estimates are guarded. This is not advertised as universal NetCDF-4 support.
- Zarr: local root-array folders or public array URLs, v2/v3 according to zarrita's codec support. Selected chunks are fetched; concurrency two, per-chunk/decoded-chunk safeguards. Remote Blosc and local uncompressed v2 samples passed. No remote group-discovery browser or cross-query chunk cache. Supply an actual array URL/folder, not a group parent.
- Map: no tile requests or API keys; blank style, point encodings, GeoJSON point/line/polygon overlays and bounds. WGS84 degrees required; embedded alternate CRS/GeometryCollection rejected. Invalid table coordinates are omitted with counts. Map image export is unavailable; palettes currently use Viridis endpoints for continuous map color.

Resource safeguards: full-file input 300 MB; CSV decoded estimate 300 MB; N-D slice 100k values; tables 50 rows/page and first 30 fields in previews; scatter defaults 50k/trace, 3D 10k, explicit show-all ≤100k; 32 groups, 12 hover fields, 16 traces/chart, 12 charts, 50 datasets and conservative 1 GiB aggregate resident estimate. Box/histogram refuse visually sampled/truncated inputs instead of claiming exact statistics. Lines use bucket extrema; other visual samples are uniform. Visual queries scan at most 100k rows; large complete Parquet scans use bounded SQL registration. Estimates are conservative guidance, not exact heap measurements. Initial Plotly loading can briefly block the main thread.

## Privacy and trusted code

No uploads, analytics, localStorage dataset persistence, credentials or public CORS proxies. Dependencies contact third-party CDN hosts and need internet on initial use. Source URLs must be public HTTPS without credentials/query parameters/fragments. CORS/firewall/CSP errors remain visible. Direct `file://` use is best effort, unverified.

The JavaScript editor executes with **full page-origin privileges**, only on explicit Run. It can read opened data and make network requests; it is not a sandbox. Imported code stays disabled until reviewed/edited or replaced. Cancellation discards its asynchronous output; synchronous user code cannot be interrupted. Never run shared code you do not trust.

`async transform(api)` receives `list()`, bounded copied `read(id, fields, limit)`, `readSlice(id, variable, selections)`, `linspace(start, stop, count)` and owned `float64(values)`. Return `{kind:'table', label, columns}` or an expert `{data,layout,config}` Plotly object. Expert plots are reproduced by their script/config, not ordinary field controls. Session JSON stores references, query/slice provenance, fields, styles and disabled JS; it does not embed File objects/live handles. Sessions are limited to 2 MiB. Derived operations must be rerun after source reselection. SVG exports of WebGL traces include raster content; standalone chart HTML still requires the pinned Plotly CDN.

## Development verification

Agents: follow [viewer-testing-procedures.md](viewer-testing-procedures.md) first for reusable profiles, canonical commands, approval reuse, fixture recovery and evidence requirements.

Temporary tooling belongs outside the repository; on this host use `/DMOD/christopher.tubbs/tmp`. Install only through npm or conda. Do not use system package installers. `viewer.html` remains the authoritative source; temporary staged source sections from the initial implementation are obsolete.

```bash
export TMPDIR=/DMOD/christopher.tubbs/tmp
export VIEWER_TOOL_ROOT="$TMPDIR/viewer-tools"
export PLAYWRIGHT_BROWSERS_PATH="$VIEWER_TOOL_ROOT/viewer-browsers"
npm install --prefix "$VIEWER_TOOL_ROOT" playwright@1.64.0 typescript@6.0.3 prettier@3.6.2
node "$VIEWER_TOOL_ROOT/node_modules/playwright/cli.js" install chromium
node tests/viewer-pure.test.cjs
node tests/viewer-check.cjs
```

For browser fixtures, optional conda packages `numpy scipy h5py pyarrow` generate real Snappy Parquet/packed arrays/local Zarr:

```bash
python tests/viewer-create-fixtures.py "$VIEWER_TOOL_ROOT"
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj /CN=localhost \
    -keyout "$VIEWER_TOOL_ROOT/viewer-key.pem" -out "$VIEWER_TOOL_ROOT/viewer-cert.pem"
node tests/viewer-browser.test.cjs
VIEWER_MAP_ONLY=1 node tests/viewer-browser.test.cjs
```

The HTTPS test certificate is temporary and used only with browser `ignoreHTTPSErrors` for deliberate local CORS/range tests. Browser automation may require approved network/local-port access and conda browser libraries. This host uses `LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-chromium-libs` (original five conda libraries only). `VIEWER_TEST_FILTER='scenario substring'` selects focused checks. `VIEWER_BROWSER=firefox` and optional `VIEWER_PLAYWRIGHT_ROOT` select alternate tooling; `VIEWER_SKIP_WEBGL=1` records excluded graphics coverage and does not imply graphics acceptance.

See [tests/viewer-validation.md](tests/viewer-validation.md) for actual evidence, limits and incomplete compatibility checks. `.llm/TASKS.md`, `.llm/DECISIONS.md`, `.llm/PROGRESS.md` and `.llm/ARCHITECTURE.md` provide disruption/resumption breadcrumbs.

## Date axes and array grids

To plot dates: select the date column under **Visualization → X**, expand **Axes, range & layout → X axis**, set **Scale → Date**, then click **Apply & render**. Use ISO strings such as `2026-10-13` or `2026-10-13T12:00:00Z`. Numeric CF time is still a number; use Linear until you convert it using the source units and calendar. Category is for other text labels.

`dim_0`, `dim_1`, and `streamflow` in a slice preview are **columns**: two coordinate/index columns and the streamflow values. Heatmap/surface needs exactly two dimensions with at least two selected positions each. A dimension with one selected position does not supply a grid axis. Select the original array dataset, expand **Array / dimension selection**, select the variable, set Start/End/Step so exactly two dimensions vary, and hold every other dimension at one position (`End = Start + 1`). End is exclusive. Set Reduction to none and **Read slice**. For a one-by-N slice, choose Line/Scatter with the varying dimension as X and streamflow as Y. Arbitrary CSV/JSON columns are not automatically reshaped into grids.

Full-file and decoded-data guards are now **300 MB = 300,000,000 bytes**, not 300 MiB. The workspace estimate is 1 GiB so a permitted file is not automatically rejected by the previous smaller workspace budget; row/point/slice limits remain. File size alone does not guarantee enough browser memory. Parquet retains selective-read support for larger files.

Switching the active Data dataset resets query fields, filters, sort, sampling, limits, array variable and reduction controls (saved per-dataset selections restore deliberately). Existing chart traces keep their independent source bindings. Changing a trace's dataset resets XYZ defaults to the new schema and clears optional size/color/group/hover fields, custom hover templates and X sorting. Removing a dataset clears its affected trace fields.

GeoPackage support is planned only: see [viewer-geopackage-plan.md](viewer-geopackage-plan.md).
