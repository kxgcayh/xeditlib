const test = require('node:test');
const assert = require('node:assert/strict');
const { withTrailingSep } = require('../paths');

test('a path that already ends in a separator is unchanged', () => {
    assert.equal(withTrailingSep('C:\\Games\\Skyrim\\'), 'C:\\Games\\Skyrim\\');
    assert.equal(withTrailingSep('/games/skyrim/'), '/games/skyrim/');
});

test('a Windows-style path gets a backslash', () => {
    assert.equal(withTrailingSep('Z:\\Steam\\Skyrim Special Edition'), 'Z:\\Steam\\Skyrim Special Edition\\');
});

test('a bare directory gets the separator of the platform it runs on', () => {
    const want = process.platform === 'win32' ? '\\' : '/';
    assert.equal(withTrailingSep('/games/skyrim'), '/games/skyrim' + want);
});

test('empty or non-string input throws', () => {
    for (const bad of ['', undefined, null, 5]) assert.throws(() => withTrailingSep(bad), TypeError);
});
