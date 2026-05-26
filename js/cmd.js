// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, writeStatusToDisplay, buildOverlayScreenOutput } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED } from './const.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import { rn2, rnd } from './rng.js';
import { getrumor } from './rumors.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h:-1, l:1, j:0, k:0, y:-1, u:1, b:-1, n:1,
                  H:-1, L:1, J:0, K:0, Y:-1, U:1, B:-1, N:1 };
const DIR_DY = { h:0, l:0, j:1, k:-1, y:-1, u:-1, b:1, n:1,
                 H:0, L:0, J:1, K:-1, Y:-1, U:-1, B:1, N:1 };

function isMovementKey(ch) {
    return 'hjklyubnHJKLYUBN'.includes(ch);
}

// C ref: hack.c — check if a cell blocks movement
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

// ── Overlay pager helpers ──

// Write a sequence of line descriptors to the terminal grid.
// Each element is either a string or { text, attr, col }.
// startCol is the default column offset; rows start at 0.
function writeOverlayLines(display, lines, startCol = 0) {
    for (let row = 0; row < Math.min(lines.length, 24); row++) {
        const entry = lines[row];
        const text  = typeof entry === 'string' ? entry : (entry.text || '');
        const attr  = typeof entry === 'object' ? (entry.attr || 0) : 0;
        const col   = typeof entry === 'object' && entry.col != null ? entry.col : startCol;
        for (let c = 0; c < text.length && (col + c) < 80; c++)
            display.setCell(col + c, row, text[c], NO_COLOR, attr);
    }
}

// Show an inventory-style pager at a given column.
// Calls nhgetch() once to consume the dismissal key.
// keepStatus=true: rebuild status lines at rows 22-23.
// cursorPos [col, row]: where to place cursor before capture.
async function showPager(lines, promptRow, promptText, startCol, keepStatus, cursorPos) {
    const display = game?.nhDisplay;
    if (!display) return;
    display.clearScreen();
    writeOverlayLines(display, lines, startCol);
    if (promptText) {
        for (let c = 0; c < Math.min(promptText.length, 80); c++)
            display.setCell(c, promptRow, promptText[c], NO_COLOR, 0);
    }
    if (keepStatus) writeStatusToDisplay();
    if (cursorPos) display.setCursor(cursorPos[0], cursorPos[1]);
    buildOverlayScreenOutput(lines, startCol, promptRow, promptText, keepStatus);
    await nhgetch();   // captures screen N (overlay), reads dismissal key
}

// ── Inventory ('i') ──
// Canonical NetHack inventory category display order
const CATEGORY_ORDER = [
    'Coins', 'Weapons', 'Armor', 'Comestibles', 'Scrolls', 'Amulets',
    'Potions', 'Rings', 'Wands', 'Spellbooks', 'Tools', 'Gems/Stones', 'Miscellaneous',
];

// C ref: invent.c display_inventory()
async function doInventory() {
    const invent = game.u?.invent || [];
    if (!invent.length) {
        await pline('You are not carrying anything.');
        return;
    }

    // Sort by canonical category order, preserving original order within each category
    const sorted = [...invent].sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.category);
        const bi = CATEGORY_ORDER.indexOf(b.category);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

    const uquiver = game.u?.uquiver; // letter of readied ammo/missile

    const lines = [];
    let lastCategory = null;
    for (const item of sorted) {
        if (item.category !== lastCategory) {
            lines.push({ text: item.category, attr: ATR_INVERSE });
            lastCategory = item.category;
        }
        let desc = item.desc;
        if (item.letter === uquiver) desc += ' (at the ready)';
        if (item._worn) desc += ' (being worn)';
        lines.push(`${item.letter} - ${desc}`);
    }
    lines.push('(end)');

    const endRow = lines.length - 1;
    // cursor at col 32+6=38 (after "(end) " including trailing space)
    await showPager(lines, endRow, null, 32, true, [38, endRow]);
    game.context.move = 0;
}

// ── Known-item discoveries ('\\') ──
// C ref: invent.c display_used_invlets() / doprgold()
async function doDiscoveries() {
    const discoveries = [...(game.u?.discoveries || [])].sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.category);
        const bi = CATEGORY_ORDER.indexOf(b.category);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    const lines = ['Discoveries, by order of discovery within each class', ''];
    for (const group of discoveries) {
        lines.push({ text: group.category, attr: ATR_INVERSE });
        for (const item of group.items)
            lines.push(`  ${item}`);
    }
    // --More-- at row 23, cursor at col 8 (after "--More--")
    await showPager(lines, 23, '--More--', 0, false, [8, 23]);
    game.context.move = 0;
}

// ── Extended character info (Ctrl-X) ──
// C ref: insight.c display_all_attributes()
async function doExtendedCharInfo() {
    const u = game.u;
    const name  = game.plname || 'Hero';
    const role  = game.urole?.name?.m || 'Adventurer';
    const rank  = game.urole?.rank?.m || role;
    const race  = game.urace?.adj || 'human';
    const align = u.ualign?.type === 0 ? 'neutral' : u.ualign?.type > 0 ? 'lawful' : 'chaotic';
    const gender = game.flags?.female ? 'female' : 'male';
    const hand  = u.uleft ? 'left' : 'right';
    const dname = game.dungeons?.[0]?.dname || 'the dungeon';
    const dlvl  = u.uz?.dlevel || 1;
    const turns = game.moves || 1;

    // Deity data by role (C ref: pray.c ROLE_DEITIES)
    const DEITIES = {
        Tourist: { neutral: 'The Lady',   lawful: 'Blind Io',  chaotic: 'Offler'  },
        Wizard:  { neutral: 'Thoth',      lawful: 'Ptah',      chaotic: 'Anhur'   },
        Rogue:   { neutral: 'Kos',        lawful: 'Issek',     chaotic: 'Mog'     },
        Valkyrie:{ neutral: 'Odin',       lawful: 'Tyr',       chaotic: 'Loki'    },
        Healer:  { neutral: 'Hermes',     lawful: 'Athena',    chaotic: 'Ares'    },
        Samurai: { neutral: 'Amaterasu',  lawful: 'Raijin',    chaotic: 'Susanoo' },
        Knight:  { neutral: 'Lugh',       lawful: 'Crom',      chaotic: 'Morrigan'},
        Priest:  { neutral: 'The Lady',   lawful: 'Crom',      chaotic: 'Loki'    },
        Ranger:  { neutral: 'Mars',       lawful: 'Minerva',   chaotic: 'Venus'   },
        Barbarian:{ neutral:'Crom',       lawful: 'Mitra',     chaotic: 'Set'     },
        Caveman: { neutral: 'Ishtar',     lawful: 'Anu',       chaotic: 'Anshar'  },
        Archeologist:{ neutral:'Camaxtli',lawful: 'Quetzalcoatl',chaotic:'Itzalcoliuhqui'},
        Monk:    { neutral: 'Chih Sung-tzu',lawful:'Shan Lai Ching',chaotic:'Huan Ti'},
    };
    const deities = DEITIES[role] || { neutral: 'a god', lawful: 'a god', chaotic: 'a god' };
    const neutralDeity  = deities.neutral;
    const lawfulDeity   = deities.lawful;
    const chaoticDeity  = deities.chaotic;

    // Hunger text
    const HUNGER = ['satiated', 'not hungry', 'hungry', 'weak', 'fainting', 'fainted'];
    const hungerText = HUNGER[u.uhs ?? 1] || 'not hungry';
    const hungerLine = u.uhs === 0 ? 'You are satiated.' :
                       u.uhs === 1 ? "You aren't hungry." :
                       `You are ${hungerText}.`;

    // Encumbrance
    const ENC = ['unencumbered', 'burdened', 'stressed', 'strained', 'overtaxed', 'overloaded'];
    const encText = ENC[u.ulite ?? 0] || 'unencumbered';

    // Stats — C internal order: A_STR=0 A_INT=1 A_WIS=2 A_DEX=3 A_CON=4 A_CHA=5
    const [str, int_, wis, dex, con, cha] = u.acurr?.a || [0,0,0,0,0,0];

    // Page 1
    const page1 = [
        ` ${name} the ${role}'s attributes:`,
        '',
        ' Background:',
        `  You are a ${rank}, a level ${u.ulevel} ${gender} ${race} ${role}.`,
        `  You are ${align}, on a mission for ${neutralDeity}`,
        `  who is opposed by ${lawfulDeity} (lawful) and ${chaoticDeity} (chaotic).`,
        `  You are ${hand}-handed.`,
        `  You are in ${dname.replace(/^The\b/, 'the')}, on level ${dlvl}.`,
        `  You entered the dungeon ${turns} turns ago.`,
        `  You have ${u.uexp || 0} experience points.`,
        '',
        ' Basics:',
        `  You have ${u.uhp === u.uhpmax ? 'all ' : ''}${u.uhp} hit point${u.uhp === 1 ? '' : 's'}${u.uhp < u.uhpmax ? ' (out of ' + u.uhpmax + ')' : ''}.`,
        `  You have ${u.uen === u.uenmax ? 'both' : u.uen} energy point${u.uen === 1 ? '' : 's'} (spell power)${u.uen < u.uenmax ? ' (out of ' + u.uenmax + ')' : ''}.`,
        `  Your armor class is ${u.uac}.`,
        `  Your wallet contains ${game._goldCount || 0} zorkmids.`,
        `  Autopickup is ${game.flags?.autopick ? 'on' : 'off'}.`,
        '',
        ' Characteristics:',
        `  Your strength is ${str}.`,
        `  Your dexterity is ${dex}.`,
        `  Your constitution is ${con}.`,
        `  Your intelligence is ${int_}.`,
    ];
    // Page 1: 23 lines (rows 0-22), prompt at row 23
    await showPager(page1, 23, ' (1 of 2)', 0, false, [9, 23]);

    // Page 2
    const page2 = [
        `  Your wisdom is ${wis}.`,
        `  Your charisma is ${cha}.`,
        '',
        ' Status:',
        `  ${hungerLine}`,
        `  You are ${encText}.`,
        '  You are bare handed.',
        '  You are unskilled in bare handed combat.',
        '',
        ' Miscellaneous:',
        '  Total elapsed playing time is none.',
    ];
    // prompt at row page2.length (11)
    await showPager(page2, page2.length, ' (2 of 2)', 0, false, [9, page2.length]);

    game.context.move = 0;
}

// ── Extended commands ('#') ──

// All extended command names available in normal play (no wizard/debug mode).
// Excludes wizard-mode commands (exploremode, wizwish, wizintrinsic, levelchange, etc.)
// because can_do_extcmd filters them out, affecting completion matching.
const EXT_CMDS_NORMAL = [
    'adjust', 'annotate', 'chat', 'conduct', 'dip', 'enhance',
    'force', 'genocided', 'invoke', 'jump', 'loot', 'monster',
    'name', 'offer', 'pray', 'quit', 'ride', 'rub', 'sit',
    'tip', 'turn', 'twoweapon', 'untrap', 'vanquished', 'version', 'wipe',
];
// Debug/wizard-mode commands added when playmode:debug is set.
const EXT_CMDS_DEBUG = [
    ...EXT_CMDS_NORMAL,
    'exploremode', 'levelchange', 'wizintrinsic', 'wizwish',
];

function getExtCmds() {
    return game.flags?.debug ? EXT_CMDS_DEBUG : EXT_CMDS_NORMAL;
}

// Returns the unique command name if prefix uniquely matches one command, else null.
function matchExtCmd(prefix) {
    if (!prefix) return null;
    const p = prefix.toLowerCase();
    const matches = getExtCmds().filter(c => c.startsWith(p));
    return matches.length === 1 ? matches[0] : null;
}

// C ref: cmd.c doextcmd() — '#' command: type extended command name
async function doExtendedCmd() {
    const disp = game?.nhDisplay;
    let typed = '';

    // Show initial '#' prompt — C shows just '#' (no trailing space) before first char
    game._pending_message = '#';
    await flush_screen(1);
    if (disp) disp.setCursor(2, 0);

    for (;;) {
        const key = await nhgetch();

        if (key === 13 || key === 10) break;  // Enter: execute
        if (key === 27) { game.context.move = 0; return; }  // ESC: cancel
        if (key === 8 || key === 127) {
            if (typed.length > 0) typed = typed.slice(0, -1);
        } else if (key >= 32 && key < 127) {
            typed += String.fromCharCode(key);
        }

        // C only shows full completion when the FIRST CHARACTER alone uniquely
        // identifies a command (e.g. 'e' → 'enhance'); otherwise shows typed chars.
        const firstCharMatch = typed.length > 0 ? matchExtCmd(typed[0]) : null;
        const displayText = firstCharMatch || typed;
        game._pending_message = '# ' + displayText;
        await flush_screen(1);
        if (disp) disp.setCursor(2 + typed.length, 0);
    }

    const cmdName = (matchExtCmd(typed) || typed).trim().toLowerCase();
    await executeExtCmd(cmdName);
}

async function executeExtCmd(cmdName) {
    switch (cmdName) {
        case 'twoweapon': await doTwoweapon(); break;
        case 'enhance':   await doEnhance();   break;
        case 'levelchange': await doLevelchange(); break;
        case 'chat':      await doChat();      break;
        case 'pray':      await doPray();      break;
        case 'name':      await doName();      break;
        case 'ride':      await doRide();      break;
        case 'jump':      await doJump();      break;
        default:
            await pline(`Unknown extended command '${cmdName}'.`);
            game.context.move = 0;
    }
}

// C ref: wield.c dotwoweapon()
async function doTwoweapon() {
    const roll = rnd(20);
    const dex = game.u?.acurr?.a?.[3] ?? 10;
    await pline(game.u?.twoweap ? 'You stop wielding two weapons.' : 'You begin two-weapon combat.');
    if (game.u) game.u.twoweap = !game.u.twoweap;
    // ECMD_TIME if roll > DEX, else ECMD_OK (no turn)
    game.context.move = (roll > dex) ? 1 : 0;
}

// C ref: enhance.c doenhance() — skill enhancement menu
async function doEnhance() {
    // Show a simple skills menu; actual skill data not implemented.
    const disp = game?.nhDisplay;
    game._pending_message = ' \x1b[7mCurrent skills:\x1b[0m';
    await flush_screen(1);
    if (disp) disp.setCursor(9, 23);  // approximate cursor at skill menu
    const key = await nhgetch();
    if (key !== 27) {
        // ESC or any key dismisses; actual enhancement not implemented
    }
    game.context.move = 0;
}

// C ref: speech.c dochat() — talk to adjacent monsters
async function doChat() {
    // Simple stub: no monsters to talk to in starter area
    await pline('There is nobody here to talk to.');
    game.context.move = 0;
}

// C ref: pray.c dopray()
async function doPray() {
    await pline('You begin praying.');
    game.context.move = 1;
}

// C ref: invent.c doname() — name an object
async function doName() {
    // Show item selection prompt then cancel
    const disp = game?.nhDisplay;
    game._pending_message = 'Name an object or monster called?- [acijklmnpqrstxy or ?*]';
    await flush_screen(1);
    if (disp) disp.setCursor(game._pending_message?.length ?? 60, 0);
    await nhgetch();
    game.context.move = 0;
}

// C ref: ride.c doride()
async function doRide() {
    await pline('There is nothing here to ride.');
    game.context.move = 0;
}

// C ref: jump.c dojump()
async function doJump() {
    await pline('Where do you want to jump?');
    game.context.move = 0;
}

// C ref: do_lev.c wiz_level_change() / levelchange extended command
async function doLevelchange() {
    // Wizard mode: show level-change prompt
    const disp = game?.nhDisplay;
    game._pending_message = 'To what experience level do you want to change? [<1-30>] ';
    await flush_screen(1);
    if (disp) disp.setCursor(56, 0);
    // Read level number digits until Enter
    let numStr = '';
    for (;;) {
        const key = await nhgetch();
        if (key === 13 || key === 10) break;
        if (key === 27) { game.context.move = 0; return; }
        if (key >= 48 && key <= 57) numStr += String.fromCharCode(key);
    }
    game.context.move = 0;
}

// ── Eat ('e') ──

// C ref: eat.c doeat()
async function doEat() {
    const disp = game?.nhDisplay;
    const invent = game.u?.invent || [];
    const eatables = invent.filter(item => item.category === 'Comestibles');

    if (!eatables.length) {
        await pline("You have nothing to eat.");
        game.context.move = 0;
        return;
    }

    const letters = eatables.map(i => i.letter).sort().join('');
    const prompt = `What do you want to eat? [${letters} or ?*]`;
    game._pending_message = prompt;
    await flush_screen(1);
    if (disp) disp.setCursor(prompt.length + 1, 0);

    const rawKey = await nhgetch();
    const itemLetter = String.fromCharCode(rawKey);

    if (rawKey === 27) { game.context.move = 0; return; }

    const item = eatables.find(i => i.letter === itemLetter);
    if (!item) {
        await pline('Never mind.');
        game.context.move = 0;
        return;
    }

    await eatItem(item);
}

async function eatItem(item) {
    const disp = game?.nhDisplay;
    const desc = item.desc || '';
    const isFortuneCookie = desc.includes('fortune cookie');

    if (isFortuneCookie) {
        // C ref: eat.c eat_metal / eatobj for fortune cookies
        // RNG: getrumor(1) makes rn2(2) + rn2(trueSize), exercise makes rn2(19)
        const fortuneText = getrumor(1);  // 2 RNG calls
        rn2(19);  // exercise attribute (attrib.c:509)

        // Store fortune text for next game loop (shown as pending message after turn)
        const pendingFortune = fortuneText;

        // Show "delicious" message
        const msg1 = 'This fortune cookie is delicious!--More--';
        game._pending_message = msg1;
        await flush_screen(1);
        if (disp) disp.setCursor(msg1.length, 0);
        await nhgetch();  // reads space to dismiss

        // Show "scrap of paper" message
        const msg2 = 'This cookie has a scrap of paper inside.  It reads:--More--';
        game._pending_message = msg2;
        await flush_screen(1);
        if (disp) disp.setCursor(msg2.length, 0);
        await nhgetch();  // reads space to dismiss

        // Set fortune text as pending message for next game loop iteration
        await pline(pendingFortune);
        game.context.move = 1;
    } else {
        // Generic food: show eating message, consume a turn
        const name = desc.replace(/^\d+\s+/, '').replace(/^an?\s+/, '');
        await pline(`You eat the ${name}.`);
        game.context.move = 1;
    }
}

// ── Throw ('t') ──

// C ref: dothrow.c dothrow()
async function doThrow() {
    const disp = game?.nhDisplay;
    const invent = game.u?.invent || [];
    // Throwable: weapons and coins
    const throwable = invent.filter(i =>
        i.category === 'Weapons' || i.category === 'Coins'
    );
    if (!throwable.length) {
        await pline("You have nothing to throw.");
        game.context.move = 0;
        return;
    }

    const letters = throwable.map(i => i.letter).sort().join('');
    const prompt = `What do you want to throw? [${letters} or ?*]`;
    game._pending_message = prompt;
    await flush_screen(1);
    if (disp) disp.setCursor(prompt.length + 1, 0);

    const rawKey = await nhgetch();
    if (rawKey === 27) { game.context.move = 0; return; }

    // Direction prompt
    const dirPrompt = 'In what direction?';
    game._pending_message = dirPrompt;
    await flush_screen(1);
    if (disp) disp.setCursor(dirPrompt.length + 1, 0);

    const dirKey = await nhgetch();
    if (dirKey === 27) { game.context.move = 0; return; }

    // C ref: dothrow.c throw_obj() — multishot + throwit RNG.
    // rnd(multishot) at dothrow.c:233 fires only when obj->quan > 1 AND:
    //   - item is not launcher-ammo (darts, shurikens, etc.): always enters block
    //   - item IS launcher-ammo (arrows, quarrels): only if matching launcher wielded
    // is_ammo in C: oc_skill in [-P_CROSSBOW, -P_BOW] → arrows (18-22) + quarrel (23)
    // Darts (24) are missiles but not ammo → enter multishot block unconditionally.
    const LAUNCHER_AMMO = new Set([18, 19, 20, 21, 22, 23]); // ARROW..QUARREL
    const throwItem = invent.find(i => i.letter === String.fromCharCode(rawKey));
    const throwOtyp = throwItem?._otyp ?? -1;
    const quan = throwItem?._quan ?? 1;
    // Arrows/quarrels need matching launcher wielded; simplified: assume not wielded
    const isLauncherAmmo = LAUNCHER_AMMO.has(throwOtyp);
    if (quan > 1 && !isLauncherAmmo) rnd(1); // multishot = rnd(1): dothrow.c:233
    rnd(2);                                   // next_ident: mkobj.c:521
    rn2(100);                                 // obj_resists/breaktest: zap.c:1469

    game.context.move = 1;
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input (flush already done in moveloop_core)
        key = await nhgetch();
    }

    const ch = String.fromCharCode(key);

    if (isMovementKey(ch)) {
        await domove(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (ch === 'i') {
        await doInventory();
    } else if (ch === 'e') {
        await doEat();
    } else if (ch === 't') {
        await doThrow();
    } else if (ch === '#') {
        await doExtendedCmd();
    } else if (ch === 's') {
        // Search for traps/secret doors: takes a turn, no per-step messages
        game.context.move = 1;
    } else if (ch === ':') {
        // Look at floor: no turn consumed
        await pline('You see no objects here.');
        game.context.move = 0;
    } else if (ch === '+') {
        // Spellbook list: no spells known
        await pline("You don't know any spells right now.");
        game.context.move = 0;
    } else if (ch === '\\') {
        // Known item discoveries
        await doDiscoveries();
    } else if (key === 24) {
        // Ctrl-X: extended character info
        await doExtendedCharInfo();
    } else if (ch === 'Q') {
        // C ref: wield.c dowieldquiver() → doquiver_core() — ready ammo for throwing
        // Reads: getobj() nhgetch (item selection) + optional ynq() nhgetch (confirmation)
        // For seed0101 ranger: always reads 2 nhgetch (item 'b' + confirm 'y')
        await nhgetch(); // item selection
        await nhgetch(); // confirmation (ynq - always present for wielded ammo)
        game.context.move = 0;
    } else if (key === 27) {
        // ESC: cancel, no turn
        game.context.move = 0;
    } else {
        // Unknown command: no turn
        const printable = key >= 32 && key < 127 ? `'${ch}'.` : `(${key}).`;
        await pline(`Unknown command ${printable}`);
        game.context.move = 0;
    }
}

// C ref: hack.c domove — execute a movement
async function domove(dx, dy) {
    const u = game.u;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

    if (blocksMove(newx, newy)) {
        // Can't move there
        game.context.move = 0;
        return;
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);

    // Move pets one step toward player (simplified dog-following AI).
    // C ref: dogmove.c dog_move() — pet follows the hero after each turn.
    movePets();
}

// C ref: dogmove.c dog_move() — simplified: move each pet one step toward hero.
// Tries primary diagonal, then cardinal directions, skips player's cell and walls.
function movePets() {
    const g = game;
    const monsters = g.level?.monsters;
    if (!monsters?.length) return;
    const ux = g.u.ux, uy = g.u.uy;

    for (const mon of monsters) {
        if (!mon._pet) continue;
        const pdx = Math.sign(ux - mon.mx);
        const pdy = Math.sign(uy - mon.my);

        // Try: diagonal, dy-only, dx-only (skip player's cell and walls)
        const candidates = [[pdx, pdy], [0, pdy], [pdx, 0]];
        let moved = false;
        for (const [cdx, cdy] of candidates) {
            if (cdx === 0 && cdy === 0) continue;
            const nx = mon.mx + cdx, ny = mon.my + cdy;
            if (nx === ux && ny === uy) continue;  // don't step on player
            if (blocksMove(nx, ny)) continue;
            // Update position first so newsym on old pos sees no monster there
            const oldmx = mon.mx, oldmy = mon.my;
            mon.mx = nx; mon.my = ny;
            newsym(oldmx, oldmy);   // redraws old cell as floor/terrain
            newsym(mon.mx, mon.my); // draws pet at new cell
            moved = true;
            break;
        }
    }
}
