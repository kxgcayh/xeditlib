#!/usr/bin/env node
const { parseArgs } = require('node:util');

const usage = `Usage: xeditlib [options] <command>

Commands:
  records <plugin> <SIG>   List records of a signature (e.g. Skyrim.esm WEAP)
  masters <plugin>         List a plugin's masters

Options:
  -g, --game <mode>        tes4|fo3|fnv|tes5|sse|fo4 (default: sse)
  -p, --game-path <dir>    Game install dir (or env XEDIT_GAME_PATH)
  -l, --load <list>        Plugins to load, comma/newline separated (default: the plugin argument)
  -n, --limit <n>          Max records to print
      --json               Print records as JSON
  -h, --help
Env: XEDITLIB_PATH overrides the native library location.`;

const { values: o, positionals: [cmd, plugin, sig] } = parseArgs({
    allowPositionals: true,
    options: {
        game: { type: 'string', short: 'g', default: 'sse' },
        'game-path': { type: 'string', short: 'p', default: process.env.XEDIT_GAME_PATH },
        load: { type: 'string', short: 'l' },
        limit: { type: 'string', short: 'n' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
    },
});

const die = msg => { console.error(msg + '\n\n' + usage); process.exit(2); };
if (o.help) { console.log(usage); process.exit(0); }
if (!['records', 'masters'].includes(cmd) || !plugin) die('Missing or unknown command.');
if (cmd === 'records' && !sig) die('records needs a signature.');
const limit = o.limit === undefined ? Infinity : Number(o.limit);
if (!(limit >= 1 && (limit === Infinity || Number.isInteger(limit)))) die('--limit must be a positive integer.');
if (!o['game-path']) die('Game path required (--game-path or XEDIT_GAME_PATH).');
const mode = { tes4: 2, fo3: 1, fnv: 0, tes5: 3, sse: 4, fo4: 5 }[o.game.toLowerCase()];
if (mode === undefined) die(`Unknown game "${o.game}".`);

const xelib = require('./xelib');

(async () => {
    xelib.init();
    try {
        xelib.setLanguage('English');
        xelib.setGamePath(o['game-path']);
        xelib.setGameMode(mode);
        xelib.clearMessages();
        xelib.loadPlugins(o.load || plugin, true, false);
        await xelib.waitForLoader();
        const file = xelib.fileByName(plugin);
        if (cmd === 'masters') {
            console.log(xelib.getMasterNames(file).join('\n'));
        } else {
            const recs = xelib.getRecords(file, sig);
            const out = recs.slice(0, limit).map(r => o.json ? xelib.elementToJson(r)
                : `${xelib.getFormID(r).toString(16).padStart(8, '0')}\t${xelib.displayName(r)}`);
            console.log(o.json ? '[' + out.join(',') + ']' : out.join('\n'));
        }
    } finally {
        xelib.close();
    }
})().catch(e => { console.error(e.message); process.exit(1); });
