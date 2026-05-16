// dungeon.js — Port of dungeon.c init_dungeons().
// C ref: dungeon.c init_dungeons(), init_dungeon_dungeons(), init_level(),
//        place_level(), parent_dlevel(), init_castle_tune()

import { rn2 } from './rng.js';
import { game } from './gstate.js';

// ─── Dungeon data from dungeon.lua (hardcoded) ───────────────────────────────
// Fields: name, base, range, chance, entry, unconnected, levels[], branches[]
// level fields: name, base, range, chance, chain (name or null)
// branch fields: name, base, range, up, chain (name or null), type
const DUNGEON_LUA = [
    {
        name: 'The Dungeons of Doom',
        base: 25, range: 5, chance: 100, entry: 0, unconnected: false,
        levels: [
            { name: 'rogue',   base: 15, range: 4, chance: 100, chain: null },
            { name: 'oracle',  base:  5, range: 5, chance: 100, chain: null },
            { name: 'bigrm',   base: 10, range: 3, chance:  40, chain: null },
            { name: 'medusa',  base: -5, range: 4, chance: 100, chain: null },
            { name: 'castle',  base: -1, range: 0, chance: 100, chain: null },
        ],
        branches: [
            { name: 'The Gnomish Mines',    base:  2, range: 3, up: false, chain: null,     type: 'stair'   },
            { name: 'Sokoban',              base:  1, range: 0, up: true,  chain: 'oracle',  type: 'stair'   },
            { name: 'The Quest',            base:  6, range: 2, up: false, chain: 'oracle',  type: 'portal'  },
            { name: 'Fort Ludios',          base: 18, range: 4, up: false, chain: null,      type: 'portal'  },
            { name: 'Gehennom',             base:  0, range: 0, up: false, chain: 'castle',  type: 'no_down' },
            { name: 'The Elemental Planes', base:  1, range: 0, up: true,  chain: null,      type: 'no_down' },
        ],
    },
    {
        name: 'Gehennom',
        base: 20, range: 5, chance: 100, entry: 0, unconnected: false,
        levels: [
            { name: 'valley',   base:  1, range: 0, chance: 100, chain: null      },
            { name: 'sanctum',  base: -1, range: 0, chance: 100, chain: null      },
            { name: 'juiblex',  base:  4, range: 4, chance: 100, chain: null      },
            { name: 'baalz',    base:  6, range: 4, chance: 100, chain: null      },
            { name: 'asmodeus', base:  2, range: 6, chance: 100, chain: null      },
            { name: 'wizard1',  base: 11, range: 6, chance: 100, chain: null      },
            { name: 'wizard2',  base:  1, range: 0, chance: 100, chain: 'wizard1' },
            { name: 'wizard3',  base:  2, range: 0, chance: 100, chain: 'wizard1' },
            { name: 'orcus',    base: 10, range: 6, chance: 100, chain: null      },
            { name: 'fakewiz1', base: -6, range: 4, chance: 100, chain: null      },
            { name: 'fakewiz2', base: -6, range: 4, chance: 100, chain: null      },
        ],
        branches: [
            { name: "Vlad's Tower", base: 9, range: 5, up: true, chain: null, type: 'stair' },
        ],
    },
    {
        name: 'The Gnomish Mines',
        base: 8, range: 2, chance: 100, entry: 0, unconnected: false,
        levels: [
            { name: 'minetn', base:  3, range: 2, chance: 100, chain: null },
            { name: 'minend', base: -1, range: 0, chance: 100, chain: null },
        ],
        branches: [],
    },
    {
        name: 'The Quest',
        base: 5, range: 2, chance: 100, entry: 0, unconnected: false,
        levels: [
            { name: 'x-strt', base:  1, range: 1, chance: 100, chain: null },
            { name: 'x-loca', base:  3, range: 1, chance: 100, chain: null },
            { name: 'x-goal', base: -1, range: 0, chance: 100, chain: null },
        ],
        branches: [],
    },
    {
        name: 'Sokoban',
        base: 4, range: 0, chance: 100, entry: -1, unconnected: false,
        levels: [
            { name: 'soko1', base: 1, range: 0, chance: 100, chain: null },
            { name: 'soko2', base: 2, range: 0, chance: 100, chain: null },
            { name: 'soko3', base: 3, range: 0, chance: 100, chain: null },
            { name: 'soko4', base: 4, range: 0, chance: 100, chain: null },
        ],
        branches: [],
    },
    {
        name: 'Fort Ludios',
        base: 1, range: 0, chance: 100, entry: 0, unconnected: false,
        levels: [
            { name: 'knox', base: -1, range: 0, chance: 100, chain: null },
        ],
        branches: [],
    },
    {
        name: "Vlad's Tower",
        base: 3, range: 0, chance: 100, entry: -1, unconnected: false,
        levels: [
            { name: 'tower1', base: 1, range: 0, chance: 100, chain: null },
            { name: 'tower2', base: 2, range: 0, chance: 100, chain: null },
            { name: 'tower3', base: 3, range: 0, chance: 100, chain: null },
        ],
        branches: [],
    },
    {
        name: 'The Elemental Planes',
        base: 6, range: 0, chance: 100, entry: -2, unconnected: false,
        levels: [
            { name: 'astral', base: 1, range: 0, chance: 100, chain: null },
            { name: 'water',  base: 2, range: 0, chance: 100, chain: null },
            { name: 'fire',   base: 3, range: 0, chance: 100, chain: null },
            { name: 'air',    base: 4, range: 0, chance: 100, chain: null },
            { name: 'earth',  base: 5, range: 0, chance: 100, chain: null },
            { name: 'dummy',  base: 6, range: 0, chance: 100, chain: null },
        ],
        branches: [],
    },
    {
        name: 'The Tutorial',
        base: 2, range: 0, chance: 100, entry: 0, unconnected: true,
        levels: [
            { name: 'tut-1', base: 1, range: 0, chance: 100, chain: null },
            { name: 'tut-2', base: 2, range: 0, chance: 100, chain: null },
        ],
        branches: [],
    },
];

// ─── Algorithmic helpers ──────────────────────────────────────────────────────

// C ref: dungeon.c level_range()
// Returns {count, base} — count of valid positions and the adjusted base level.
function level_range(dnum, base, randc, chainIdx, finalLevs, numDunlevs) {
    const lmax = numDunlevs[dnum];
    if (chainIdx >= 0) {
        const fl = finalLevs[chainIdx];
        base = (fl ? fl.dlevel : 0) + base;
    } else if (base < 0) {
        base = lmax + base + 1;
    }
    if (base < 1) base = 1;
    if (base > lmax) base = lmax;
    if (randc === -1) return { count: lmax - base + 1, base };
    if (randc > 0)   return { count: Math.min(randc, lmax - base + 1), base };
    return { count: 1, base };
}

// C ref: dungeon.c pick_level() — nth TRUE entry in map[1..n]
function pick_level(map, nth) {
    for (let i = 1; i < map.length; i++)
        if (map[i] && !nth--) return i;
    throw new Error('pick_level: exhausted');
}

// C ref: dungeon.c possible_places()
// Returns {map, count} — boolean[] and number of valid positions.
function possible_places(dnum, allTmpLevs, protoIdx, startIdx, finalLevs, numDunlevs) {
    const lmax = numDunlevs[dnum];
    const map = new Array(lmax + 1).fill(false);
    const tl = allTmpLevs[protoIdx];
    const { count, base } = level_range(dnum, tl.base, tl.range, tl.chainIdx, finalLevs, numDunlevs);
    for (let i = 0; i < count; i++) {
        const lvl = base + i;
        if (lvl >= 1 && lvl <= lmax) map[lvl] = true;
    }
    let remaining = count;
    for (let i = startIdx; i < protoIdx; i++) {
        const fl = finalLevs[i];
        if (fl && fl.dlevel >= 1 && fl.dlevel <= lmax && map[fl.dlevel]) {
            map[fl.dlevel] = false;
            remaining--;
        }
    }
    return { map, count: remaining };
}

// C ref: dungeon.c place_level() — recursive backtracking placement
function place_level_rec(protoIdx, nLevs, dnum, allTmpLevs, startIdx, finalLevs, numDunlevs) {
    if (protoIdx === nLevs) return true;
    const fl = finalLevs[protoIdx];
    if (!fl) return place_level_rec(protoIdx + 1, nLevs, dnum, allTmpLevs, startIdx, finalLevs, numDunlevs);
    const { map, count } = possible_places(dnum, allTmpLevs, protoIdx, startIdx, finalLevs, numDunlevs);
    for (let n = count; n > 0; n--) {
        fl.dlevel = pick_level(map, rn2(n));
        if (place_level_rec(protoIdx + 1, nLevs, dnum, allTmpLevs, startIdx, finalLevs, numDunlevs))
            return true;
        map[fl.dlevel] = false;
    }
    return false;
}

// C ref: dungeon.c parent_dlevel()
// Consumes rn2(num) to find the parent dungeon level for the branch entry.
function parent_dlevel_fn(branchDef, parentDnum, numDunlevs, placedBranches, finalLevs) {
    const { count: num, base } = level_range(parentDnum, branchDef.base, branchDef.range,
                                              branchDef.chainIdx, finalLevs, numDunlevs);
    let j = rn2(num);
    let i = j;
    do {
        if (++i >= num) i = 0;
        let conflict = false;
        for (const br of placedBranches) {
            if ((br.end1.dnum === parentDnum && br.end1.dlevel === base + i) ||
                (br.end2.dnum === parentDnum && br.end2.dlevel === base + i)) {
                conflict = true;
                break;
            }
        }
        if (!conflict) break;
    } while (i !== j);
    return base + i;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

// C ref: dungeon.c init_dungeons()
// wizardMode: if true, skip all rn2(100) chance checks (debug/wizard play).
export function initDungeons(wizardMode) {
    // Build flat level-prototype array with chain names resolved to global indices.
    const allTmpLevs = [];
    const finalLevs  = [];  // null = not created; {name, dlevel} = created+placed
    const nameToIdx  = new Map();

    // Pre-pass: resolve chain names → global indices for all dungeons.
    const preparedDgns = DUNGEON_LUA.map(dgn => {
        const startIdx = allTmpLevs.length;
        for (const lev of dgn.levels) {
            const chainIdx = lev.chain != null ? (nameToIdx.get(lev.chain) ?? -1) : -1;
            allTmpLevs.push({ ...lev, chainIdx });
            finalLevs.push(null);
            nameToIdx.set(lev.name, allTmpLevs.length - 1);
        }
        return {
            ...dgn,
            startIdx,
            endIdx: allTmpLevs.length,
            resolvedBranches: dgn.branches.map(br => ({
                ...br,
                chainIdx: br.chain != null ? (nameToIdx.get(br.chain) ?? -1) : -1,
            })),
        };
    });

    const numDunlevs    = new Array(DUNGEON_LUA.length).fill(0);
    const placedBranches = [];  // branches added as each child dungeon is processed

    for (let dngidx = 0; dngidx < preparedDgns.length; dngidx++) {
        const dgn = preparedDgns[dngidx];

        // ── Chance check (C ref: dungeon.c:1022) ──
        // All dungeon.lua dungeons have chance=100, so they're never skipped,
        // but rn2(100) is still consumed in non-wizard mode.
        if (!wizardMode && dgn.chance) {
            if (dgn.chance <= rn2(100)) continue;   // dungeon skipped (never happens for chance=100)
        }

        // ── Level count (C ref: dungeon.c:1074) ──
        numDunlevs[dngidx] = dgn.range > 0 ? rn2(dgn.range) + dgn.base : dgn.base;

        // ── Entry level ──
        let entryLev = 1;
        if (dgn.entry < 0)      entryLev = Math.max(1, numDunlevs[dngidx] + dgn.entry + 1);
        else if (dgn.entry > 0) entryLev = Math.min(dgn.entry, numDunlevs[dngidx]);

        // ── Parent connection: parent_dlevel → add_branch (C ref: dungeon.c:966) ──
        if (dngidx > 0 && !dgn.unconnected) {
            let parentDnum = -1;
            let branchDef  = null;
            for (let pi = 0; pi < dngidx; pi++) {
                const pb = preparedDgns[pi].resolvedBranches.find(b => b.name === dgn.name);
                if (pb) { parentDnum = pi; branchDef = pb; break; }
            }
            if (parentDnum >= 0 && branchDef) {
                const parentLvl = parent_dlevel_fn(branchDef, parentDnum, numDunlevs,
                                                   placedBranches, finalLevs);
                placedBranches.push({
                    end1:     { dnum: parentDnum, dlevel: parentLvl },
                    end2:     { dnum: dngidx,     dlevel: entryLev  },
                    end1_up:  !!branchDef.up,
                    type:     branchDef.type,
                });
            }
        }

        // ── init_level for each special level (C ref: dungeon.c:572) ──
        for (let li = dgn.startIdx; li < dgn.endIdx; li++) {
            const tl = allTmpLevs[li];
            if (!wizardMode) {
                const r = rn2(100);
                if (tl.chance <= r) { finalLevs[li] = null; continue; }
            }
            finalLevs[li] = { name: tl.name, dlevel: 0 };
        }

        // ── place_level (C ref: dungeon.c:687) ──
        place_level_rec(dgn.startIdx, dgn.endIdx, dngidx, allTmpLevs,
                        dgn.startIdx, finalLevs, numDunlevs);
    }

    // ── init_castle_tune (C ref: dungeon.c:1116) ──
    const tune = [];
    for (let i = 0; i < 5; i++) tune.push(String.fromCharCode(65 + rn2(7)));
    game.castleTune = tune.join('');

    // ── Write results to game state ──
    game.dungeons = preparedDgns.map((dgn, i) => ({
        dname:       dgn.name,
        depth_start: i === 0 ? 1 : 1,   // simplified; depth_start for non-Doom requires branch calc
        num_dunlevs: numDunlevs[i],
    }));
    game.branches = placedBranches;
}
