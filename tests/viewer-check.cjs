/**
 * @module tests/viewer-check
 * Check the actual inline application, packaging, review markers, braces and strict JSDoc types.
 * Development-only: requires temporary npm TypeScript under VIEWER_TOOL_ROOT, no runtime build.
 * TODO(AI-REVIEW): AI-authored validation harness; review coverage and limitations.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const toolRoot = process.env.VIEWER_TOOL_ROOT;
if (toolRoot === undefined) {
    throw new Error('Set VIEWER_TOOL_ROOT to the temporary npm tooling directory.');
}
const ts = require(path.join(toolRoot, 'node_modules/typescript'));
const html = fs.readFileSync(path.join(__dirname, '../viewer.html'), 'utf8');
const match = /<script\b[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/.exec(html);
assert.ok(match, 'Inline module must be present in viewer.html');
const code = match[1];
assert.match(code, /\/\/ @ts-check/);
assert.match(code, /@module viewer/);
assert.doesNotMatch(html, /<script[^>]+src=["'][./]/);
assert.doesNotMatch(html, /\son\w+\s*=/i, 'No authored inline event attributes');
assert.doesNotMatch(code, /@latest|@\d+\/(?:\+esm|dist)/, 'No floating library versions');
const parsed = ts.createSourceFile('viewer-inline-check.mjs', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let functionCount = 0;
const violations = [];
visit(parsed);
assert.deepEqual(violations, [], 'Required function review documentation and explicit braces');
const filename = path.join(toolRoot, 'viewer-inline-check.mjs');
fs.writeFileSync(filename, code);
const syntax = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
assert.equal(syntax.status, 0, syntax.stderr);
const check = spawnSync(
    process.execPath,
    [
        path.join(toolRoot, 'node_modules/typescript/bin/tsc'),
        '--allowJs',
        '--checkJs',
        '--strict',
        '--noEmit',
        '--target',
        'ES2022',
        '--module',
        'ESNext',
        '--lib',
        'ES2022,DOM,DOM.Iterable',
        filename,
    ],
    { encoding: 'utf8' },
);
assert.equal(check.status, 0, check.stdout + check.stderr);
console.log(`Viewer packaging/syntax/strict JSDoc pass; ${functionCount} functions have review contracts.`);
/**
 * Walk source AST for control-block and function-documentation requirements; no source rewriting.
 * @param {import('typescript').Node} node Parser AST node.
 * @returns {void} Appends precise line-based violations and counts reviewed functions.
 * TODO(AI-REVIEW): Review AST categories and meaningful documentation scope.
 */
function visit(node) {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
        functionCount += 1;
        const comments = ts
            .getJSDocCommentsAndTags(node)
            .map((doc) => doc.getFullText(parsed))
            .join('\n');
        if (!comments.includes('TODO(AI-REVIEW)') || !comments.includes('@returns')) {
            violations.push(
                `Missing function return/review contract at line ${parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1}`,
            );
        }
    }
    if (ts.isIfStatement(node) && !ts.isBlock(node.thenStatement)) {
        violations.push('If body needs explicit braces.');
    }
    if (
        (ts.isForStatement(node) ||
            ts.isForOfStatement(node) ||
            ts.isForInStatement(node) ||
            ts.isWhileStatement(node) ||
            ts.isDoStatement(node)) &&
        !ts.isBlock(node.statement)
    ) {
        violations.push('Loop body needs explicit braces.');
    }
    ts.forEachChild(node, visit);
}
