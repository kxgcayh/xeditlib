// Pure-JS reader for Bethesda plugins (ESP/ESM/ESL). No native library, works on any OS.
// Read-only. FormIDs are raw (master index in the top byte), not load-order adjusted.
const fs = require('node:fs');
const zlib = require('node:zlib');

const COMPRESSED = 0x40000, LOCALIZED = 0x80;
const str = b => b.toString('latin1').replace(/\0.*$/s, ''); // shortcut: cp1252 approximated by latin1

// Oblivion/FO3/FNV headers are 20 bytes; Skyrim and later are 24.
function parsePlugin(file, { oldFormat = false } = {}) {
    const buf = Buffer.isBuffer(file) ? file : fs.readFileSync(file);
    const hs = oldFormat ? 20 : 24;
    const check = (cond, msg) => { if (!cond) throw new Error('Invalid plugin: ' + msg); };

    function subrecords(data) {
        const out = [];
        let big = 0;
        for (let p = 0; p < data.length;) {
            check(p + 6 <= data.length, 'truncated subrecord');
            const sig = data.toString('latin1', p, p + 4);
            let size = data.readUInt16LE(p + 4);
            if (sig === 'XXXX') { big = data.readUInt32LE(p + 6); p += 6 + size; continue; }
            if (big) { size = big; big = 0; }
            check(p + 6 + size <= data.length, 'subrecord overruns record');
            out.push({ sig, data: data.subarray(p + 6, p + 6 + size) });
            p += 6 + size;
        }
        return out;
    }

    function readRecord(p) {
        const size = buf.readUInt32LE(p + 4), flags = buf.readUInt32LE(p + 8);
        check(p + hs + size <= buf.length, 'record overruns file');
        let data = buf.subarray(p + hs, p + hs + size);
        if (flags & COMPRESSED) data = zlib.inflateSync(data.subarray(4));
        return { sig: buf.toString('latin1', p, p + 4), flags, formId: buf.readUInt32LE(p + 12), subs: subrecords(data) };
    }

    function* walk(start, end) {
        for (let p = start; p < end;) {
            check(p + hs <= end, 'truncated header');
            const size = buf.readUInt32LE(p + 4);
            if (buf.toString('latin1', p, p + 4) === 'GRUP') {
                check(size >= hs && p + size <= end, 'bad group size');
                yield* walk(p + hs, p + size);
                p += size;
            } else {
                const r = readRecord(p);
                yield r;
                p += hs + buf.readUInt32LE(p + 4);
            }
        }
    }

    check(buf.length >= hs && buf.toString('latin1', 0, 4) === 'TES4', 'missing TES4 header');
    const header = readRecord(0);
    const localized = !!(header.flags & LOCALIZED);
    const masters = header.subs.filter(s => s.sig === 'MAST').map(s => str(s.data));

    return {
        masters,
        // Records of one signature (e.g. 'WEAP'), or all records when omitted.
        *records(sig) {
            for (const r of walk(hs + buf.readUInt32LE(4), buf.length)) {
                if (sig && r.sig !== sig) continue;
                const edid = r.subs.find(s => s.sig === 'EDID'), full = r.subs.find(s => s.sig === 'FULL');
                yield {
                    sig: r.sig, formId: r.formId,
                    editorId: edid ? str(edid.data) : '',
                    // Localized plugins store a string-table ID, not text.
                    name: !full ? '' : localized ? `<string #${full.data.readUInt32LE(0)}>` : str(full.data),
                };
            }
        },
    };
}

module.exports = { parsePlugin };
