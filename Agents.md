# AGENTS.md

## Purpose and authority

This document instructs coding agents working on a **single-page, browser-only HTML/CSS/JavaScript application**. The objective is a maintainable, understandable application that can be hosted on static infrastructure such as GitHub Pages. This is not a request for a backend, framework, bundler, or elaborate architecture.

Read these files in order before implementing anything:

1. `SPEC.md` (if present): functional requirements and acceptance criteria.
2. `STYLE.md`: mandatory implementation and documentation standards.
3. `README.md` and other relevant project documentation.
4. Existing source files, tests, and data fixtures before making architectural assumptions.

If instructions conflict, flag the conflict explicitly. Do not quietly discard requirements. Prefer the simplest implementation consistent with the specification. Do not introduce a technology merely because it is fashionable.

## Non-negotiable design principles

- **No backend:** No application server, database service, authentication server, or server-side rendering. Static hosting is the deployment target. A local development server may be used only for testing or browser module/CORS behavior.
- **One application page:** Use a dedicated HTML application page (e.g. `viewer.html`); do not assume its name is `index.html`. Keep application behavior out of the HTML where practical.
- **Separate concerns:** HTML defines structure; CSS defines presentation; JavaScript modules define behavior. `type="module"` and locally referenced `.js` files are preferred.
- **No mandatory build step:** Prefer native ES modules, browser APIs, and dependencies loadable as browser modules. A development-only tool is permissible when justified, but the deployed app must be static and straightforward to inspect.
- **Readability over cleverness:** Explicit names, early returns, small functions, straightforward data flows, limited nesting, and written-out conditionals win over terseness and elaborate abstractions.
- **Document public and internal code:** Use thorough JSDoc, precise types, typedefs, documented object fields, parameter constraints, return semantics, and failure modes. Follow `STYLE.md`.
- **Preserve existing work:** Change only what the task requires. Do not silently replace, remove, rename, or reformat unrelated features.
- **No unexpected network traffic:** Use remote libraries or APIs only if specified or clearly necessary; document remote dependencies and their privacy/offline implications.
- **No invention of capabilities:** File system access, HTTP querying, authentication, cross-origin fetch, worker support, local storage, and large-file handling are constrained by browsers. State limitations accurately.

## Work procedure

### 1. Understand and plan

Before editing code:

- Identify the requested behavior, supported browser targets, expected file formats, data volumes, and interaction patterns.
- Inspect relevant source modules and existing interfaces.
- Distinguish **requirements** from suggestions and unknowns.
- Record assumptions and limitations instead of presenting guesses as facts.
- For substantial work, establish a short, incremental plan with verification steps.
- Identify boundary cases: no input, malformed input, zero results, large input, cancellations, and unavailable browser features.

Do not construct a large framework to solve a small feature. If an abstraction is proposed, explain which real repetition or complexity it removes.

### 2. Maintain agent handoff notes

For multi-step work, maintain a `.llm/` directory containing:

- `TASKS.md`: requirements checklist, status, explicit acceptance criteria.
- `DECISIONS.md`: architecture decisions and rationale, including rejected approaches.
- `PROGRESS.md`: what changed, what was tested, what remains unfinished.
- `ARCHITECTURE.md`: module map, ownership, event flow, state ownership, dependencies, and browser limitations.

Keep these useful and concise. Update existing entries instead of producing sprawling, contradictory notes. Do not treat notes as a substitute for committed source documentation.

### 3. Implement in reviewable increments

- Prefer changing one cohesive behavior at a time.
- Isolate data ingestion/parsing, validation, transformation, state management, DOM rendering, and external library adapters.
- Prefer named exports and explicit imports over hidden global variables.
- Avoid unnecessary inheritance, generic event buses, dependency injection containers, decorators, proxy-based magic, and dynamic code generation.
- Do not put application-sized scripts or styles inline in the HTML.
- Write the JSDoc and types alongside the implementation, not as an afterthought.
- Add small tests or deterministic sample cases for parsers, transformations, and state transitions.
- Never swallow failures or fabricate success states.

### 4. Verify behavior

At minimum, when applicable:

- Run available syntax checks, static analysis, and tests.
- Open or serve the static application in a real browser and inspect console errors.
- Test initial load, valid and invalid inputs, empty results, basic keyboard access, and window resizing.
- Test browser-origin and CORS limitations, especially when using `file://` or loading remote data.
- Test large inputs and repeat interactions for UI freezes, accidental re-rendering, and memory accumulation.
- Confirm no server endpoint or bundling infrastructure was inadvertently made mandatory.
- Recheck all touched JSDoc typedefs and `@param`/`@returns` annotations for accuracy.

Use development tooling if helpful, but ensure the published artifact still runs as a static site.

### 5. Report changes honestly

At the end of each task, summarize what was implemented, affected files, verification performed, outstanding limitations, and any unverified behavior. Explicitly distinguish a passing test from a test that was not run. Do not claim browser compatibility without testing it.

## Architecture defaults

Use a small, unsurprising structure as a starting point, adapting to the project's actual complexity:

```text
project/
├── viewer.html
├── css/
│   ├── base.css
│   └── viewer.css
├── js/
│   ├── main.js
│   ├── app/
│   │   ├── app-controller.js
│   │   └── app-state.js
│   ├── data/
│   │   ├── parse-data.js
│   │   └── validate-data.js
│   ├── ui/
│   │   └── render-status.js
│   └── types/
│       └── shared-types.js
├── tests/
├── SPEC.md
├── STYLE.md
└── .llm/
```

This is a suggestion, not an obligation. Small applications need fewer files. When files become hard to navigate or responsibilities diverge, separate them by concern. A shared-types module may consist solely of documented `@typedef` declarations; importing it at runtime should not be necessary. Use `@import` in JSDoc where supported by the configured checker or `import('./module.js').Type` references.

## Browser-only constraints

- **Data inputs:** Prefer user-selected files (`<input type="file">`), drag-and-drop, and authorized `fetch()` to public CORS-enabled URLs. Explain when arbitrary URL access is impossible because the remote server blocks CORS. Do not use a public proxy as a silent workaround.
- **Queries:** Queries over locally loaded data are computed in the browser; querying a remote service requires that service to support an accessible API. Do not promise SQL against arbitrary files without an included engine.
- **Storage:** Treat `localStorage`, IndexedDB, and the File System Access API as optional, user-visible features with browser limitations. Avoid storing sensitive raw datasets without a clear requirement.
- **Performance:** Parse/transform large data in workers when justified; avoid long synchronous loops on the UI thread. Avoid unnecessary object copies and full-DOM updates. Document resource limits and cleanup mechanisms.
- **Security:** Treat all user files, remote data, URL parameters, and text as untrusted. Prefer `textContent` over `innerHTML`. Avoid `eval()`, `new Function()`, dynamic script injection, and unchecked URL schemes.
- **Accessibility:** Use semantic HTML, associated labels, keyboard-friendly controls, visible focus states, and meaningful status/error text. Do not depend on color alone.
- **Dependencies:** Prefer small, maintained libraries with a concrete reason to exist. Document version, license, source, loaded assets, and whether a network connection is required. Pin dependency versions rather than loading floating latest releases.

## Documentation requirements

Every new module, class, function, callback, constructor, significant typedef, and exported constant must comply with `STYLE.md`. The agent must visibly mark AI-authored code for review using a concise `TODO(AI-REVIEW)` inside its **module-level documentation and every new or substantially rewritten function/class JSDoc block**. This makes copied code conspicuous during human review. Do not misrepresent AI work as reviewed or production-approved. Do not insert these TODO markers into end-user text.

Avoid narrating obvious syntax. Documentation should explain intent, invariants, inputs, outputs, failure cases, state ownership, and performance or browser assumptions.

## Explicit anti-patterns

Do not:

- Build a backend or introduce a framework without a requirement.
- Create an unmanageable single multi-thousand-line JavaScript file because the application is called “single-page.”
- Introduce global mutable state spread across unrelated modules.
- Use clever one-liners, nested ternaries, implicit coercion, or compressed control flow.
- Place multiple statements on one line or omit braces from control bodies.
- Use anonymous complex callbacks when a named function would clarify intent.
- Abandon JSDoc at module boundaries or replace precise object types with `Object`, `*`, or `any` as a shortcut.
- Make undocumented assumptions about data schemas, units, coordinates, date/time formats, or API contracts.
- Log entire datasets or secrets to the console.
- Hide unexpected exceptions behind a generic catch-and-continue.
- Add speculative features, dependencies, or refactors unrelated to the task.

## Definition of done

A change is complete only when it meets the specification, follows `STYLE.md`, has accurate and sufficiently deep documentation, handles expected error conditions, has proportionate verification, remains suitable for static hosting, and leaves clear handoff notes. If any of these cannot be satisfied, state the reason and mark the relevant task incomplete.
