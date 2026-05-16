// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, writeStatusToDisplay } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED } from './const.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
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
    await nhgetch();   // captures screen N (overlay), reads dismissal key
}

// ── Inventory ('i') ──
// C ref: invent.c display_inventory()
async function doInventory() {
    const invent = game.u?.invent || [];
    if (!invent.length) {
        await pline('You are not carrying anything.');
        return;
    }

    const lines = [];
    let lastCategory = null;
    for (const item of invent) {
        if (item.category !== lastCategory) {
            lines.push({ text: item.category, attr: ATR_INVERSE });
            lastCategory = item.category;
        }
        lines.push(`${item.letter} - ${item.desc}`);
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
    const discoveries = game.u?.discoveries || [];
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

    // Stats
    const [str, dex, con, int_, wis, cha] = u.acurr?.a || [0,0,0,0,0,0];

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
    // " (1 of 2)" at row 23
    const display = game?.nhDisplay;
    if (!display) return;
    display.clearScreen();
    writeOverlayLines(display, page1, 0);
    const p1prompt = ' (1 of 2)';
    for (let c = 0; c < p1prompt.length; c++)
        display.setCell(c, 23, p1prompt[c], NO_COLOR, 0);
    display.setCursor(p1prompt.length, 23);  // cursor at col 9, row 23
    await nhgetch();   // captures screen 17 (page 1), reads space

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
    display.clearScreen();
    writeOverlayLines(display, page2, 0);
    const p2prompt = ' (2 of 2)';
    for (let c = 0; c < p2prompt.length; c++)
        display.setCell(c, page2.length, p2prompt[c], NO_COLOR, 0);
    display.setCursor(p2prompt.length, page2.length);  // cursor at col 9, row 11
    await nhgetch();   // captures screen 18 (page 2), reads space

    game.context.move = 0;
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
    } else if (key === 27) {
        // ESC: cancel, no turn
        game.context.move = 0;
    } else {
        // Unknown command: no turn
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
}
