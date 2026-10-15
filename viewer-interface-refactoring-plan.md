# Viewer interface refactoring plan

**Status: planning only. No interface or runtime changes are implemented by this document.**

Prepared for a future session from the current `viewer.html`, project instructions, README, tests and handoff notes. The user's request is to simplify the interface, prevent irrelevant settings from causing rendering failures, explain the data/series model, and provide usable fixes where the application already knows the solution. Implement the phases below only in the later implementation session.

## 1. Outcome and scope

A user should be able to open data, choose a graph, select the required values and render without understanding Plotly, internal dataset IDs, or the complete settings inventory. Additional controls should appear only when relevant to the selected graph and data. A recoverable problem should offer a nearby, specific action instead of requiring navigation through nested settings.

Keep supported capabilities available through progressive disclosure. Preserve independent series bindings, derived-data provenance, truthful sampling/statistics notices, cancellation, exports and sessions. Do not trade a smaller form for silent data conversion, discarded work or incorrect plots.

The implementation must retain:

- The static, browser-only, single authored runtime page `viewer.html`, with inline CSS/JS and pinned lazy CDN dependencies.
- The 300,000,000-byte common guard, 1 GiB conservative workspace estimate and existing row/slice/render/session limits unless a separately justified change is requested.
- Existing instruction files, landing page, unrelated user changes and current format limitations.
- Existing JSDoc, strict checking, review markers and `.llm` breadcrumbs.
- `/DMOD/christopher.tubbs/tmp` for temporary work; installations only through npm/conda, never dnf.

The existing SPEC-versus-STYLE packaging conflict is already resolved in favor of SPEC's inline runtime. This refactor does not authorize splitting deployed application code into local resources, introducing a framework/build/backend, implementing GeoPackage, or widening scientific-format support. GeoPackage remains the separate `viewer-geopackage-plan.md` task list.

## 2. Confirmed problems and code touchpoints

These findings are based on source inspection, not a new browser usability study.

| Current area | Problem | Future work |
|---|---|---|
| Visualization markup, `viewer-x/y/z`, size/color/group/hover controls | Every graph shares the same binding form and ambiguous labels such as `Y / latitude / value` | Show graph-specific roles and required/optional fields |
| Trace appearance markup | Histogram bins/normalization, bar orientation, box points, line styles and marker styles share one panel | Split relevant type settings from optional appearance |
| `saveChartControls()` | Reads/validates every numeric control, including histogram bins for nonhistogram graphs, and every axis | Read and validate only applicable effective settings; invalid inactive drafts cannot block navigation/render |
| `translateTrace()` | Collects size/color/group/hover fields without first checking graph support; validates marker size/color even where the renderer cannot use them | Obtain required read fields from the same graph contract as the UI |
| `updateVisualizationCapabilities()` | Primarily gates date slider, legend and color bar; cannot describe all graph/data dependencies | Replace its scattered eligibility checks with a small explicit capability description |
| `loadTraceControls()`, `assignDefaultFields()`, `changeViewerSelection()` | Shared defaults and broad form synchronization obscure what changed and why | Centralize small, explicit type/source transition rules |
| `createAxisControls()`, `validateAxisValues()` | Axis scale is deeply nested; errors explain a path rather than offering a direct fix | Add nearby scale summary and buttons for safe known resolutions |
| `renderChart()` | Some renderer-family and single-table incompatibilities are detected only after Render | Validate chart composition before expensive reads and guide users to a separate chart |
| `publishTable()`, `readSelectedSlice()` | Derived results change the inspected dataset; slice creation also rebinds the current trace | Make creation and series binding separate, visible choices |
| Data/trace selectors | `Active dataset`, `Trace`, `Trace dataset` expose internal distinctions without explanation | Adopt inspection-versus-plot terminology and a persistent source summary |
| `viewer-sidebar-toggle`, sidebar action | Toggle is in the plot toolbar, visually detached from the sidebar | Place collapse/reopen controls on the sidebar boundary |
| `runUiAction()` | Generic error text is associated with the inspected dataset, which may differ from the failing series source | Carry explicit operation/source/series context into actionable issues and diagnostics |

Use function names and control IDs as navigation anchors; line numbers will change during implementation. The integrated HTML is canonical. Do not regenerate it from obsolete temporary staging sections.

## 3. Explain the model using user-facing terms

Keep internal IDs and serialized `Trace` properties stable where practical. Change visible labels and explanations first.

| Internal concept | Proposed label | Plain-language explanation |
|---|---|---|
| Dataset | Dataset | A file, connection, generated data, or a result available in this browser session |
| `activeDatasetId` | Dataset to inspect | The dataset shown in the preview and used by data-selection/filter tools. Selecting it does not change existing plotted series |
| Derived dataset | Result dataset | A new dataset made by filtering, querying, slicing or transforming other data. The original remains unchanged |
| Chart | Chart | A plot workspace containing one or more series and shared chart settings |
| Trace | Series | One plotted layer with its own source, field choices and appearance. Multiple series can compare different datasets |
| `trace.datasetId` / Trace dataset | Data for this series | The dataset used by the selected plotted series. It can differ from the dataset currently being inspected |
| Group-generated Plotly traces | Categories within a series | One configured series can draw several categories; these are not separate editable series unless deliberately created |

Place a short explanation next to each selector using associated help text, not a tooltip alone. Offer a compact “How data and charts relate” disclosure with an example:

> Open `flows.csv`. Filter it to create `flows — selected stations`. Inspect either dataset without changing the chart. Set Series 1's data to the filtered result. Add Series 2 using the original file to compare them.

Show a summary above the plot: `Chart: Streamflow · Editing series: Station A · Data: flows — selected stations`. When inspection and plot data differ, show a brief neutral note: `Inspecting flows.csv; this series uses flows — selected stations`, with **Inspect series data** and **Use inspected data for this series** actions. The latter explicitly rebinds only the selected series.

Result datasets need a visible `Result` badge, parent/source name and short operation summary. Put full provenance and raw metadata behind **Details**. A result can have multiple inputs or no parent file (generated code); never invent a single parent or imply a live query. Removing a parent need not remove a resident result; imported results still require regeneration according to existing restoration limits.

## 4. Proposed information layout

Use the existing responsive sidebar/plot structure, with two main sidebar sections or native tabs: **Data** and **Plot**. Do not force a rigid wizard that prevents exploration.

### Data

Default view: dataset selector, Open/Paste/Connect entry points, compact format/row-or-shape summary, preview, and one relevant primary selection tool. Show filters for tables and array selection for arrays. Mark pending session references with a clear reselection action.

Keep full field inventory, missing-value statistics, source URL, raw metadata and diagnostics collapsed. SQL and JavaScript move under explicitly named **Advanced transformations** disclosures; retain the trusted-code warning when its editor opens. Full source URLs and internal SQL names belong in details, not the primary workflow.

For queries/slices, show what will be created before running. On success display a result card: `Created [name] from [source]`, row/shape/subset summary, **Plot this result**, **Inspect result**, and optional rename. Creating a result must not silently replace the selected series. **Plot this result** is the explicit binding action; it must not trigger an expensive render without a visible Render action or a clearly stated action label.

### Plot

Default view in order:

1. Chart selection and a compact series summary.
2. Graph type and **Data for this series**.
3. Required bindings with labels appropriate to the graph.
4. Nearby field type/scale summaries and any blocking issue with its fix.
5. **Render** (or **Update plot** when a prior render exists).

Put type-specific options immediately below required bindings, collapsed where sensible. Appearance, axes/ranges, grouping/color/hover, multi-series controls, subplots and sampling limits are progressively disclosed. Hide entire empty sections. Chart title remains easy to find; sharing/export controls use the actual renderer's capabilities.

With a single series, avoid a large trace-management form; show its summary and **Add comparison series**. Reveal the series list when there are multiple series or the user opens **Series**. Retain chart switching and all existing independent bindings.

Keep succinct loaded/subset/sampling notices visible near the plot. Move verbose timing/memory/dependency reports to Diagnostics. Error guidance must remain visible even with advanced panels closed.

### Sidebar visibility

Move **Hide controls** into the sidebar header or its edge, adjacent to the area it controls. When collapsed, leave a **Show controls** button on the same left boundary; it must not disappear with the sidebar. On small screens use an anchored drawer trigger with the same relationship.

Use `aria-controls`, accurate `aria-expanded`, visible labels and keyboard focus. Return focus to the opener when closing a mobile drawer; support Escape where appropriate and prevent hidden controls from receiving focus. Opening/closing controls must preserve scroll, edits and map/plot state and must not reinitialize a renderer. Native button handling must remain usable without pointer hover.

## 5. Graph-specific binding and settings contract

This table is the intended default interface contract. Verify each capability against the existing translator and pinned renderer during implementation; a renderer feature is not supported just because its library supports it. Do not reveal controls whose implementation has not been verified.

| Graph | Primary bindings / labels | Applicable type options | Hidden or excluded inputs |
|---|---|---|---|
| 2D scatter | X field, Y field | Marker appearance; optional verified size/color/group/hover encodings | Z, line-only options, bins, normalization, bar orientation, box points |
| Bubble | X field, Y field, **Bubble size** required | Nonnegative numeric size, marker appearance, verified color/group/hover | Z, histogram/bar/box options, line-only styles |
| 2D line | X field, Y field | Line color/width/dash; Sort by X; categorical grouping and verified hover | Z, marker size/symbol/outline; continuous marker color/size encodings unless a separately supported marker mode exists |
| 3D scatter | X field, Y field, Z field | Verified marker appearance and size/color/group/hover; X/Y/Z scene axes | Histogram/bar/box options, 2D date slider/subplots, unsupported scene options |
| 3D line | X field, Y field, Z field | Verified line appearance, Sort by X, categorical grouping/hover; scene axes | Marker-only encodings, histogram/bar/box options, 2D date slider/subplots |
| Bar | Category field, Value field | **Orientation**; category grouping; verified bar fill/opacity; Grouped/Stacked where meaningful | Z, size field and marker symbols, histogram bins/normalization, box points, Sort X for lines |
| Box & whisker | Numeric value; optional category | **Show underlying points**; category/group; verified fill/outline | Z, size encoding, histogram/bar options, line sorting; unused custom per-row hover |
| Histogram | **Values to bin** (numeric) | **Bins**, **Normalization**, optional category grouping and verified appearance | Separate generic X/Y/Z field selectors, size encoding, bar orientation, box points, raw-row hover/template |
| Table | Dataset; bounded column/preview selection if supported | Table navigation/display only | XYZ, graph encodings, graph styles, axes/scales, legend, histogram/bar/box controls, plotting point limits |
| Point map | **Longitude**, **Latitude** in WGS84 degrees | Verified point size/color/opacity/hover; invalid-coordinate notice and fit bounds | Z, Plotly axes/legend/color-bar controls, line/chart statistics, subplot/date slider |
| GeoJSON map | Geometry from source; optional verified properties | Verified point/line/polygon appearance and fit bounds | Mandatory table longitude/latitude for geometry-backed source, unused point-only options for polygon/line-only content, Plotly axes |
| Heatmap | Existing explicit 2D grid; read-only horizontal/vertical/value summary | Palette/range/reversal/color bar and verified coordinate axis modes | Arbitrary XYZ binding dropdowns, size/group/per-row hover fields, marker/line/statistical options |
| Surface | Existing explicit 2D grid; coordinate/value summary | Palette/range/reversal/color bar, supported surface/scene controls | Arbitrary XYZ binding dropdowns, size/group/per-row hover fields, 2D slider/subplots, marker/line/statistical options |

Implementation notes:

- Keep size encoding on scatter/3D scatter only where the current adapter genuinely consumes it. Bubble requires it; on other marker graphs it is optional and disclosed. Do not keep size fields on line/bar/box/histogram merely because current shared code validates them.
- Separate continuous numeric coloring from categorical grouping. Palette, numeric bounds and color bar appear only for actual continuous coloring or grids. Category coloring can use a categorical group selector without irrelevant continuous ranges.
- Histogram's numeric input may map to the existing internal `trace.y`; the visible label must be **Values to bin**. Explain `Count`, `Probability`, `Percent` and `Density` briefly, using the renderer's verified semantics. Its horizontal axis describes binned values; its vertical axis is the computed statistic.
- A box plot should accept a single numeric field without requiring a meaningless X column. Optional categories require a matching translator change; do not merely hide a still-required binding. Explain why exact statistics need a complete selected result.
- Bar role labels remain Category/Value when orientation changes. Switch the physical axis assignments and scale validation consistently; do not ask the user to swap fields manually. Grouped/Stacked is a chart-level option exposed only for applicable bar compositions.
- Tables must describe the present 50-row/30-column display limits or explicitly implement planned pagination; do not imply a newly added table feature from markup alone.
- Show map field bindings only for table-backed point sources. Shape/property controls must match the actual GeoJSON geometry content and current supported geometry restrictions.
- Heatmap/surface cannot reshape arbitrary columns automatically in this refactor. Display a true grid summary when present and offer the array-selection workflow when absent.
- Shared chart controls derive from all applicable visible series, not just the series being edited. A 2D comparison can contain compatible graph types; unsupported family combinations require a separate chart. Do not let invisible stale series accidentally change plot-family selection.
- Date sliders, shared axes, subplot assignment and Z-axis settings must match the actual chart family/layout. Keep unverified scene mode combinations unavailable with a brief explanation in the type picker/details.

## 6. Capability-aware logic, not visibility alone

Introduce a small, explicit graph contract inside the existing inline chart section. Avoid a generic form engine or plugin framework. A JSDoc-typed record keyed by graph kind plus named predicates for dataset/chart conditions is sufficient.

Each entry identifies: required roles, supported optional encodings, relevant appearance/type settings, renderer family, supported axes/modes, grouping and hover semantics, statistic completeness requirements, and export/layout capabilities. Include dataset-specific requirements such as grid metadata or geometry-backed map input. Keep column names, selected values and user text outside this static contract.

Use the contract for these independent responsibilities:

1. `getApplicableControls(...)`: derive visible sections and field roles without I/O or mutating chart state.
2. `normalizeEffectiveTrace(...)`: construct the applicable specification from saved state; exclude inactive bindings/settings. Do not pass inactive state downstream.
3. `getRequiredReadFields(...)`: include only relevant required roles and active optional encodings. No missing-column errors for fields the graph cannot use.
4. `validatePlotSelection(...)`: return typed issues tied to source/series/control, rather than throwing a generic user-input error after a fetch.
5. `applyGraphTypeChange(...)` / `applySeriesDatasetChange(...)`: make scoped, documented transitions and cancellation explicit.

Names are suggestions, not requirements to add five unnecessary layers. Reuse existing functions where their responsibilities fit. The essential invariant is one source of applicability rules across UI, normalization, validation and translation.

Read/write form synchronization must stop depending on irrelevant DOM values. Do not validate hidden histogram bins on scatter, a hidden Z range on 2D, or a hidden size field on line. Renderer-boundary validation remains necessary for programmatic/session input; hiding controls does not make untrusted or stale settings valid.

Avoid unconditional DOM reconstruction on each edit. Update affected sections/options, retain focus and disclosure state, and batch nonexpensive UI changes. Cheap eligibility checks happen on graph/source/field edits; reads, parsing, full scans and rendering remain explicit worker-backed actions.

## 7. State transitions and inactive settings

Distinguish shared chart settings, per-series bindings, type-specific preferences and unfinished editor drafts. Preserve user work without letting inactive settings participate in rendering.

| Transition | Required behavior |
|---|---|
| Change dataset to inspect | Update Data preview/query/slice context; restore saved per-dataset selections deliberately. Leave every existing series binding unchanged |
| Change data for selected series | Cancel affected stale work, reset source-dependent fields/templates/encodings and suggest new compatible fields. Keep unrelated series/chart settings; explain invalid shared-axis compatibility |
| Switch graph type with same dataset | Retain compatible role selections. Clear/inactivate incompatible effective bindings and show the new required fields. Store harmless type-specific preferences separately if restoring them is useful |
| Switch scatter → histogram | Choose an explicitly numeric value suggestion from the existing Y when valid. Hide generic X/Z and marker-size encodings. Only histogram settings contribute to reads/validation |
| Switch histogram → scatter | Restore compatible prior XY selections or request missing ones. Hidden bins/normalization cannot influence scatter or prevent switching |
| Switch bar orientation | Keep Category/Value roles; map them to physical axes and validate axis scale/ranges accordingly |
| Switch to heatmap/surface without grid | Show a preparation card and actions; do not fabricate grid metadata or silently reinterpret rows |
| Create filter/query/slice result | Create and identify the result; offer explicit Inspect/Plot actions. No silent rebind of an established series |
| Add series | Present source/type explicitly; inherit compatible defaults with clear summary. Do not clone stale source-specific fields blindly |
| Remove dataset | Clear affected series bindings and fields, identify affected series, offer reselection. Preserve other series and valid resident results |
| Switch chart/series | Save applicable editor drafts without validating unrelated inactive fields. Restore only the selected entity's state and guidance |
| Import session | Preserve IDs, provenance, chart styles and compatible bindings. Normalize inactive settings without running code, reconnecting URLs or loading data automatically |

An invalid numeric draft must not trap the user on a graph or prevent changing series. Keep its local message/draft or discard it with a narrow explicit action; do not coerce it to an invented valid value. Inactive preferences may be cached by graph kind, but stale field names must be rechecked against the source before reactivation.

Plan session compatibility before adding state. Prefer keeping version-1 serialized field names and deriving applicable state at render time. If a new persistent type-preference structure is required, document a schema migration, accept old sessions, and add round-trip tests. Never overwrite old imported settings silently or rename IDs merely for friendlier UI labels.

## 8. Guidance and direct recovery actions

Replace long global path instructions with a short contextual issue card plus an optional detail section. The card answers: what is wrong, which series/field/source is affected, what the proposed action changes, and how to continue.

Use a structured issue description with stable code, severity, source/series/chart IDs, affected controls and fixed authored action identifiers. Resolve actions through explicit dispatch, never executable strings from errors or sessions. Keep technical exceptions in Diagnostics with explicit context; sanitize all labels/file values.

### Dates and categories

Place a compact **X scale** summary beside the X binding (equivalent Y/Z where supported), with an accessible route to full settings.

For a first compatible field binding with no explicit scale choice, propose defaults from bounded cached type inference: numeric → Linear; consistently ISO date text → Date; other text → Category. Display the chosen or suggested scale. Existing explicit axis preferences, unusual calendars and mixed values must not be silently overridden. Inference from a preview is provisional; validate actual selected values during the explicit read.

Example card:

> “The X field `time` contains date text, but this chart uses a numeric scale.” **Use Date scale** · **Choose another X field**

**Use Date scale** updates the exact chart/panel axis, opens/focuses the scale summary if needed, clears only incompatible bounds with a visible notice, and marks the plot as needing update. Keep Render explicit. Show a reversible change notice rather than asking the user to navigate nested disclosures. If that axis is shared by multiple series, preflight all affected series and show any conflicts before changing it; offer a separate chart when necessary.

For ordinary text: **Use Category scale**. For numeric CF time: explain that it needs its units/calendar for conversion; offer **Keep numeric time** and **Inspect time metadata**. Date mode alone cannot convert numeric time. Do not guess Unix timestamps, infer epoch units from magnitude, or implement new calendar conversion as part of a visibility refactor.

### Other known cases

| Problem | Contextual explanation | Proposed actions |
|---|---|---|
| Log axis has zero/negative values | Identify the axis/field and that log requires positive values | **Use Linear scale**; **Open filters** with an explicit proposed positive-value filter that creates a result rather than mutating source |
| Continuous color receives labels | Distinguish numeric intensity from categories | **Color by category** if supported; **Choose numeric field** |
| Bubble has no size field | Identify required Bubble size and valid numeric candidates | Focus **Bubble size**; or **Use Scatter** |
| Stale/missing field after source change | Name selected series/source and missing role | Focus the role selector; **Choose series data** |
| No 2D grid | Explain two varying coordinate dimensions and the value column | **Prepare array slice** if provenance/source is available; **Use Line/Scatter** for a series-shaped slice; **Choose grid dataset** |
| Incomplete histogram/box input | State whether the input is a sampled result or bounded source read | **Inspect result limits**; **Create complete selected result** only through supported bounded filtering/query workflows; explain SQL alternative |
| Mixed 2D/3D/map/table chart | Identify conflicting series | **Move selected series to new chart** or **Change graph type** with compatible choices; no silent loss of series |
| Array source is not yet tabular | Explain select/read first, then plot the result | **Choose variable and slice** in Data, with return path to series |
| Too many groups or excessive points | Explain affected encoding and limits | **Choose fewer categories/filter**; **Use continuous color** only for numeric fields; **Review sampling** |
| Missing local session file | Identify exact referenced filename/source | **Reselect file**; preserve stable source/series IDs |
| CORS/range/CDN failure | Separate source-access failure from blocked library loading | **Open local file**, **Edit URL**, or a supported **Retry**; retain details without promising to fix server headers |

Navigation actions must open the correct section, select the correct source/series where explicitly requested, and focus the relevant control. A fix that creates/filters data or changes a shared chart must state that effect before the action. Do not automatically run code, queries, remote connections or large reads to resolve an issue.

### Grid-specific explanation

For a preview containing `dim_0`, `dim_1`, `streamflow`, explain that these are columns: coordinate/index columns plus values. Show original variable dimensions and selected lengths where known. Render a concise shape summary such as `1 × 120: one varying dimension; suitable for a line`, or `20 × 30: two varying dimensions; suitable for a heatmap`.

Offer **Line/Scatter** with the actually varying coordinate and streamflow value when metadata establishes those roles. Do not guess a varying axis from column order. **Prepare array slice** returns to the original array source through provenance when that source is available; if absent, say to reopen the original file. Show start-inclusive/end-exclusive terminology beside the inputs and a small selected-shape summary before reading. Holding other dimensions at one position is the guidance for more than two source dimensions.

## 9. Error prevention and validation order

Validate in two stages:

1. Cheap form/schema/capability checks before allocating, reading or loading a renderer. Missing roles, unavailable grids, incompatible families and unsupported options get immediate inline guidance.
2. Value-dependent checks during the bounded worker/read flow. Validate date/log/numeric/color/size/statistical completeness against the actual selected data; preview inference alone cannot guarantee these.

Keep **Render** available when only a provisional inference warning exists. If blocked by a known missing requirement, show the reason next to the disabled button and an enabled recovery action; do not leave a tooltip-only dead end. On explicit attempts, focus the first actionable problem without hiding the rest. Clear obsolete issues on changes and avoid stale worker errors after a source/type switch.

A plot last rendered from an older selection needs a brief `Settings changed — update plot` indicator. Preserve the last valid result when safe, labeling its source/settings accurately; clear it on removal/rebinding where otherwise misleading. Failed renders must not appear to confirm new settings. Cancel behavior and renderer lifecycle remain intact.

Scope errors to the actual read source/series, not automatically the inspected dataset. Shared-chart errors attach to the chart. Keep global unexpected-failure fallback, source/network details and bounded diagnostics for investigation.

## 10. Implementation phases for the next session

Each phase should leave the viewer usable and update `.llm` evidence. The later session should establish a source checkpoint before edits and avoid user-owned staged instruction changes.

### Phase A — inventory and applicability contract

- [ ] Inventory every binding, appearance, axis, layout, export and transform control and map it to actual translator use.
- [ ] Confirm renderer-family compatibility, source-kind distinctions, scene-axis modes and statistics semantics from existing source/tests; verify primary dependency documentation only where necessary.
- [ ] Record the final control matrix and any deferred support differences from this proposed matrix.
- [ ] Define the minimal typed graph contract and effective-state/read-field rules; write meaningful boundary tests.

Acceptance: every control has an explicit applicability rule; inactive values have no path into relevant validation/read fields. No additional renderer capability is claimed from library existence alone.

### Phase B — logic and transition fixes

- [ ] Make `saveChartControls()` validate applicable settings only; make `translateTrace()` read/validate applicable fields only.
- [ ] Add type/source/chart transitions, invalid-draft navigation behavior, optional box category support and family preflight.
- [ ] Normalize old session/programmatic state using the same rules and retain renderer-boundary checks.
- [ ] Preserve cancellation and provenance/source ownership; separate result creation from explicit series rebinding.

Acceptance: malformed inactive histogram/size/Z fields cannot break a scatter/line/table render or prevent switching. Applicable invalid values still produce clear errors. Existing valid chart/session/export behavior survives.

### Phase C — simplified forms and vocabulary

- [ ] Change visible terminology to Dataset to inspect / Result dataset / Series / Data for this series; provide adjacent explanations and source summary.
- [ ] Apply graph-specific role labels and hide irrelevant sections; group type options separately from advanced appearance.
- [ ] Add Data/Plot navigation and progressive disclosures without destroying focus/edits.
- [ ] Add visible result cards and explicit Plot/Inspect actions, with truthful lineage/subset summaries.

Acceptance: each graph presents only relevant inputs; required selections are obvious; inspection never unexpectedly changes a plotted series.

### Phase D — guided fixes

- [ ] Add structured contextual issues and fixed action handlers, with cheap preflight/value-check separation.
- [ ] Implement direct date/category/linear fixes and guided field/color/size/grid/family recovery.
- [ ] Show automatic/suggested first-binding scale defaults, preserve explicit preferences, and handle shared-axis conflicts.
- [ ] Add source/series-aware error attribution, stale-result labeling and corrective navigation/focus.

Acceptance: a user can fix an ISO date-axis mismatch from the visible issue card without finding a nested settings panel. No fixes silently change data, run code or trigger remote/expensive work.

### Phase E — sidebar and accessibility

- [ ] Anchor hide/show to the sidebar boundary and preserve an always-visible reopening control.
- [ ] Verify keyboard/ARIA behavior, focus after hiding/opening, error announcements, touch targets, narrow-screen layout and no hidden-field tab stops.
- [ ] Confirm control edits and sidebar toggles do not reinitialize plots/maps or fetch data.

Acceptance: the toggle visibly belongs to its sidebar and can always reopen it; all primary workflows work by keyboard at desktop and narrow widths.

### Phase F — regression, documentation and handoff

- [ ] Extend existing pure/browser tests using actual production functions and scenarios; remove brittle assertions tied to the old form order.
- [ ] Run syntax/strict JSDoc/packaging/format checks, pure tests, focused transitions/guidance tests and appropriate full supported browser scenarios.
- [ ] Re-run separate map/headless-shell configuration on this host where required. Keep Firefox/Safari claims limited to actual tests.
- [ ] Update README, Help, screenshots if maintained, validation evidence and all four `.llm` files with remaining gaps.

Acceptance: no regressions in limits, source loading, queries/slices, independent series, map/grid rendering, session references, exports, trusted-code safety or static project-subpath hosting.

## 11. Concrete acceptance test matrix

| Scenario | Expected result |
|---|---|
| Fresh 2D scatter with numeric data | Only X/Y and relevant options; Z/bins/normalization/orientation/box points absent from visible and keyboard UI |
| Bubble selected | Size visibly required and restricted/suggested to compatible fields; missing size gets local guidance |
| Line with prior scatter size/color settings | Inapplicable numeric marker encodings do not read columns or fail validation; line styles/grouping work |
| Scatter with invalid histogram-bin draft | Scatter renders; switching away from histogram is possible; inactive draft does not become an effective setting |
| 3D scatter/line | XYZ shown; 2D slider/subplots hidden; applicable scene controls verified |
| Histogram from numeric field | One Values to bin selector; bins/normalization present; count axis correctly labeled; generic XY/Z hidden |
| Box from one numeric field | Category optional; no spurious missing-X failure; underlying-points option applies only to box |
| Bar orientation vertical/horizontal | Category/Value labels remain stable; axis assignments/scales correct; only applicable bar options present |
| Continuous versus categorical color | Palette/ranges/color bar shown only for genuine continuous mapping; labels can be resolved using category action |
| Table | No plot encodings/axes/statistical controls; bounded table behavior honest; incompatible extra series guided to separate chart |
| Table-backed point map versus GeoJSON polygon | Coordinate inputs appear only where needed; plot axes hidden; geometry-specific appearance supported and truthful |
| Real 2D grid versus one-by-N slice | Grid summary and palette for heatmap/surface; nongrid path explains varying dimension and offers appropriate series workflow |
| Raw array without prepared result | Primary next step is choose/read slice; unusable table-field controls not shown |
| ISO date field on Linear | Use Date action visible locally; exact axis updated and compatible bounds handled; explicit render succeeds |
| Numeric CF time/unsupported calendar | No guessed conversion; keep numeric / inspect metadata actions; raw values remain unchanged |
| Mixed date/text/missing values | Preview inference labeled provisional; actual validation catches incompatible values with field/source context |
| Shared axis with conflicting series | Suggested fix identifies other affected series and offers review/separate chart; no silent global changes |
| Inspect dataset A while series uses B | Summary explains both; preview/query actions use A, render uses B; explicit Use inspected data changes only selected series |
| Query/slice creates result | Visible parent/operation summary; source unchanged; no implicit series replacement; explicit Plot result binds as stated |
| Remove/reselect dataset | Affected series identified; fields clear; unrelated series and valid results preserved; imported source IDs recover |
| Type change and session round trip | Compatible selections and styles retained; irrelevant serialized settings normalized; imported code stays disabled |
| Source/schema/family invalid state | Clear local blocking reason and reachable correction before expensive reads |
| Sidebar hide/show desktop/mobile | Boundary anchor remains visible, ARIA accurate, focus usable, edits/renderer state preserved |
| Keyboard/screen reader | Hidden controls cannot be focused; labels help distinguish inspect versus series source; fixes announced without repeated live-region chatter |
| Offline/CORS/range failure | Specific context/retry/local-file guidance; no false empty success or unintended requests |
| 300 MB and row/value caps | Existing guard behavior unchanged; warnings and sampling remain visible despite reduced detail |

Supplement browser assertions with a manual first-use review: open sample, plot dates, change graph, make a filtered result, compare two series and hide/reopen controls. The user should be able to explain which data are inspected versus plotted and find the relevant action without Help. Record observations and actual browser coverage rather than asserting usability from code alone.

## 12. Risks, open choices and completion boundary

- **Hiding without logic normalization:** highest risk; Phase B precedes cosmetic completion.
- **Shared-axis side effects:** safe-looking scale fixes can affect multiple series; validate chart-level impact and maintain explicit ownership.
- **Statistics metadata:** current `isPartial` can conflate source selection, sampled results and bounded reads. Audit its meaning before allowing histogram/box; filtering a complete selected result can be legitimate, but a visually sampled one cannot be called exact. Do not loosen the safeguard to make the form appear successful.
- **Renderer-specific appearance:** Plotly marker properties passed through shared objects may be ignored for lines/statistical/grid graphs. Verify actual use before retaining a control.
- **Scope growth:** category-free boxes, result-binding behavior and compatibility normalization require targeted logic changes, not just CSS. They are explicit plan tasks; new binning/pivoting, time conversion, GeoPackage and new renderer features remain separate work.
- **Session design:** inspect the real saved schema before changing storage; prefer compatible terminology changes and effective-state derivation. Document any migration rather than silently dropping settings.
- **New-user versus expert workflow:** preserve expert access behind clear disclosures, including raw provenance and SQL/JS, while keeping runtime/security warnings visible when relevant.
- **Layout choice:** native Data/Plot tabs or grouped disclosures may be chosen based on keyboard/accessibility and current CSS. The required result is a shorter contextual form, not a new dependency.

The refactor is complete only after all requested behaviors above are implemented, meaningful tests pass, and actual browser limitations remain documented. This planning session does not mark any implementation phase complete and does not authorize starting the separate GeoPackage plan.
