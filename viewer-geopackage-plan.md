# GeoPackage support — tasks only

Status: **not implemented**. These are proposed work items, not capability claims. Keep the static one-HTML runtime, pinned lazy dependencies and viewer-prefixed authored resources. No backend, system packages, uploads, editing or GeoPackage writing is proposed.

Reference scope: the [OGC GeoPackage standard](https://www.ogc.org/standards/geopackage/) covers vector features, tile imagery and nonspatial tables within SQLite. Use the [normative encoding specification](https://www.geopackage.org/spec/) for validation and fixtures. Record the supported specification versions and extensions explicitly.

## 1. Feasibility and scope gate

- [ ] Separate delivery gates: feature/attribute reading first; raster tile display second; extension support only after representative fixtures pass. Define whether coverage, related-table and custom geometry extensions are deferred.
- [ ] Evaluate browser SQLite/WASM readers and GeoPackage libraries using actual pinned CDN artifacts, licenses and worker entry points. Verify single-threaded operation without SharedArrayBuffer/COOP/COEP, a bundler or hosted project assets. Document the chosen engine and rejected alternatives.
- [ ] Prove local File random reads versus full buffer copies; measure WASM memory and cleanup with a 300 MB file. Do not assume selective SQLite reads simply because SQLite is page based.
- [ ] Prove public HTTPS random reads with CORS/HEAD/exposed length/206 responses if the reader offers an HTTP VFS. Otherwise require an explicit bounded full download or local file. Specify behavior for ignored Range and inconsistent remote revisions.
- [ ] Test project-subpath hosting, offline/CDN failure, Chromium, Firefox and Safari before committing to the reader. Install development tooling only through npm/conda in the designated temporary directory.

## 2. Recognition, metadata and layer selection

- [ ] Probe SQLite signature, GeoPackage application/version identifiers and required metadata. Recognize supported legacy identifiers deliberately; distinguish ordinary SQLite, damaged files and unsupported versions.
- [ ] Read contents, geometry columns, spatial reference systems, tile matrix metadata, extensions and optional descriptive metadata. Validate identifiers, schemas, row references and declared geometry/CRS consistently.
- [ ] Add a layer/table picker with feature, attribute and tile types, names, bounds, CRS and supported-operation explanations. Treat each selected layer as an independent dataset with source package/layer provenance.
- [ ] Implement probe/open/describe/readTable/close adapter contracts and honest table/map/SQL capabilities. Define counts as exact or estimated, not a mandatory unbounded startup scan.
- [ ] Preserve nulls, booleans, timestamps, integer precision and binary columns. Keep large geometry/BLOB values out of ordinary preview text; show bounded summaries.

## 3. Vector features and coordinate handling

- [ ] Decode GeoPackage geometry headers and WKB safely: byte order, envelope flags, empty geometries, SRS IDs, Point/LineString/Polygon, multi-geometries and collections. Bound nested depth, coordinate counts and blob length; handle Z/M without silently misrepresenting them.
- [ ] Verify supported geometry extensions; report unsupported curves/custom geometry clearly rather than displaying incomplete shapes as complete.
- [ ] Transform supported layer CRS to the existing WGS84 map contract. Evaluate a pinned browser reprojection dependency; handle EPSG identifiers, WKT/custom definitions, axis order and units. Unknown/undefined CRS must require a supported CRS choice or an actionable refusal. Do not guess degrees from numeric ranges.
- [ ] Produce bounded GeoJSON for MapLibre, preserve feature IDs and properties, fit bounds, and report omitted/invalid/empty geometries. Address antimeridian crossings and multi-layer styles/legends.
- [ ] Paginate attributes with stable ordering. Use RTree bounds indexes when available, with a bounded fallback and execution-method notice. Remember that bounds candidates need exact geometry checks for precise spatial predicates.
- [ ] Add layer/viewport/attribute filtering and projection with cancellation. Define explicit maximum returned features and vertices; disclose sampling and clipped/truncated results.

## 4. SQL and existing viewer integration

- [ ] Decide whether source queries run read-only SQLite or use bounded Arrow registration in DuckDB. Explain dialect differences and whether operations push down; never imply DuckDB reads arbitrary GeoPackage geometry directly.
- [ ] Quote discovered identifiers, parameterize values, and disallow writes/extension loading/unsafe pragmas or attachments. Opening a package must not execute its triggers or user-authored SQL.
- [ ] Reset dependent layer/field/filter/CRS controls on package/layer changes; keep unrelated trace bindings intact. Cancel stale readers and clear displayed selections/results.
- [ ] Session references must retain package filename/public URL, layer, source CRS, query, styles and provenance, without files/WASM handles/raw content. File reselection must reconnect the correct layer and validate its schema.
- [ ] Export bounded attributes/GeoJSON and chart/session configuration with documented geometry/CRS semantics. GeoPackage export/editing remains out of scope unless separately requested.

## 5. Tile delivery gate

- [ ] Read tile matrix sets, zoom levels, tile dimensions, bounds, CRS and pixel sizes; do not assume XYZ/Web Mercator numbering.
- [ ] Implement a bounded MapLibre tile provider with correct GeoPackage row/column orientation, reprojection feasibility, zoom selection and missing-tile behavior. Fail clearly for unsupported projections.
- [ ] Decode verified PNG/JPEG types lazily; extensions such as WebP/elevation/gridded coverage require independent codec/data-model support and tests.
- [ ] Bound visible tile requests and cache bytes, evict entries, cancel stale viewport work and revoke object URLs. Verify image export/tainted-canvas limits rather than promising universal screenshots.

## 6. Limits, diagnostics and acceptance

- [ ] Budget source bytes, SQLite/WASM copies, result cells, decoded coordinates and tiles independently; keep the 300 MB full-file guard, bounded previews and workspace estimate. Measure load/query/render timings and peak memory; publish supported practical limits.
- [ ] Close databases/VFS/workers and free geometry/tile caches on removal, replacement, cancellation and failed open. Repeated loads must not accumulate retained handles.
- [ ] Supply actionable errors for non-GeoPackage SQLite, corrupt metadata, unsupported versions/extensions/CRS, malformed geometry, missing layer, locked/encrypted databases, CORS/range/CDN failures and memory limits.
- [ ] Validate real fixtures against independent trusted reference results: multiple feature and attribute layers; every supported geometry type; multipart/collections/Z/M; null/empty values; Unicode/large integers/dates; EPSG:4326, projected CRS and unknown CRS; RTree/no RTree; empty layers; PNG/JPEG matrices and missing tiles.
- [ ] Test malformed/truncated/adversarial files, unknown extensions, SQL identifier injection, wrong headers, oversized geometry, cancellation during open/query/tiles, layer switching, removal, session reselection and source immutability.
- [ ] Benchmark representative small and near-300 MB packages, sparse previews, repeated viewport changes and remote request costs. Verify responsive controls and diagnostics with no backend.
- [ ] Update Help, README, inline contracts, validation evidence and `.llm` breadcrumbs. Mark each capability complete only after its browser acceptance test passes. Keep tile and extension phases visibly deferred until then.
