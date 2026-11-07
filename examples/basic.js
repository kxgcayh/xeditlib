// Basic example: Load Skyrim.esm and list the first 5 weapons
const xelib = require('../xelib');

// Pass the game directory as an argument or via XEDIT_GAME_PATH
const GAME_PATH = process.argv[2] || process.env.XEDIT_GAME_PATH;
if (!GAME_PATH) { console.error('Usage: node basic.js <game dir>'); process.exit(2); }

xelib.init();
xelib.setLanguage('English');
xelib.setGamePath(GAME_PATH);
xelib.setGameMode(xelib.GM_SSE); // Use GM_SSE for Skyrim SE and Skyrim VR
xelib.clearMessages();

console.log('Loading Skyrim.esm...');
xelib.loadPlugins('Skyrim.esm', true, false);

xelib.waitForLoader().then(() => {
    xelib.clearMessages();
    console.log('Loaded!\n');

    const skyrim = xelib.fileByName('Skyrim.esm');
    console.log('File:', xelib.name(skyrim));

    // Get WEAP group and count
    const weapGroup = xelib.getElement(skyrim, 'WEAP');
    console.log('Total weapons:', xelib.elementCount(weapGroup));

    // List first 5 weapons
    const weapons = xelib.getElements(weapGroup);
    console.log(`\nFirst 5 of ${weapons.length} weapons:`);

    for (let i = 0; i < Math.min(5, weapons.length); i++) {
        const w = weapons[i];
        const name = xelib.displayName(w);
        const formID = xelib.getFormID(w).toString(16).padStart(8, '0');
        const damage = xelib.getValue(w, 'DATA\\Damage');
        console.log(`  [${formID}] ${name} (damage: ${damage})`);
    }

    // Clean up handles
    weapons.forEach(w => xelib.release(w));
    xelib.release(weapGroup);
    xelib.release(skyrim);
    xelib.close();
    console.log('\nDone!');
}).catch(err => {
    console.error('Error:', err.message);
    xelib.close();
});
