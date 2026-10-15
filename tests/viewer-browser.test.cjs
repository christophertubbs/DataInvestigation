/**
 * @module tests/viewer-browser
 * Browser acceptance harness serving viewer.html unchanged under a project path except a test-only
 * internal inspection hook. Uses temporary npm Playwright + optional real Parquet fixture.
 * HTTPS fixture server tests browser CORS/Range with no production backend. All outputs remain in
 * VIEWER_TOOL_ROOT. See viewer-README.md for setup and restrictions.
 * TODO(AI-REVIEW): AI-authored harness; review acceptance assertions and fixtures.
 */
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const assert = require('node:assert/strict');
const toolRoot = process.env.VIEWER_TOOL_ROOT;
if (toolRoot === undefined) {
    throw new Error(
        'Set VIEWER_TOOL_ROOT to the temporary npm tooling/fixture directory documented in viewer-README.md.',
    );
}
const { chromium, firefox } = require(
    path.join(process.env.VIEWER_PLAYWRIGHT_ROOT || toolRoot, 'node_modules/playwright'),
);
const appPath = path.resolve(__dirname, '../viewer.html');
const browserName = process.env.VIEWER_BROWSER || 'chromium';
const outcomes = [];
const errors = [];
let page;
let browser;
let remotePort;
const source = fs.readFileSync(appPath, 'utf8');
const hook = `globalThis.viewerTest = {
    snapshot: () => ({datasets: [...datasets.values()].map(d => ({id:d.id,label:d.label,format:d.format,
        count:d.totalRows,columns:d.table?.columns,metadata:d.metadata,provenance:d.provenance})),
        charts: structuredClone(charts), activeDatasetId, workerCount: activeWorkers.size}),
    runWorker, cancelJobs, publicUrl, restoreCharts
};`;
const server = http.createServer(serveViewer);
const remote = https.createServer(
    {
        key: fs.readFileSync(path.join(toolRoot, 'viewer-key.pem')),
        cert: fs.readFileSync(path.join(toolRoot, 'viewer-cert.pem')),
    },
    serveRemoteFixture,
);
/**
 * Serve only the dedicated test entry under /project, injecting inspection helpers into module scope.
 * @param {import('node:http').IncomingMessage} request Read-only request.
 * @param {import('node:http').ServerResponse} response Static HTML response.
 * @returns {void} No application-server functionality.
 * TODO(AI-REVIEW): Review instrumentation versus unchanged runtime source.
 */
function serveViewer(request, response) {
    response.setHeader('Content-Type', 'text/html');
    response.end(source.replace('startViewer();', `${hook}\nstartViewer();`));
}
/**
 * Serve explicit dev-only fixture endpoints with strict Range, absent CORS, or ignored Range.
 * @param {import('node:http').IncomingMessage} request Test request.
 * @param {import('node:http').ServerResponse} response Response with selected test headers.
 * @returns {void} Reads only viewer fixture bytes; tracks no user data.
 * TODO(AI-REVIEW): Review failure routes and expected partial response behavior.
 */
function serveRemoteFixture(request, response) {
    if (!request.url.includes('no-cors')) {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
        response.setHeader('Access-Control-Allow-Headers', 'Range');
    }
    if (request.method === 'OPTIONS') {
        response.end();
        return;
    }
    const data = fs.readFileSync(path.join(toolRoot, 'viewer-fixture.parquet'));
    response.setHeader('Content-Length', data.length);
    if (request.method === 'HEAD') {
        response.end();
        return;
    }
    const range = request.headers.range;
    if (range !== undefined && !request.url.includes('ignore-range')) {
        const parts = /bytes=(\d+)-(\d+)/.exec(range);
        const start = Number(parts[1]);
        const end = Number(parts[2]);
        response.writeHead(206, {
            'Content-Length': end - start + 1,
            'Content-Range': `bytes ${start}-${end}/${data.length}`,
        });
        response.end(data.subarray(start, end + 1));
    } else {
        response.end(data);
    }
}
/**
 * Execute one scenario while preserving evidence of subsequent independent scenarios after failure.
 * @param {string} name Acceptance scenario label.
 * @param {()=>Promise<void>} operation Named scenario function.
 * @returns {Promise<void>} Stores pass/fail and duration, logs concise evidence.
 * TODO(AI-REVIEW): Review result reporting and nonzero final failure status.
 */
async function scenario(name, operation) {
    if (process.env.VIEWER_TEST_FILTER && !name.includes(process.env.VIEWER_TEST_FILTER)) {
        return;
    }
    const started = Date.now();
    try {
        await operation();
        outcomes.push({ name, pass: true, elapsedMs: Date.now() - started });
        console.log('PASS', name);
    } catch (error) {
        outcomes.push({ name, pass: false, error: error.message, elapsedMs: Date.now() - started });
        console.log('FAIL', name, error.message);
    }
}
/** @returns {Promise<void>} Wait until actual loading state ends, not a fixed assumed duration.
 * TODO(AI-REVIEW): Review asynchronous wait boundaries. */
async function idle() {
    await page.waitForFunction(
        () => document.getElementById('viewer-workspace').getAttribute('aria-busy') === 'false',
        null,
        { timeout: 90000 },
    );
}
/** @returns {Promise<string>} Visible status. TODO(AI-REVIEW): Review status evidence. */
async function status() {
    return await page.locator('#viewer-status').innerText();
}
/** @param {string} action Fixed action value. @returns {Promise<void>} Click and await work settlement.
 * TODO(AI-REVIEW): Review action completion waits. */
async function action(action) {
    await page.locator(`button[data-action="${action}"]`).first().click();
    await idle();
}
/** @param {string} name Fixture label. @param {string} text CSV/JSON fixture content.
 * @returns {Promise<void>} File-input load from memory, worker parse complete.
 * TODO(AI-REVIEW): Review real input path usage. */
async function fileText(name, text) {
    await page.locator('#viewer-files').setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from(text) });
    await idle();
}
/** @returns {Promise<void>} Resets independent browser document; no previous runtime library promises retained.
 * TODO(AI-REVIEW): Review test isolation. */
async function fresh() {
    await page.goto(`http://127.0.0.1:${server.address().port}/project/viewer.html`);
    await page.waitForFunction(() => globalThis.viewerTest !== undefined);
}
/** @returns {Promise<void>} Sample chart, all phase-1 Plotly types, slider and strict log rejection.
 * TODO(AI-REVIEW): Review field bindings and renderer trace assertions. */
async function chartTypes() {
    await fresh();
    await action('sample');
    assert.match(await status(), /Rendered/);
    const kinds = ['scatter', 'bubble', 'line', 'scatter3d', 'line3d', 'bar', 'box', 'histogram', 'table'];
    for (const kind of kinds) {
        if (process.env.VIEWER_SKIP_WEBGL === '1' && ['scatter3d', 'line3d'].includes(kind)) {
            continue;
        }
        await page.selectOption('#viewer-chart-type', kind);
        if (kind === 'bubble') {
            await page.selectOption('#viewer-size-field', 'size');
        }
        await action('render');
        assert.doesNotMatch(await status(), /failed|requires|Missing|invalid|unavailable/i, kind);
        if (kind !== 'table') {
            const data = await page
                .locator('#viewer-plot')
                .evaluate((node) => ({ type: node.data[0].type, n: (node.data[0].x || node.data[0].y).length }));
            assert.equal(
                data.type,
                {
                    scatter: 'scatter',
                    bubble: 'scatter',
                    line: 'scatter',
                    scatter3d: 'scatter3d',
                    line3d: 'scatter3d',
                    bar: 'bar',
                    box: 'box',
                    histogram: 'histogram',
                }[kind],
            );
            assert.equal(data.n, 720);
        }
    }
    await page.selectOption('#viewer-chart-type', 'line');
    await page.selectOption('#viewer-x', 'time');
    await page.locator('#viewer-x-mode').selectOption('date', { force: true });
    await page.getByText('Axes, range & layout', { exact: true }).click();
    await page.locator('#viewer-time-slider').check();
    await action('render');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.layout.xaxis.rangeslider.visible), true);
    await page.locator('#viewer-time-slider').uncheck();
    await page.locator('#viewer-y-mode').selectOption('log', { force: true });
    await action('render');
    assert.match(await status(), /log axes require positive/);
}
/** @returns {Promise<void>} Dataset resets, actionable date/grid errors and a real input above the old size limit.
 * TODO(AI-REVIEW): Review state transitions and large-file fixture lifetime. */
async function settingsRecovery() {
    await fresh();
    await fileText('viewer-settings-a.csv', 'dim_0,dim_1,streamflow\n0,0,1\n1,0,2');
    await page.selectOption('#viewer-sort', 'dim_0');
    await page.fill('#viewer-row-limit', '12');
    await page.selectOption('#viewer-query-sample', 'uniform');
    await page.selectOption('#viewer-color-field', 'streamflow');
    await page.selectOption('#viewer-size-field', 'streamflow');
    await page.selectOption('#viewer-group', 'dim_1');
    await page.selectOption('#viewer-hover-fields', ['streamflow']);
    await page.fill('#viewer-hover-template', 'Old value: {streamflow}');
    await fileText('viewer-settings-b.csv', 'dim_0,date,value\n0,2026-10-13,3\n1,2026-10-14,4');
    assert.equal(await page.locator('#viewer-sort').inputValue(), '');
    assert.equal(await page.locator('#viewer-row-limit').inputValue(), '10000');
    assert.equal(await page.locator('#viewer-query-sample').inputValue(), 'first');
    assert.equal(await page.locator('#viewer-trace-dataset').inputValue(), 'viewer_data_1');
    await page.selectOption('#viewer-trace-dataset', 'viewer_data_2');
    assert.equal(await page.locator('#viewer-color-field').inputValue(), '');
    assert.equal(await page.locator('#viewer-size-field').inputValue(), '');
    assert.equal(await page.locator('#viewer-group').inputValue(), '');
    assert.equal(await page.locator('#viewer-hover-template').inputValue(), '');
    assert.deepEqual(
        await page
            .locator('#viewer-hover-fields')
            .evaluate((select) => [...select.selectedOptions].map((option) => option.value)),
        [],
    );
    await page.selectOption('#viewer-x', 'date');
    await action('render');
    assert.match(await status(), /X axis.*Scale.*Date/);
    await page.selectOption('#viewer-chart-type', 'heatmap');
    await action('render');
    assert.match(await status(), /at least two positions.*End is exclusive/);
    const largeFile = path.join(toolRoot, 'viewer-size-above-old-limit.json');
    fs.writeFileSync(largeFile, '[{"x":1,"y":2}]');
    fs.appendFileSync(largeFile, Buffer.alloc(65 * 1024 * 1024, 32));
    await page.locator('#viewer-files').setInputFiles(largeFile);
    await idle();
    assert.match(await status(), /Opened 1\/1/);
    assert.equal((await page.evaluate(() => viewerTest.snapshot())).datasets.at(-1).count, 1);
    const oversizedFile = path.join(toolRoot, 'viewer-size-over-300mb.json');
    fs.writeFileSync(oversizedFile, '[]');
    fs.truncateSync(oversizedFile, 300000001);
    await page.locator('#viewer-files').setInputFiles(oversizedFile);
    await idle();
    assert.match(await status(), /limited to 300 MB/);
    assert.equal((await page.evaluate(() => viewerTest.snapshot())).datasets.length, 3);
}
/** @returns {Promise<void>} CSV quotes/missing, JSON shapes, malformed/empty/prototype-safe ingestion.
 * TODO(AI-REVIEW): Review parser boundary fixtures. */
async function ingestion() {
    await fresh();
    await fileText('viewer-quotes.csv', 'x,label,y\r\n1,"comma, and ""quote""",2\r\n2,"multiline\nlabel",\r\n');
    let snapshot = await page.evaluate(() => viewerTest.snapshot());
    assert.equal(snapshot.datasets[0].columns.label[0], 'comma, and "quote"');
    assert.equal(snapshot.datasets[0].columns.y[1], null);
    await fileText('viewer-quotes.csv', 'x,y\n3,4');
    snapshot = await page.evaluate(() => viewerTest.snapshot());
    assert.equal(snapshot.datasets[1].label, 'viewer-quotes.csv (2)');
    await fileText('viewer-column.json', '{"columns":{"a":[1,2],"b":[null,4]}}');
    assert.match(await status(), /Opened 1\/1/);
    await fileText('viewer-empty.csv', '');
    assert.match(await status(), /input is empty/);
    await fileText('viewer-invalid.csv', 'a,b\n1,2,3');
    assert.match(await status(), /Malformed CSV/);
    await fileText('viewer-duplicate.csv', 'a,a\n1,2');
    assert.match(await status(), /duplicated/);
    await fileText('viewer-unsafe.json', '{"__proto__":[1]}');
    assert.match(await status(), /Invalid field/);
    assert.equal(await page.locator('#viewer-preview tbody tr').count(), 2);
}
/** @returns {Promise<void>} AND/OR filtering, projection, sort, source immutability, no-results schema.
 * TODO(AI-REVIEW): Review visual query workflow. */
async function visualQuery() {
    await fresh();
    await fileText('viewer-query.json', '{"columns":{"x":[0,2,4,null,1],"group":["A","B","A","B","A"]}}');
    await action('add-filter');
    await page.locator('[data-filter-field]').selectOption('x');
    await page.locator('[data-filter-operator]').selectOption('ge');
    await page.locator('[data-filter-value]').fill('1');
    await page.selectOption('#viewer-sort', 'x');
    await page.selectOption('#viewer-direction', 'desc');
    await page.fill('#viewer-row-limit', '2');
    await action('query');
    const snapshot = await page.evaluate(() => viewerTest.snapshot());
    assert.deepEqual(snapshot.datasets[1].columns.x, [4, 2]);
    assert.deepEqual(snapshot.datasets[0].columns.x, [0, 2, 4, null, 1]);
    assert.match(await status(), /3 matched/);
    await page.selectOption('#viewer-dataset', 'viewer_data_1');
    await action('add-filter');
    await page.locator('[data-filter-field]').selectOption('x');
    await page.locator('[data-filter-operator]').selectOption('gt');
    await page.locator('[data-filter-value]').fill('999');
    await action('query');
    assert.match(await status(), /0 rows returned/);
    await page.selectOption('#viewer-trace-dataset', 'viewer_data_3');
    await action('render');
    assert.equal(await page.locator('#viewer-empty-heading').innerText(), 'No records to plot');
}
/** @returns {Promise<void>} Independent traces and chart workspaces retain bindings across source switches.
 * TODO(AI-REVIEW): Review comparison state ownership. */
async function multipleTraces() {
    await fresh();
    await fileText('viewer-first.csv', 'x,y\n1,2\n3,4');
    await action('render');
    await fileText('viewer-second.csv', 'a,b\n5,6\n7,8');
    await action('add-trace');
    await page.fill('#viewer-trace-name', 'Second');
    await page.fill('#viewer-hover-template', '<b>Y</b>: {b}');
    await action('render');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.data[1].text[0]), '&lt;b&gt;Y&lt;/b&gt;: 6.000');
    const data = await page.locator('#viewer-plot').evaluate((n) => n.data.map((t) => ({ x: t.x, y: t.y })));
    assert.deepEqual(data, [
        { x: [1, 3], y: [2, 4] },
        { x: [5, 7], y: [6, 8] },
    ]);
    await action('add-chart');
    assert.equal((await page.evaluate(() => viewerTest.snapshot())).charts.length, 2);
    await page.selectOption('#viewer-chart', 'viewer_chart_1');
    await action('render');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.data.length), 2);
}
/** @returns {Promise<void>} 100003-row Parquet projection and complete Arrow SQL result.
 * TODO(AI-REVIEW): Review real binary and full SQL scan acceptance. */
async function parquetSql() {
    await fresh();
    await page.locator('#viewer-files').setInputFiles(path.join(toolRoot, 'viewer-fixture.parquet'));
    await idle();
    assert.match(await status(), /Opened 1\/1/);
    const snapshot = await page.evaluate(() => viewerTest.snapshot());
    assert.equal(snapshot.datasets[0].count, 100003);
    assert.equal(snapshot.datasets[0].columns.value.length, 50);
    await page.getByText('SQL · DuckDB', { exact: true }).click();
    await page.fill('#viewer-sql', 'SELECT count(*) AS n, sum(value) AS total FROM viewer_data_1');
    await action('sql');
    assert.match(await status(), /1 SQL rows/);
    const selected = (await page.evaluate(() => viewerTest.snapshot())).datasets.at(-1);
    assert.deepEqual(selected.columns, { n: [100003], total: [4242816] });
}
/** @returns {Promise<void>} HTTPS CORS/range reader success and explicit failure without fake datasets.
 * TODO(AI-REVIEW): Review real browser CORS boundaries. */
async function remoteRanges() {
    await fresh();
    for (const [name, expected] of [
        ['viewer-range.parquet', /Opened/],
        ['viewer-ignore-range.parquet', /ignored HTTP Range/],
        ['viewer-no-cors.parquet', /CORS|Failed to fetch/],
    ]) {
        await page.fill('#viewer-url', `https://127.0.0.1:${remotePort}/${name}`);
        await page.locator('#viewer-url-form button').click();
        await idle();
        assert.match(await status(), expected);
    }
    assert.equal((await page.evaluate(() => viewerTest.snapshot())).datasets.length, 1);
}
/** @returns {Promise<void>} Packed classic slice values, fill ordering, heatmap/surface and reduction.
 * TODO(AI-REVIEW): Review scientific fixture expected values. */
async function scientificSlice() {
    await fresh();
    await page.locator('#viewer-files').setInputFiles(path.resolve(__dirname, 'viewer-fixtures/viewer-packed.nc'));
    await idle();
    assert.equal(await page.locator('button[data-action=\"query\"]').isDisabled(), true);
    await action('slice');
    const snapshot = await page.evaluate(() => viewerTest.snapshot());
    assert.deepEqual(snapshot.datasets[1].columns.temperature, [10, 11, null, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    await action('render');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.data[0].type), 'heatmap');
    if (process.env.VIEWER_SKIP_WEBGL !== '1') {
        await page.selectOption('#viewer-chart-type', 'surface');
        await action('render');
        assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.data[0].type), 'surface');
    }
    await page.selectOption('#viewer-dataset', 'viewer_data_1');
    await page.selectOption('#viewer-reduction', 'mean');
    await page.selectOption('#viewer-reduce-dimension', 'x');
    await action('slice');
    const reduced = (await page.evaluate(() => viewerTest.snapshot())).datasets.at(-1);
    assert.deepEqual(reduced.columns.temperature, [34 / 3, 15.5, 19.5]);
    assert.equal(await page.locator('#viewer-chart-type').inputValue(), 'scatter');
    await page.selectOption('#viewer-chart-type', 'heatmap');
    await action('render');
    assert.match(await status(), /one-position-by-many-positions slice is a series/);
}
/** @returns {Promise<void>} Public compressed Zarr bounded worker read.
 * TODO(AI-REVIEW): Review remote array/codec acceptance. */
async function compressedZarr() {
    await fresh();
    await page.fill(
        '#viewer-url',
        'https://raw.githubusercontent.com/zarr-developers/zarr_implementations/5dc998ac72/examples/zarr.zr/blosc',
    );
    await page.selectOption('#viewer-url-kind', 'zarr');
    await page.locator('#viewer-url-form button').click();
    await idle();
    assert.match(await status(), /Opened/);
    for (const [axis, end] of [
        [0, '2'],
        [1, '3'],
        [2, '1'],
    ]) {
        await page.fill(`#viewer-dim-${axis}-end`, end);
    }
    await action('slice');
    const derived = (await page.evaluate(() => viewerTest.snapshot())).datasets.at(-1);
    assert.deepEqual(derived.columns.array, [154, 109, 63, 177, 144, 113]);
}
/** @returns {Promise<void>} Browser-selected local Zarr directory metadata and selected chunk read.
 * TODO(AI-REVIEW): Review relative path preservation across worker structured clone. */
async function localZarr() {
    await fresh();
    await page.locator('#viewer-zarr-files').setInputFiles(path.join(toolRoot, 'viewer-local.zarr'));
    await idle();
    assert.match(await status(), /Opened/);
    await action('slice');
    const derived = (await page.evaluate(() => viewerTest.snapshot())).datasets.at(-1);
    assert.deepEqual(derived.columns.array, [0, 1, 2, 3, 4, 5]);
}
/** @returns {Promise<void>} Session references restore without network/script execution and reselect stable IDs.
 * TODO(AI-REVIEW): Review round-trip security and reproducibility. */
async function sessions() {
    await fresh();
    await fileText('viewer-session-source.csv', 'x,y\n1,2\n3,4');
    await action('add-filter');
    await page.locator('[data-filter-field]').selectOption('x');
    await page.locator('[data-filter-operator]').selectOption('gt');
    await page.locator('[data-filter-value]').fill('0');
    await page.fill('#viewer-row-limit', '123');
    await page.fill('#viewer-title', 'Saved comparison');
    await page.getByText('JavaScript · trusted code', { exact: true }).click();
    await page.fill('#viewer-code', 'globalThis.viewerUnsafeRan = true; return {kind:"table",columns:{x:[1]}};');
    const downloadPromise = page.waitForEvent('download');
    await action('save-session');
    const download = await downloadPromise;
    const filename = path.join(toolRoot, 'viewer-session-test.json');
    await download.saveAs(filename);
    const session = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(session.datasets[0].source.reference, 'viewer-session-source.csv');
    assert.equal(session.scriptEnabled, false);
    await page.locator('#viewer-session-file').setInputFiles(filename);
    await page.waitForFunction(() => document.getElementById('viewer-run-code').disabled);
    assert.equal(await page.evaluate(() => globalThis.viewerUnsafeRan), undefined);
    assert.match(await status(), /Reselect files/);
    await fileText('viewer-session-source.csv', 'x,y\n1,2\n3,4');
    assert.equal((await page.evaluate(() => viewerTest.snapshot())).datasets.length, 1);
    assert.equal(await page.locator('[data-filter-value]').inputValue(), '0');
    assert.equal(await page.locator('#viewer-row-limit').inputValue(), '123');
    await action('render');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.layout.title.text), 'Saved comparison');
    await fresh();
    await action('sample');
    await page.selectOption('#viewer-chart-type', 'scatter3d');
    await page.fill('#viewer-title', 'Saved sample 3D');
    const sampleDownloadPromise = page.waitForEvent('download');
    await action('save-session');
    const sampleDownload = await sampleDownloadPromise;
    const sampleFile = path.join(toolRoot, 'viewer-sample-session-test.json');
    await sampleDownload.saveAs(sampleFile);
    await page.locator('#viewer-session-file').setInputFiles(sampleFile);
    await page.waitForFunction(() => document.getElementById('viewer-run-code').disabled);
    await action('sample');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.layout.title.text), 'Saved sample 3D');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.data[0].type), 'scatter3d');
}
/** @returns {Promise<void>} Worker cancellation frees references; offline dependencies show actionable errors.
 * TODO(AI-REVIEW): Review stale/canceled publication and CDN failures. */
async function cancellationOffline() {
    await fresh();
    const canceled = await page.evaluate(async () => {
        const task = viewerTest.runWorker({ operation: 'text', text: 'x,y\n1,2', delimiter: '' });
        viewerTest.cancelJobs();
        try {
            await task;
            return false;
        } catch (error) {
            return error.name === 'AbortError';
        }
    });
    assert.equal(canceled, true);
    assert.equal((await page.evaluate(() => viewerTest.snapshot())).workerCount, 0);
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await action('sample');
    assert.match(await status(), /Library unavailable/);
    await page.unroute('https://cdn.jsdelivr.net/**');
    await action('render');
    assert.match(await status(), /Rendered/);
}
/** @returns {Promise<void>} Keyboard access/narrow layouts avoid horizontal page overflow.
 * TODO(AI-REVIEW): Review responsive shell accessibility. */
async function responsive() {
    await fresh();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BUTTON');
    await page.setViewportSize({ width: 390, height: 844 });
    const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
    }));
    assert.ok(widths.scroll <= widths.client + 1, JSON.stringify(widths));
    await page.screenshot({ path: path.join(toolRoot, `viewer-${browserName}-mobile.png`), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
}
/** @returns {Promise<void>} Actual image/config/table downloads and explicit typed-code execution.
 * TODO(AI-REVIEW): Review exported content and never-auto-run behavior. */
async function exportsAndCode() {
    await fresh();
    await action('sample');
    for (const kind of ['png', 'svg', 'plot', 'html', 'csv', 'json']) {
        await page.selectOption('#viewer-export-kind', kind);
        const expected = page.waitForEvent('download');
        await action('export');
        const download = await expected;
        assert.ok(download.suggestedFilename().includes('viewer'));
        const file = path.join(toolRoot, 'viewer-export-test.' + kind);
        await download.saveAs(file);
        assert.ok(fs.statSync(file).size > 50);
        if (kind === 'plot') {
            const plot = JSON.parse(fs.readFileSync(file, 'utf8'));
            assert.equal(plot.data[0].x.length, 720);
        }
        if (kind === 'json') {
            assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).columns.x.length, 720);
        }
    }
    await page.getByText('JavaScript · trusted code', { exact: true }).click();
    await page.selectOption('#viewer-example', process.env.VIEWER_SKIP_WEBGL === '1' ? 'sine' : 'helix');
    await action('example');
    await action('code');
    assert.match(await status(), process.env.VIEWER_SKIP_WEBGL === '1' ? /Published 400/ : /Published 600/);
    await action('render');
    assert.equal(
        await page.locator('#viewer-plot').evaluate((n) => n.data[0].type),
        process.env.VIEWER_SKIP_WEBGL === '1' ? 'scatter' : 'scatter3d',
    );
    await page
        .locator('#viewer-code')
        .fill(
            'return {kind: "table", label: "Typed values", columns: {x: api.float64([1,2]), y: api.float64([3,4])}};',
        );
    await action('code');
    assert.deepEqual((await page.evaluate(() => viewerTest.snapshot())).datasets.at(-1).columns, {
        x: [1, 2],
        y: [3, 4],
    });
}
/** @returns {Promise<void>} 100k CSV, responsive worker query, sampling extrema, zero results and subplots.
 * TODO(AI-REVIEW): Review performance counters and honest sampling labels. */
async function largeAndSubplots() {
    await fresh();
    const lines = ['x,y'];
    for (let i = 0; i < 100000; i += 1) {
        lines.push(`${i},${i === 4321 ? 999999 : Math.sin(i / 100)}`);
    }
    await page.evaluate(() => {
        globalThis.viewerLongTasks = [];
        if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) {
            return;
        }
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                globalThis.viewerLongTasks.push(entry.duration);
            }
        }).observe({ type: 'longtask', buffered: true });
    });
    const started = Date.now();
    const csvPath = path.join(toolRoot, 'viewer-100k.csv');
    fs.writeFileSync(csvPath, lines.join('\n'));
    await page.locator('#viewer-files').setInputFiles(csvPath);
    await idle();
    assert.equal((await page.evaluate(() => viewerTest.snapshot())).datasets[0].count, 100000);
    assert.equal(await page.locator('#viewer-preview tbody tr').count(), 50);
    const metadataDurations = await page.evaluate(() => globalThis.viewerLongTasks.slice());
    const metadataElapsedMs = Date.now() - started;
    await page.evaluate(() => {
        globalThis.viewerLongTasks = [];
    });
    await page.selectOption('#viewer-chart-type', 'line');
    await page.getByText('Axes, range & layout', { exact: true }).click();
    await page.locator('#viewer-point-limit').fill('100');
    await action('render');
    const trace = await page
        .locator('#viewer-plot')
        .evaluate((n) => ({ count: n.data[0].x.length, peak: n.data[0].y.includes(999999) }));
    assert.ok(trace.count <= 100 && trace.peak);
    assert.match(await status(), /visually sampled/);
    await action('add-trace');
    await page.selectOption('#viewer-layout', '1x2');
    await page.locator('#viewer-panel').fill('2');
    await page.locator('#viewer-shared-axes').check();
    await action('render');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.data[1].xaxis), 'x2');
    assert.equal(await page.locator('#viewer-plot').evaluate((n) => n.layout.xaxis2.matches), 'x');
    const durations = await page.evaluate(() => globalThis.viewerLongTasks);
    outcomes.push({
        name: '100k CSV performance observation (entire ingest/render workflow)',
        pass: true,
        elapsedMs: Date.now() - started,
        metadataPreviewElapsedMs: metadataElapsedMs,
        metadataMaxMainThreadLongTaskMs: Math.max(0, ...metadataDurations),
        renderAndInitialPlotlyMaxMainThreadLongTaskMs: Math.max(0, ...durations),
        longTaskCount: durations.length,
    });
}
/** @returns {Promise<void>} Blank map, invalid coordinate omission, GeoJSON line/polygon overlays.
 * TODO(AI-REVIEW): Review map feature counts and no-basemap traffic. */
async function maps() {
    await fresh();
    await fileText('viewer-map.csv', 'longitude,latitude,value\n-100,35,1\n-101,36,2\n-300,35,3');
    await page.selectOption('#viewer-chart-type', 'map');
    await action('render');
    assert.match(await status(), /Map rendered/);
    assert.match(await status(), /1 invalid/);
    const geometry = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: { label: 'line' },
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [-101, 36],
                        [-100, 35],
                    ],
                },
            },
            {
                type: 'Feature',
                properties: { label: 'area' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [-102, 34],
                            [-100, 34],
                            [-100, 35],
                            [-102, 34],
                        ],
                    ],
                },
            },
        ],
    };
    await fileText('viewer-geometry.geojson', JSON.stringify(geometry));
    await page.selectOption('#viewer-trace-dataset', 'viewer_data_2');
    await action('render');
    assert.match(await status(), /2 features/);
    assert.equal(await page.locator('#viewer-map canvas').count(), 1);
}
/** @returns {Promise<void>} Real packed compressed HDF5 file, hyperslab and expected CF values.
 * TODO(AI-REVIEW): Review experimental scope and independent fixture creation. */
async function hdf5Slice() {
    await fresh();
    const bytes = await page.evaluate(async () => {
        const h = await import('https://cdn.jsdelivr.net/npm/h5wasm@0.9.0/dist/esm/hdf5_hl.js');
        const { FS } = await h.ready;
        const f = new h.File('viewer-fixture.h5', 'w');
        const v = f.create_dataset({
            name: 'temperature',
            data: new Int16Array([0, 2, -9999, 6, 8, 10, 12, 14, 16, 18, 20, 22]),
            shape: [1, 3, 4],
            chunks: [1, 3, 4],
            compression: 'gzip',
            compression_opts: 1,
        });
        v.create_attribute('scale_factor', 0.5);
        v.create_attribute('add_offset', 10);
        v.create_attribute('_FillValue', -9999);
        f.close();
        const output = Array.from(FS.readFile('viewer-fixture.h5'));
        FS.unlink('viewer-fixture.h5');
        return output;
    });
    await page
        .locator('#viewer-files')
        .setInputFiles({ name: 'viewer-fixture.h5', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes) });
    await idle();
    assert.match(await status(), /Opened 1\/1/);
    await page.fill('#viewer-dim-1-end', '2');
    await page.fill('#viewer-dim-2-end', '3');
    await action('slice');
    const derived = (await page.evaluate(() => viewerTest.snapshot())).datasets.at(-1);
    assert.deepEqual(derived.columns.temperature, [10, 11, null, 14, 15, 16]);
    assert.match(derived.metadata.warning, /packing/);
    fs.writeFileSync(path.join(toolRoot, 'viewer-fixture.h5'), Buffer.from(bytes));
}
/**
 * Run all scenarios with owned browser/server cleanup and machine-readable evidence.
 * @returns {Promise<void>} Writes viewer-browser-results-*.json; sets failure exit code.
 * @throws {Error} Browser/tool startup failure propagates to final handler.
 * TODO(AI-REVIEW): Review verification scope and browser-specific limitations.
 */
async function main() {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    await new Promise((resolve) => remote.listen(0, '127.0.0.1', resolve));
    remotePort = remote.address().port;
    const launch = { headless: true, args: ['--no-sandbox'] };
    if (browserName === 'firefox' && process.env.VIEWER_SKIP_WEBGL === '1') {
        launch.firefoxUserPrefs = { 'webgl.disabled': true, 'gfx.webrender.software': true };
    }
    if (browserName === 'chromium' && process.env.VIEWER_MAP_ONLY !== '1') {
        launch.channel = 'chromium';
        launch.args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl');
    }
    browser = await (browserName === 'firefox' ? firefox : chromium).launch(launch);
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
    page.on('pageerror', (error) => errors.push(error.message));
    try {
        if (process.env.VIEWER_MAP_ONLY === '1') {
            await scenario('MapLibre points/invalid coordinates/GeoJSON', maps);
            await scenario('experimental packed HDF5 hyperslabs', hdf5Slice);
        } else {
            await scenario('chart types/date slider/log validation', chartTypes);
            await scenario('settings recovery and increased file size', settingsRecovery);
            await scenario('quoted/missing/malformed CSV and JSON', ingestion);
            await scenario('visual derived query/source immutability', visualQuery);
            await scenario('multi-trace and chart bindings', multipleTraces);
            await scenario('100003-row Parquet + complete SQL', parquetSql);
            await scenario('remote HTTPS range/CORS failures', remoteRanges);
            await scenario('packed NetCDF3 slices/grid/reduction', scientificSlice);
            await scenario('public compressed Zarr slice', compressedZarr);
            await scenario('local Zarr directory', localZarr);
            await scenario('session round trip + no script execution', sessions);
            await scenario('cancel/offline/retry', cancellationOffline);
            await scenario('exports and explicit JavaScript', exportsAndCode);
            await scenario('large CSV/sampling/subplots', largeAndSubplots);
            await scenario('keyboard/responsive shell', responsive);
        }
        await page.screenshot({ path: path.join(toolRoot, `viewer-${browserName}-desktop.png`), fullPage: true });
    } finally {
        await browser.close();
        server.close();
        remote.close();
    }
    const evidence = {
        browser: browserName,
        skippedWebGL: process.env.VIEWER_SKIP_WEBGL === '1',
        outcomes,
        pageErrors: errors,
    };
    fs.writeFileSync(
        path.join(
            toolRoot,
            `viewer-browser-results-${browserName}${process.env.VIEWER_TEST_FILTER ? '-' + process.env.VIEWER_TEST_FILTER.replace(/[^a-z0-9]/gi, '-') : ''}${process.env.VIEWER_MAP_ONLY === '1' ? '-map' : ''}.json`,
        ),
        JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence, null, 2));
    if (outcomes.some((result) => !result.pass) || errors.length > 0) {
        process.exitCode = 1;
    }
}
main().catch(reportStartupFailure);
/** @param {Error} error Startup failure. @returns {void} Nonzero exit and owned server shutdown.
 * TODO(AI-REVIEW): Review failure reporting. */
function reportStartupFailure(error) {
    console.error(error);
    server.close();
    remote.close();
    process.exitCode = 1;
}
