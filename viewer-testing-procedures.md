# Viewer testing procedures for agents

This is the testing runbook for the existing viewer. Read it before browser testing or installing test dependencies. Its purpose is to complete appropriate checks autonomously, reuse the working environment, and avoid repeated user involvement in routine Playwright work.

These instructions do not implement the pending interface or GeoPackage plans. They do not change sandbox permissions or grant unrestricted execution. Repository documentation cannot create a platform approval.

## Quick start — normal agent workflow

1. From the repository, read the latest `.llm/PROGRESS.md` checkpoint. For docs-only work, verify the docs and stop; skip browser setup.
2. For code changes, reuse the existing paths in section 2. Run the static/pure commands in section 4; run the relevant canonical browser profile for the changed behavior. Do not install anything unless a required artifact is missing.
3. Use the exact command with the execution tool's project working directory. Reuse its matching saved approval. If sandbox restrictions require escalation, use the tool's approval flow once for the concrete invocation, then reuse it; do not ask a separate testing permission question.
4. Wait for completion, read the nonempty result report, record coverage/limits in the handoff, and finish. Investigate only failures or new risks; do not repeat passing checks for reassurance.

Section 4 contains copyable commands. Sections 6–7 are recovery guidance, not steps to perform on every run.

## 1. Operating rules

1. Routine validation needed for an authorized change is part of that change. Run it without asking “May I test?” or requesting confirmation of ordinary browser settings.
2. Inspect the current tool permission rules. Reuse matching saved approvals and the canonical commands below. Do not ask again for an action already authorized in the session.
3. Attempt ordinary permitted execution when no applicable restriction is known. If local ports, browser processes or CDN requests are blocked by the sandbox, use the tool's required escalation mechanism. Request only the needed action; do not send a separate preliminary permission question.
4. A required platform approval still applies. Describe it as approval for the sandbox-restricted browser process, local fixture server or dependency access—not permission to perform testing in general. If rejected, report the rejected action/reason and continue independently permitted checks; never bypass the rejection.
5. Keep command spelling and profile paths stable. Shell wrappers, changed environment assignments and quoting can make a previously approved command stop matching. Reuse an exact matching command where practical.
6. For a genuinely new repeatable test invocation, request the narrowest reusable prefix the platform supports for that test entry point. Do not request unrestricted `bash`, `node`, Python, arbitrary commands or broad filesystem access. An exact command approval may be necessary where environment assignments prevent a narrower match. Do not claim a new approval has been saved unless the tool confirms it.
7. Do not reinstall packages, redownload browsers, regenerate fixtures, rotate certificates or vary launch flags as a routine prelude to each test.
8. Test the change proportionately. Run a meaningful focused scenario first where appropriate; expand coverage for shared changes, new failures or unresolved risk. After required checks pass, finish the task rather than repeatedly running them or seeking user reassurance.
9. Keep production static. All testing tools are development-only; no backend, bundler, production Node/Python or repository-local runtime dependency is added.
10. Use `/DMOD/christopher.tubbs/tmp` for all temporary files, caches and tooling. Install only through npm/conda. Never use dnf, apt, yum, system package installation, or Playwright `install-deps`.

## 2. Reusable environment inventory

Use the following defaults on this host. Verify presence first; treat this table as a recorded working configuration, not proof that a future machine has it.

| Item | Existing path / version | Reuse rule |
|---|---|---|
| Repository | `/DMOD/christopher.tubbs/DataInvestigation` | Run repository tests from here |
| Temporary root | `/DMOD/christopher.tubbs/tmp` | Set TMPDIR here |
| Main npm tools | `.../tmp/viewer-tools` | Playwright 1.64.0, TypeScript 6.0.3, Prettier 3.6.2 |
| Browser cache | `.../tmp/viewer-tools/viewer-browsers` | Chromium/full and headless-shell build 1248; Firefox builds 1495 and 1555 present |
| Chromium runtime libraries | `.../tmp/viewer-chromium-libs` | Use this isolated directory for Chromium |
| Firefox-compatible tools | `.../tmp/viewer-firefox-tools` | Playwright 1.56.1 selects compatible Firefox build 1495 |
| Firefox runtime libraries | `.../tmp/viewer-browser-conda/lib` | Use for isolated Firefox checks only |
| Scientific Python | `.../tmp/viewer-conda/bin/python` | Existing numpy/scipy/h5py/pyarrow fixture environment |
| HTTPS fixture key/cert | `.../tmp/viewer-tools/viewer-key.pem`, `viewer-cert.pem` | Reuse; do not print private key contents |
| Parquet fixture | `.../tmp/viewer-tools/viewer-fixture.parquet` | 100003 rows, expected sum(value) 4242816 |
| Local Zarr fixture | `.../tmp/viewer-tools/viewer-local.zarr` | This is the actual fixture folder name |
| Classic packed fixture | `tests/viewer-fixtures/viewer-packed.nc` | Repository fixture; do not replace during normal setup |

Do not point Chromium at the whole `viewer-browser-conda/lib` directory. Firefox-related NSS additions there previously conflicted with Chromium. The isolated Chromium directory contains the required original five library families: alsa-lib, at-spi2-atk, at-spi2-core, libgbm and libxkbcommon.

Do not upgrade TypeScript blindly: the existing checker imports its JavaScript AST API and was verified with 6.0.3. Keep Playwright and its expected browser revisions paired. Installing a newer browser is not a substitute for fixing a test or reusing the compatible cache.

Inspect presence with read-only commands or a small path check; inspect npm `package.json` versions rather than running an install to discover them. For a documentation-only change, this inspection is enough; launching browsers is not required.

## 3. Standard profiles and avoiding leaked settings

The effective default profile is:

```bash
export TMPDIR=/DMOD/christopher.tubbs/tmp
export VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools
export PLAYWRIGHT_BROWSERS_PATH=/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-browsers
export LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-chromium-libs
unset VIEWER_BROWSER VIEWER_PLAYWRIGHT_ROOT VIEWER_SKIP_WEBGL VIEWER_MAP_ONLY VIEWER_TEST_FILTER
```

Environment exports do not reliably survive independent tool calls. Prefer a canonical self-contained invocation from section 4. Do not assume a prior shell activated conda or exported a variable.

If many commands need a persistent profile, an agent may create a reusable, development-only environment file under `/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-test-env.sh` containing the block above. Source it explicitly in each new shell that uses it. Reuse the file after inspecting it; update it only when a verified profile change is necessary. This runbook does not create that file, and sourcing it is not guaranteed to match existing exact-command approvals.

Use a separate `viewer-test-env-firefox.sh` if needed; do not repeatedly rewrite the Chromium profile. Firefox overrides are:

```bash
export VIEWER_BROWSER=firefox
export VIEWER_PLAYWRIGHT_ROOT=/DMOD/christopher.tubbs/tmp/viewer-firefox-tools
export VIEWER_SKIP_WEBGL=1
export LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-browser-conda/lib
```

The map profile is the Chromium default with `VIEWER_MAP_ONLY=1`. A focused profile adds one exact `VIEWER_TEST_FILTER` substring. Reset unrelated profile variables between modes. Prefer tool-scoped values and explicit profiles over modifying global shell startup files, HOME, CODEX_HOME or system configuration.

## 4. Canonical commands

These are real commands for the existing harness. Some matching invocations have saved approvals in the current environment; future agents must inspect actual permission rules rather than assume this document grants them. Use the project working directory explicitly in the execution tool.

### Static and pure checks — no browser or network

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools node tests/viewer-check.cjs
node tests/viewer-pure.test.cjs
```

Formatting check, when source/test formatting changed:

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp node /DMOD/christopher.tubbs/tmp/viewer-tools/node_modules/prettier/bin/prettier.cjs --check --tab-width 4 --print-width 120 --single-quote --html-whitespace-sensitivity ignore viewer.html tests/viewer-check.cjs tests/viewer-pure.test.cjs tests/viewer-browser.test.cjs
```

### Chromium core suite

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-chromium-libs PLAYWRIGHT_BROWSERS_PATH=/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-browsers node tests/viewer-browser.test.cjs
```

The harness itself selects full Chromium with software 3D flags for core tests. Do not add a headed mode, desktop GUI, custom proxy or alternate flags simply to run these checks.

### Chromium map and experimental HDF5 suite

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools VIEWER_MAP_ONLY=1 LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-chromium-libs PLAYWRIGHT_BROWSERS_PATH=/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-browsers node tests/viewer-browser.test.cjs
```

The harness uses its separate headless-shell configuration in this mode. On this host, core forced-software-3D and MapLibre WebGL2 checks need these different configurations. Do not “fix” this by changing global libraries or removing assertions.

### Existing focused recovery and grid regressions

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools VIEWER_TEST_FILTER='settings recovery' LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-chromium-libs PLAYWRIGHT_BROWSERS_PATH=/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-browsers node tests/viewer-browser.test.cjs
```

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools VIEWER_TEST_FILTER='packed NetCDF3' LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-chromium-libs PLAYWRIGHT_BROWSERS_PATH=/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-browsers node tests/viewer-browser.test.cjs
```

For another focused scenario, change only the filter deliberately. Filters are **case-sensitive substrings of scenario names**, not regexes. The harness can currently exit successfully with zero matching scenarios: always check the report has at least one outcome and the intended scenario. An empty report is not a passing test.

If a changed filter does not match a saved exact approval, do not repeatedly ask for near-identical commands. Check whether an already authorized relevant invocation satisfies the required coverage. If a new invocation is needed, request its platform approval through the execution tool with a scoped reusable rule where supported.

### Optional known-working Firefox data checks

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools VIEWER_PLAYWRIGHT_ROOT=/DMOD/christopher.tubbs/tmp/viewer-firefox-tools VIEWER_BROWSER=firefox VIEWER_SKIP_WEBGL=1 VIEWER_TEST_FILTER='quoted' LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-browser-conda/lib PLAYWRIGHT_BROWSERS_PATH=/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-browsers node tests/viewer-browser.test.cjs
```

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp VIEWER_TOOL_ROOT=/DMOD/christopher.tubbs/tmp/viewer-tools VIEWER_PLAYWRIGHT_ROOT=/DMOD/christopher.tubbs/tmp/viewer-firefox-tools VIEWER_BROWSER=firefox VIEWER_SKIP_WEBGL=1 VIEWER_TEST_FILTER='Parquet' LD_LIBRARY_PATH=/DMOD/christopher.tubbs/tmp/viewer-browser-conda/lib PLAYWRIGHT_BROWSERS_PATH=/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-browsers node tests/viewer-browser.test.cjs
```

Do not default to a full Firefox graphics run here: current Firefox requires unavailable NSS, and compatible Firefox full rendering/pointer scenarios previously stalled. These isolated data checks do not establish graphics compatibility. Safari is untested on this host. Revisit limitations only with a relevant environment change or user task, not through repeated speculative installations.

## 5. Choose coverage before running

| Change | Normal coverage |
|---|---|
| Plan/docs only | Review document accuracy and links; confirm runtime untouched. No browser suite |
| Pure normalization/query/slice helper | Pure tests + static checks; corresponding browser ingestion/query/grid scenario if user-visible behavior changes |
| Graph bindings, type visibility, scale/recovery or state transitions | Static/pure + affected browser scenarios; core suite when shared chart/state paths change |
| Sidebar, responsive layout, accessible controls | Responsive/keyboard scenario + affected chart/state scenario; manual browser review only if available and materially useful |
| Session, export, source lifetime/cancel | Matching session/export/cancel and independent-binding scenarios; broaden for shared state changes |
| Map or HDF5 reader | Separate map/HDF5 profile; core grid or source scenarios when shared code changes |
| Resource limits/performance | Settings recovery/size regression and relevant real-file performance scenario; avoid in-memory large-fixture transport |
| Shared UI refactor across graph kinds | Core + separate map/HDF5 suites and new meaningful applicability/recovery tests from the interface plan |

Use `rg` against `await scenario(` in the harness to discover exact scenario names before choosing a filter. Existing scenario names and counts can change as tests are added; do not hard-code yesterday's total as today's acceptance threshold.

Do not create tests that merely repeat implementation constants. Test an actual behavior or failure boundary. Large fixture performance checks should pass a real temporary file path to Playwright; in-memory automation transport previously distorted main-thread timing.

## 6. Reuse and repair setup only when necessary

### Missing npm tools

Check installed versions first. If missing, install the pinned development tools into the existing root, never the repository:

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp npm install --prefix /DMOD/christopher.tubbs/tmp/viewer-tools playwright@1.64.0 typescript@6.0.3 prettier@3.6.2
```

Reuse any matching npm approval. If registry/network access is sandbox-blocked, retry through required escalation. Do not add an unrelated dependency or upgrade known-compatible packages to address a permission failure.

### Missing browser binary

Reuse the configured browser cache. Install only the browser needed for the chosen profile using that profile's Playwright CLI; do not install all browsers or run `install-deps`. For the main Chromium profile:

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp PLAYWRIGHT_BROWSERS_PATH=/DMOD/christopher.tubbs/tmp/viewer-tools/viewer-browsers node /DMOD/christopher.tubbs/tmp/viewer-tools/node_modules/playwright/cli.js install chromium
```

Use the required network approval if blocked. A missing shared library requires a targeted conda-only repair based on the actual loader error; first verify LD_LIBRARY_PATH. Do not recreate the entire scientific/browser environment or replace system libraries. Preserve the separate Chromium library directory and document any verified repair.

### Missing fixtures

Use the explicit existing conda interpreter, not whichever Python happens to be on PATH:

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp /DMOD/christopher.tubbs/tmp/viewer-conda/bin/python tests/viewer-create-fixtures.py /DMOD/christopher.tubbs/tmp/viewer-tools
```

This creates Parquet, classic NetCDF, compressed HDF5 and `viewer-local.zarr` fixtures. Regenerate only if required artifacts are missing or the fixture definition intentionally changed. The browser harness additionally creates some owned outputs as part of scenarios; those scenario-specific writes are expected.

### Missing HTTPS key/certificate

The harness reads both files at startup, even for a focused scenario that does not use the HTTPS server. Existing readable files suffice. The isolated browser context uses `ignoreHTTPSErrors: true`, so an expired local test certificate alone does not justify rotation. Do not extend this setting to application fetches or production operation.

Only if either file is absent or invalid:

```bash
TMPDIR=/DMOD/christopher.tubbs/tmp openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj /CN=localhost -keyout /DMOD/christopher.tubbs/tmp/viewer-tools/viewer-key.pem -out /DMOD/christopher.tubbs/tmp/viewer-tools/viewer-cert.pem
```

This uses an existing OpenSSL executable to generate test files, not install software or establish system trust. Keep them outside source control, never print the key, and avoid replacing a valid pair during a concurrent test.

## 7. Execution, timeouts and cleanup

- The harness starts its own loopback HTTP/HTTPS fixture servers, chooses ephemeral ports and serves `/project/viewer.html`. Do not ask the user to start a server, open browser developer tools or approve each fixture endpoint.
- It injects the inspection hook only into the served test copy. Do not add the hook to production HTML or deploy the test server.
- Real pinned CDN libraries and the public Zarr fixture require outbound network access. Headless launch, loopback ports and CDN access may require one platform escalation; reuse it when allowed.
- Run browser profiles sequentially. They share fixture/output paths and can overwrite screenshots, large files and reports. Batch independent read-only inspection if helpful, not overlapping fixture-mutating browser suites.
- Use asynchronous execution with short yields, retaining the returned process session ID. Poll in reasonable intervals no longer than 60 seconds and send concise progress updates during long runs. Do not launch a duplicate run because the first command yielded without output.
- Distinguish an orchestration cell ID from the underlying command's session ID: wait on a running cell; after it returns a process session ID, poll that process using the corresponding stdin/poll tool.
- Wait for actual scenario completion and final exit status. The harness's per-operation idle wait is up to 90 seconds; a full suite can take longer. Lack of immediate stdout is not evidence of a hang.
- For a confirmed stall, inspect the owned process/last scenario before stopping it. Use that test's specific PID/session, respecting any required permission. Do not kill all Node, Firefox, Chromium or Playwright processes on a shared host.
- Normal completion closes browser and servers. Startup failure and externally interrupted runs may need targeted child-process cleanup; verify only owned resources remain. Keep reusable binaries, fixtures, profiles and reports.
- If a graphics profile fails, inspect the actual error and known profile limitations. Do not silently skip WebGL, loosen assertions or relabel a reduced run as full acceptance.

## 8. Read evidence, then stop

The harness writes reports under VIEWER_TOOL_ROOT:

- Core: `viewer-browser-results-chromium.json`.
- Map/HDF5: `viewer-browser-results-chromium-map.json`.
- Focused: browser name plus the filter with nonalphanumeric characters replaced by hyphens.
- Firefox: matching `viewer-browser-results-firefox...json`.

Reports with the same profile/filter overwrite prior evidence. The desktop screenshot also reuses the browser-specific filename. When preserving a baseline or multiple attempts matters, copy existing reports/screenshots to viewer-prefixed revision/attempt filenames in the temporary directory before running again. Record the tested source revision/hash and command; a preexisting file or historical passing note is not evidence for current source.

A valid passing browser run requires: process exit 0, the intended nonempty scenario outcomes all pass, and no unexpected page errors. Check elapsed time and skippedWebGL/profile flags. If a scenario fails, preserve its message/report, diagnose, fix if authorized, and rerun affected coverage. Broaden only when changes or uncertainty warrant it.

Update `tests/viewer-validation.md` and `.llm/PROGRESS.md` with exact coverage, environment/profile, source checkpoint, command, result and limitations. Update `.llm/DECISIONS.md` only for meaningful new setup decisions. State clearly what was not run. Keep temporary artifacts out of the runtime and git staging.

Final user report should summarize relevant outcomes and real remaining gaps. Do not ask whether to continue testing once the task's required checks have passed. Do not ask the user to repeatedly approve the same already authorized test profile.

## 9. Future improvement if exact-command approvals remain cumbersome

The current commands above work without adding a test wrapper. If the platform still needs distinct approvals for every filter/profile, a later testing-tooling change can add a single reviewable repository entry point, for example `tests/viewer-run-tests.sh`, with a small explicit mode list: static, core, map, focused scenario, isolated Firefox data. That wrapper does **not exist as a result of this documentation task**.

Before proposing approval, implement/review the complete wrapper within the authorized testing-tooling scope: fixed repository/tool paths, known profiles, validated arguments, no arbitrary command evaluation, nonzero exit on empty outcomes, no automatic installations, and owned-process cleanup. Keep headless flags in the existing harness. Make its limited effects concrete, then request a reusable prefix for that specific script only if platform rules require it. Do not add a generic shell executor or edit approval configuration to bypass policy.

Do not create this wrapper merely because it is described here. First reuse existing approvals and commands. This runbook's immediate handoff is sufficient to avoid needless questions and environment rebuilding.
