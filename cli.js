#!/usr/bin/env node
const { parseArgs } = require('node:util');
const { parsePlugin } = require('./esp');

const usage = `Usage: xeditlib [options] <command> <plugin file>

Commands:
  records <file> <SIG>   List records of a signature (e.g. Skyrim.esm WEAP)
  masters <file>         List a plugin's masters

Options:
  -g, --game <mode>      tes4|fo3|fnv|tes5|sse|fo4 (default: sse)
  -n, --limit <n>        Max records to print
      --json             Print records as a JSON array
  -h, --help

Reads the plugin directly (no game install or native library needed), on any OS.`;

const { values: o, positionals: [cmd, file, sig] } = parseArgs({
    allowPositionals: true,
    options: {
        game: { type: 'string', short: 'g', default: 'sse' },
        limit: { type: 'string', short: 'n' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
    },
});

const die = msg => { console.error(msg + '\n\n' + usage); process.exit(2); };
if (o.help) { console.log(usage); process.exit(0); }
if (!['records', 'masters'].includes(cmd) || !file) die('Missing or unknown command.');
if (cmd === 'records' && !sig) die('records needs a signature.');
const limit = o.limit === undefined ? Infinity : Number(o.limit);
if (!(limit >= 1 && (limit === Infinity || Number.isInteger(limit)))) die('--limit must be a positive integer.');
const game = o.game.toLowerCase();
if (!['tes4', 'fo3', 'fnv', 'tes5', 'sse', 'fo4'].includes(game)) die(`Unknown game "${o.game}".`);

try {
    const plugin = parsePlugin(file, { oldFormat: ['tes4', 'fo3', 'fnv'].includes(game) });
    if (cmd === 'masters') {
        console.log(plugin.masters.join('\n'));
    } else {
        const out = [];
        for (const r of plugin.records(sig)) {
            if (out.length >= limit) break;
            out.push(r);
        }
        console.log(o.json ? JSON.stringify(out, null, 2)
            : out.map(r => `${r.formId.toString(16).padStart(8, '0')}\t${r.editorId}\t${r.name}`).join('\n'));
    }
} catch (e) {
    console.error(e.message);
    process.exit(1);
}
