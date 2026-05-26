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

// C ref: dogmove.c dog_goal() — pet scans floor objects for apport goal, then follow-player.
//
// C structure (dogmove.c:483-640):
//   for (obj = fobj; obj; obj = obj->nobj)  — iterate ALL floor objects
//     if within SQSRCHRADIUS(5):
//       dogfood() → obj_resists(obj, 0, 95) → rn2(100)          always
//       if (gtyp==UNDEF && in_masters_sight && !dog_has_minvent
//           && m_cansee && edog->apport > rn2(8)                 dogmove.c:554
//           && can_carry > 0):
//         gtyp = APPORT
//   if (gtyp==UNDEF || non-food goal):                           follow player
//     if udist > 1 && IS_ROOM: !rn2(4) check                    dogmove.c:575
//
// can_carry: dogs cannot carry containers (CHEST etc.); those consume
// rn2(8) but leave gtyp==UNDEF, so the follow-player rn2(4) still fires.
const SQSRCHRADIUS = 5;
// Containers dogs cannot carry — can_carry(dog, obj)==0 for these
const UNCAUGHT_OTYPS = new Set([215 /*CHEST*/, 200 /*LARGE_BOX*/, 212 /*ICE_BOX*/]);

function dog_goal_rng(mon) {
    const g = game;
    const mx = mon.mx, my = mon.my;
    // edog->apport initialised to ACURR(A_CHA); A_CHA = acurr.a[5]
    const apport = mon._apport ?? (g.u?.acurr?.a?.[5] ?? 10);

    let gtyp = 6; // UNDEF — no goal found yet

    // Scan all floor objects within SQSRCHRADIUS=5 (C iterates global fobj list)
    for (const obj of (g.level?.allObjects || [])) {
        const nx = obj.ox, ny = obj.oy;
        if (nx == null) continue;
        if (nx < mx - SQSRCHRADIUS || nx > mx + SQSRCHRADIUS ||
            ny < my - SQSRCHRADIUS || ny > my + SQSRCHRADIUS) continue;

        // dogfood() calls obj_resists(obj, 0, 95) which always calls rn2(100)
        rn2(100); // zap.c:1469

        // APPORT candidate: rn2(8) fires when gtyp==UNDEF and standard conditions
        // (in_masters_sight, !dog_has_minvent, m_cansee — all assumed true at level 1)
        if (gtyp === 6) { // UNDEF
            const r8 = rn2(8); // dogmove.c:554
            const otyp = obj.otyp ?? obj._otyp ?? 0;
            if (apport > r8 && !UNCAUGHT_OTYPS.has(otyp)) {
                gtyp = 4; // APPORT — dog has a fetch goal, skip follow-player check
            }
        }
    }

    // Follow-player approach check — only when no fetch goal (gtyp==UNDEF)
    // C ref: dogmove.c:574 — if (udist > 1) { if (!IS_ROOM || !rn2(4) ...) }
    // udist is distu() = squared Euclidean distance (not Chebyshev).
    // Diagonal neighbor has udist=2, so rn2(4) fires even when 1 step away diagonally.
    if (gtyp === 6) { // UNDEF
        const ux = g.u?.ux, uy = g.u?.uy;
        if (ux != null) {
            const udist = (ux - mx) ** 2 + (uy - my) ** 2; // distu(): squared Euclidean
            if (udist > 1) rn2(4); // dogmove.c:575
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
