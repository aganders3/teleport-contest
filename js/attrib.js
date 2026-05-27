// attrib.js — Port of attrib.c: attribute initialization and management.
// C ref: attrib.c
//
// Attribute order: A_STR=0 A_INT=1 A_WIS=2 A_DEX=3 A_CON=4 A_CHA=5
// Macros from C: ABASE(x)=u.acurr.a[x], AMAX(x)=u.amax.a[x],
//   ABON(x)=u.abon.a[x], ATEMP(x)=u.atemp.a[x], AEXE(x)=u.aexe.a[x]
//   ATTRMAX(x)=race.attrmax[x], ATTRMIN(x)=race.attrmin[x]
//   ACURR(x) = abon[x] + atemp[x] + abase[x]  (simplified; no polymorph)

import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';

// Tourist/human defaults for sessions where urole_data/urace_data not yet set
const TOURIST_DEFAULT = { attrbase: [7, 10, 6, 7, 7, 10], attrdist: [15, 10, 10, 15, 30, 20] };
const HUMAN_DEFAULT   = { attrmin: [3, 3, 3, 3, 3, 3], attrmax: [118, 18, 18, 18, 18, 18] };

// Helpers to read from game.u with safe fallbacks
function _abase(ndx) { return game.u.acurr?.a[ndx] ?? 0; }
function _amax(ndx)  { return game.u.amax?.a[ndx]  ?? 0; }
function _abon(ndx)  { return game.u.abon?.a[ndx]  ?? 0; }
function _atemp(ndx) { return game.u.atemp?.a[ndx] ?? 0; }

// C ref: attrib.c acurr() — effective attribute value (abon+atemp+abase, clamped).
// Simplified: no polymorph, no gauntlets-of-power, no dunce-cap.
// For A_STR: min 3, max 125; for others: min 3, max 25.
function acurr(ndx) {
    const tmp = _abon(ndx) + _atemp(ndx) + _abase(ndx);
    if (ndx === 0 /* A_STR */) return Math.max(tmp, 3); // cap 125 not relevant pre-game
    return Math.max(3, Math.min(25, tmp));
}

// C ref: attrib.c adjattrib() — adjust one attribute by incr; return true if effective.
// msgflg: >0 = no message, 0 = message, <0 = conditional. During init always TRUE (no msg).
// Critical: when incr < 0 and ABASE drops below ATTRMIN, fires rn2(ATTRMIN-ABASE+1).
export function adjattrib(ndx, incr, msgflg) {
    const g = game;
    if (!incr) return false;

    const race = g.urace_data || HUMAN_DEFAULT;
    const attrmin = race.attrmin[ndx];
    const attrmax = race.attrmax[ndx];

    const old_acurr = acurr(ndx);
    const a = g.u.acurr.a;
    const m = g.u.amax.a;

    a[ndx] += incr;

    if (incr > 0) {
        if (a[ndx] > m[ndx]) {
            m[ndx] = a[ndx];
            if (m[ndx] > attrmax) {
                a[ndx] = m[ndx] = attrmax;
            }
        }
    } else { // incr < 0
        if (a[ndx] < attrmin) {
            // C ref: decr = rn2(ATTRMIN - ABASE + 1); — consume RNG even if result is 0
            const decr = rn2(attrmin - a[ndx] + 1);
            a[ndx] = attrmin;
            m[ndx] -= decr;
            if (m[ndx] < attrmin) m[ndx] = attrmin;
        }
    }

    if (acurr(ndx) === old_acurr) {
        return false;
    }

    // Successful change: reset exercise accumulator
    if (g.u.aexe) g.u.aexe.a[ndx] = 0;

    return true;
}

// C ref: attrib.c rnd_attr() — pick random attribute index weighted by role attrdist.
// Consumes rn2(100); uses x -= attrdist[i]; if x<0 break pattern.
function rnd_attr(role) {
    let x = rn2(100);
    for (let i = 0; i < 6; i++) {
        x -= role.attrdist[i];
        if (x < 0) return i;
    }
    return 5; // A_CHA if somehow x >= sum (shouldn't happen if attrdist sums to 100)
}

// C ref: attrib.c init_attr_role_redist() — add or subtract np points from random attrs.
// Updates ABASE and AMAX symmetrically; returns leftover points.
function init_attr_role_redist(attrs, amax_arr, attrmax, attrmin, role, np) {
    const adding = np > 0;
    const adj = adding ? 1 : -1;
    let tryct = 0;

    while ((adding ? np > 0 : np < 0) && tryct < 100) {
        const i = rnd_attr(role);
        const blocked = adding ? (attrs[i] >= attrmax[i]) : (attrs[i] <= attrmin[i]);
        if (blocked) {
            tryct++;
            continue;
        }
        tryct = 0;
        attrs[i] += adj;
        amax_arr[i] += adj;
        np -= adj;
    }
    return np;
}

// C ref: attrib.c init_attr(np=75) — set hero's initial attributes.
// Stores result in game.u.acurr (=ABASE) and game.u.amax.
export function init_attr(np) {
    const g = game;
    const role = g.urole_data || TOURIST_DEFAULT;
    const race = g.urace_data || HUMAN_DEFAULT;
    const attrmin = race.attrmin;
    const attrmax = race.attrmax;

    const attrs = [...role.attrbase];
    const amax_arr = [...role.attrbase];
    let remaining = np;
    for (const v of role.attrbase) remaining -= v;

    remaining = init_attr_role_redist(attrs, amax_arr, attrmax, attrmin, role, remaining);
    init_attr_role_redist(attrs, amax_arr, attrmax, attrmin, role, remaining);

    g.u.acurr = { a: attrs };
    g.u.amax  = { a: amax_arr };
    if (!g.u.abon)  g.u.abon  = { a: [0, 0, 0, 0, 0, 0] };
    if (!g.u.atemp) g.u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if (!g.u.aexe)  g.u.aexe  = { a: [0, 0, 0, 0, 0, 0] };
}

// C ref: attrib.c vary_init_attr() — apply minor random variation to initial attributes.
// Calls adjattrib() which may consume an extra rn2() when ABASE drops below ATTRMIN.
export function vary_init_attr() {
    const g = game;
    for (let i = 0; i < 6; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2; // biased: -2..4
            adjattrib(i, xd, true); // true = no message
            if (g.u.acurr.a[i] < g.u.amax.a[i])
                g.u.amax.a[i] = g.u.acurr.a[i];
        }
    }
}

// C ref: attrib.c redist_attr() — redistribute attributes after polymorph.
// Not needed for early game but exported for completeness.
export function redist_attr() {
    const g = game;
    const race = g.urace_data || HUMAN_DEFAULT;
    const a = g.u.acurr.a;
    const m = g.u.amax.a;
    for (let i = 0; i < 6; i++) {
        if (i === 1 || i === 2) continue; // skip INT, WIS
        const tmp = m[i];
        m[i] += rn2(5) - 2;
        if (m[i] > race.attrmax[i]) m[i] = race.attrmax[i];
        if (m[i] < race.attrmin[i]) m[i] = race.attrmin[i];
        a[i] = Math.floor(a[i] * m[i] / tmp);
        if (a[i] < race.attrmin[i]) a[i] = race.attrmin[i];
    }
}

// C ref: attrib.c newhp() — compute HP increment for level-up (or init at ulevel=0).
// Called at ulevel=0 during initialization; called again at each level gain.
export function newhp() {
    const g = game;
    const role = g.urole_data || { hpadv: { infix: 8, inrnd: 0 } };
    const race = g.urace_data || { hpadv: { infix: 2, inrnd: 0 } };
    const ulevel = g.u.ulevel ?? 0;

    let hp;
    if (ulevel === 0) {
        hp = role.hpadv.infix + race.hpadv.infix;
        if ((role.hpadv.inrnd ?? 0) > 0) hp += rnd(role.hpadv.inrnd);
        if ((race.hpadv.inrnd ?? 0) > 0) hp += rnd(race.hpadv.inrnd);
        // Initialize alignment
        if ((g.moves ?? 0) === 0) {
            const alignVal = (g.flags?.initalign ?? 0);
            if (!g.u.ualign) g.u.ualign = {};
            g.u.ualign.type = alignVal;
            g.u.ualign.record = role.initrecord ?? 0;
        }
    } else {
        const xlev = role.xlev ?? 10;
        if (ulevel < xlev) {
            hp = (role.hpadv.lofix ?? 0) + (race.hpadv.lofix ?? 0);
            if ((role.hpadv.lornd ?? 0) > 0) hp += rnd(role.hpadv.lornd);
            if ((race.hpadv.lornd ?? 0) > 0) hp += rnd(race.hpadv.lornd);
        } else {
            hp = (role.hpadv.hifix ?? 0) + (race.hpadv.hifix ?? 0);
            if ((role.hpadv.hirnd ?? 0) > 0) hp += rnd(role.hpadv.hirnd);
            if ((race.hpadv.hirnd ?? 0) > 0) hp += rnd(race.hpadv.hirnd);
        }
        const con = acurr(4 /* A_CON */);
        const conplus = con <= 3 ? -2 : con <= 6 ? -1 : con <= 14 ? 0 :
                        con <= 16 ? 1 : con === 17 ? 2 : con === 18 ? 3 : 4;
        hp += conplus;
    }
    if (hp <= 0) hp = 1;
    return hp;
}

// C ref: attrib.c change_luck() — adjust luck within LUCKMIN/LUCKMAX bounds.
export function change_luck(n) {
    const g = game;
    if (!g.u.uluck) g.u.uluck = 0;
    g.u.uluck += n;
    const LUCKMIN = -10, LUCKMAX = 10;
    if (g.u.uluck < 0 && g.u.uluck < LUCKMIN) g.u.uluck = LUCKMIN;
    if (g.u.uluck > 0 && g.u.uluck > LUCKMAX) g.u.uluck = LUCKMAX;
}

// C ref: attrib.c exercise() — accumulate exercise/abuse for attribute.
// A_INT=1 and A_CHA=5 cannot be exercised.
export function exercise(i, inc_or_dec) {
    const g = game;
    if (i === 1 || i === 5) return; // INT and CHA not exercisable
    if (!g.u.aexe) g.u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    const AVAL = 50;
    if (Math.abs(g.u.aexe.a[i]) < AVAL) {
        const con = acurr(4 /* A_CON */);
        const str = acurr(0 /* A_STR */);
        const dex = acurr(3 /* A_DEX */);
        const wis = acurr(2 /* A_WIS */);
        const cur = i === 0 ? str : i === 2 ? wis : i === 3 ? dex : con;
        g.u.aexe.a[i] += inc_or_dec ? (rn2(19) > cur ? 1 : 0) : -rn2(2);
    }
}

// C ref: attrib.c adjalign() — adjust alignment record within limits.
export function adjalign(n) {
    const g = game;
    if (!g.u.ualign) g.u.ualign = { record: 0, abuse: 0 };
    const ALIGNLIM = 10;
    const newalign = (g.u.ualign.record ?? 0) + n;
    if (n < 0) {
        if (newalign < (g.u.ualign.record ?? 0)) g.u.ualign.record = newalign;
    } else if (newalign > (g.u.ualign.record ?? 0)) {
        g.u.ualign.record = Math.min(newalign, ALIGNLIM);
    }
}
