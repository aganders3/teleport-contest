// monmove.js — General per-step monster movement and environment RNG.
// C ref: allmain.c moveloop_core() — movemon, mcalcmove, maybe_generate_rnd_mon,
//        u_calc_moveamt, dosounds, gethungry, ambient engraving wipe check.
//
// general_step(stepNum) is the session-general replacement for the
// seed8000-specific fastforward_step() table.  It reads live game state
// (monster count, level features, player DEX, player speed intrinsic) and
// consumes the matching RNG calls.

import { rn2 } from './rng.js';
import { game } from './gstate.js';

// C ref: allmain.c maybe_generate_rnd_mon()
// rn2 argument: 25 if demi-god status, 50 in deep dungeon, else 70.
// For new games on dungeon level 1: always rn2(70).
function maybe_generate_rnd_mon() {
    rn2(70);
}

// C ref: allmain.c u_calc_moveamt() — Fast intrinsic calls rn2(3).
// Called once per game turn if context.move.
// Very_fast (speed boots/spell) also calls rn2(3); for level-1 heroes
// only Samurai and Monk have Fast, and no hero starts Very_fast.
function u_calc_moveamt_rng() {
    rn2(3);
}

// C ref: sounds.c dosounds()
// Each level feature calls its rn2 unconditionally if present.
// (The actual sound only plays on a lucky roll, but rn2 is always consumed.)
function dosounds() {
    const flags = game.level?.flags || {};
    if (flags.nfountains) rn2(400);
    if (flags.nsinks)     rn2(300);
    if (flags.has_court)  rn2(200);
    if (flags.has_swamp)  rn2(200);
    if (flags.has_vault)  rn2(200);
}

// C ref: eat.c gethungry()
function gethungry() {
    rn2(20);
}

// C ref: allmain.c moveloop_core line ~360
// if (!rn2(40 + ACURR(A_DEX)*3)) u_wipe_engr(rnd(3))
// A_DEX = index 3 in acurr.a[].
function ambient() {
    const dex = game.u?.acurr?.a?.[3] ?? 14; // 14 is Tourist default
    rn2(40 + dex * 3);
}

// C ref: dogmove.c dog_goal() — pet scans nearby objects for apport
// For each object in adjacent cells: obj_resists rn2(100) + apport check rn2(8)
// dog_goal returns a direction or 0 to indicate no move needed
function dog_goal_rng(mon) {
    const g = game;
    if (!g.level?.objects) return;
    const mx = mon.mx, my = mon.my;
    // Scan 9 cells: dog's cell + 8 neighbors (C iterates mx-1..mx+1, my-1..my+1)
    for (let nx = mx - 1; nx <= mx + 1; nx++) {
        for (let ny = my - 1; ny <= my + 1; ny++) {
            const key = `${nx},${ny}`;
            const objs = g.level.objects[key];
            if (!objs) continue;
            for (const obj of objs) {
                rn2(100); // obj_resists: zap.c:1469
                rn2(8);   // apport check: dogmove.c:554
            }
        }
    }
}

// C ref: allmain.c moveloop_core() — per-turn RNG for a single game turn.
// Handles: movemon (when monsters have accumulated movement), mcalcmove
// allocation, maybe_generate_rnd_mon, u_calc_moveamt, dosounds, gethungry,
// and ambient engraving wipe.
//
// stepNum: 1-based game turn index (matches fastforward_step numbering).
// stepNum == 1: first game turn — monsters start with movement=0, so
//   no monster moves in movemon; only mcalcmove allocation + standard calls.
// stepNum >= 2: monsters have movement=12 (normal speed) from previous
//   mcalcmove; each awake monster goes through dochug (distfleeck calls).
export function general_step(stepNum) {
    if (stepNum < 1) return;

    const g = game;
    const monsters = g.level?.monsters || [];
    const monCount = monsters.length;

    // movemon: at step >= 2, monsters accumulated movement from previous mcalcmove
    // C ordering: movemon() (distfleeck per monster) THEN mcalcmove, then standard
    if (stepNum >= 2) {
        for (const mon of monsters) {
            // distfleeck: called for every monster dochug processes
            // C: movemon() only processes monsters with movement >= NORMAL_SPEED (12)
            // After step 1 mcalcmove gives all monsters 12; all get processed at step 2+
            rn2(5); // distfleeck: monmove.c:538
            if (mon._pet) {
                dog_goal_rng(mon);
            }
        }
    }

    // mcalcmove: rn2(NORMAL_SPEED=12) per monster (always runs)
    for (let i = 0; i < monCount; i++) rn2(12);

    // maybe_generate_rnd_mon
    maybe_generate_rnd_mon();

    // u_calc_moveamt: Samurai and Monk start with Fast intrinsic at level 1.
    // C sam_abil / mon_abil both have { 1, &HFast, "", "" }.
    if (g.u?.hfast) u_calc_moveamt_rng();

    // dosounds: one rn2 per level feature present
    dosounds();

    // gethungry
    gethungry();

    // ambient engraving wipe check (DEX-dependent N)
    ambient();
}
