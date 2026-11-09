// XEditLib appends "data\" to the game path without adding a separator, so the path must end in one.
// Callers (and the README's own Quick Start) pass a bare directory, and a trailing backslash cannot
// be passed on a command line under Wine, so the wrapper adds it.
function withTrailingSep(p) {
    if (typeof p !== 'string' || p === '') throw new TypeError('game path must be a non-empty string');
    if (/[\\/]$/.test(p)) return p;
    const sep = process.platform === 'win32' || p.includes('\\') ? '\\' : '/';
    return p + sep;
}

module.exports = { withTrailingSep };
