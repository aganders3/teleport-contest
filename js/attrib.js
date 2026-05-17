// attrib.js — Port of attrib.c: attribute initialization.
// C ref: attrib.c rnd_attr(), init_attr_role_redist(), init_attr(), vary_init_attr()
//
// Attribute order: A_STR=0 A_INT=1 A_WIS=2 A_DEX=3 A_CON=4 A_CHA=5

import { rn2 } from './rng.js';
import { game } from './gstate.js';

// C ref: attrib.c rnd_attr() — pick a random attribute index weighted by attrdist
// Consumes rn2(100); returns attribute index 0-5.
function rnd_attr(role) {
    const x = rn2(100);
    let acc = 0;
    for (let i = 0; i < 6; i++) {
        acc += role.attrdist[i];
        if (x < acc) return i;
    }
    return 5;
}

// C ref: attrib.c init_attr_role_redist() — distribute or remove np points
function init_attr_role_redist(attrs, attrmax, attrmin, role, np) {
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
        np -= adj;
    }
    return np;
}

// Tourist/human defaults used when urole_data/urace_data are not yet set
const TOURIST_DEFAULT = { attrbase: [7, 10, 6, 7, 7, 10], attrdist: [15, 10, 10, 15, 30, 20] };
const HUMAN_DEFAULT   = { attrmin: [3, 3, 3, 3, 3, 3], attrmax: [118, 18, 18, 18, 18, 18] };

// C ref: attrib.c init_attr(np=75) — set hero's starting attributes
// Stores result in game.u.acurr and game.u.amax
export function init_attr(np) {
    const g = game;
    const role = g.urole_data || TOURIST_DEFAULT;
    const race = g.urace_data || HUMAN_DEFAULT;
    const attrmin = race.attrmin;
    const attrmax = race.attrmax;

    const attrs = [...role.attrbase];
    let remaining = np;
    for (const v of role.attrbase) remaining -= v;

    remaining = init_attr_role_redist(attrs, attrmax, attrmin, role, remaining);
    init_attr_role_redist(attrs, attrmax, attrmin, role, remaining);

    g.u.acurr = { a: [...attrs] };
    g.u.amax  = { a: [...attrs] };
}

// C ref: attrib.c vary_init_attr() — apply minor random variation to attributes
export function vary_init_attr() {
    const g = game;
    const race = g.urace_data || HUMAN_DEFAULT;
    const attrmin = race.attrmin;
    const attrmax = race.attrmax;
    if (!g.u.acurr) g.u.acurr = { a: [0, 0, 0, 0, 0, 0] };
    if (!g.u.amax)  g.u.amax  = { a: [...g.u.acurr.a] };
    const attrs = g.u.acurr.a;

    for (let i = 0; i < 6; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2;
            attrs[i] = Math.max(attrmin[i], Math.min(attrmax[i], attrs[i] + xd));
            if (attrs[i] < g.u.amax.a[i])
                g.u.amax.a[i] = attrs[i];
        }
    }
}
