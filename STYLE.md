# STYLE.md

## 1. Scope and guiding principle

This standard applies to **browser-only single-page HTML, CSS, and modern JavaScript applications**. It prioritizes comprehension, debuggability, code review, explicit types, and documentation over compactness, novelty, or minimizing file count.

**A single-page application does not mean a single source file.** Keep source modules focused, use native JavaScript modules, and deploy ordinary static files. Prefer native platform behavior and small libraries over complicated frameworks.

The words **MUST**, **SHOULD**, and **MAY** indicate mandatory rules, strong defaults, and acceptable options, respectively.

## 2. General formatting

- Use UTF-8, LF line endings, and a final newline in every text file.
- Indent HTML, CSS, and JavaScript using four spaces. Never use tabs for indentation.
- Use consistent descriptive names; avoid unexplained abbreviations.
- Use one statement per line. Never combine an assignment, mutation, and call on one line via semicolons.
- Use semicolons for JavaScript statements.
- Keep normal lines at or below approximately 120 characters; use 180 only where readability genuinely improves.
- Put opening braces on the **same line** as the statement or declaration (K&R style) and closing braces on their own line. This convention applies to functions, classes, loops, conditionals, `try`/`catch`, object literals formatted across lines, and CSS rules.
- Every conditional and loop body MUST use braces, including single-statement bodies.
- `else`, `catch`, and `finally` follow the closing brace on the same line: `} else {`, `} catch (error) {`.
- Use a blank line between logical groups and declarations; avoid vertical noise between every trivial line.
- Avoid chained assignments, comma operators, nested ternaries, one-line conditional logic, and compressed callback expressions.
- Prefer guard clauses over unnecessary nested `if` statements.

```javascript
if (selectedFiles.length === 0) {
    showMessage('Select at least one file.');
    return;
}

for (const file of selectedFiles) {
    await loadFile(file);
}
```

**Not allowed:** `if (ready) start();`, `for (...) doThing();`, `if (a) { return b; }`, or `thingA(); thingB();` on one line.

## 3. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Variables and functions | `camelCase` | `selectedColumns`, `parseCsvFile` |
| Classes, constructors, typedefs | `PascalCase` | `DataViewState`, `AxisDefinition` |
| True constants and enumerated-like maps | `UPPER_SNAKE_CASE` | `DEFAULT_PAGE_SIZE` |
| JS module files | `kebab-case.js` | `render-table.js` |
| CSS classes | `kebab-case` | `.data-table-toolbar` |
| HTML IDs | `kebab-case` | `file-picker` |
| Custom events | descriptive `kebab-case` | `dataset-loaded` |
| Boolean values | positive predicates | `isLoading`, `hasSelection` |

Name functions after observable actions. Avoid vague names such as `handle`, `process`, `data`, `util`, and `doStuff` when a specific name is available. Prefer `parseGeoJsonDocument` to `parse`, and `renderAxisControls` to `render` when ambiguity exists.

## 4. JavaScript: syntax, control flow, and modules

- Prefer `const`; use `let` only for reassigned bindings. Never use `var`.
- Prefer `===` and `!==`; avoid implicit type coercion and implicit truthiness checks for numbers and strings where `0` or `''` are meaningful.
- Use `switch` for clear multi-branch selection. Every branch must have explicit control flow; avoid implicit fallthrough.
- Use `async`/`await` for asynchronous sequences. Avoid complicated `.then()` chains.
- Catch exceptions at meaningful boundaries, attach context, and surface actionable errors to the UI. Never silently ignore them.
- Prefer narrow, named functions rather than massive functions or deeply nested callbacks.
- Keep function parameters few and meaningful. Use a documented options object when there are many related, optional settings.
- Prefer named exports. Avoid default exports except when consistent with a narrowly defined library interface.
- Never rely on implicit global variables; do not use wildcard global namespace objects as your application's state container.
- Avoid `eval()`, `new Function()`, monkey-patching built-ins, surprising getters, and metaprogramming unless explicitly justified.
- Use template literals for interpolation; do not use them to insert unchecked markup into the DOM.
- Prefer `for...of` for readable iteration with side effects and `map`/`filter` for simple, clearly functional transformations. Do not force functional chains when a loop is easier to follow.
- Avoid mutating input arguments unless the function's contract explicitly says it will do so.

### 4.1 Arrow functions

Arrow functions are acceptable for short, unsurprising callbacks. Use a named function for nontrivial parsing, state mutation, or error handling. Braces remain mandatory for multi-statement bodies. Avoid nested anonymous callbacks.

### 4.2 DOM and events

- Query DOM elements once where practical, validating required elements before use.
- Prefer `addEventListener()` over inline event handler attributes.
- Use `textContent` for untrusted text. Treat `innerHTML` as a security-sensitive operation requiring justification and trusted sanitized input.
- Prefer `DocumentFragment`, incremental updates, or virtualization for large tables and lists.
- Unregister listeners, stop workers, cancel requests, and release large references when no longer needed.
- Keep DOM logic out of file readers, parsers, and transformation modules.

### 4.3 State and data flow

- Define which module owns each state value.
- Prefer explicit function parameters and return values over hidden side effects.
- Keep parser outputs and chart/table inputs represented by named typedefs.
- Normalize external input once at ingestion boundaries. Do not scatter format-specific checks throughout UI code.
- Document when values are mutated, cloned, cached, sorted, or filtered; document whether ordering is guaranteed.

## 5. JSDoc is mandatory and extensive

JavaScript does not become maintainable because someone writes `@param {Object} options`. Such documentation conceals the contract rather than describing it.

### 5.1 Static type checking

Use JavaScript with JSDoc types, not TypeScript as a mandatory build/deployment requirement. Enable editor/static checking when possible:

- Put `// @ts-check` at the top of JavaScript modules (before their module JSDoc) when supported by the project checker.
- Use a development-only `jsconfig.json` or equivalent with `checkJs: true`, `strict: true`, browser libraries, and `noEmit: true`.
- A locally installed TypeScript checker MAY validate JSDoc, but compiled output MUST NOT become necessary for deployment.
- Resolve type errors rather than masking them with `@ts-ignore`, broad `any`, or unchecked assertions. Document necessary exceptions.
- Use `@type` annotations for non-obvious local values, DOM queries, maps, nullable state, and containers, even when inference could technically determine the type. Do not annotate every obvious primitive assignment solely to produce noise.

### 5.2 Every module has a header

Every `.js` file MUST contain a module-level JSDoc block describing its purpose, responsibilities, dependencies, expected side effects, significant constraints, and associated interfaces. Add `@module` and `@see` where appropriate. Include the AI-review TODO for generated or substantially revised code.

```javascript
// @ts-check

/**
 * @module data/csv-parser
 * @description
 * Parses local CSV text into validated, column-oriented data suitable for
 * tables and visualizations. This module never reads the DOM or fetches URLs.
 *
 * Dependencies: browser-native JavaScript only.
 * Side effects: none; returns newly allocated data structures.
 * Input assumptions: text has already been decoded as UTF-8.
 *
 * TODO(AI-REVIEW): AI-authored module; review parsing and error boundaries.
 */
```

### 5.3 Every function has a contract

Every function, method, constructor, callback with nontrivial behavior, and exported arrow function MUST have JSDoc specifying:

1. **What it does and why:** purpose, not a restatement of its name.
2. **Parameters:** every argument's precise type, name, meaning, allowed values, units, nullability, optional/default behavior, and constraints where relevant.
3. **Return value:** `@returns {Type}` with a meaningful description; use `@returns {void}` for functions that return nothing and describe effects elsewhere.
4. **Errors:** `@throws` for validation errors, parsing failures, and other deliberately propagated errors; state whether asynchronous functions reject.
5. **Side effects:** DOM mutation, state changes, storage writes, logging, network operations, or input mutation.
6. **Invariant/ordering/performance details** when material, including complexity for potentially expensive operations.
7. `@example` for functions with nontrivial input/output relationships.
8. `TODO(AI-REVIEW)` for AI-authored functions or substantial AI rewrites.

Document callback function signatures via `@callback` or a typedef when reused. A function passed anonymously to an event handler is not exempt from meaningful documentation; extract a named handler when necessary.

```javascript
/**
 * Converts a column of numeric input values to a validated extent.
 * Null and non-finite values are ignored rather than treated as zero.
 * Does not modify the original array.
 *
 * @param {ReadonlyArray<number | null>} values
 *     Values in the column, in source order. Null represents missing data.
 * @param {boolean} includeZero
 *     If true, expand the finite extent so that zero lies within it.
 * @returns {NumericExtent | null}
 *     Lowest and highest finite values, or null if no finite values exist.
 * @throws {TypeError}
 *     If the collection contains values outside the documented union type
 *     when runtime validation is enabled.
 * @example
 * const extent = calculateNumericExtent([3, null, 8], false);
 * // Returns { minimum: 3, maximum: 8 }.
 *
 * TODO(AI-REVIEW): AI-authored function; verify edge-case handling.
 */
export function calculateNumericExtent(values, includeZero) {
    // Implementation intentionally omitted from this style example.
}
```

**Note:** The sample intentionally demonstrates documentation, not working logic. Production functions MUST implement their contracts, and `@throws` MUST match actual runtime behavior. `@returns` MUST describe what happens on empty inputs and errors.

### 5.4 Define and group object types explicitly

Do not use anonymous, unexplained dictionaries. Give important shapes a named `@typedef {object}` and document **every** `@property`, including:

- Purpose and domain meaning.
- Type and allowed values.
- Whether the field is required or optional.
- Units, coordinate systems, and data conventions where applicable.
- Default, sentinel values, and null behavior.
- Ownership and mutability when relevant.

Group related types by domain in logically named modules. Examples: dataset types together, visualization configuration types together, axis types together, UI state types together. Do not accumulate every type in one enormous file.

```javascript
/**
 * @typedef {object} NumericExtent
 * @property {number} minimum
 *     Smallest finite value; same physical unit as the source column.
 * @property {number} maximum
 *     Largest finite value; same physical unit as the source column.
 */

/**
 * @typedef {'linear' | 'logarithmic'} AxisScale
 *     Supported numerical axis transformations.
 */

/**
 * @typedef {object} AxisConfiguration
 * @property {string} title
 *     Human-readable axis label displayed in the plot.
 * @property {AxisScale} scale
 *     Axis transformation. Logarithmic axes require strictly positive values.
 * @property {NumericExtent | null} visibleRange
 *     Explicit visible bounds, or null for automatic bounds.
 * @property {string | null} unit
 *     Physical unit shown with tick values; null if dimensionless or unknown.
 */
```

Use `@enum` only when its runtime semantics are useful. Prefer literal unions for constrained strings. Use `@template` for genuinely reusable generic functions and collections; never invent unnecessary generics.

### 5.5 Importing and reusing typedefs

Declare authoritative types once and reference them, rather than duplicating descriptions across modules. Prefer a documented central type in the appropriate domain module:

```javascript
/** @typedef {import('../types/axis-types.js').AxisConfiguration} AxisConfiguration */
```

Pure JSDoc type modules may use `export {};` to be treated as ES modules. Keep type imports independent of runtime imports. Cross-reference important related types with `@see`.

### 5.6 DOM and complex local types

Explicitly type expected HTML elements and null cases, and validate at runtime before using them.

```javascript
/** @type {HTMLInputElement | null} */
const fileInput = document.querySelector('#file-picker');

if (fileInput === null) {
    throw new Error('Required file picker was not found.');
}
```

For ambiguous DOM selectors, runtime type-check with `instanceof HTMLInputElement` before relying on input-specific APIs.

Annotate maps, records, callbacks, union types, `Promise` results, and object literals whose shape is important:

```javascript
/** @type {Map<string, AxisConfiguration>} */
const configuredAxes = new Map();
```

Avoid indiscriminate non-null assertions, `any`, wildcard types, and unsafe casts. Use `unknown` for untrusted external values until validated.

### 5.7 Errors and asynchronous APIs

For async functions, document the resolved type as `@returns {Promise<ResultType>}` and document rejection conditions using `@throws` with an explanation that the returned promise rejects. For cancellable operations, specify whether `AbortError` propagates, is mapped, or is handled.

### 5.8 Documentation is not filler

- Never write `@param {string} name - The name` if it can describe provenance, meaning, constraints, or display usage.
- Do not invent guarantees the code cannot uphold.
- Keep type definitions aligned with runtime validation and data contracts.
- Use meaningful comments for rationale, units, browser quirks, and non-obvious algorithms, not obvious assignments.
- Update JSDoc whenever implementation behavior changes.
- AI-authored module, class, and function documentation MUST contain `TODO(AI-REVIEW)` until a human consciously reviews and removes it.

## 6. HTML

- Use semantic HTML5 (`main`, `nav`, `header`, `section`, `form`, `table`, `button`) rather than generic containers everywhere.
- Keep one logical application page. Do not build the UI by writing a giant HTML string in JavaScript.
- Place CSS in dedicated files and JavaScript in modules loaded with `defer` semantics (`type="module"`).
- Indent nested elements consistently; use one attribute per line when a tag becomes lengthy.
- Give every input an explicit associated label and validation/help text when needed.
- Use `<button type="button">` for non-submit actions and real form behavior when submitting a form.
- Keep IDs unique. Use classes for styling, IDs for unique references, and `data-*` attributes for structured hooks where beneficial.
- Avoid inline `style` attributes, inline event attributes, and deprecated presentational elements.
- Describe accessible controls, focus ordering, keyboard interactions, and any ARIA attributes when they are not obvious. Prefer native semantics over unnecessary ARIA.
- Set the document language, character encoding, viewport metadata, a meaningful page title, and content-security restrictions when deployment allows them.
- Never place secrets in HTML, JavaScript, query strings, or shipped static assets.

## 7. CSS

- Use plain, organized CSS unless a real requirement justifies a preprocessor.
- Split base styles, reusable components, and page-specific styles when scale requires it.
- Group rules by component or purpose, and place related properties together consistently.
- Prefer CSS custom properties for shared colors, spacing, typography, and sizing.
- Use flexbox/grid for layout, not hardcoded coordinates. Avoid unnecessary fixed heights and widths.
- Support reasonably narrow screens and browser zoom.
- Respect `prefers-reduced-motion`; provide visible keyboard focus and accessible contrast.
- Avoid broad global selectors that unexpectedly restyle library content.
- Prefer specific component classes over `!important`, deep descendant selectors, or complicated selector tricks.
- Document unexpected layering, stacking context, overflow, or responsive behavior.

```css
:root {
    --space-small: 0.5rem;
    --space-medium: 1rem;
}

.data-panel {
    display: grid;
    gap: var(--space-medium);
    min-width: 0;
}

.data-panel__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-small);
}
```

## 8. Files, parsing, queries, and visualization

- Keep loading, decoding, parsing, schema validation, transformation, and rendering separate.
- Never assume a file is well-formed merely because its extension matches a parser.
- Document accepted formats, encoding, delimiter behavior, header rules, missing values, timestamps/timezones, coordinate reference systems, and measurement units.
- Validate user-configured axis selections and ranges before invoking a charting library. Handle log-scale non-positive values explicitly.
- Use adapters around external libraries so library-specific objects do not leak throughout the codebase.
- Document selection, filtering, aggregation, downsampling, and sorting semantics. In particular, distinguish a filtered dataset from the raw dataset.
- Keep compute-intensive work off the main thread when necessary. Document transfer/copy tradeoffs and worker lifecycle.
- Handle loading indicators, partial failures, cancellation, empty states, and error reporting visibly.
- Avoid rendering every row as a DOM node for very large tables; paginate or virtualize.

## 9. Security, dependencies, and hosting

- Assume user-provided data and URLs are untrusted. Use safe text APIs and strict URL validation.
- A client-only app cannot bypass CORS, authenticate securely with embedded secrets, or access arbitrary local file paths. Do not add hacks pretending otherwise.
- Pin external dependency versions and document licenses, network requirements, and offline behavior.
- Do not load libraries or assets from an untrusted URL as a shortcut.
- Prefer relative paths that work beneath a GitHub Pages project subpath rather than root-absolute paths.
- Test both static-hosted HTTP use and any claimed direct `file://` use. ES modules, `fetch()`, and worker loading can behave differently under the file scheme.
- Avoid unnecessary telemetry, analytics, third-party trackers, and persistent storage.

## 10. Tests and review requirements

- Prioritize pure-function tests for parsing, validation, formatting, filtering, numerical operations, and configuration normalization.
- Include failure and boundary tests: empty files, malformed inputs, missing columns, NaN/infinity, nulls, huge files, duplicate identifiers, cancellations, and bad user input as appropriate.
- Prefer deterministic fixtures and clearly documented expectations.
- Run static JSDoc type checks and linting when configured. Avoid suppressions without documented reasons.
- Test browser interaction and accessibility at least manually when automated browser tests do not exist.
- Inspect performance and memory use for large input workloads; avoid promising capacity without measurement.

## 11. AI-generated code identification

Any AI-generated or substantially AI-rewritten **module, class, or function** MUST include a review marker in its JSDoc:

`TODO(AI-REVIEW): AI-authored code; verify behavior, design, and tests before adoption.`

This is a review mechanism, not an excuse to omit tests or documentation. The human owner can remove the marker after conducting their own review. Keep this marker out of production-facing UI messages and comments in copied third-party dependencies.

## 12. Review checklist

Before marking work complete, verify:

- [ ] No backend or mandatory build step was introduced without authorization.
- [ ] HTML, CSS, and JavaScript responsibilities remain separated.
- [ ] Braces exist for every conditional and loop; no compressed one-line bodies or multi-statement lines.
- [ ] Variables, functions, and files have explicit, meaningful names.
- [ ] Every module, class, and function has thorough, accurate JSDoc.
- [ ] Every parameter and return value is fully documented, including edge cases and side effects.
- [ ] Important object shapes and properties have reusable typedefs, grouped by domain.
- [ ] No avoidable `any`, unchecked external data, unsafe HTML insertion, or silent catches remain.
- [ ] Browser/CORS/static-hosting constraints are respected.
- [ ] User-facing controls have labels, keyboard access, and understandable errors.
- [ ] Representative valid, invalid, empty, and large-input cases were checked.
- [ ] AI-review TODO markers are present where required.
- [ ] Remaining risks and unverified behavior are disclosed in the handoff.
