# xeditlib

Node.js wrapper for [XEditLib](https://github.com/matortheeternal/xedit-lib) — programmatic access to xEdit for Bethesda game plugins (ESP/ESM/ESL).

Uses [koffi](https://koffi.dev/) for FFI bindings. No C++ compilation required — just install and go.

## Two ways to use it

| | Pure-JS reader (`esp.js`, CLI) | Native wrapper (`xelib.js`) |
|---|---|---|
| Needs XEditLib | no | yes |
| Windows / macOS / Linux | yes | Windows and macOS arm64 bundled (`libXEditLib.dylib`); Linux needs a build you supply |
| Read plugins | yes (records, masters) | yes (everything xEdit does) |
| Edit / save, conflicts, references | no | yes |

Use the CLI or `esp.js` for read-only inspection on any OS. Use `xelib.js` when you need editing or xEdit's full logic; it needs a native XEditLib build.

## CLI (any OS, no native library)

```bash
npx xeditlib records "Skyrim.esm" WEAP -n 5
npx xeditlib masters "MyMod.esp"
npx xeditlib -g tes4 records Oblivion.esm NPC_   # Oblivion/FO3/FNV use older record headers
npx xeditlib --help
```

| Command | Description |
|---------|-------------|
| `records <file> <SIG>` | List records of a signature as `formid<TAB>editorId<TAB>name` |
| `masters <file>` | List a plugin's masters |

| Option | Description |
|--------|-------------|
| `-g, --game <mode>` | `tes4`, `fo3`, `fnv`, `tes5`, `sse`, `fo4` (default `sse`) |
| `-n, --limit <n>` | Max records to print |
| `--json` | Print records as a JSON array of `{sig, formId, editorId, name}` |

Bad arguments exit with code 2; an unreadable or invalid plugin exits with 1. Requires Node.js 18.3+.

Limits: FormIDs are raw (the top byte is the master index, not the load-order slot). Names in localized plugins appear as `<string #id>` because `.STRINGS` files are not read. Only `EDID` and `FULL` are extracted.

```js
const { parsePlugin } = require('xeditlib/esp');
const p = parsePlugin('MyMod.esp');        // { oldFormat: true } for Oblivion/FO3/FNV
console.log(p.masters, [...p.records('ARMO')]);
```

## Native wrapper platform support

`xelib.js` loads a native XEditLib build:

| OS | Default file (in the package directory) | Bundled |
|----|------------------------------------------|---------|
| Windows | `XEditLib.dll` | yes |
| macOS | `libXEditLib.dylib` | yes (arm64) |
| Linux | `libXEditLib.so` | no |

Set `XEDITLIB_PATH` to load a build from anywhere else. Linux still needs a supplied build; use the pure-JS reader instead if no build is available.

## macOS native build

Built from [XEditLib macOS source](https://github.com/kxgcayh/xedit-lib/tree/df2f8773c67a11b49b9d83fd0fd80067832ced6d), using Free Pascal 3.2.2, aarch64-darwin.

- SHA-256: `373547cd0f18173607b01e65ab287096985a0938422bcdf1a7609b6ea8b4f36a`
- Dynamically links macOS system /usr/lib/libz.1.dylib (zlib).
- The `*.Hardcoded.dat` files must stay beside it.

Known differences:
- `GetGameLanguage` returns the language from installed Skyrim INIs, where the Windows DLL in a bare environment returns an error.
- JSON nesting limit about 1000 levels vs 2000-4000 in the Windows DLL.
- `File:hex6` FormID strings are not accepted by `ElementFromJson`, same as the Windows DLL.

## Diagnostic readers

Messages, exception messages and exception stacks use their dedicated native
readers. `getString(lengthFunction, reader)` defaults to `GetResultString` for
ordinary values; advanced callers can pass a native reader function or its name.
Buffers reserve the UTF-16 terminator written by `GetMessages`. The reported
length still excludes it, as required by the native API.

Diagnostic channels are consumed when read. An internal failure collects both
the native message and available stack before constructing its JavaScript error.
The first native exception can have no captured stack; absence is retained.

Run `npm test` for simulated channel/UTF-16 boundary tests. `npm run test:native`
qualifies the native library, without loading plugins or editing system
configuration. It needs koffi installed and may write the library's log in its cwd.

## Why this exists

The original [xelib npm package](https://www.npmjs.com/package/xelib) is a placeholder that doesn't work. The real xelib (from [zEdit](https://github.com/z-edit/zedit)) used native C++ bindings via [nan](https://github.com/nodejs/nan), which broke on modern Node.js versions and required a full C++ build toolchain.

This package replaces all of that with pure JavaScript FFI calls via koffi, making it work on any modern Node.js (18.3+) without compilation.

## Supported Games

- The Elder Scrolls IV: Oblivion (`GM_TES4`)
- The Elder Scrolls V: Skyrim (`GM_TES5`)
- The Elder Scrolls V: Skyrim Special Edition / VR (`GM_SSE`)
- Fallout 3 (`GM_FO3`)
- Fallout: New Vegas (`GM_FNV`)
- Fallout 4 / VR (`GM_FO4`)

## Installation

```bash
npm install xeditlib
```

The Windows and macOS arm64 libraries and data files are bundled. For other platforms see *Native wrapper platform support* above.

### Game path

Always call `setGamePath(dir)` rather than relying on the library's own lookup, which may use the Windows registry. Paths use your OS's normal format. The native library appends `data\` to the path without a separator, so `setGamePath` adds a trailing separator when you leave it off.

### macOS: the Windows build under CrossOver / Wine

The bundled `XEditLib.dll` runs with a Windows Node under Wine. koffi ships win32 prebuilds, so the same `node_modules` serves both. Measured on macOS 2026-11-09 with CrossOver, Node 24 and `Update.esm`:

```bash
CX=/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin
CX_BOTTLE_PATH="$HOME/Bottles" "$CX/wine" --bottle <bottle> --no-convert 'Z:\path\to\node.exe' 'Z:\path\to\script.js' > out.txt 2> err.txt
```

- Send stdout and stderr to separate files. With `2>&1` into a pipe, Node under Wine fails with `EBADF` and hides the real error.
- Do not pass a game path ending in a backslash on the command line: Wine turns a trailing `\` before the closing quote into a literal `"`. Pass it through an environment variable, or rely on `setGamePath` adding the separator.
- XEditLib writes `xelib_log.txt` into the current directory; run from a scratch directory.

## Quick Start

```js
const xelib = require('xeditlib');

xelib.init();
xelib.setLanguage('English');
xelib.setGamePath('/path/to/Skyrim Special Edition');
xelib.setGameMode(xelib.GM_SSE);
xelib.clearMessages();

// Load plugins (async — loader runs in background)
xelib.loadPlugins('Skyrim.esm', true, false);

xelib.waitForLoader().then(() => {
    xelib.clearMessages();

    const skyrim = xelib.fileByName('Skyrim.esm');
    console.log('File:', xelib.name(skyrim));

    // Navigate elements
    const weapGroup = xelib.getElement(skyrim, 'WEAP');
    console.log('Weapons:', xelib.elementCount(weapGroup));

    // Read record values
    const weapons = xelib.getElements(weapGroup);
    for (const w of weapons.slice(0, 5)) {
        const name = xelib.displayName(w);
        const fid = xelib.getFormID(w).toString(16).padStart(8, '0');
        const dmg = xelib.getValue(w, 'DATA\\Damage');
        console.log(`  [${fid}] ${name} (damage: ${dmg})`);
        xelib.release(w);
    }

    // Always release handles and close
    xelib.release(weapGroup);
    xelib.release(skyrim);
    xelib.close();
});
```

## API Overview

All 163 XEditLib functions are wrapped. Key categories:

### Setup
| Method | Description |
|--------|-------------|
| `init()` | Initialize XEditLib |
| `close()` | Shut down XEditLib |
| `setGamePath(path)` | Set game installation path |
| `setGameMode(mode)` | Set game mode (`GM_SSE`, `GM_FO4`, etc.) |
| `setLanguage(lang)` | Set language (e.g. `'English'`) |
| `loadPlugins(list, smartLoad, useDummies)` | Load plugins by name (comma or `\n` separated). `useDummies=true` loads empty placeholders, not references |
| `waitForLoader(timeout?)` | Returns Promise that resolves when loading completes |

### File Handling
| Method | Description |
|--------|-------------|
| `fileByName(name)` | Get file handle by filename |
| `fileByIndex(i)` | Get file handle by load order index |
| `addFile(name)` | Create a new plugin file |
| `saveFile(handle, path?)` | Save a plugin file |

### Element Navigation
| Method | Description |
|--------|-------------|
| `getElement(handle, path)` | Get child element by path |
| `getElements(handle, path?, sort?, filter?, sparse?)` | Get all child elements (returns handle array) |
| `elementCount(handle)` | Count child elements |
| `hasElement(handle, path)` | Check if element exists |
| `name(handle)` | Get element name |
| `displayName(handle)` | Get display name |
| `path(handle)` | Get element path |
| `signature(handle)` | Get record signature |

### Values
| Method | Description |
|--------|-------------|
| `getValue(handle, path?)` | Get string value |
| `setValue(handle, path, value)` | Set string value |
| `getIntValue(handle, path?)` | Get integer value |
| `setIntValue(handle, path, value)` | Set integer value |
| `getFloatValue(handle, path?)` | Get float value |
| `setFloatValue(handle, path, value)` | Set float value |
| `getFlag(handle, path, name)` | Get flag state |
| `setFlag(handle, path, name, enabled)` | Set flag state |

### Records
| Method | Description |
|--------|-------------|
| `getFormID(handle, local?)` | Get FormID |
| `setFormID(handle, id, local?, fixRefs?)` | Set FormID |
| `getRecord(fileH, formID, searchMasters?)` | Get record by FormID |
| `getRecords(handle, search?, includeOverrides?)` | Get records by signature |
| `getOverrides(handle)` | Get override records |
| `getWinningOverride(handle)` | Get winning override |
| `copyElement(handle, dest, asNew?)` | Copy element to another file |
| `isMaster(handle)` / `isOverride(handle)` | Check record type |

### Serialization
| Method | Description |
|--------|-------------|
| `elementToJson(handle)` | Serialize element to JSON string |
| `elementFromJson(handle, path, json)` | Deserialize from JSON |

### Handle Management
| Method | Description |
|--------|-------------|
| `release(handle)` | Release a handle (important — prevents leaks!) |
| `releaseNodes(handle)` | Release node tree |
| `cleanStore()` | Clean handle store |
| `resetStore()` | Reset handle store |

### Advanced Access
| Property | Description |
|----------|-------------|
| `raw` | Direct access to all raw DLL bindings |
| `wcb(str)` | Create UCS-2 wide char buffer from string |
| `getString(fn)` | Low-level string getter helper |
| `getArray(fn)` | Low-level array getter helper |

## Important Notes

### Handle Management
Every `getElement`, `getElements`, `fileByName`, etc. returns a handle (uint32). You **must** call `release(handle)` when done to prevent handle leaks. XEditLib has a finite handle store.

### XEditLib Internals
These are documented here because they cost us hours of debugging:

1. **All strings are UCS-2/UTF-16LE** (Delphi `PWideChar`). The wrapper handles this automatically — you pass normal JS strings.

2. **`init()` and `close()` are void** — they don't return success/failure. If something goes wrong during init, it surfaces later.

3. **Delphi `WordBool` = `uint16`** (2 bytes), not a regular boolean.

4. **String return pattern**: Functions don't return strings directly. They write a length to a pointer, then you call `GetResultString` to retrieve the value. The wrapper handles this automatically.

5. **Game modes**: Use `GM_SSE` (4) for both Skyrim Special Edition and Skyrim VR.

## Credits

This repository is a fork of **[WingedGuardian/xeditlib](https://github.com/WingedGuardian/xeditlib)**. The koffi-based `xelib.js` wrapper, the bundled `XEditLib.dll` setup, the diagnostic-channel handling and the original documentation are WingedGuardian's work; this fork adds the pure-JS plugin reader (`esp.js`), the cross-platform CLI and loader, and the related tests and docs.

Underneath it:

- [XEditLib](https://github.com/matortheeternal/xedit-lib) by matortheeternal: Mozilla Public License 1.1 (https://github.com/matortheeternal/xedit-lib).
- [xEdit](https://github.com/TES5Edit/TES5Edit) by Elminster, updated and maintained by Sharlikran, Zilav, Hlp and contributors: the engine XEditLib is built from: Mozilla Public License 1.1.
- macOS port of XEditLib by kxgcayh: Mozilla Public License 1.1 (https://github.com/kxgcayh/xedit-lib/tree/macos-arm64).
  - Argo by Colin (matortheeternal): MIT.
  - mteHelpers by matortheeternal: Mozilla Public License 1.1.
  - Imaging by Marek Mauder: Mozilla Public License 1.1 or LGPL.
  - Imaging PasZLib by Jacques Nomssi Nzali, based on zlib by Jean-loup Gailly and Mark Adler: zlib licence.
  - BSArch by Zilav: Mozilla Public License 1.1.
  - LZ4 and xxHash by Yann Collet, Pascal port by Jose Pascoa: BSD 2-Clause.
  - ZLibEx by Brent Sherwood / base2 technologies, with Borland Software Corporation copyright: zlib-style licence.
  - TForge by Sergey Kasandrov: Apache License 2.0.
  - Apple system zlib by Jean-loup Gailly and Mark Adler: zlib licence.
- Mahogany by Colin (matortheeternal): MIT.
- [zEdit](https://github.com/z-edit/zedit) by matortheeternal: the reference implementation whose xelib API this follows: MIT.
- [koffi](https://koffi.dev/) by Niels Martignène: the FFI engine.

## License

The JavaScript in this repository is MIT licensed (see `LICENSE`, Copyright (c) 2026 WingedGuardian). The bundled native libraries and Hardcoded.dat files contain MPL 1.1 Covered Code and separately licensed components listed in THIRD_PARTY_NOTICES.txt. Source for the Windows library and data files is available under MPL 1.1 at https://github.com/matortheeternal/xedit-lib. The complete corresponding source for the bundled macOS library, including port changes and build scripts, is available under MPL 1.1 at https://github.com/kxgcayh/xedit-lib/tree/df2f8773c67a11b49b9d83fd0fd80067832ced6d. These source-code rights are unaffected by the JavaScript's MIT licence.
