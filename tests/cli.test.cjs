const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const cli = require('node:path').join(__dirname, '../cli.js');
const run = (...a) => spawnSync(process.execPath, [cli, ...a], { encoding: 'utf8' });

test('bad CLI input exits 2 before loading the native library', () => {
    for (const args of [[], ['records', 'a.esm'], ['-p', '/x', 'masters', 'a.esm', '-g', 'nope'],
                        ['-p', '/x', 'records', 'a.esm', 'WEAP', '-n', 'abc'], ['records', 'a.esm', 'WEAP']]) {
        assert.equal(run(...args).status, 2, args.join(' '));
    }
});
