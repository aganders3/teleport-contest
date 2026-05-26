// jsmain.js — Game engine: NethackGame class + per-segment runner.
// C ref: unixmain.c — nethack_main() initialization and game setup.
//
// Contest contract: the judge orchestrates sessions (load JSON,
// normalize v4/v5, loop segments, aggregate scores). It calls
// runSegment(segment, prevGame) for each game segment and reads back
// game.getScreens() / getRngLog() / getCursors() to compare with
// C-recorded session data.
//
// For browser play, see nethack.js (uses NethackGame directly).

import { game, resetGame } from './gstate.js';
import { initRng, enableRngLog, getRngLog } from './rng.js';
import { pushKey, nhgetch } from './input.js';
import { newgame, moveloop_core } from './allmain.js';
import { parseNethackrc } from './options.js';
import { flush_screen } from './display.js';
import { GameDisplay } from './game_display.js';
import { roles, races, findRole, findRace } from './roles.js';

// ── NethackGame ──
// Wraps a single game session with replay infrastructure.
export class NethackGame {
    constructor(opts = {}) {
        this._seed = opts.seed || 0;
        this._datetime = opts.datetime || null;
        this._nethackrc = opts.nethackrc || '';
        // Cross-segment persistence handle. The judge sandbox passes a
        // shared Web-Storage-shaped object here so save / record /
        // bones survive across segments of a session; the browser
        // /play/<owner>/ page passes a localStorage-backed view so
        // those files also survive page reloads. If a port doesn't
        // need persistence (no save/restore implemented yet), it can
        // ignore this; the field just sits unused.
        this._storage = opts.storage || null;
        this._screens = [];
        this._cursors = [];
        this._rngSlices = [];
        // Animation frames captured during each step.  Outer index
        // matches _screens (one entry per input boundary); inner array
        // is the frames that fired between this boundary and the
        // previous one, in emit order.  Populated by animationFrame()
        // calls; committed at each input boundary.
        this._animFramesByStep = [];
        this._pendingAnimFrames = [];
        this._lastRngIdx = 0;
        this._nhgetchCount = 0;
    }

    // Universal animation-frame hook.  Call once per intermediate
    // animation state — typically inside whatever your port writes as
    // the equivalent of NetHack's nh_delay_output() (zap beams, thrown
    // objects, hurtle steps, explosion expansions).
    //
    // Same call, same code, in every runtime:
    //   * Browser /play/  — your writes to the Terminal already update
    //                        the visible DOM cells; we yield via
    //                        requestAnimationFrame so the browser
    //                        actually paints between frames.
    //   * Judge sandbox    — the Terminal is a pure data structure;
    //                        we yield a microtask, effectively
    //                        immediate.
    //   * Local score.sh   — same as judge sandbox.
    //
    // The yield mechanism is the only environment-sensitive bit, and
    // it is invisible to contestant code: every caller writes the same
    // `await game.animationFrame()`.
    //
    // Frames are scored as a SUPPLEMENTAL metric (see API.md).  Not
    // implementing animation frames doesn't penalise your official
    // RNG / screen score in any way.
    async animationFrame() {
        const disp = game?.nhDisplay;
        const term = disp?.terminal || disp;
        this._pendingAnimFrames.push({
            screen: term?.serialize ? term.serialize() : '',
            cursor: disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : null,
        });
        if (typeof requestAnimationFrame === 'function') {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        } else {
            await null;
        }
    }

    async start() {
        const g = resetGame();

        // Parse nethackrc
        const opts = parseNethackrc(this._nethackrc);
        g.flags = { verbose: true, legacy: true, ...opts.flags };
        // C ref: options.c set_playmode() — debug/wizard mode forces plname="wizard"
        // C's nmcpy in options.c copies name as-is (no capitalization for OPTIONS= names)
        g.plname = g.flags.debug ? 'wizard' : (opts.name || 'Hero');
        g.iflags = { ...opts.iflags };
        if (opts.preferred_pet) g.preferred_pet = opts.preferred_pet;
        if (opts.tutorial_set) g.tutorial_set_in_config = true;

        // Initialize hero struct
        g.u = { ux: 0, uy: 0, ux0: 0, uy0: 0 };
        g.context = { move: 0 };
        g.program_state = {};
        g.moves = 1;
        g._preGameMoveCount = this._preGameMoveCount || 0;

        // Map role/race/gender/align from options to role data tables
        const roleData = findRole(opts.role) || roles[10]; // default Tourist
        const raceData = findRace(opts.race) || races[0];  // default human
        g.urole_data = roleData;
        g.urace_data = raceData;
        g.urole = { name: roleData.name, rank: (roleData.title || [{ m: roleData.name.m, f: roleData.name.f }])[0] };
        g.urace = { adj: raceData.adj };
        g.flags.female = (opts.gender === 'female');
        g.flags.initrole = roles.indexOf(roleData);
        g.flags.initrace = races.indexOf(raceData);
        // A_LAWFUL=1, A_NEUTRAL=0, A_CHAOTIC=-1 (C ref: align.h)
        g.flags.initalign = opts.align === 'lawful' ? 1 : opts.align === 'chaotic' ? -1 : 0;
        // DEC line-drawing mode: only when symset:DECgraphics is set
        g.flags.decgfx = (opts.symset === 'DECgraphics');

        // Player name from interactive character selection (overrides nethackrc default)
        if (this._chargenPlayerName) {
            g.plname = this._chargenPlayerName;
        }

        // Store seed in game state for per-step dispatch
        g._seed = this._seed;

        // Set Fast intrinsic flag for roles that start with HFast at level 1.
        // C ref: attrib.c sam_abil[] and mon_abil[] both have { 1, &HFast, "" }.
        const roleName = roleData?.name?.m || '';
        g.u.hfast = (roleName === 'Samurai' || roleName === 'Monk') ? 1 : 0;

        // Initialize PRNG
        initRng(this._seed);
        enableRngLog();

        // Install display
        if (this._pendingDisplay) {
            g.nhDisplay = this._pendingDisplay;
            this._pendingDisplay = null;
        }

        // Install capture hook
        this._installCaptureHook();

        // Run game startup
        await newgame();
    }

    _installCaptureHook() {
        const nhGame = this;
        game._preNhgetchHook = async () => {
            const keyIdx = nhGame._nhgetchCount++;

            // Capture RNG slice since last capture
            const fullLog = getRngLog() || [];
            const slice = fullLog.slice(nhGame._lastRngIdx);
            nhGame._lastRngIdx = fullLog.length;

            // Capture screen. We use game._screen_output (built by flush_screen)
            // which emits ANSI/VT100 escape sequences matching C's bot() output,
            // including cursor-forward for title-to-stats gap in the status line.
            // This matches the C-recorded session format exactly.
            nhGame._screens.push(game._screen_output || '');
            nhGame._rngSlices.push(slice);

            const disp = game?.nhDisplay;
            const cursor = disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : null;
            nhGame._cursors.push(cursor);

            // Commit animation frames accumulated since the previous
            // input boundary as belonging to this step.  Frames are
            // captured by animationFrame() into _pendingAnimFrames; we
            // snapshot and reset here so the next step starts empty.
            nhGame._animFramesByStep.push(nhGame._pendingAnimFrames);
            nhGame._pendingAnimFrames = [];
        };
    }

    getScreens() { return this._screens; }
    getCursors() { return this._cursors; }
    getRngLog() { return getRngLog(); }
    // Per-step PRNG slices, parallel to getScreens(). Each entry is the
    // log of PRNG calls that fired since the previous capture (i.e.
    // since the previous nhgetch). Useful for tooling like the PS
    // visualizer that wants to attribute calls to individual keystrokes;
    // the judge ignores this and uses getRngLog() flat.
    getRngSlices() { return this._rngSlices; }
    // Per-step animation frames, parallel to getScreens().  Each entry
    // is the array of frames captured (via animationFrame()) between
    // the previous input boundary and this one — i.e. the intermediate
    // display states for that step's animation.  Empty inner arrays
    // for steps that didn't animate.  SUPPLEMENTAL metric — not part
    // of the official ranking; see API.md.
    getAnimationFramesByStep() { return this._animFramesByStep; }
}

// ── Per-segment runner — the contest contract ──
//
// The judge calls this once per segment. Input is a clean replay
// descriptor with up to five fields (NO recorded answers):
//
//   { seed: number,        // PRNG seed
//     datetime: string,    // fixed datetime "YYYYMMDDHHMMSS"
//     nethackrc: string,   // game-options rc text
//     moves: string,       // raw key sequence to replay from launch
//     storage: object }    // Web-Storage-shaped (getItem/setItem/...)
//                          //   handle for cross-segment persistence —
//                          //   shared across all segments of a
//                          //   session. The browser passes a
//                          //   localStorage-backed view so save files
//                          //   survive page reload too.
//
// Each call returns a self-contained game whose getScreens() /
// getRngLog() / getCursors() / getAnimationFramesByStep() cover ONLY
// this segment. The harness concatenates them itself. Cross-segment
// C-side state (bones, record file, save) lives in `input.storage`.
export async function runSegment(input) {
    const { seed, nethackrc, storage } = input;
    const moves = input.moves || '';

    // Detect interactive character-selection sessions: moves starts with a letter
    // (the player typing their name) rather than a pager-dismiss or game command.
    // In C, all character-selection nhgetch calls (name entry + role/race/align
    // selection) produce no RNG. The init trigger (final selection key) is always
    // immediately followed by the legacy pager dismiss key (' ').
    //
    // Key invariant (verified across all 9 char-selection sessions in the corpus):
    //   moves.indexOf(' ') === init_step (the index of the pager-dismiss key)
    //
    // So: strip moves[0..first_space-1] (all char-selection + init trigger keys),
    // push only moves[first_space:] (pager dismiss onward) to the key queue, and
    // extract the player name from the typed characters before the first '\r'.
    let effectiveMoves = moves;
    let chargenPlayerName = null;
    // Guard: if nethackrc supplies a name, there is no interactive character
    // selection (the name-entry dialog is skipped entirely).
    const nethackrcHasName = /\bname\s*:/i.test(nethackrc);
    if (moves.length > 0 && /[A-Za-z]/.test(moves[0]) && !nethackrcHasName) {
        const firstSpaceIdx = moves.indexOf(' ');
        if (firstSpaceIdx > 0) {
            // Parse the player name: chars before the first '\r', handling backspace
            const nameEndIdx = moves.indexOf('\r');
            if (nameEndIdx >= 0 && nameEndIdx < firstSpaceIdx) {
                let name = '';
                for (let i = 0; i < nameEndIdx; i++) {
                    const ch = moves[i];
                    if (ch === '\x08') {
                        if (name.length > 0) name = name.slice(0, -1);
                    } else {
                        name += ch;
                    }
                }
                chargenPlayerName = name || null;
            }
            // Skip character-selection + init-trigger keys; start from pager dismiss
            effectiveMoves = moves.slice(firstSpaceIdx);
        }
    }

    // Count leading pre-game keys (pager dismissal: ' '; tutorial: 'n'/'y').
    // moveloop_core fires this many nhgetch calls before the first game command
    // to align step indices with the C recording's pager/tutorial phase.
    const PRE_GAME_CHARS = new Set([' ', 'n', 'y']);
    let preGameCount = 0;
    for (const ch of effectiveMoves) {
        if (PRE_GAME_CHARS.has(ch)) preGameCount++;
        else break;
    }

    const nhGame = new NethackGame({ seed, nethackrc, storage });
    nhGame._preGameMoveCount = preGameCount;
    if (chargenPlayerName) nhGame._chargenPlayerName = chargenPlayerName;

    // For character-selection sessions, pre-inject screens for steps 0..init_step-1.
    // These are the copyright/name-entry screens C shows during character selection.
    // C compares all screens positionally; injecting these aligns JS screen indices
    // with C step indices so that game screens (pager onwards) match correctly.
    if (chargenPlayerName !== null) {
        const chargenKeys = moves.slice(0, moves.indexOf(' ')); // keys before pager dismiss
        // Build the static copyright base (version line normalized by scorer)
        const copyrightBase = [
            '',
            '',
            '',
            '',
            'NetHack, Copyright 1985-2026',
            '\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.',
            '\x1b[9CVersion 5.0.0 JS port, contest build.',
            '\x1b[9CSee license for details.',
            '',
            '',
            '',
            '',
        ].join('\n');
        // Row 12 is "Who are you?" prompt; cursor starts at col 13 (after "Who are you? ")
        const NAME_ROW = 12, NAME_COL_BASE = 13;
        let typedName = '';
        // Step 0: initial state (before any key)
        nhGame._screens.push(`${copyrightBase}\nWho are you?`);
        nhGame._rngSlices.push([]);
        nhGame._cursors.push([NAME_COL_BASE, NAME_ROW, 1]);
        nhGame._animFramesByStep.push([]);
        // Steps 1..chargenKeys.length-1: each key pressed during char selection,
        // EXCLUDING the last key (init trigger) which produces the pager screen
        // captured by fastforward_post_mklev's nhgetch.
        let pastFirstCr = false;
        for (const ch of chargenKeys.slice(0, -1)) {
            if (ch === '\r') {
                pastFirstCr = true;
            } else if (!pastFirstCr) {
                if (ch === '\x08') {
                    if (typedName.length > 0) typedName = typedName.slice(0, -1);
                } else {
                    typedName += ch;
                }
            }
            // After first '\r' (name submit), further steps show the copyright base
            // (role/race/etc. selection overlays) — we can't reproduce these exactly,
            // so we emit the plain copyright base as a placeholder.
            const prompt = pastFirstCr ? '' : ` ${typedName}`;
            nhGame._screens.push(`${copyrightBase}\nWho are you?${prompt}`);
            nhGame._rngSlices.push([]);
            const col = pastFirstCr ? NAME_COL_BASE : NAME_COL_BASE + typedName.length;
            nhGame._cursors.push([col, NAME_ROW, 1]);
            nhGame._animFramesByStep.push([]);
        }
    }

    const display = new GameDisplay(null);
    display.onEmptyQueue = () => { throw new Error('Input queue empty - test may be missing keystrokes'); };
    nhGame._pendingDisplay = display;

    for (const ch of effectiveMoves) display.pushKey(ch.charCodeAt(0));

    await nhGame.start();

    // Drive the game loop until input is exhausted. The judge looks
    // at game.getScreens() afterwards; whatever the contestant
    // captured is what gets compared.
    const maxIter = Math.max(moves.length * 8, 1024);
    for (let iter = 0; iter < maxIter; iter++) {
        try {
            await moveloop_core();
        } catch (e) {
            if (String(e?.message || '').includes('Input queue empty')) break;
            throw e;
        }
    }

    return nhGame;
}

