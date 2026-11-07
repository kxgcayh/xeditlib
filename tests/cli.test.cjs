const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const cli = require('node:path').join(__dirname, '../cli.js');
const run = (...a) => spawnSync(process.execPath, [cli, ...a], { encoding: 'utf8' });

test('bad CLI input exits 2', () => {
    for (const args of [[], ['records', 'a.esm'], ['masters', 'a.esm', '-g', 'nope'],
                        ['records', 'a.esm', 'WEAP', '-n', 'abc']]) {
        assert.equal(run(...args).status, 2, args.join(' '));
    }
});

test('unreadable plugin exits 1 with a message', () => {
    const r = run('masters', 'does-not-exist.esp');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /ENOENT/);
});
