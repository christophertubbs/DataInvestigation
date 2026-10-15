# SPEC.md — Browser-Only Scientific Data Viewer & Plot Playground

**Status:** Implementation specification  
**Working title:** Scientific Data Viewer (name configurable; do not hard-code branding)  
**Entry page:** `viewer.html` — **do not name it `index.html`**  
**Deployment target:** Static HTTPS hosting, particularly GitHub Pages  
**Runtime:** Browser only; no application server, database server, Python runtime, Node runtime, or build step in production  
**Primary constraint:** One self-contained authored HTML page with inline application CSS and JS; third-party libraries may be dynamically fetched from **version-pinned CDN URLs**. WASM, worker scripts, fonts, and codecs may be separately fetched from those CDNs. No required repository-local JavaScript/CSS/WASM assets.

## 1. Mission

Implement a responsive, general-purpose, interactive **data viewer**, not a scientific simulation or routing engine. Users should be able to load or connect to tabular and multidimensional scientific datasets, inspect their contents, filter/query/slice them, assign data fields to chart dimensions, configure chart attributes, compare multiple series, run optional custom JavaScript transformations, and export visualizations or configurations. The default experience must be useful **without writing code**.

An existing GitHub Pages data viewer (`https://joshcu.github.io/datastream_viewer/`, source `https://github.com/JoshCu/datastream_viewer`) is **architectural inspiration only**: borrow lazy library loading, typed arrays, worker-based processing, selective reads, and visible-data updates as appropriate. **Do not copy its hydrologic routing, model execution, map-painting logic, domain-specific data assumptions, or application layout.**

### Explicit non-goals

- No numerical routing, model execution, calibration, simulation management, orchestration, or distributed computing.
- No data upload to a service controlled by this application. Local dropped data stays in the browser unless the user explicitly invokes a remote operation in their own code.
- No mandatory authentication, backend API, server-side proxy, npm installation, bundler, framework, or custom build pipeline.
- No universal support for every NetCDF codec, Zarr codec, remote server, file size, or Plotly chart type in release 1.
- No unrestricted spreadsheet replacement, full GIS editor, Tableau clone, dashboard service, or automatic generation of hundreds of subplots.
- Do not add architectural complexity merely to anticipate a future multitool product.

## 2. Hard deployment and packaging requirements

1. All app-authored UI, CSS, and executable application logic live in **`viewer.html`**. A future `index.html` landing page can link to it; this project must not create or overwrite that landing page.
2. Serve unchanged on `https://<username>.github.io/<repository>/viewer.html` and from a GitHub Pages project subdirectory. **Do not assume origin root `/`.**
3. Use ordinary `<script>` tags, inline `<script type="module">`, dynamic `import()` from pinned ESM CDN endpoints, or documented CDN-loaded UMD builds. Avoid npm-based build machinery and bare module specifiers unless resolved via an inline import map.
4. Resolve worker/WASM dependencies via explicit URLs. Use Blob worker wrappers if a third-party library requires a same-origin worker entrypoint; test CDN cross-origin restrictions. Do not assume an arbitrary CDN ESM script can directly be used as a Worker URL.
5. Lazy-load nonessential dependencies only when their features are selected. Plotly and the core shell may initialize at startup; scientific decoders and SQL should not.
6. Run on a conventional, **non-cross-origin-isolated** GitHub Pages page. DuckDB-Wasm must default to the supported single-threaded `mvp`/`eh` bundle. Do not require `SharedArrayBuffer` or COOP/COEP headers.
7. Support current desktop Chromium and Firefox; test Safari to the extent accessible. Touch and small-screen support are desirable but desktop data exploration is the primary target.
8. A CDN network connection is needed for first-time dependency loading. Expose clear errors if offline, blocked by a firewall, or denied by CSP. Do not claim true offline operation without vendored assets/service-worker caching and explicit testing.
9. Make the dependency registry visible in the source: library name, exact pinned version, CDN URL(s), reason for use, and fallback behavior. **Never use `@latest`, floating major versions, or unpinned CDN endpoints in the finished application.**
10. Do not rely on a development server in deployment. A local static HTTP server **may** be used during testing; direct `file://` operation is best-effort, not a guaranteed acceptance criterion due to module/worker/browser restrictions.

## 3. Libraries and roles

Do **not** blindly import everything on page load. Verify current CDN artifacts, versions, public APIs, licenses, and browser compatibility before implementation; document the choices in a source comment or internal dependency table. Prefer the smallest dependable distribution, but do not implement custom binary readers when a maintained one suffices.

| Role | Preferred option | Requirements / caveats |
|---|---|---|
| General charting | **Plotly.js**, appropriately scoped distribution or full bundle | 2D/3D traces, hover, legends, axis layouts, exports, subplots. Confirm chosen bundle contains *all* enabled trace types, especially 3D and mapping. |
| Interactive maps | **MapLibre GL JS** | Optional, lazy loaded; render longitude/latitude point data, GeoJSON features, color and size encoding, map controls. MapLibre is for map rendering, not general Plotly replacement. |
| Optional vector tile sources | **PMTiles** | Optional plugin for hosted PMTiles basemaps/overlays; do not force a map-tile service. Provide a blank/no-basemap mode. |
| CSV/TSV | **Papa Parse** (or adequately tested native parser) | Quotes, delimiters, headers, large-file incremental parsing, malformed rows. |
| Parquet lightweight reader | **hyparquet** | Metadata, selected columns, row slices and remote HTTP byte ranges; use as straightforward initial Parquet reader. |
| SQL/query engine | **DuckDB-Wasm** | Lazy initialize; SQL over registered local/remote tabular data; prefer Arrow results; single-threaded GitHub Pages bundle. |
| Zarr | **zarrita.js** | Zarr v2/v3 where codecs supported, remote chunked stores, named array paths, dimension slicing via adapter. |
| NetCDF classic | **netcdfjs** | NetCDF-3/classic and 64-bit offset; do not mislabel as NetCDF-4 support. |
| NetCDF-4/HDF5 | **netcdf4-wasm**, with **h5wasm** or **jsfive** considered as fallback | Validate actual browser distributions and **real sliced variable reading** on representative files. HDF5 reading does not imply full NetCDF semantics. May be deferred to phase 2 if reliable slicing is unavailable. |
| Rich JS editor | **CodeMirror 6** (optional) | Loaded on demand; plain textarea fallback always available. |
| Utility plotting / data operations | Native JS and typed arrays first | D3 may be used for narrowly justified helpers; do not import all D3 simply to reproduce Plotly behavior. |

**Selection principle:** Plotly for conventional charts, MapLibre for geographic basemaps/geometries; do not draw millions of points as DOM/SVG nodes. Do not include deck.gl unless actual performance tests establish that MapLibre/Plotly are insufficient for a target rendering workflow.

Reference documentation:
- Plotly: https://plotly.com/javascript/
- MapLibre: https://maplibre.org/maplibre-gl-js/docs/
- PMTiles: https://docs.protomaps.com/pmtiles/
- DuckDB-Wasm: https://duckdb.org/docs/stable/clients/wasm/overview
- hyparquet: https://github.com/hyparam/hyparquet
- zarrita: https://zarrita.dev/get-started.html
- netcdfjs: https://github.com/cheminfo/netcdfjs
- netcdf4-wasm: https://github.com/oceanum/netcdf4-wasm
- h5wasm: https://github.com/usnistgov/h5wasm

## 4. Required user workflows

### 4.1 Open a dataset

- Drag/drop one or multiple local files; provide file picker and paste-text options.
- Support local `.csv`, `.tsv`, `.json` (array of records and common tabular shapes), `.geojson`, `.parquet`, `.nc` and `.zarr` **subject to format-specific restrictions**.
- Support HTTPS URLs to CSV/JSON/GeoJSON/Parquet; support HTTPS URLs to Zarr stores/array paths; provide an optional remote NetCDF URL only when the reader path is known to work, rather than promising universal NetCDF-by-URL.
- Detect formats using signature/magic bytes where possible; do not rely solely on extension. NetCDF classic (`CDF`) versus HDF5-backed NetCDF-4 signature must be distinguishable. Show an actionable failure for unsupported formats/codecs.
- Render a quick dataset overview: source name/URL, format, size if available, columns/variables, types, dimensions/shape, units, missing values, and a preview of up to a bounded number of records.
- Multiple datasets may coexist and be labeled or removed independently. Deduplicate names visibly; never silently overwrite a dataset.
- Local files must not be uploaded. Avoid any external service calls except dependency and user-requested data URL fetching.

### 4.2 Query and selection

Define **two distinct kinds of query**, not one magical query box:

**Tabular:**
- A visual filter builder for field, operator, comparison value(s), AND/OR grouping at least at one level; sort; select columns; row limit; sample strategies.
- An optional SQL panel backed by DuckDB-Wasm for CSV/JSON/Parquet and appropriately materialized tabular datasets.
- Display query status, elapsed time, number of returned rows, selected/loaded columns, and whether filtering was pushed down into the reader/query engine or applied in memory.
- Register named datasets as queryable tables with stable, sanitized SQL identifiers; keep displayed filenames separate from internal SQL identifiers. Never naively interpolate user-supplied table names, paths, or UI values into arbitrary SQL fragments.
- Present query results as a **derived dataset**, leaving the source data unchanged. Results can be plotted or tabulated. Permit canceling/interrupting where the engine exposes that capability; otherwise provide a bounded timeout/UI cancel request with honest limitations.

**Multidimensional (NetCDF/Zarr):**
- Variable/array chooser, dimension browser, named index selection, start/end/step slicing, coordinate-based nearest index or range when coordinate metadata is available, and display of the estimated output shape/element count **before reading**.
- Support common operations: select one timestep, lat/lon spatial slice, one feature ID, timeseries along a chosen dimension, optional reductions such as mean/min/max/sum over a dimension for manageable selections.
- Make the requested slice explicit, e.g. `precipitation[time=12, y=100:400, x=200:500]`; do not pretend SQL applies directly to raw N-D arrays.
- When selected multidimensional values are converted to a table for SQL or plotting, label the conversion clearly. Flattening must be **opt-in or bounded**, not an accidental trillion-row allocation.
- When server read access is inefficient or impossible, report that limitation and offer smaller local-file slices where supported.

### 4.3 Plot data

- Open a chart type, select an existing or derived dataset, bind fields/axes/encodings via drop-downs, configure styling, then render immediately or using an explicit Apply button (recommended for heavy data).
- Update charts without losing unrelated UI state; use `Plotly.react`/appropriate API rather than recreating the whole application.
- Support multiple traces on one chart, even from different datasets, with independent labels and styles.
- Allow multiple separate charts in a simple tabbed or resizable grid workspace. Support basic Plotly subplots in a later phase with explicit axis/scene mapping. No complicated drag/drop dashboard builder needed.
- Clicking a point can reveal a selected record (if available) without forcing large hidden datasets into Plotly hover payloads.

### 4.4 Programmatic mode

- Include a collapsible JavaScript editor for generating arrays or deriving new datasets. Accept a documented function contract such as `async function transform(api) { ...; return { kind: 'table', ... }; }` or a return of `{data, layout, config}` for expert Plotly use.
- Expose documented read-only dataset access, selected-column/slice fetching, typed array helpers, and controlled publishing of derived datasets. Avoid exposing raw mutable internal state to scripts.
- Provide example snippets: sine curve, random scatter, 3D helix/line, bubble chart, grouped bar, filter+aggregate, spatial heatmap.
- **Security:** Treat user-entered JS as fully trusted code for the origin. Do not claim `new Function`, `eval`, or a worker is a sandbox. If allowing imported/shared executable scripts, require explicit consent before execution and use a strongly isolated execution design (such as sandboxed iframe on a separate origin) where feasible. Never run saved scripts automatically on load.
- If secure isolation cannot be implemented under the one-file constraint, restrict code execution to code typed/pasted and explicitly Run by the current user, with an unmistakable warning that it can access data and make network requests with page privileges.

## 5. Visualization types and controls

### Phase 1 (must implement)

| View | Required bindings | Renderer / notes |
|---|---|---|
| 2D scatter | X, Y; optional color, size, group, hover fields | Plotly `scatter` / `scattergl` as supported; preserve categorical vs continuous color choices |
| Bubble | X, Y, size; optional color, label | Plotly scatter with visible marker-size scale and sensible clamping |
| 2D line | X, Y, optional series/group | Plotly scatter with `lines` or `lines+markers`; sort X optionally, never silently reorder original rows |
| 3D scatter | X, Y, Z; optional color, size, hover fields | Plotly `scatter3d` |
| 3D line | X, Y, Z; optional group | Plotly `scatter3d` with `mode:'lines'` or `lines+markers`; order follows records unless explicitly sorted |
| Bar | Category/X, numeric/Y; optional group | Vertical/horizontal, grouped/stacked |
| Box-and-whisker | Numeric value, optional category/group | Plotly box; show underlying points optionally |
| Histogram | Numeric value, optional group | Bin control and normalization |
| Table | Selected columns | Virtualized or paginated DOM table; optional Plotly table for chart export only |
| Map points | Latitude, longitude; optional value, size, label | MapLibre; automatic detection must be user-confirmable. No API-key-only basemap dependency |

### Phase 2 (should implement)

- Heatmap: 2D matrix/regular gridded N-D slice or aggregated tabular bins.
- 3D surface: regular grid with explicit shape and dimension mapping.
- GeoJSON line and polygon overlays, map legend, viewport bounds, basemap/style selector, and PMTiles option.
- Linked axis zoom and shared hover where technically appropriate.
- Subplots: 2x1, 1x2, 2x2, shared/independent axes, per-panel trace assignment.
- Chart layout presets and reproducible chart templates.

### Common plot controls (Phase 1 unless marked)

- Chart title, subtitle/annotation (subtitle optional), axis labels, units, legend display, legend position/orientation, trace name, trace visibility.
- Axis mode: linear/logarithmic, date, categorical **when the chart supports it**. Validate strictly positive values for log axes; explain omission or invalidity rather than producing nonsense. 3D axis scale support must be verified against Plotly's actual scene-axis API.
- Explicit axis min/max, auto-range, reversed direction, grid toggle, tick formatting where supported.
- Numeric and categorical color scales; min/max, reverse palette, show/hide color bar; legend separate from continuous color bar.
- Marker size, opacity, outline; line width, dash and color; symbol where supported.
- Hover field selection, formatting/precision and units, hover template; escape/sanitize freeform metadata in HTML renderers.
- Date/time **range selector and slider** for eligible 2D time-series charts; don't promise universal sliders for 3D/map traces.
- Pan, zoom, autoscale/reset axes, 3D camera rotation/reset, map pan/zoom, save image.
- Point limits, sampling indication, and an explicit “show all (may be slow)” action with warning, if permitted by resource guardrails.
- Responsive resize and theme (light/dark) with readable labels.
- Per-trace data source and underlying selected query/slice reference. Re-render must be reproducible from saved settings.

## 6. Data abstraction: avoid making everything rows of objects

Use a small in-page adapter interface. Document the interface with JSDoc typedefs and TypeScript-style generics in comments. **Do not introduce a framework or compile TypeScript.**

Each adapter should implement conceptual operations:

- `probe(source)` → recognition result / capabilities.
- `open(source, options)` → dataset handle; lazy where possible.
- `describe(handle)` → format, metadata, schema (fields or variables and dims), units, shape, capability flags.
- `readTable(handle, {columns, filter, offset, limit, signal})` → bounded columnar/Arrow-style or row-form output plus truncation metadata.
- `readArray(handle, {variable, selections, reduction, signal})` → `{data: TypedArray, shape, dimensions, coordinates?, metadata}`.
- `close(handle)` → free resources and revoke temporary URLs.

Not every adapter implements every method. Capability flags drive the UI; unsupported operations must be disabled with an explanation. Prefer columnar arrays/typed arrays and Arrow for large tabular data; use object-per-row only for small previews and convenient UI editing. Preserve source metadata; derived datasets are distinct immutable logical views with provenance. Do not copy huge buffers unnecessarily.

**Canonical dataset model** contains ID, label, source type, format, adapter ID, capability flags, schema, handle, current selection, errors, estimated bytes, and optional provenance. Never persist live `File` objects, WASM handles, or credentials in exported session JSON.

**Typed fields:** number, integer, datetime, string/category, boolean, geometry, unknown. Preserve integer/float distinction where useful, and treat missing/NaN/infinite values explicitly. For geographic plotting, detect coordinate names heuristically but require confirmation.

**NetCDF/CF conventions:** preserve dimensions, units, coordinate variables, `_FillValue`, `missing_value`, `scale_factor`, `add_offset`, calendars and time units. Apply packing/fill transformations correctly where supported. Do not silently convert unusual CF calendars into ordinary JavaScript `Date` objects with incorrect semantics; retain labels or show an unsupported-calendar notice.

## 7. Layout and interaction specification

Desktop layout:

- Compact top toolbar: file picker/drop zone, URL input, dataset selector, Save Session, Export, Help.
- Left collapsible **Data** pane: list of datasets, fields/variables, metadata, row/array preview, dimensions.
- Middle/top **Query & Transform** pane: visual query/filter or dimension selector; tabs for SQL and JS.
- Main **Visualization** pane: chart canvas, trace list, selectable chart type, axes and styling controls.
- Bottom optional **Table / Diagnostics** drawer: sampled records, source/query information, parse warnings, load/render timings, memory estimates.
- Workspace may use a left control sidebar + large plot area rather than cramming all panes on screen simultaneously. Favor responsive splitters and collapsible panels; do not pull in a full layout framework.

Required interaction details:

- Loading/progress indicator for large operations; Cancel where supported.
- Clear empty state with a sample dataset button (locally generated in JS).
- Warnings for CORS errors, unsupported codec, out-of-memory risk, incompatible axes, too many points, missing variables.
- Separate “Load/Query” from “Render” for expensive operations.
- Keyboard accessible form controls, explicit field labels, sufficient contrast, accessible status messages.
- Avoid reinitializing maps/charts while editing a title or toggling a sidebar.

## 8. Performance requirements

This is a viewer, so time-to-first-use matters more than implementing every possible feature.

1. **Lazy-load** heavy readers/WASM and map support. Cache module promises to avoid duplicate loads.
2. Parse and query large datasets in workers where practical, leaving the UI responsive. Start with one or two workers; use a bounded pool **only if profiling proves the benefit**.
3. Use transferable `ArrayBuffer`s where ownership can be safely handed off. Do not transfer a buffer still needed by its producer; avoid costly copies.
4. For Parquet, read metadata and requested columns/row ranges; attempt predicate/projection pushdown through DuckDB where available. Not every filter will push down; report execution method honestly.
5. For Zarr, retrieve selected chunks and avoid whole-array materialization. Cache bounded reusable chunks, with eviction.
6. For local NetCDF, prefer variable/slice reads where genuinely supported. If a library requires reading the whole file, show estimated memory cost and refuse oversized files unless user explicitly overrides reasonable safeguards.
7. For remote reads, use HTTP byte ranges where the chosen adapter supports them. If the server ignores `Range` or lacks usable CORS headers, display fallback/cost, rather than silently fetching multi-GB assets.
8. Never pass an unbounded million-row result directly into Plotly by default. Provide sensible caps (e.g. default ~50k 2D points, lower for 3D), editable thresholds, sampling/aggregation, and visible indication when data is sampled.
9. Downsample line charts using an extrema-preserving or LTTB-style strategy rather than naive every-Nth sampling when preserving peaks matters. Box plots and histograms require statistically appropriate aggregation; **never calculate them from an unmarked visual-only sample** and call the statistics exact.
10. Table previews must be paginated or virtualized; do not create hundreds of thousands of DOM rows.
11. Use request tokens/cancellation to discard stale results when the user switches dataset, variable, or query mid-load.
12. Clean up worker jobs, WASM resources, object URLs, event handlers, old map/chart contexts, and dataset handles on replacement/removal.
13. Measure input size, bytes fetched, rows/values selected, parse time, query time, render time and whether sampling was used. A Diagnostics drawer can reveal these counters.

**Performance acceptance targets** (guidance, to be measured rather than assumed): interface interactive after initial dependencies load; 100k-row CSV/Parquet metadata/preview without main-thread freezes over ~250 ms; user can operate controls while a larger query runs; 2D charts with tens of thousands of points remain usable; reject/guard impossible N-D reads before allocation. Benchmark with representative files, not just tiny hand-generated examples. Memory, dataset layouts and device capability will affect exact results.

## 9. Security and remote access boundaries

- No backend means **all remote data retrieval is done by the browser**. It is subject to browser CORS, HTTPS/mixed-content restrictions, credential mode, authentication, CSP, and server support for `HEAD`/`GET`/`Range` as relevant.
- GitHub Pages does not bypass CORS. Never propose an arbitrary public CORS proxy as a default workaround for scientific or private data.
- Remote URLs must not embed credentials in exported sessions or logs. Do not persist authentication tokens. Support public URLs first; authenticated URL workflows are deferred unless their browser security model is explicitly reviewed.
- Limit data preview text rendered into DOM, escaping HTML; avoid raw `innerHTML` for file-derived strings. Apply URL validation for user-provided links.
- Loading dependencies from CDNs inherently contacts third parties. Document privacy implications and consider SRI for suitable classic script assets. Pin exact versions; verify hashes/distributions.
- Imported session JSON is treated as **data**, not executable code. Show embedded JS without automatically running it. Do not allow a session to inject arbitrary HTML attributes or scripts.
- Code textbox executes only by an explicit Run action. Show a persistent reminder that executing arbitrary JS on the page can read opened data and make browser-permitted requests.
- Browser limits: finite memory, slower WASM than native in some workloads, single-threaded DuckDB under normal GitHub Pages, unavailable or expensive remote scientific format operations.

## 10. Persistence, export, and reproducibility

Implement:

- Export chart as PNG and SVG when the selected renderer/trace supports it; if a map raster/screenshot is blocked by tainted canvas, explain the limitation. Plotly's SVG export varies with WebGL-based traces, so do not guarantee purely vector results for WebGL plots.
- Export a bounded selected/derived tabular result as CSV/JSON; warn before materializing excessive results.
- Export Plotly `data/layout/config` JSON and optional standalone HTML **for compatible Plotly charts**. Clearly note external library dependencies in generated HTML; an entirely offline self-contained HTML export may substantially increase file size and is optional.
- Export a **session JSON**: dataset references, source filenames/URLs, nonsecret metadata, query definitions, dimension selections, JS text (disabled on import), chart types, fields, styling, layout, provenance. Local file handles are not serializable; re-import should prompt users to reselect required local files.
- Restore sessions from JSON; do not automatically run embedded scripts or access remote URLs without a visible user action when privacy/security is material.
- `localStorage` may remember UI preferences only. IndexedDB/OPFS dataset caching is optional phase 3; avoid silently consuming large amounts of browser storage.

## 11. Implementation phases, in mandatory order

### Phase 0 — feasibility spikes (required before committing to libraries)

1. Render one CDN-loaded Plotly `scatter` and one `scatter3d` in `viewer.html` on GitHub Pages path semantics.
2. Load a real local Parquet and inspect schema via hyparquet; read selected columns.
3. Instantiate DuckDB-Wasm from CDN using single-threaded worker/WASM, run a query on that Parquet, and verify cleanup.
4. Open a public CORS-enabled remote Zarr store and fetch a small N-D slice via zarrita.
5. Open a NetCDF-3 sample via netcdfjs, and a NetCDF-4 sample via the best verified WASM/HDF5 reader; record actual support for variable slicing and codecs. If NetCDF-4 support is defective, mark it experimental rather than faking completion.
6. Load MapLibre lazily and show local GeoJSON/point data without an API key.
7. Test the same file on a GitHub Pages-like project subpath and with offline CDN requests blocked, verifying useful error messages.

### Phase 1 — useful minimal viewer (release gate)

- One page, responsive UI, drag/drop and paste, local/remote CSV/JSON/Parquet, metadata/preview, query/filter/SQL, table preview, dataset registry.
- Plotly chart types: 2D scatter, bubble, line, 3D scatter, 3D line, histogram, box, bar, table.
- Basic MapLibre point map and GeoJSON, plot titles/axes/legend/hover/colors/styles/ranges, multiple traces.
- Generate sample datasets, explicit code execution panel, export chart/config/session.
- Loading/error states, cancellation where possible, safeguards against excessive allocations, no external build/runtime dependencies.

### Phase 2 — scientific multidimensional + advanced charts

- NetCDF-3, reliably tested NetCDF-4/HDF5 support, remote Zarr, full dimension/slice panel and coordinate/CF handling.
- Heatmaps, surfaces, time slice controls, dimension reductions.
- Query-result-to-plot and selected-slice-to-tabular workflows; GeoJSON lines/polygons; basic subplots.
- Performance benchmarks on real scientific files, memory bounds, and robust error handling.

### Phase 3 — optional refinements

- Rich editor with CodeMirror, complex SQL presets, optional PMTiles, linked subplots, reusable templates, query history, IndexedDB caching, more format/codecs, map performance enhancements.
- Do **not** begin phase 3 while basic file loading, data selection, and chart configuration remain unreliable.

## 12. Acceptance criteria / test matrix

A feature is **not complete** until the corresponding test passes in the browser without a backend:

| Scenario | Expected behavior |
|---|---|
| `viewer.html` hosted under GitHub Pages project path | Works without a build system, npm, backend, or root-path assumptions |
| Local CSV and JSON with commas, quotes, missing values | Schema and bounded preview correct; selectable fields |
| Local Parquet with 100k+ rows | Reads selected columns, SQL query returns expected results, no UI lockup |
| Remote Parquet permitting range/CORS | Metadata/selected reads work; network bytes and failure states observable |
| Remote Parquet denying CORS | Clear actionable error; no bogus empty dataset |
| Zarr variable with 3 or 4 dimensions | Reads chosen spatial/time subset without allocating whole source array |
| NetCDF-3 | Enumerates dimensions/variables and extracts expected values |
| NetCDF-4/HDF5 | Proven functional on a documented representative fixture or explicitly marked unsupported/experimental |
| 2D scatter, bubble, line, bars, box, histogram | Correct field bindings, useful hover, axis configuration, legends |
| 3D scatter and 3D line | Rotate/zoom; correct XYZ and trace grouping |
| Map | Loads geographical data, handles valid/invalid coordinates, works without an API key |
| Log axis with zero/negative values | Warns and explains what cannot be displayed; never silently fabricates values |
| Multi-trace comparisons | Independent dataset bindings and labels retained across edits |
| Time-series range selector | Works for an eligible 2D date axis; absent/disabled for ineligible plots |
| Large scatter input | Samples/aggregates or refuses with clear indication, no frozen tab |
| Session export/import | Restores chart config; prompts to reselect local files; never auto-runs JS |
| Dataset removed during query | Cancels or ignores stale result, releases references |
| CDN unavailable | Clear library-specific failure instead of blank page |
| Single HTML source check | Authored CSS/JS inline; only version-pinned external dependencies; no `index.html` generated |

For the Phase 0 and Phase 2 NetCDF fixtures, test at least one packed variable with `scale_factor`/`add_offset` and fill values, and verify the displayed result against known expected values. For Zarr, include one compressed dataset and document decoder compatibility. For Parquet, include nulls, timestamps, and several physical types.

## 13. Implementation discipline for an LLM coding agent

- **Follow the spec in phase order**, and keep the application usable at the end of every phase. Do not jump to advanced features while ordinary plotting is broken.
- Prefer clear, conventional JavaScript with **JSDoc type annotations for public functions, parameters, and returns**, descriptive names, small functions, and concise explanatory comments. Do not create enormous anonymous callbacks or clever meta-frameworks.
- Each meaningful function, class, or module-style section generated by an AI coding agent should include a `TODO (AI-generated): review ...` note identifying the generated code for human review. Avoid flooding every trivial line with boilerplate.
- Since everything lives in one HTML file, use **well-marked sections** in a predictable order: imports/dependency registry, CSS, state/model, adapters, query, chart translation, mapping, editor, UI bindings, startup. Group related functions rather than organizing by arbitrary initialization chronology.
- Keep adapters independent and make capabilities explicit; do not force all data into one `Array<object>` representation.
- Do not wrap the entire app in one monolithic stateful class. One clear shared state registry with pure transformation helpers is preferable.
- Keep chart specification separate from Plotly's final trace/layout object: UI state → normalized chart spec → Plotly/MapLibre configuration → renderer. This prevents UI configuration becoming tightly coupled to every renderer detail.
- Do not manufacture demo values in place of failed loads. Never report a plot as showing complete raw data when it is downsampled or incomplete.
- Log unresolved choices and scientific-format limitations within an inline developer-notes comment in `viewer.html`, or a separate `DECISIONS.md` **if project documentation files are allowed**. This does not violate the single-runtime-page constraint; the deliverable page itself remains one file.
- If a dependency requires local asset hosting or build-time transformation and no reliable pinned CDN path works, explicitly report the incompatibility and select an alternative. **Do not quietly add a runtime backend or npm.**

## 14. Completion definition

Deliver **`viewer.html`** as the sole required deployable application page, plus an optional short README and static test fixtures/documentation. It must be usable directly from a GitHub Pages HTTPS URL, with no server-side endpoint and no project-specific library files needed. Users can load ordinary datasets, inspect schema, query tabular data, slice multidimensional data as supported, select chart fields, render and configure the requested chart types, and export reproducible results without writing application code. Features not supported due to browsers/format restrictions must be clearly surfaced, not silently emulated.

**Design maxim:** *One page, serious data capabilities, no invented infrastructure.*
