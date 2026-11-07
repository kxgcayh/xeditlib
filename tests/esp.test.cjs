const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { parsePlugin } = require('../esp');

const sub = (sig, data) => Buffer.concat([Buffer.from(sig, 'latin1'), Buffer.from([data.length & 255, data.length >> 8]), data]);
const z = s => Buffer.from(s + '\0', 'latin1');
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
// Header layout: Skyrim+ = 24 bytes, older games = 20.
function rec(sig, formId, subs, { flags = 0, old = false } = {}) {
    let data = Buffer.concat(subs);
    if (flags & 0x40000) data = Buffer.concat([u32(data.length), zlib.deflateSync(data)]);
    return Buffer.concat([Buffer.from(sig), u32(data.length), u32(flags), u32(formId), Buffer.alloc(old ? 4 : 8), data]);
}
function grup(content, old) {
    return Buffer.concat([Buffer.from('GRUP'), u32(content.length + (old ? 20 : 24)), Buffer.from('WEAP'), Buffer.alloc(old ? 8 : 12), content]);
}

for (const old of [false, true]) {
    test(`parses masters, nested groups and compressed records (${old ? 'old' : 'new'} format)`, () => {
        const file = Buffer.concat([
            rec('TES4', 0, [sub('MAST', z('Skyrim.esm')), sub('MAST', z('Update.esm'))], { old }),
            grup(Buffer.concat([
                rec('WEAP', 0x100, [sub('EDID', z('IronSword')), sub('FULL', z('Iron Sword'))], { old }),
                grup(rec('WEAP', 0x101, [sub('EDID', z('Zipped')), sub('FULL', z('Packed'))], { old, flags: 0x40000 }), old),
                rec('ARMO', 0x102, [sub('EDID', z('Other'))], { old }),
            ]), old),
        ]);
        const p = parsePlugin(file, { oldFormat: old });
        assert.deepEqual(p.masters, ['Skyrim.esm', 'Update.esm']);
        assert.deepEqual([...p.records('WEAP')].map(r => [r.formId, r.editorId, r.name]),
            [[0x100, 'IronSword', 'Iron Sword'], [0x101, 'Zipped', 'Packed']]);
        assert.equal([...p.records()].length, 3);
    });
}

test('localized plugins report the string id; bad input throws', () => {
    const file = Buffer.concat([rec('TES4', 0, [], { flags: 0x80 }),
        grup(rec('WEAP', 1, [sub('FULL', u32(42))]))]);
    assert.equal([...parsePlugin(file).records('WEAP')][0].name, '<string #42>');
    assert.throws(() => parsePlugin(Buffer.from('nope')), /missing TES4/);
    assert.throws(() => [...parsePlugin(file.subarray(0, file.length - 3)).records()], /Invalid plugin/);
});
