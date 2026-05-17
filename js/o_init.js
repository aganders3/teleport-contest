// o_init.js — Port of o_init.c: object description shuffling.
// C ref: o_init.c randomize_gem_colors(), shuffle(), shuffle_all(), init_objects()
//
// All 44 sessions produce identical rn2() argument sizes (object table is fixed).
// Group sizes confirmed: amulet=11, potion=25, ring=28, scroll=41, spbook=41,
// wand=28, venom=2, helmet=4, gloves=4, cloak=4, boots=7. Total = 198 calls.
// Plus randomize_gem_colors (3), WAN_NOTHING dir (1), nhlib.lua (2) = 204... wait 201.
// Actual count: 3 + 195 shuffle calls + 1 init_objects + 2 nhlib = 201 ✓

import { rn2 } from './rng.js';
import { game } from './gstate.js';

// C Fisher-Yates: for (j=0; j<n; j++) { i=j+rn2(n-j); swap(arr[j],arr[i]); }
// Consumes rn2(n), rn2(n-1), ..., rn2(1) — n calls for n items.
function shuffle(arr) {
    const n = arr.length;
    for (let j = 0; j < n; j++) {
        const i = j + rn2(n - j);
        const t = arr[j]; arr[j] = arr[i]; arr[i] = t;
    }
}

// Lua nhlib shuffle: for i=#arr,2,-1 do j=RNG(i); swap(arr[i],arr[j+1]) end
// Consumes rn2(n), rn2(n-1), ..., rn2(2) — n-1 calls for n items.
function luaShuffle(arr) {
    for (let i = arr.length; i >= 2; i--) {
        const j = rn2(i);
        const t = arr[i - 1]; arr[i - 1] = arr[j]; arr[j] = t;
    }
}

// C ref: o_init.c randomize_gem_colors()
// Consumes 3 RNG calls: rn2(2), rn2(2), rn2(4)
function randomize_gem_colors() {
    const turqBlue   = rn2(2);   // change turquoise from green to blue?
    const aquaBlue   = rn2(2);   // change aquamarine from green to blue?
    const fluorite   = rn2(4);   // 0=violet 1=blue 2=white 3=green
    const g = game.obj_appearances;
    g.turquoise  = turqBlue  ? 'blue'   : 'green';
    g.aquamarine = aquaBlue  ? 'blue'   : 'green';
    g.fluorite   = ['violet', 'blue', 'white', 'green'][fluorite];
}

// ── Item description tables ───────────────────────────────────────────────────
// Listed in objects.h order; shuffle() permutes these arrays in-place.

// AMULET_CLASS — 11 magic non-unique amulets (FIRST_AMULET..AMULET_OF_FLYING)
// C ref: obj_shuffle_range stops before FAKE_AMULET_OF_YENDOR (non-magic)
const AMULET_TYPES = [
    'amulet of ESP', 'amulet of life saving', 'amulet of strangulation',
    'amulet of restful sleep', 'amulet versus poison', 'amulet of change',
    'amulet of unchanging', 'amulet of reflection', 'amulet of magical breathing',
    'amulet of guarding', 'amulet of flying',
];
const AMULET_DESCS = [
    'circular', 'spherical', 'oval', 'triangular', 'pyramidal',
    'square', 'concave', 'hexagonal', 'octagonal', 'perforated', 'cubical',
];

// POTION_CLASS — 25 potions before POT_WATER (fixed "clear" description)
const POTION_TYPES = [
    'potion of gain ability', 'potion of restore ability', 'potion of confusion',
    'potion of blindness', 'potion of paralysis', 'potion of speed',
    'potion of levitation', 'potion of hallucination', 'potion of invisibility',
    'potion of see invisible', 'potion of healing', 'potion of extra healing',
    'potion of gain level', 'potion of enlightenment', 'potion of monster detection',
    'potion of object detection', 'potion of gain energy', 'potion of sleeping',
    'potion of full healing', 'potion of polymorph', 'potion of booze',
    'potion of sickness', 'potion of fruit juice', 'potion of acid', 'potion of oil',
];
const POTION_DESCS = [
    'ruby', 'pink', 'orange', 'yellow', 'emerald', 'dark green',
    'cyan', 'sky blue', 'brilliant blue', 'magenta', 'purple-red', 'puce',
    'milky', 'swirly', 'bubbly', 'smoky', 'cloudy', 'effervescent',
    'black', 'golden', 'brown', 'fizzy', 'dark', 'white', 'murky',
];

// RING_CLASS — 28 rings (entire class)
const RING_TYPES = [
    'ring of adornment', 'ring of gain strength', 'ring of gain constitution',
    'ring of increase accuracy', 'ring of increase damage', 'ring of protection',
    'ring of regeneration', 'ring of searching', 'ring of stealth',
    'ring of sustain ability', 'ring of levitation', 'ring of hunger',
    'ring of aggravate monster', 'ring of conflict', 'ring of warning',
    'ring of poison resistance', 'ring of fire resistance', 'ring of cold resistance',
    'ring of shock resistance', 'ring of free action', 'ring of slow digestion',
    'ring of teleportation', 'ring of teleport control', 'ring of polymorph',
    'ring of polymorph control', 'ring of invisibility', 'ring of see invisible',
    'ring of protection from shape changers',
];
const RING_DESCS = [
    'wooden', 'granite', 'opal', 'clay', 'coral', 'black onyx',
    'moonstone', 'tiger eye', 'jade', 'bronze', 'agate', 'topaz',
    'sapphire', 'ruby', 'diamond', 'pearl', 'iron', 'brass',
    'copper', 'twisted', 'steel', 'silver', 'gold', 'ivory',
    'emerald', 'wire', 'engagement', 'shiny',
];

// SCROLL_CLASS — 21 magic scrolls + 20 extra label placeholders = 41
// C ref: obj_shuffle_range stops at SCR_MAIL (non-magic)
const SCROLL_TYPES = [
    'scroll of enchant armor', 'scroll of destroy armor', 'scroll of confuse monster',
    'scroll of scare monster', 'scroll of remove curse', 'scroll of enchant weapon',
    'scroll of create monster', 'scroll of taming', 'scroll of genocide',
    'scroll of light', 'scroll of teleportation', 'scroll of gold detection',
    'scroll of food detection', 'scroll of identify', 'scroll of magic mapping',
    'scroll of amnesia', 'scroll of fire', 'scroll of earth',
    'scroll of punishment', 'scroll of charging', 'scroll of stinking cloud',
    // 20 extra placeholder scrolls (NoDes name, shuffled label only)
    'scroll SC01', 'scroll SC02', 'scroll SC03', 'scroll SC04', 'scroll SC05',
    'scroll SC06', 'scroll SC07', 'scroll SC08', 'scroll SC09', 'scroll SC10',
    'scroll SC11', 'scroll SC12', 'scroll SC13', 'scroll SC14', 'scroll SC15',
    'scroll SC16', 'scroll SC17', 'scroll SC18', 'scroll SC19', 'scroll SC20',
];
const SCROLL_DESCS = [
    'ZELGO MER', 'JUYED AWK YACC', 'NR 9', 'XIXAXA XOXAXA XUXAXA', 'PRATYAVAYAH',
    'DAIYEN FOOELS', 'LEP GEX VEN ZEA', 'PRIRUTSENIE', 'ELBIB YLOH',
    'VERR YED HORRE', 'VENZAR BORGAVVE', 'THARR', 'YUM YUM', 'KERNOD WEL',
    'ELAM EBOW', 'DUAM XNAHT', 'ANDOVA BEGARIN', 'KIRJE', 'VE FORBRYDERNE',
    'HACKEM MUCHE', 'VELOX NEB',
    // 20 extra labels
    'FOOBIE BLETCH', 'TEMOV', 'GARVEN DEH', 'READ ME', 'ETAOIN SHRDLU',
    'LOREM IPSUM', 'FNORD', 'KO BATE', 'ABRA KA DABRA', 'ASHPD SODALG',
    'ZLORFIK', 'GNIK SISI VLE', 'HAPAX LEGOMENON', 'EIRIS SAZUN IDISI',
    'PHOL ENDE WODAN', 'GHOTI', 'MAPIRO MAHAMA DIROMAT', 'VAS CORP BET MANI',
    'XOR OTA', 'STRC PRST SKRZ KRK',
];

// SPBOOK_CLASS — 41 active spellbooks (flame/freeze sphere are #if 0 / deferred)
// C ref: obj_shuffle_range stops at SPE_BLANK_PAPER (non-magic, last entry)
const SPBOOK_TYPES = [
    'spellbook of dig', 'spellbook of magic missile', 'spellbook of fireball',
    'spellbook of cone of cold', 'spellbook of sleep', 'spellbook of finger of death',
    'spellbook of light', 'spellbook of detect monsters', 'spellbook of healing',
    'spellbook of knock', 'spellbook of force bolt', 'spellbook of confuse monster',
    'spellbook of cure blindness', 'spellbook of drain life', 'spellbook of slow monster',
    'spellbook of wizard lock', 'spellbook of create monster', 'spellbook of detect food',
    'spellbook of cause fear', 'spellbook of clairvoyance', 'spellbook of cure sickness',
    'spellbook of charm monster', 'spellbook of haste self', 'spellbook of detect unseen',
    'spellbook of levitation', 'spellbook of extra healing', 'spellbook of restore ability',
    'spellbook of invisibility', 'spellbook of detect treasure', 'spellbook of remove curse',
    'spellbook of magic mapping', 'spellbook of identify', 'spellbook of turn undead',
    'spellbook of polymorph', 'spellbook of teleport away', 'spellbook of create familiar',
    'spellbook of cancellation', 'spellbook of protection', 'spellbook of jumping',
    'spellbook of stone to flesh', 'spellbook of chain lightning',
];
const SPBOOK_DESCS = [
    'parchment', 'vellum', 'ragged', 'dog eared', 'mottled', 'stained',
    'cloth', 'leathery', 'white', 'pink', 'red', 'orange', 'yellow', 'velvet',
    'light green', 'dark green', 'turquoise', 'cyan', 'light blue', 'dark blue',
    'indigo', 'magenta', 'purple', 'violet', 'tan', 'plaid', 'light brown',
    'dark brown', 'gray', 'wrinkled', 'dusty', 'bronze', 'copper', 'silver',
    'gold', 'glittering', 'shining', 'dull', 'thin', 'thick', 'checkered',
];

// WAND_CLASS — 28 wands (entire class including 3 NoDes extra descriptions)
const WAND_TYPES = [
    'wand of light', 'wand of secret door detection', 'wand of enlightenment',
    'wand of create monster', 'wand of wishing', 'wand of stasis', 'wand of nothing',
    'wand of striking', 'wand of make invisible', 'wand of slow monster',
    'wand of speed monster', 'wand of undead turning', 'wand of polymorph',
    'wand of cancellation', 'wand of teleportation', 'wand of opening',
    'wand of locking', 'wand of probing', 'wand of digging', 'wand of magic missile',
    'wand of fire', 'wand of cold', 'wand of sleep', 'wand of death',
    'wand of lightning',
    // 3 extra descriptions (NoDes — no canonical name, pure extra descriptions)
    'wand WAN1', 'wand WAN2', 'wand WAN3',
];
const WAND_DESCS = [
    'glass', 'balsa', 'crystal', 'maple', 'pine', 'redwood', 'oak',
    'ebony', 'marble', 'tin', 'brass', 'copper', 'silver', 'platinum',
    'iridium', 'zinc', 'aluminum', 'uranium', 'iron', 'steel',
    'hexagonal', 'short', 'runed', 'long', 'curved',
    'forked', 'spiked', 'jeweled',
];

// VENOM_CLASS — 2 venoms (entire class)
const VENOM_TYPES  = ['blinding venom', 'acid venom'];
const VENOM_DESCS  = ['blinding venom', 'acid venom'];

// ARMOR sub-groups (no domaterial flag — only description shuffled)
// HELMET..HELM_OF_TELEPATHY — 4 helms
const HELM_TYPES = ['helmet', 'helm of caution', 'helm of opposite alignment', 'helm of telepathy'];
const HELM_DESCS = ['plumed helmet', 'etched helmet', 'crested helmet', 'visored helmet'];

// LEATHER_GLOVES..GAUNTLETS_OF_DEXTERITY — 4 gloves
const GLOVE_TYPES = ['leather gloves', 'gauntlets of fumbling', 'gauntlets of power', 'gauntlets of dexterity'];
const GLOVE_DESCS = ['old gloves', 'padded gloves', 'riding gloves', 'fencing gloves'];

// CLOAK_OF_PROTECTION..CLOAK_OF_DISPLACEMENT — 4 cloaks
const CLOAK_TYPES = ['cloak of protection', 'cloak of invisibility', 'cloak of magic resistance', 'cloak of displacement'];
const CLOAK_DESCS = ['tattered cape', 'opera cloak', 'ornamental cope', 'piece of cloth'];

// SPEED_BOOTS..LEVITATION_BOOTS — 7 boots
const BOOT_TYPES = [
    'speed boots', 'water walking boots', 'jumping boots', 'elven boots',
    'kicking boots', 'fumble boots', 'levitation boots',
];
const BOOT_DESCS = ['combat boots', 'jungle boots', 'hiking boots', 'mud boots',
                    'buckled boots', 'riding boots', 'snow boots'];

// ── Main entry point ──────────────────────────────────────────────────────────

// C ref: o_init.c init_objects()
// Consumes 201 RNG calls (indices 0-200 for seed8000 Tourist).
export function init_objects() {
    const app = {};
    game.obj_appearances = app;

    // randomize_gem_colors: 3 calls
    randomize_gem_colors();

    // shuffle_all: 7 whole classes + 4 armor sub-ranges
    // Each shuffle(arr) consumes arr.length calls: rn2(n), rn2(n-1), ..., rn2(1)

    const amuletDescs = [...AMULET_DESCS]; shuffle(amuletDescs);
    for (let i = 0; i < AMULET_TYPES.length; i++)
        app[AMULET_TYPES[i]] = amuletDescs[i];

    const potionDescs = [...POTION_DESCS]; shuffle(potionDescs);
    for (let i = 0; i < POTION_TYPES.length; i++)
        app[POTION_TYPES[i]] = potionDescs[i];
    app['potion of water'] = 'clear';   // fixed description, not shuffled

    const ringDescs = [...RING_DESCS]; shuffle(ringDescs);
    for (let i = 0; i < RING_TYPES.length; i++)
        app[RING_TYPES[i]] = ringDescs[i];

    const scrollDescs = [...SCROLL_DESCS]; shuffle(scrollDescs);
    for (let i = 0; i < SCROLL_TYPES.length; i++)
        app[SCROLL_TYPES[i]] = scrollDescs[i];

    const spbookDescs = [...SPBOOK_DESCS]; shuffle(spbookDescs);
    for (let i = 0; i < SPBOOK_TYPES.length; i++)
        app[SPBOOK_TYPES[i]] = spbookDescs[i];

    const wandDescs = [...WAND_DESCS]; shuffle(wandDescs);
    for (let i = 0; i < WAND_TYPES.length; i++)
        app[WAND_TYPES[i]] = wandDescs[i];

    const venomDescs = [...VENOM_DESCS]; shuffle(venomDescs);
    for (let i = 0; i < VENOM_TYPES.length; i++)
        app[VENOM_TYPES[i]] = venomDescs[i];

    // armor sub-ranges (domaterial=FALSE: description only, same Fisher-Yates)
    const helmDescs  = [...HELM_DESCS];  shuffle(helmDescs);
    for (let i = 0; i < HELM_TYPES.length; i++)  app[HELM_TYPES[i]]  = helmDescs[i];

    const gloveDescs = [...GLOVE_DESCS]; shuffle(gloveDescs);
    for (let i = 0; i < GLOVE_TYPES.length; i++) app[GLOVE_TYPES[i]] = gloveDescs[i];

    const cloakDescs = [...CLOAK_DESCS]; shuffle(cloakDescs);
    for (let i = 0; i < CLOAK_TYPES.length; i++) app[CLOAK_TYPES[i]] = cloakDescs[i];

    const bootDescs  = [...BOOT_DESCS];  shuffle(bootDescs);
    for (let i = 0; i < BOOT_TYPES.length; i++)  app[BOOT_TYPES[i]]  = bootDescs[i];

    // WAN_NOTHING direction: rn2(2) — C ref: o_init.c init_objects() line 234
    app.wan_nothing_dir = rn2(2) ? 'NODIR' : 'IMMEDIATE';

    // nhlib.lua shuffle (3-element array, Lua style: n-1 calls for n items)
    // Happens alongside o_init; consumes rn2(3), rn2(2)
    const luaArr = [0, 1, 2];
    luaShuffle(luaArr);
    game.lua_align_order = luaArr;
}
