// @ts-check
/**
 * @module tests/viewer-pure
 * Exercises the actual inline pure helpers without duplicating implementation or fetching libraries.
 * Development-only Node harness; no runtime assets/build dependencies. Run: node tests/viewer-pure.test.cjs.
 * TODO(AI-REVIEW): AI-authored tests; review boundaries and representative assertions.
 */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(new URL('../viewer.html', `file://${__filename}`), 'utf8');
const code = html
    .split('// ── Pure normalization')[1]
    .split('\n')
    .slice(1)
    .join('\n')
    .split('// ── Cancellable jobs')[0];
const context = vm.createContext({ Date, ArrayBuffer, BigInt });
vm.runInContext(code, context);
/**
 * Normalize cross-realm objects for Node deep equality; no application code transformation.
 * @param {unknown} value Pure helper result, JSON-compatible.
 * @returns {unknown} Native-realm structural clone via JSON.
 * TODO(AI-REVIEW): Review test normalization.
 */
function native(value) {
    return JSON.parse(JSON.stringify(value));
}
const normalized = context.normalizeTable([{ x: 1, label: '<script>' }, { x: null }, { x: Infinity }]);
assert.deepEqual(native(normalized), { columns: { x: [1, null, null], label: ['<script>', null, null] }, count: 3 });
assert.deepEqual(native(context.normalizeTable({ columns: { x: [1, 2], y: [3, null] } })), {
    columns: { x: [1, 2], y: [3, null] },
    count: 2,
});
assert.throws(invalidColumns, /same length/);
assert.throws(invalidRows, /must be an object/);
assert.throws(unsafeHeader, /Invalid field/);
assert.equal(context.normalizeCell(9007199254740993n), '9007199254740993');
assert.equal(context.normalizeCell(new Date('2025-01-01')), '2025-01-01T00:00:00.000Z');
const source = context.normalizeTable({ x: [0, 2, 4, null, 1], group: ['A', 'B', 'A', 'B', 'A'] });
const query = {
    columns: ['x'],
    filters: [{ field: 'x', operator: 'ge', value: '1' }],
    join: 'and',
    sort: 'x',
    direction: 'desc',
    limit: 2,
    sample: 'first',
};
assert.deepEqual(native(context.queryTable(source, query)), {
    table: { columns: { x: [4, 2] }, count: 2 },
    matched: 3,
    selected: 2,
});
assert.deepEqual(native(source.columns.x), [0, 2, 4, null, 1]);
assert.equal(context.matchesFilter(null, { field: 'x', operator: 'missing', value: '' }), true);
assert.equal(context.matchesFilter(null, { field: 'x', operator: 'eq', value: '' }), false);
assert.throws(invalidNumericFilter, /finite numeric/);
assert.deepEqual(
    native(context.queryTable(source, { ...query, filters: [], limit: 3, sample: 'uniform' }).table.columns.x),
    [4, 1, null],
);
assert.deepEqual(
    native(context.unpackValues([0, 2, -9999, 6], { scale_factor: 0.5, add_offset: 10, _FillValue: -9999 })),
    [10, 11, null, 13],
);
assert.deepEqual(
    native(
        context.selectedShape(
            [2, 3, 4],
            [
                { start: 0, end: 1, step: 1 },
                { start: 0, end: 3, step: 2 },
                { start: 1, end: 4, step: 1 },
            ],
        ),
    ),
    [1, 2, 3],
);
assert.throws(oversizedSlice, /exceeds 100,000/);
assert.throws(invalidStep, /Invalid slice/);
const signal = new Array(10000).fill(0);
signal[4321] = 100;
signal[5678] = -200;
const sample = context.sampleIndices(signal, 100, true);
assert.ok(sample.includes(4321) && sample.includes(5678));
assert.ok(sample.length <= 100 && sample[0] === 0 && sample.at(-1) === 9999);
assert.equal(context.inferType([null, 0, 1]), 'integer');
assert.equal(context.inferType(['2025-01-01', '2025-01-02']), 'datetime');
assert.deepEqual(native(context.normalizeTable({ data: [1, 2], columns: [3, 4] })), {
    columns: { data: [1, 2], columns: [3, 4] },
    count: 2,
});
const adapterHelpers = html.split('// ── DOM primitives')[1].split('\n').slice(1).join('\n').split('// ── Registry')[0];
const scientificHelpers = html.split('// ── SQL adapter')[1].split('\n').slice(1).join('\n').split('// ── MapLibre')[0];
vm.runInContext(adapterHelpers, context);
vm.runInContext(scientificHelpers, context);
const arrayVariable = { name: 'temperature', shape: [2, 2], dimensions: ['y', 'x'], attributes: {}, type: 'number' };
const arraySelection = [
    { start: 0, end: 2, step: 1 },
    { start: 0, end: 2, step: 1 },
];
assert.deepEqual(
    native(
        context.sliceToTable([10, 11, null, 13], [2, 2], arrayVariable, arraySelection, 'mean', 'x').table.columns
            .temperature,
    ),
    [10.5, 13],
);
assert.deepEqual(
    native(
        context.sliceToTable([10, 11, null, 13], [2, 2], arrayVariable, arraySelection, 'min', 'x').table.columns
            .temperature,
    ),
    [10, 13],
);
assert.deepEqual(
    native(
        context.sliceToTable([10, 11, null, 13], [2, 2], arrayVariable, arraySelection, 'max', 'x').table.columns
            .temperature,
    ),
    [11, 13],
);
assert.deepEqual(
    native(
        context.sliceToTable([10, 11, null, 13], [2, 2], arrayVariable, arraySelection, 'sum', 'x').table.columns
            .temperature,
    ),
    [21, 13],
);
assert.deepEqual(
    native(context.sliceToTable([10, 11, null, 13], [2, 2], arrayVariable, arraySelection, 'none', 'x').grid.z),
    [
        [10, 11],
        [null, 13],
    ],
);
assert.throws(invalidReduction, /Unknown reduction/);
assert.deepEqual(native(context.normalizeTable({ columns: new Float64Array([1, 2]) })), {
    columns: { columns: [1, 2] },
    count: 2,
});
assert.deepEqual(native(context.normalizeTable({ columns: { data: [{ value: 1 }] } })), {
    columns: { data: ['{"value":1}'] },
    count: 1,
});
assert.deepEqual(native(context.normalizeTable({ data: [new Date('2025-01-01')] }, true)), {
    columns: { data: ['2025-01-01T00:00:00.000Z'] },
    count: 1,
});
console.log('Viewer pure helpers: 31 boundary assertions passed.');
/** @returns {void} Unequal column fixture. TODO(AI-REVIEW): Review malformed input assertion. */
function invalidColumns() {
    context.normalizeTable({ x: [1], y: [2, 3] });
}
/** @returns {void} Nonrecord JSON fixture. TODO(AI-REVIEW): Review malformed shape assertion. */
function invalidRows() {
    context.normalizeTable([1, 2]);
}
/** @returns {void} Prototype-sensitive header fixture. TODO(AI-REVIEW): Review security assertion. */
function unsafeHeader() {
    context.normalizeTable(JSON.parse('{"__proto__":[1]}'));
}
/** @returns {void} Invalid numeric predicate fixture. TODO(AI-REVIEW): Review coercion assertion. */
function invalidNumericFilter() {
    context.matchesFilter(1, { field: 'x', operator: 'eq', value: 'abc' });
}
/** @returns {void} Impossible array allocation fixture. TODO(AI-REVIEW): Review guard assertion. */
function oversizedSlice() {
    context.selectedShape(
        [1000, 1000],
        [
            { start: 0, end: 1000, step: 1 },
            { start: 0, end: 1000, step: 1 },
        ],
    );
}
/** @returns {void} Zero-stride fixture. TODO(AI-REVIEW): Review slice assertion. */
function invalidStep() {
    context.selectedShape([3], [{ start: 0, end: 2, step: 0 }]);
}

/** @returns {void} Invalid scientific reduction fixture. TODO(AI-REVIEW): Review imported-setting guard. */
function invalidReduction() {
    context.sliceToTable([10, 11, null, 13], [2, 2], arrayVariable, arraySelection, 'unknown', 'x');
}
