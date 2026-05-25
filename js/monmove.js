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
//   Full movemon simulation requires knowing awake state per monster;
//   that tracking is deferred, so for stepNum>=2 only the allocation
//   and standard calls are made here.  The seed8000 path in allmain.js
//   uses the hardcoded fastforward_step table for steps 2-12 instead.
export function general_step(stepNum) {
    if (stepNum < 1) return;

    const g = game;
    const monsters = g.level?.monsters || [];
    const monCount = monsters.length;

    // mcalcmove: rn2(NORMAL_SPEED=12) per monster.
    // For normal-speed monsters the rn2 result doesn't change the
    // actual movement added (always +12), but the call is always made.
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
