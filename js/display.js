// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee } from './vision.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    SDOOR, SCORR,
} from './const.js';
import { NO_COLOR, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW, CLR_MAGENTA, CLR_CYAN, CLR_ORANGE, DEC_TO_UNICODE } from './terminal.js';
import { MONS, MONS_COLOR } from './mondata.js';

// MONSYM index → display character (from defsym.h MONSYM table)
// Index 0 = unused, 1='a' (ant), 2='b' (blob), ..., 60=']' (mimic)
const MONSYM_CHARS = [
    ' ','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o',
    'p','q','r','s','t','u','v','w','x','y','z',
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
    '@',' ','\'','&',';',':','~',']',
];

// ── ANSI color codes ──
// Maps CLR_* constants (0-15) to ANSI SGR color codes.
// C ref: wintty.c term_start_color
const ANSI_DEFAULT = 39;
const ANSI_COLOR = [
    30,  // CLR_BLACK     0
    31,  // CLR_RED       1
    32,  // CLR_GREEN     2
    33,  // CLR_BROWN     3
    34,  // CLR_BLUE      4
    35,  // CLR_MAGENTA   5
    36,  // CLR_CYAN      6
    37,  // CLR_GRAY      7
    39,  // NO_COLOR      8 → default
    91,  // CLR_ORANGE    9
    92,  // CLR_BRIGHT_GREEN  10
    93,  // CLR_YELLOW    11
    94,  // CLR_BRIGHT_BLUE   12
    95,  // CLR_BRIGHT_MAGENTA 13
    96,  // CLR_BRIGHT_CYAN   14
    97,  // CLR_WHITE     15
];

// ── Terrain to display character + color + DEC flag ──
function terrain_glyph(loc, x, y) {
    const typ = loc.typ;
    const dec = !!game.flags?.decgfx;
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case ROOM:      return dec ? { ch: '~', color: NO_COLOR, dec: true }
                               : { ch: '.', color: NO_COLOR, dec: false };
    case CORR:      return { ch: '#', color: NO_COLOR, dec: false };
    case DOOR:
        if (loc.doormask & D_ISOPEN) return { ch: '|', color: CLR_BROWN, dec: false };
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: CLR_BROWN, dec: false };
        return dec ? { ch: '~', color: NO_COLOR, dec: true }
                   : { ch: '.', color: NO_COLOR, dec: false };
    case STAIRS:
        if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
            return { ch: '<', color: CLR_YELLOW, dec: false };
        return { ch: '>', color: CLR_YELLOW, dec: false };
    // Wall types
    case HWALL:     return dec ? { ch: 'q', color: NO_COLOR, dec: true }
                               : { ch: '-', color: NO_COLOR, dec: false };
    case VWALL:     return dec ? { ch: 'x', color: NO_COLOR, dec: true }
                               : { ch: '|', color: NO_COLOR, dec: false };
    case TLCORNER:  return dec ? { ch: 'l', color: NO_COLOR, dec: true }
                               : { ch: '-', color: NO_COLOR, dec: false };
    case TRCORNER:  return dec ? { ch: 'k', color: NO_COLOR, dec: true }
                               : { ch: '-', color: NO_COLOR, dec: false };
    case BLCORNER:  return dec ? { ch: 'm', color: NO_COLOR, dec: true }
                               : { ch: '-', color: NO_COLOR, dec: false };
    case BRCORNER:  return dec ? { ch: 'j', color: NO_COLOR, dec: true }
                               : { ch: '-', color: NO_COLOR, dec: false };
    case CROSSWALL: return dec ? { ch: 'n', color: NO_COLOR, dec: true }
                               : { ch: '+', color: NO_COLOR, dec: false };
    case TUWALL:    return dec ? { ch: 'v', color: NO_COLOR, dec: true }
                               : { ch: '-', color: NO_COLOR, dec: false };
    case TDWALL:    return dec ? { ch: 'w', color: NO_COLOR, dec: true }
                               : { ch: '-', color: NO_COLOR, dec: false };
    case TLWALL:    return dec ? { ch: 'u', color: NO_COLOR, dec: true }
                               : { ch: '|', color: NO_COLOR, dec: false };
    case TRWALL:    return dec ? { ch: 't', color: NO_COLOR, dec: true }
                               : { ch: '|', color: NO_COLOR, dec: false };
    case SDOOR: {
        // SDOOR disguises as the appropriate wall type based on neighbors
        const neighbors = [game.level?.at(x-1,y), game.level?.at(x+1,y)];
        const horizNeighbor = neighbors.some(l => l && (l.typ === HWALL || l.typ === TLCORNER || l.typ === TRCORNER || l.typ === BLCORNER || l.typ === BRCORNER || l.typ === TUWALL || l.typ === TDWALL));
        if (horizNeighbor)
            return dec ? { ch: 'q', color: NO_COLOR, dec: true } : { ch: '-', color: NO_COLOR, dec: false };
        return dec ? { ch: 'x', color: NO_COLOR, dec: true } : { ch: '|', color: NO_COLOR, dec: false };
    }
    case SCORR:     return { ch: '#', color: NO_COLOR, dec: false };
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

// ── Object class → display glyph ──
// oclass constants (must match mklev.js WEAPON_CLASS etc.)
const _WEAPON_CLASS = 2, _ARMOR_CLASS = 3, _RING_CLASS = 4, _AMULET_CLASS = 5;
const _TOOL_CLASS = 6, _FOOD_CLASS = 7, _POTION_CLASS = 8, _SCROLL_CLASS = 9;
const _SPBOOK_CLASS = 10, _WAND_CLASS = 11, _COIN_CLASS = 12, _GEM_CLASS = 13;
const _ROCK_CLASS = 14, _BALL_CLASS = 15, _CHAIN_CLASS = 16;

function obj_glyph(obj) {
    switch (obj.oclass) {
    case _WEAPON_CLASS: return { ch: '(', color: CLR_WHITE };
    case _ARMOR_CLASS:  return { ch: '[', color: CLR_GRAY };
    case _TOOL_CLASS:   return { ch: '(', color: CLR_BROWN };
    case _FOOD_CLASS:   return { ch: '%', color: CLR_BROWN };
    case _POTION_CLASS: return { ch: '!', color: CLR_MAGENTA };
    case _SCROLL_CLASS: return { ch: '?', color: CLR_WHITE };
    case _SPBOOK_CLASS: return { ch: '+', color: CLR_CYAN };
    case _RING_CLASS:   return { ch: '=', color: CLR_YELLOW };
    case _AMULET_CLASS: return { ch: '"', color: CLR_YELLOW };
    case _WAND_CLASS:   return { ch: '/', color: CLR_ORANGE };
    case _COIN_CLASS:   return { ch: '$', color: CLR_YELLOW };
    case _GEM_CLASS:    return { ch: '*', color: CLR_WHITE };
    case _ROCK_CLASS:   return { ch: '`', color: CLR_GRAY };
    case _BALL_CLASS:   return { ch: '0', color: CLR_WHITE };
    case _CHAIN_CLASS:  return { ch: '_', color: CLR_GRAY };
    default:            return { ch: '~', color: NO_COLOR };
    }
}

// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = color;
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero
        show_glyph_cell(x, y, '@', CLR_WHITE, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    // Monster at this cell
    const mon = game.level.monsters?.find(m => m.mx === x && m.my === y);
    if (mon && cansee(x, y)) {
        const sym_id = (mon._mndx != null) ? (MONS[mon._mndx]?.[4] ?? 0) : 0;
        const mch = mon._petChar || MONSYM_CHARS[sym_id] || 'd';
        const mcol = (mon._mndx != null) ? (MONS_COLOR[mon._mndx] ?? CLR_WHITE) : CLR_WHITE;
        show_glyph_cell(x, y, mch, mcol, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    // Floor item at this cell (items from level generation)
    const flItem = game.level.floor_items?.get(`${x},${y}`);
    if (flItem && cansee(x, y)) {
        const og = obj_glyph(flItem);
        show_glyph_cell(x, y, og.ch, og.color, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    // Gold at this cell
    const goldAmt = game.level._gold_cells?.get(`${x},${y}`);
    if (goldAmt && cansee(x, y)) {
        show_glyph_cell(x, y, '$', CLR_YELLOW, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    const tg = terrain_glyph(loc, x, y);
    if (cansee(x, y)) {
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        }
    } else if (loc.remembered_glyph) {
        show_glyph_cell(x, y, loc.remembered_glyph.ch,
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
    }
}

// ── docrt ──
export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            newsym(x, y);
}

// ── Serialize a map row with DEC line-drawing and ANSI colors ──
// maxX: if set, only render cells with map x ≤ maxX (used for pager overlay).
function render_map_row(y, maxX = COLNO - 1) {
    if (!game.level) return '';
    let firstCol = -1, lastCol = -1;
    for (let x = 1; x <= Math.min(maxX, COLNO - 1); x++) {
        const loc = game.level.at(x, y);
        if (loc?.disp_ch && loc.disp_ch !== ' ') {
            if (firstCol < 0) firstCol = x;
            lastCol = x;
        }
    }
    if (firstCol < 0) return '';

    let output = '';
    let activeColor = ANSI_DEFAULT;  // default
    let activeDec = false;

    // Leading gap
    const gap = firstCol - 1;
    if (gap > 4) output += `\x1b[${gap}C`;
    else if (gap > 0) output += ' '.repeat(gap);

    for (let x = firstCol; x <= lastCol; x++) {
        const loc = game.level.at(x, y);
        const ch = loc?.disp_ch ?? ' ';
        const color = loc?.disp_color ?? NO_COLOR;
        const dec = !!loc?.disp_decgfx;

        if (ch === ' ') {
            // Space runs
            let run = 1;
            while (x + run <= lastCol && (game.level.at(x + run, y)?.disp_ch ?? ' ') === ' ') run++;
            if (activeDec) { output += '\x0f'; activeDec = false; }
            if (run > 4) output += `\x1b[${run}C`;
            else output += ' '.repeat(run);
            x += run - 1;
            continue;
        }

        let wantAnsi = ANSI_COLOR[color] ?? ANSI_DEFAULT;
        if (wantAnsi !== activeColor) {
            output += `\x1b[${wantAnsi}m`;
            activeColor = wantAnsi;
        }

        // DEC mode switching
        if (dec && !activeDec) { output += '\x0e'; activeDec = true; }
        else if (!dec && activeDec) { output += '\x0f'; activeDec = false; }

        output += ch;
    }

    // Reset state at end of row (C does per-row SO/SI)
    if (activeColor !== ANSI_DEFAULT) output += `\x1b[${ANSI_DEFAULT}m`;
    if (activeDec) output += '\x0f';

    return output;
}

// ── Status lines ──
function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    const rawName = game.plname || 'Hero';
    // C ref: botl.c — nb[0] = highc(nb[0]); capitalizes first letter for status line
    const name = rawName.length > 0 ? rawName[0].toUpperCase() + rawName.slice(1) : rawName;
    const role = game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
    const title = `${name} the ${role}`;
    // C internal order: A_STR=0 A_INT=1 A_WIS=2 A_DEX=3 A_CON=4 A_CHA=5
    // Display order: St Dx Co In Wi Ch = STR DEX CON INT WIS CHA
    const a = u.acurr?.a;
    const strVal = a ? a[0] : '?';
    const stats = a
        ? `St:${a[0]} Dx:${a[3]} Co:${a[4]} In:${a[1]} Wi:${a[2]} Ch:${a[5]}`
        : 'St:? Dx:? Co:? In:? Wi:? Ch:?';
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    let s = `Dlvl:${u.uz?.dlevel || 1} $:${game._goldCount || 0} HP:${u.uhp || 0}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10}`;
    if (game.flags?.showexp)
        s += ` Xp:${u.ulevel || 1}/${u.uexp || 0}`;
    else
        s += ` Xp:${u.ulevel || 1}`;
    if (game.flags?.time) s += ` T:${game.moves || 1}`;
    return s;
}

// ── Serialize terminal grid for screen comparison ──
export function serialize_terminal_grid(display) {
    let output = '';
    let lastRow = 0;
    for (let r = 0; r < display.rows; r++) {
        for (let c = 0; c < display.cols; c++) {
            if (display.grid[r][c].ch !== ' ') { lastRow = r; break; }
        }
    }
    for (let r = 0; r <= lastRow; r++) {
        let lastCol = -1;
        for (let c = display.cols - 1; c >= 0; c--) {
            if (display.grid[r][c].ch !== ' ') { lastCol = c; break; }
        }
        if (lastCol < 0) { if (r < lastRow) output += '\n'; continue; }
        let firstCol = 0;
        for (let c = 0; c <= lastCol; c++) {
            if (display.grid[r][c].ch !== ' ') { firstCol = c; break; }
        }
        if (firstCol > 4) output += `\x1b[${firstCol}C`;
        else if (firstCol > 0) output += ' '.repeat(firstCol);
        for (let c = firstCol; c <= lastCol; c++) output += display.grid[r][c].ch;
        if (r < lastRow) output += '\n';
    }
    return output;
}

// ── Build screen output ──
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display) return;

    let output = '';
    // Row 0: message
    output += (game._pending_message || '') + '\n';

    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }

    // Row 22-23: status
    output += _statusLine1() + '\n';
    output += _statusLine2();

    game._screen_output = output;

    // Also write to grid for serialize_terminal_grid
    if (display.grid) {
        display.clearScreen();
        // Message line — consume and clear the pending message so it only shows once
        const msg = game._pending_message || '';
        game._pending_message = '';
        for (let c = 0; c < Math.min(msg.length, display.cols); c++)
            display.setCell(c, 0, msg[c], NO_COLOR, 0);
        // Map — write characters to grid (DEC → Unicode for browser display)
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        // Status lines
        const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
            m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = _statusLine2();
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
        // Cursor at hero
        if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
}

// ── flush_screen ──
export async function flush_screen(mode) {
    _buildScreenOutput();
}

// ── cls ──
export async function cls() {
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();
    game._pending_message = '';
}

// ── bot ──
export async function bot() {
    // Status line updates happen in _buildScreenOutput
}

// ── writeStatusToDisplay ──
// Write status lines to rows 22-23. Used by overlay commands that need status preserved.
export function writeStatusToDisplay() {
    const display = game?.nhDisplay;
    if (!display) return;
    const s1 = _statusLine1().replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(parseInt(n)));
    for (let c = 0; c < Math.min(s1.length, display.cols); c++)
        display.setCell(c, 22, s1[c], NO_COLOR, 0);
    const s2 = _statusLine2();
    for (let c = 0; c < Math.min(s2.length, display.cols); c++)
        display.setCell(c, 23, s2[c], NO_COLOR, 0);
}

// ── buildOverlayScreenOutput ──
// Build game._screen_output for overlay screens (inventory, pagers, etc).
// Lines with {text, attr} get inverse-video when attr&1; plain strings are normal.
// promptText (if truthy) is placed at promptRow instead of any overlay line.
// keepStatus: include status lines at rows 22-23.
export function buildOverlayScreenOutput(lines, startCol, promptRow, promptText, keepStatus) {
    const parts = [];
    for (let row = 0; row < 24; row++) {
        let lineStr = '';
        if (keepStatus && row === 22) {
            lineStr = _statusLine1();
        } else if (keepStatus && row === 23) {
            lineStr = _statusLine2();
        } else if (promptText && row === promptRow) {
            lineStr = promptText;
        } else if (row < lines.length) {
            const entry = lines[row];
            const text = typeof entry === 'string' ? entry : (entry?.text || '');
            const isInverse = typeof entry !== 'string' && !!(entry?.attr & 1);
            lineStr = startCol > 0 ? `\x1b[${startCol}C` : '';
            if (isInverse) lineStr += `\x1b[7m${text}\x1b[0m`;
            else lineStr += text;
        }
        parts.push(lineStr);
    }
    game._screen_output = parts.slice(0, 23).join('\n') + '\n' + parts[23];
}

// ── buildLegacyPagerScreen ──
// Build game._screen_output for the com_pager("legacy") screen.
// pagerLines: 18 strings (rows 0-17; row 17 = "--More--").
// textCol: terminal column where pager text starts.
// Caller sets display cursor after this (textCol+8, 17).
export function buildLegacyPagerScreen(pagerLines, textCol) {
    const parts = [];

    // Row 0: pager line 0, no map at message row
    {
        const line = pagerLines[0] || '';
        let nsp = 0;
        while (nsp < line.length && line[nsp] === ' ') nsp++;
        const content = line.slice(nsp);
        const col = textCol + nsp;
        parts.push(content ? (col > 4 ? `\x1b[${col}C${content}` : ' '.repeat(col) + content) : '');
    }

    // Rows 1-17: map row y=(row-1) + pager line overlay
    for (let row = 1; row <= 17; row++) {
        const y = row - 1;
        const pagerLine = pagerLines[row] || '';

        let nsp = 0;
        while (nsp < pagerLine.length && pagerLine[nsp] === ' ') nsp++;
        const content = pagerLine.slice(nsp);
        const targetCol = textCol + nsp;

        if (!content) {
            // Empty pager line: show full map row (no text to overlay).
            let hasMap = false;
            if (game.level) {
                for (let x = 1; x < COLNO; x++) {
                    if (game.level.at(x, y)?.disp_ch > ' ') { hasMap = true; break; }
                }
            }
            parts.push(hasMap ? render_map_row(y) : '');
        } else {
            // C com_pager does clrtoeol from textCol-1, so only map cells at
            // x ≤ textCol-1 (terminal col ≤ textCol-2) survive.
            let leftLastCol = -1;
            if (game.level) {
                for (let x = 1; x <= Math.min(textCol - 1, COLNO - 1); x++) {
                    const loc = game.level.at(x, y);
                    if (loc?.disp_ch && loc.disp_ch !== ' ') leftLastCol = x;
                }
            }
            if (leftLastCol < 0) {
                // No visible map to the left — just pager text.
                parts.push(targetCol > 4 ? `\x1b[${targetCol}C${content}` : ' '.repeat(targetCol) + content);
            } else {
                // Map to the left, then pager text (covering any map at targetCol+).
                const partialMap = render_map_row(y, leftLastCol);
                const gap = targetCol - leftLastCol;
                const gapStr = gap > 4 ? `\x1b[${gap}C` : ' '.repeat(gap);
                parts.push(partialMap + gapStr + content);
            }
        }
    }

    // Rows 18-21: map only
    for (let row = 18; row <= 21; row++) {
        parts.push(render_map_row(row - 1));
    }

    // Rows 22-23: status
    parts.push(_statusLine1());
    parts.push(_statusLine2());

    game._screen_output = parts.slice(0, 23).join('\n') + '\n' + parts[23];
}

// ── pline ──
export async function pline(msg) {
    game._pending_message = msg;
}
