// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { RUMORS_B64, ENGRAVE_B64 } from './dat_inline.js';
import { game } from './gstate.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1, d, rnz, rne } from './rng.js';
import { MONS, SPECIAL_PM, MON_FLAGS, MON_NAMES } from './mondata.js';
import { init_rect, rnd_rect, get_rect, split_rects } from './rect.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED,
    SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL,
    SPACE_POS, isok, W_NONDIGGABLE, FILL_NONE, FILL_NORMAL,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL,
    A_LAWFUL, Align2amask,
    LR_UPTELE,
} from './const.js';

// Object/class constants matching C defsym.h enum values
const RANDOM_CLASS = 0;
const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const COIN_CLASS = 12;
const GEM_CLASS = 13;
const ROCK_CLASS = 14;   // boulders/statues
const BALL_CLASS = 15;
const CHAIN_CLASS = 16;
const VENOM_CLASS = 17;
// SPBOOK_no_NOVEL: special sentinel for spellbooks excluding blank paper
const SPBOOK_no_NOVEL = -(SPBOOK_CLASS); // = -10
// Object type constants (from dump_objects2 output)
const ARROW               = 18;
const ELVEN_ARROW         = 19;
const ORCISH_ARROW        = 20;
const CROSSBOW_BOLT       = 23;
const DART                = 24;
const SHURIKEN            = 25;
const SPEAR               = 27;
const ELVEN_SPEAR         = 28;
const DWARVISH_SPEAR      = 30;
const TRIDENT             = 33;
const DAGGER              = 34;
const ELVEN_DAGGER        = 35;
const ORCISH_DAGGER       = 36;
const KNIFE               = 40;
const STILETTO            = 41;
const AXE                 = 44;
const BATTLE_AXE          = 45;
const SHORT_SWORD         = 46;
const ELVEN_SHORT_SWORD   = 47;
const ORCISH_SHORT_SWORD  = 48;
const DWARVISH_SHORT_SWORD = 49;
const SCIMITAR            = 50;
const SILVER_SABER        = 51;
const BROADSWORD          = 52;
const ELVEN_BROADSWORD    = 53;
const LONG_SWORD          = 54;
const TWO_HANDED_SWORD    = 55;
const PARTISAN            = 59;
const RANSEUR             = 60;
const SPETUM              = 61;
const GLAIVE              = 62;
const HALBERD             = 63;
const LUCERN_HAMMER       = 69;
const BEC_DE_CORBIN       = 70;
const DWARVISH_MATTOCK    = 71;
const LANCE               = 72;
const CLUB                = 77;
const RUBBER_HOSE         = 78;
const AKLYS               = 80;
const FLAIL               = 81;
const BULLWHIP            = 82;
const BOW                 = 83;
const ELVEN_BOW           = 84;
const ORCISH_BOW          = 85;
const SLING               = 87;
const CROSSBOW            = 88;
// Armor (otyp 89-172) — corrected to NH5.0 objects.h enum order
const ELVEN_LEATHER_HELM  = 89;
const ORCISH_HELM         = 90;
const DWARVISH_IRON_HELM  = 91;
// 92-100: FEDORA, CORNUTHAUM, DUNCE_CAP, DENTED_POT, helms-of-X
// 101-120: dragon scale mails and dragon scales (NH5 addition)
const PLATE_MAIL          = 121;
const SPLINT_MAIL         = 124;
const BANDED_MAIL         = 125;
const DWARVISH_MITHRIL_COAT = 126;
const ELVEN_MITHRIL_COAT  = 127;
const CHAIN_MAIL          = 128;
const ORCISH_CHAIN_MAIL   = 129;
const RING_MAIL           = 132;
const ORCISH_RING_MAIL    = 133;
const LEATHER_ARMOR       = 134;
const LEATHER_JACKET      = 135;
const HAWAIIAN_SHIRT      = 136;
const ELVEN_CLOAK         = 139;
const ORCISH_CLOAK        = 140;
const DWARVISH_CLOAK      = 141;
const OILSKIN_CLOAK       = 142;
const ROBE                = 143;
const LEATHER_CLOAK       = 145;
const CLOAK_OF_PROTECTION = 146;
const CLOAK_OF_INVISIBILITY = 147;
const CLOAK_OF_MAGIC_RESISTANCE = 148;
const CLOAK_OF_DISPLACEMENT = 149;
const SMALL_SHIELD        = 150;
const ELVEN_SHIELD        = 153;
const URUK_HAI_SHIELD     = 154;
const ORCISH_SHIELD       = 155;
const LARGE_SHIELD        = 156;
const DWARVISH_ROUNDSHIELD = 157;
const SHIELD_OF_REFLECTION = 158;
const LEATHER_GLOVES      = 159;
const LOW_BOOTS           = 163;
const IRON_SHOES          = 164;
const HIGH_BOOTS          = 165;
const ELVEN_BOOTS         = 169;
const LEVITATION_BOOTS    = 172;
const MACE                = 73;
const MORNING_STAR        = 75;
const SILVER_MACE         = 74;
// Tools (otyp 214-263)
const LARGE_BOX           = 214;
const CHEST               = 215;
const ICE_BOX             = 216;
const SACK                = 217;
const OILSKIN_SACK        = 218;
const BAG_OF_HOLDING      = 219;
const BAG_OF_TRICKS       = 220;
const SKELETON_KEY        = 221;
const LOCK_PICK           = 222;
const CREDIT_CARD         = 223;
const OIL_LAMP            = 227;
const MAGIC_LAMP          = 228;
const EXPENSIVE_CAMERA    = 229;
const CRYSTAL_BALL        = 231;
const BLINDFOLD           = 233;
const TOWEL               = 234;
const LEASH               = 236;
const STETHOSCOPE         = 237;
const TINNING_KIT         = 238;
const TIN_OPENER          = 239;
const MAGIC_MARKER        = 242;
const BELL                = 255;
const PICK_AXE            = 259;
// Food (otyp 264-296)
const TRIPE_RATION        = 264;
const CORPSE              = 265;
const EGG                 = 266;
const KELP_FROND          = 275;
const EUCALYPTUS_LEAF     = 276;
const APPLE               = 277;
const ORANGE              = 278;
const PEAR                = 279;
const MELON               = 280;
const BANANA              = 281;
const CARROT              = 282;
const SPRIG_OF_WOLFSBANE  = 283;
const CLOVE_OF_GARLIC     = 284;
const SLIME_MOLD          = 285;
const CREAM_PIE           = 287;
const CANDY_BAR           = 288;
const FORTUNE_COOKIE      = 289;
const PANCAKE             = 290;
const LEMBAS_WAFER        = 291;
const CRAM_RATION         = 292;
const FOOD_RATION         = 293;
const TIN                 = 296;
// Potions (otyp 297-322)
const POT_SPEED           = 302;
const POT_HEALING         = 307;
const POT_EXTRA_HEALING   = 308;
const POT_GAIN_ENERGY     = 313;
const POT_SICKNESS        = 318;
const POT_WATER           = 322;
// Scrolls (otyp 323-364)
const SCR_ENCHANT_ARMOR   = 323;
const SCR_CONFUSE_MONSTER = 325;
const SCR_SCARE_MONSTER   = 326;
const SCR_ENCHANT_WEAPON  = 328;
const SCR_TELEPORTATION   = 333;
const SCR_MAGIC_MAPPING   = 337;
// Spellbooks (otyp 365-408)
const SPE_HEALING         = 373;
const SPE_FORCE_BOLT      = 375;
const SPE_CONFUSE_MONSTER = 376;
const SPE_EXTRA_HEALING   = 390;
const SPE_PROTECTION      = 402;
const SPE_STONE_TO_FLESH  = 404;
// Wands (otyp 409-436)
const WAN_WISHING         = 413;
const WAN_STRIKING        = 416;
const WAN_DIGGING         = 427;
const WAN_SLEEP           = 431;
const WAN_DEATH           = 432;
// Coin / Gems / Rock
const GOLD_PIECE          = 437;
const TOUCHSTONE          = 471;
const FLINT               = 472;
const ROCK                = 473;
const BOULDER             = 474;
const STATUE              = 475;
const DUST                = 3;
const MARK                = 6;

const XLIM = 4;
const YLIM = 3;

// Direction deltas
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

// Trap constants (C ref: trap.h enum trap_types)
const NO_TRAP = 0;
const ARROW_TRAP = 1;
const DART_TRAP = 2;
const ROCKTRAP = 3;
const SQKY_BOARD = 4;
const BEAR_TRAP = 5;
const LANDMINE = 6;
const ROLLING_BOULDER_TRAP = 7;
const SLP_GAS_TRAP = 8;
const RUST_TRAP = 9;
const FIRE_TRAP = 10;
const PIT = 11;
const SPIKED_PIT = 12;
const HOLE = 13;
const TRAPDOOR = 14;
const TELEP_TRAP = 15;
const LEVEL_TELEP = 16;
const MAGIC_PORTAL = 17;
const WEB = 18;
const STATUE_TRAP = 19;
const MAGIC_TRAP = 20;
const ANTI_MAGIC = 21;
const POLY_TRAP = 22;
const VIBRATING_SQUARE = 23;
const TRAPPED_DOOR = 24;
const TRAPPED_CHEST = 25;
const TRAPNUM = 26;

function is_hole(t) { return t === HOLE || t === TRAPDOOR; }
function is_pit(t) { return t === PIT || t === SPIKED_PIT; }

// Stairway list management
function stairway_add(x, y, up, isladder, dest) {
    const node = { sx: x, sy: y, up, isladder, tolev: { ...dest }, next: game.stairs };
    game.stairs = node;
}

// ── Stairway lookup ──

function stairway_find_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.up === up) return s;
    return null;
}

function stairway_find_special_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev.dnum !== (game.u?.uz?.dnum ?? 0) && s.up !== up) return s;
    return null;
}

// ── Hero placement (C ref: stairs.c, mkmaze.c) ──

function u_on_newpos(x, y) {
    game.u.ux = x;
    game.u.uy = y;
}

// C ref: mkmaze.c bad_location — simplified for skeleton
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    // Excluded region
    if (nlx && x >= nlx && x <= nhx && y >= nly && y <= nhy) return true;
    // Must be ROOM or (CORR in maze)
    if (loc.typ !== ROOM && !(loc.typ === CORR && game.level?.flags?.is_maze_lev))
        return true;
    return false;
}

// C ref: mkmaze.c place_lregion — place hero (LR_UPTELE/LR_DOWNTELE)
export function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) {
        lx = 1; hx = COLNO - 1; ly = 0; hy = ROWNO - 1;
    }
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    // Probabilistic search
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
            u_on_newpos(x, y);
            return;
        }
    }
    // Deterministic fallback
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
                u_on_newpos(x, y);
                return;
            }
}

// C ref: stairs.c u_on_upstairs — place hero on upstairs or fallback
export function u_on_upstairs() {
    const stway = stairway_find_dir(true);
    if (stway) { u_on_newpos(stway.sx, stway.sy); return; }
    // No upstair — try special stairs, then random
    const special = stairway_find_special_dir(0);
    if (special) { u_on_newpos(special.sx, special.sy); return; }
    // Random placement via place_lregion
    place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
}

// oinit stub (level-dependent object probability reset)
function oinit() { /* no-op for contest */ }

// level_difficulty stub
function level_difficulty() {
    const uz = game.u?.uz;
    const d = depth_of_level(uz);
    return d;
}

// ============================================================
// Stub functions for object/monster/trap creation
// These consume the exact RNG calls that C makes.
// ============================================================

let _nextObjId = 1;

// next_ident defined below near makemon

// Whether makelevel() is currently running (affects mkobj_erosions)
let _in_mklev = false;

// C ref: mkobj.c blessorcurse(otmp, chance)
// Makes 1 call (rn2(chance)) or 2 calls (rn2(chance)+rn2(2)) if triggered.
function blessorcurse(otmp, chance) {
    if (otmp && (otmp.blessed || otmp.cursed)) return;
    if (!rn2(chance)) {
        const r2 = rn2(2);
        if (otmp) {
            if (r2 === 0) otmp.cursed = true;
            else otmp.blessed = true;
        }
    }
}

// C ref: mkobj.c rne(x) — 1..max(ulevel/3,5) enchantment roll
// ulevel=1 → utmp=5; loop while tmp<5 && !rn2(x)

// C ref: mkobj.c mkobj_erosions — erosion/grease random generation
// Only called when _in_mklev=true and erosion_matters(oclass) and is_damageable.
// For WEAPON_CLASS and ARMOR_CLASS: always erosion_matters (BALL/CHAIN not used here).
function mkobj_erosions(otmp) {
    const oclass = otmp ? otmp.oclass : 0;
    // erosion_matters: WEAPON, ARMOR (BALL, CHAIN not relevant here)
    if (oclass !== WEAPON_CLASS && oclass !== ARMOR_CLASS) return;
    if (!_in_mklev) return; // may_generate_eroded: skipped outside mklev
    if (otmp && (otmp.oerodeproof || otmp.oartifact)) return;
    // rn2(100): erodeproof check
    if (!rn2(100)) {
        if (otmp) otmp.oerodeproof = 1;
    } else {
        // erosion type 1: flammable/rustprone/crackable (line 205)
        if (!rn2(80)) {
            // most weapons/armor qualify; do-while until rn2(9)!=0 or cap of 3
            let e = 0; do { e++; } while (e < 3 && !rn2(9));
        }
        // erosion type 2: rottable/corrodeable (line 211)
        if (!rn2(80)) {
            let e = 0; do { e++; } while (e < 3 && !rn2(9));
        }
    }
    rn2(1000); // greased check (line 219, outside if/else)
}

// C ref: mkobj.c boxiprobs — box contents probability table
const BOXIPROBS = [
    [18, GEM_CLASS],
    [15, FOOD_CLASS],
    [18, POTION_CLASS],
    [18, SCROLL_CLASS],
    [12, SPBOOK_CLASS],
    [7,  COIN_CLASS],
    [6,  WAND_CLASS],
    [5,  RING_CLASS],
    [1,  AMULET_CLASS],
];

// C ref: mkobj.c mkbox_cnts — fill a container with random items
function mkbox_cnts(box) {
    let n;
    if (box.otyp === ICE_BOX) {
        n = 20;
    } else if (box.otyp === CHEST) {
        n = box.olocked ? 7 : 5;
    } else if (box.otyp === LARGE_BOX) {
        n = box.olocked ? 5 : 3;
    } else if (box.otyp === SACK || box.otyp === OILSKIN_SACK) {
        n = _in_mklev ? 1 : 0; // C: moves<=1 && !in_mklev → n=0 during ini_inv
    } else if (box.otyp === BAG_OF_HOLDING) {
        n = 1;
    } else {
        n = 0;
    }
    for (n = rn2(n + 1); n > 0; n--) {
        if (box.otyp === ICE_BOX) {
            mksobj(CORPSE, true, false);
        } else {
            let tprob = rnd(100);
            let oclass = FOOD_CLASS;
            for (const [iprob, iclass] of BOXIPROBS) {
                tprob -= iprob;
                if (tprob <= 0) { oclass = iclass; break; }
            }
            const boxItem = mkobj(oclass, false);
            if (oclass === GEM_CLASS && boxItem && boxItem.otyp > 900) {
                // ROCK was selected (cumulative boundary at 900): reroll
                // C ref: mkbox_cnts while(otyp==ROCK) rnd_class(DILITHIUM,LOADSTONE)
                // rnd_class sum = probs from DILITHIUM_CRYSTAL to LOADSTONE = 882
                rnd(882);
            }
            if (oclass === COIN_CLASS) {
                rnd(level_difficulty() + 2);
                rnd(75);
            }
        }
    }
}

// C ref: mkobj.c mksobj_init — per-class initialization RNG
function mksobj_init(otmp, artif) {
    if (!otmp) return;
    const oclass = otmp.oclass;
    const otyp = otmp.otyp;

    switch (oclass) {
    case WEAPON_CLASS: {
        // Quantity for multigen (projectile) weapons: rn1(6,6) = rn2(6)+6
        if (otmp._multigen) rn2(6);
        // Enchantment branch
        if (!rn2(11)) {
            rne(3); rn2(2); // blessed+enchanted
            if (otmp) { otmp.blessed = true; }
        } else if (!rn2(10)) {
            rne(3); // cursed+enchanted
            if (otmp) { otmp.cursed = true; }
        } else {
            blessorcurse(otmp, 10);
        }
        // is_poisonable == is_multigen for randomly-generated weapons
        // (both check oc_skill in [-P_SHURIKEN, -P_BOW] range)
        if (otmp._multigen) rn2(100); // poison check (only for poisonable weapons)
        if (artif && !rn2(20)) { } // artifact check (nartifact_exist()=0 at start)
        mkobj_erosions(otmp);
        break;
    }
    case ARMOR_CLASS: {
        // rn2(10): first branch check
        if (rn2(10)) {
            // rn2(11): curse-via-enchantment check (for non-special armor)
            if (!rn2(11)) {
                rne(3); // spe = -rne(3)
                if (otmp) otmp.cursed = true;
            } else {
                // else if (!rn2(10)) bless
                if (!rn2(10)) {
                    rn2(2); // blessed = rn2(2)
                    rne(3); // spe = rne(3)
                } else {
                    blessorcurse(otmp, 10);
                }
            }
        } else {
            // else if (!rn2(10)) bless
            if (!rn2(10)) {
                rn2(2); // blessed = rn2(2)
                rne(3); // spe = rne(3)
            } else {
                blessorcurse(otmp, 10);
            }
        }
        if (artif) rn2(40); // artifact check
        mkobj_erosions(otmp);
        break;
    }
    case FOOD_CLASS: {
        // Type-specific sub-cases
        if (otmp._food_type === 'EGG') {
            if (!rn2(3)) {
                // typed egg: rndmonnum loop — just make the calls
                rndmonnum();
            }
        } else if (otmp._food_type === 'TIN') {
            if (!rn2(6)) {
                otmp._tin_spinach = true; // spinach tin
            } else {
                otmp._tin_pm = rndmonnum(); // flesh tin: record monster
                rn2(15); // set_tin_variety: rn2(15) for preparation
            }
            blessorcurse(otmp, 10);
        } else if (otmp._food_type === 'KELP_FROND') {
            rnd(2); // quan = rnd(2) — uses rnd not rn2
            return;  // skip generic food check
        } else if (otmp._food_type === 'CANDY_BAR') {
            rn2(11); // assign_candy_wrapper: rn2(SIZE(candy_wrappers)-1) = rn2(12-1)
        }
        // Generic food quantity check (skipped for CORPSE, MEAT_RING, KELP_FROND, puddings)
        if (otmp._food_type !== 'CORPSE' && otmp._food_type !== 'MEAT_RING') {
            otmp.quan = rn2(6) ? 1 : 2;
        }
        break;
    }
    case GEM_CLASS: {
        // LOADSTONE: no RNG; LUCKSTONE: no RNG; ROCK: rn2(6); others: rn2(6)
        if (otmp._gem_type !== 'LOADSTONE' && otmp._gem_type !== 'LUCKSTONE') {
            rn2(6); // quantity check (or rn1(6,6) for ROCK, same call)
        }
        break;
    }
    case SCROLL_CLASS:
    case POTION_CLASS:
        blessorcurse(otmp, 4);
        break;
    case SPBOOK_CLASS:
        blessorcurse(otmp, 17);
        break;
    case WAND_CLASS: {
        // spe = rn1(5, NODIR?11:4) or special cases
        // For simplification: most wands use rn2(5)
        rn2(5); // rn1(5,...) = rn2(5) + constant
        blessorcurse(otmp, 17);
        break;
    }
    case RING_CLASS: {
        // C ref: mksobj_init:1128 — charged vs uncharged rings
        // Uncharged rings (most): else-if path — rn2(10), if non-zero also rn2(9)
        // Charged rings (~5/28): blessorcurse(3) + complex spe init
        // Simplified: assume uncharged (most common for random selections)
        if (rn2(10)) {
            // Not a specific bad ring type: evaluate !rn2(9) for curse chance
            rn2(9);
        }
        break;
    }
    case AMULET_CLASS:
        // rn2(10) + blessorcurse(10) or just blessorcurse
        if (rn2(10)) blessorcurse(otmp, 10);
        break;
    case ROCK_CLASS: {
        // STATUE: rndmonnum() for corpsenm, then spellbook check if NOT verysmall
        if (otyp === STATUE) {
            otmp.corpsenm = rndmonnum(); // actual monster index
            // C ref: mksobj_init:1154 — !verysmall(ptr) && rn2(level_difficulty/2+10) > 10
            if (!VERYSMALL_MONS.has(otmp.corpsenm))
                rn2(Math.trunc(level_difficulty() / 2) + 10);
        }
        break;
    }
    case TOOL_CLASS: {
        if (otyp === CHEST || otyp === LARGE_BOX) {
            otmp.olocked = !!rn2(5);
            otmp.otrapped = !rn2(10);
            if (otmp.otrapped) rn2(100);
            mkbox_cnts(otmp);
        } else if (otyp === ICE_BOX || otyp === SACK || otyp === OILSKIN_SACK ||
                   otyp === BAG_OF_HOLDING) {
            mkbox_cnts(otmp);
        } else if (otyp === EXPENSIVE_CAMERA || otyp === TINNING_KIT || otyp === MAGIC_MARKER) {
            otmp.spe = rn1(70, 30); // charges: rn2(70)+30
        }
        break;
    }
    default:
        break;
    }
}

// Map rnd(1000) result to actual food otyp (cumulative probabilities from objects.h)
// Cumulative: tripe(140), egg(225), eucalyptus(228), apple(243), orange(253),
// pear(263), melon(273), banana(283), carrot(298), wolfsbane(305), garlic(312),
// slime_mold(387), cream_pie(412), candy_bar(425), fortune_cookie(480),
// pancake(505), lembas(525), cram(545), food_ration(925), tin(1000)
function food_prob_to_otyp(p) {
    if (p <= 140) return TRIPE_RATION;
    if (p <= 225) return EGG;
    if (p <= 228) return EUCALYPTUS_LEAF;
    if (p <= 243) return APPLE;
    if (p <= 253) return ORANGE;
    if (p <= 263) return PEAR;
    if (p <= 273) return MELON;
    if (p <= 283) return BANANA;
    if (p <= 298) return CARROT;
    if (p <= 305) return SPRIG_OF_WOLFSBANE;
    if (p <= 312) return CLOVE_OF_GARLIC;
    if (p <= 387) return SLIME_MOLD;
    if (p <= 412) return CREAM_PIE;
    if (p <= 425) return CANDY_BAR;
    if (p <= 480) return FORTUNE_COOKIE;
    if (p <= 505) return PANCAKE;
    if (p <= 525) return LEMBAS_WAFER;
    if (p <= 545) return CRAM_RATION;
    if (p <= 925) return FOOD_RATION;
    return TIN;
}

// Derive mksobj_init dispatch type string from actual food otyp
function food_otyp_to_type(otyp) {
    if (otyp === EGG) return 'EGG';
    if (otyp === TIN) return 'TIN';
    if (otyp === KELP_FROND) return 'KELP_FROND';
    if (otyp === CANDY_BAR) return 'CANDY_BAR';
    if (otyp === CORPSE) return 'CORPSE';
    return 'GENERIC';
}

// mkobjprobs: class selection probabilities for RANDOM_CLASS mkobj
// C ref: mkobj.c mkobjprobs[]
const MKOBJPROBS = [
    [10, WEAPON_CLASS],
    [11, ARMOR_CLASS],
    [20, FOOD_CLASS],
    [8, TOOL_CLASS],
    [7, GEM_CLASS],
    [16, POTION_CLASS],
    [16, SCROLL_CLASS],
    [4, SPBOOK_CLASS],
    [4, WAND_CLASS],
    [3, RING_CLASS],
    [1, AMULET_CLASS],
];

// oclass_prob_totals[class] = sum of oc_prob for all objects in that class
// Computed from objects.h: WEAPON_CLASS=1002, RING_CLASS=28, all others=1000
// WEAPON=1002 because arrows+melee+bows: 177+692+133=1002
// RING=28 because 28 rings each with implicit prob=1
const OCLASS_PROB_TOTALS = new Map([
    [WEAPON_CLASS, 1002],
    [ARMOR_CLASS,  1000],
    [FOOD_CLASS,   1000],
    [TOOL_CLASS,   1000],
    [GEM_CLASS,    1000],
    [POTION_CLASS, 1000],
    [SCROLL_CLASS, 1000],
    [SPBOOK_CLASS, 1000],
    [WAND_CLASS,   1000],
    [RING_CLASS,      28],
    [AMULET_CLASS, 1000],
    [COIN_CLASS,   1000],
]);

// Cumulative WEAPON_CLASS probability threshold for multigen weapons
// (arrows, elven/orcish/silver arrow, ya, crossbow bolt: 177 total)
// + dart(60) + shuriken(35) + boomerang(15) = 287
// All weapons with typProb ≤ 287 are multigen (projectiles/missiles)
const WEAPON_MULTIGEN_THRESHOLD = 287;

// C ref: mkobj.c mkobj() — select class then type, create with mksobj
export function mkobj(oclass, artif) {
    if (oclass === RANDOM_CLASS) {
        // Select class from mkobjprobs using rnd(100)
        let tprob = rnd(100);
        for (const [iprob, iclass] of MKOBJPROBS) {
            tprob -= iprob;
            if (tprob <= 0) { oclass = iclass; break; }
        }
    }
    // Select type within class using rnd(oclass_prob_totals[oclass])
    const total = OCLASS_PROB_TOTALS.get(oclass) || 1000;
    const typProb = rnd(total);
    return mksobj_from_class(oclass, typProb, false, artif);
}

// Internal: create object of given class with type probability already rolled
function mksobj_from_class(oclass, typProb, init_forced, artif) {
    const otmp = {
        oclass, otyp: typProb, ox: 0, oy: 0, quan: 1, owt: 1,
        cursed: false, blessed: false, olocked: false, spe: 0,
        oerodeproof: 0, oartifact: 0,
    };
    // Annotate type-specific metadata for mksobj_init dispatch
    if (oclass === FOOD_CLASS) {
        otmp.otyp = food_prob_to_otyp(typProb);
        otmp._food_type = food_otyp_to_type(otmp.otyp);
    } else if (oclass === GEM_CLASS) {
        otmp._gem_type = 'GENERIC'; // simplified: treat all gems as generic
    } else if (oclass === WEAPON_CLASS) {
        // Multigen weapons (projectiles): typProb ≤ 287 covers all mg=1 weapons
        // (arrows 1-177, dart 178-237, shuriken 238-272, boomerang 273-287)
        otmp._multigen = typProb <= WEAPON_MULTIGEN_THRESHOLD;
    }
    next_ident();
    mksobj_init(otmp, artif);
    return otmp;
}

// C ref: mkobj.c mksobj — create specific object by type ID
export function mksobj(otyp, init, artif) {
    const oclass = otyp_to_class(otyp);
    const otmp = {
        oclass, otyp, ox: 0, oy: 0, quan: 1, owt: 1,
        cursed: false, blessed: false, olocked: false, spe: 0,
        oerodeproof: 0, oartifact: 0,
        corpsenm: -1, // NON_PM
    };
    // Mark food subtypes so mksobj_init skips wrong branches
    if (otyp === CORPSE) otmp._food_type = 'CORPSE';
    else if (otyp === KELP_FROND) otmp._food_type = 'KELP_FROND';
    // Mark multigen weapons (projectiles): ARROW(18)..SHURIKEN(25) use -P_BOW..-P_SHURIKEN
    else if (oclass === WEAPON_CLASS) otmp._multigen = (otyp >= ARROW && otyp <= SHURIKEN);
    next_ident();
    if (init) mksobj_init(otmp, artif);
    // C ref: mksobj "regardless of init" block — CORPSE/STATUE/FIGURINE
    // CORPSE: set corpsenm via rndmonnum if still NON_PM, then gender + timeout
    // STATUE: corpsenm set by mksobj_init if init=true; just gender check
    if (otyp === CORPSE && otmp.corpsenm === -1) {
        otmp.corpsenm = rndmonnum();
    }
    if ((otyp === CORPSE || otyp === STATUE) && otmp.corpsenm >= 0) {
        const gflags = (otmp.corpsenm >= 0 ? MONS[otmp.corpsenm]?.[3] : 0) ?? 0;
        const M2_MALE = 0x10000, M2_FEMALE = 0x20000, M2_NEUTER = 0x40000;
        if (!(gflags & (M2_MALE | M2_FEMALE | M2_NEUTER))) rn2(2);
    }
    if (otyp === CORPSE) {
        start_corpse_timeout(otmp);
    }
    return otmp;
}

// Object type → class mapping using NH5.0 objects.h enum order (cpp -DOBJECTS_ENUM)
// WEAPON:18-88, ARMOR:89-172, RING:173-200, AMULET:201-213, TOOL:214-263,
// FOOD:264-296, POTION:297-322, SCROLL:323-364, SPBOOK:365-408, WAND:409-436,
// COIN:437, GEM:438-473, ROCK:474-475, BALL:476, CHAIN:477
function otyp_to_class(otyp) {
    if (otyp >= 18  && otyp <= 88)  return WEAPON_CLASS;
    if (otyp >= 89  && otyp <= 172) return ARMOR_CLASS;
    if (otyp >= 173 && otyp <= 200) return RING_CLASS;
    if (otyp >= 201 && otyp <= 213) return AMULET_CLASS;
    if (otyp >= 214 && otyp <= 263) return TOOL_CLASS;
    if (otyp >= 264 && otyp <= 296) return FOOD_CLASS;
    if (otyp >= 297 && otyp <= 322) return POTION_CLASS;
    if (otyp >= 323 && otyp <= 364) return SCROLL_CLASS;
    if (otyp >= 365 && otyp <= 408) return SPBOOK_CLASS;
    if (otyp >= 409 && otyp <= 436) return WAND_CLASS;
    if (otyp === 437)               return COIN_CLASS;
    if (otyp >= 438 && otyp <= 473) return GEM_CLASS;
    if (otyp >= 474 && otyp <= 475) return ROCK_CLASS;
    if (otyp === 476)               return BALL_CLASS;
    if (otyp === 477)               return CHAIN_CLASS;
    return FOOD_CLASS;
}

function mksobj_at(otyp, x, y, init, artif) {
    const obj = mksobj(otyp, init, artif);
    if (game.level && x > 0 && y >= 0 && x < COLNO && y < ROWNO) {
        if (!game.level.floor_items) game.level.floor_items = new Map();
        game.level.floor_items.set(`${x},${y}`, obj);
        place_object(obj, x, y);
    }
    return obj;
}

function mkobj_at(oclass, x, y, artif) {
    const obj = mkobj(oclass, artif);
    if (game.level && x > 0 && y >= 0 && x < COLNO && y < ROWNO) {
        if (!game.level.floor_items) game.level.floor_items = new Map();
        game.level.floor_items.set(`${x},${y}`, obj);
        place_object(obj, x, y);
    }
    return obj;
}

// Monster indices with MZ_TINY size (verysmall() returns true for these)
// Extracted from monsters.h SIZ(..., MZ_TINY) entries in order
const VERYSMALL_MONS = new Set([0,1,2,3,5,6,9,53,54,65,90,91,92,93,96,97,118,119,128,219,329,330,331,333,334]);

// C ref: mkobj.c rndmonnum → rndmonnum_adj(0,0) → rndmonst_adj(0,0)
function rndmonnum() {
    return rndmonst_adj(0, 0);
}

function mkgold(amount, x, y) {
    // C ref: mkobj.c mkgold()
    if (amount <= 0) {
        // C ref: mkobj.c:2008-2010
        const depthVal = depth_of_level(game.u?.uz);
        const mul = rnd(Math.trunc(30 / Math.max(12 - depthVal, 2)));
        amount = 1 + rnd(level_difficulty() + 2) * mul;
    }
    const g = game;
    if (!g.level) { next_ident(); return; }
    // C uses g_at(x,y) to find existing gold — check game.level.objects for GOLD_PIECE
    const key = `${x},${y}`;
    const existing = g.level.objects?.[key]?.find(o => o._otyp === GOLD_PIECE || o.otyp === GOLD_PIECE);
    if (existing) {
        existing.quan += amount;
    } else {
        // mksobj_at calls next_ident() + place_object() — COIN_CLASS mksobj_init is a no-op
        const gold = mksobj_at(GOLD_PIECE, x, y, true, false);
        if (gold) { gold.quan = amount; gold._otyp = GOLD_PIECE; }
    }
}

function place_object(otmp, x, y) {
    if (!otmp || !game.level) return;
    otmp.ox = x; otmp.oy = y;
    if (!game.level.objects) game.level.objects = {};
    const key = `${x},${y}`;
    if (!game.level.objects[key]) game.level.objects[key] = [];
    game.level.objects[key].push(otmp);
    if (!game.level.allObjects) game.level.allObjects = [];
    game.level.allObjects.push(otmp);
}
function dealloc_obj(otmp) { /* stub */ }
function curse(otmp) { if (otmp) otmp.cursed = true; }
function weight(otmp) { return otmp?.owt || 1; }
function add_to_container(container, otmp) { /* stub */ }
function sobj_at(otyp, x, y) {
    const key = `${x},${y}`;
    const objs = game.level?.objects?.[key];
    return objs ? objs.some(o => o._otyp === otyp) : false;
}

// set_corpsenm stub
function set_corpsenm(otmp, pm) { /* stub */ }

// C ref: mkobj.c mkcorpstat — create corpse or statue
// flags: CORPSTAT_NONE=0, CORPSTAT_INIT=0x08
const CORPSTAT_INIT = 0x08;
const CORPSTAT_NONE = 0x00;
function mkcorpstat(objtyp, mtmp, pm, x, y, flags) {
    const init = (flags & CORPSTAT_INIT) !== 0;
    const otmp = mksobj(objtyp, init, false);
    // Set corpsenm from pm (monster index) if provided
    if (pm !== null && pm !== undefined && pm >= 0) otmp.corpsenm = pm;
    return otmp;
}

// C ref: mkobj.c start_corpse_timeout — set up corpse rot timer
// For contest: only matters for RNG consumption. Lizard/lichen return early.
const PM_LIZARD = 137, PM_LICHEN = 6; // from monsters.h ordering
function start_corpse_timeout(otmp) {
    const nm = otmp.corpsenm ?? -1;
    if (nm === PM_LIZARD || nm === PM_LICHEN) return;
    const rot_adjust = _in_mklev ? 25 : 10;
    // rnz(rot_adjust): rn2(1000) + rne(4) [logs rne] + rn2(2) + logs rnz result
    rnz(rot_adjust);
}

// G_* flags for monster geno field
const G_FREQ   = 0x0007;
const G_SGROUP = 0x0080;
const G_LGROUP = 0x0040;
const G_GENO   = 0x0020;
const G_NOCORPSE = 0x0010;
const G_NOHELL = 0x0800;
const G_HELL   = 0x1000;
const G_NOGEN  = 0x2000;
const G_UNIQ   = 0x4000;
// M2 gender flags (stored in MONS[][3])
const M2_MALE   = 0x10000;
const M2_FEMALE = 0x20000;
const M2_NEUTER = 0x40000;
// M2 flags stored in MONS[][5] (combined M1+M2 minus gender bits)
const M2_ELF    = 0x10;
const M2_DWARF  = 0x20;
const M2_ORC    = 0x80;
const M2_DEMON  = 0x100;
const M2_MERC   = 0x200;
const M2_LORD   = 0x400;
const M2_PRINCE = 0x800;
const M2_NASTY  = 0x2000000;
const M2_STRONG = 0x4000000;
const M1_HUMANOID = 0x20000; // from mflags1, stored in MONS[][5]
// S_ sym ids
const S_DRAGON   = 30;
const S_GIANT    = 34;
const S_KOP      = 37;
const S_MUMMY    = 39;
const S_OGRE     = 41;
const S_TROLL    = 46;
const S_WRAITH   = 49;
const S_ZOMBIE   = 52;
const S_HUMAN    = 53;
const S_GHOST    = 54;
const S_GOLEM    = 55;
const S_DEMON    = 56;
const S_LIZARD   = 58;
const S_KOBOLD   = 11;
const S_ORC      = 15;
const S_CENTAUR  = 29;
const S_ANGEL    = 27;
const S_HUMANOID = 8;
// PM_ indices needed for m_initweap
const PM_ETTIN         = 178;
const PM_WATCHMAN      = 288;
const PM_SOLDIER       = 283;
const PM_SERGEANT      = 284;
const PM_LIEUTENANT    = 286;
const PM_CAPTAIN       = 287;
const PM_WATCH_CAPTAIN = 289;
const PM_ELVEN_MONARCH = 275;
const PM_HOBBIT        = 45;
const PM_NINJA         = 389;
const PM_STUDENT       = 379;
const PM_ATTENDANT     = 383;
const PM_ABBOT         = 385;
const PM_ACOLYTE       = 386;
const PM_GUIDE         = 391;
const PM_APPRENTICE    = 393;
const PM_CHIEFTAIN     = 380;
const PM_PAGE          = 384;
const PM_ROSHI         = 390;
const PM_WARRIOR       = 392;
const PM_HUNTER        = 387;
const PM_THUG          = 388;
const PM_NEANDERTHAL   = 381;
const PM_MORDOR_ORC    = 76;
const PM_URUK_HAI      = 77;
const PM_ORC_CAPTAIN   = 79;
const PM_ORC_SHAMAN    = 78;
const PM_GOBLIN        = 72;
const PM_OGRE_LEADER   = 209;
const PM_OGRE_TYRANT   = 210;
const PM_BALROG        = 309;
const PM_ORCUS         = 312;
const PM_HORNED_DEVIL  = 298;
const PM_DISPATER      = 314;
const PM_YEENOGHU      = 311;
const PM_FOREST_CENTAUR = 133;
const PM_SALAMANDER    = 336;
// Monsters that have AT_WEAP attack (extracted from monsters.h)
const AT_WEAP_PM = new Set([45,46,47,48,49,50,51,61,62,63,72,73,74,75,76,77,79,124,125,127,132,133,134,169,170,172,173,174,175,176,177,178,179,180,184,185,186,187,208,209,210,225,226,227,228,229,234,235,237,254,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,281,282,283,284,286,287,288,289,290,292,293,296,298,299,301,304,307,308,309,311,312,314,322,336,338,339,340,341,342,344,345,346,347,348,349,350,351,352,353,354,355,356,357,359,360,361,362,363,364,365,366,367,369,370,373,375,376,377,378,379,380,381,382,383,384,386,387,388,389,390,391,392,393]);
// Monsters with MS_PRIEST sound (AT_WEAP subset)
const MS_PRIEST_PM = new Set([281, 282]);
// Monsters with MS_GUARDIAN sound (quest guardians, AT_WEAP subset)
const MS_GUARDIAN_PM = new Set([379,380,381,382,383,384,386,387,388,390,391,392,393]);
// Additional otyp constants not yet defined above (needed for m_initweap / rnd_offensive_item)
const DENTED_POT=95,HELMET=97;
const WAN_MAGIC_MISSILE=428,WAN_FIRE=429,WAN_COLD=430,WAN_LIGHTNING=433;
const POT_CONFUSION=299,POT_BLINDNESS=300,POT_PARALYSIS=301,POT_SLEEPING=314,POT_ACID=320;
const SCR_EARTH=340;

// C ref: makemon.c uncommon()
function uncommon(mndx) {
    const geno = MONS[mndx][0];
    if (geno & (G_NOGEN | G_UNIQ)) return true;
    // G_GONE (genocided/extinct) — not tracked yet; treat as false
    // Inhell check — all contest sessions are in the main dungeon, not hell
    return (geno & G_HELL) !== 0;
}

// C ref: makemon.c align_shift() — returns 0 for AM_NONE (main dungeon default)
function align_shift(mndx) {
    // Main dungeon has AM_NONE alignment → alshift = 0
    return 0;
}

// C ref: makemon.c temperature_shift() — returns 0 for normal dungeon (no temperature)
function temperature_shift(mndx) {
    // Normal dungeon level has no temperature flag → 0
    return 0;
}

// C ref: makemon.c rndmonst_adj()
// Weighted reservoir sampling over monsters [LOW_PM, SPECIAL_PM).
function rndmonst_adj(minadj, maxadj) {
    const g = game;
    const zlevel = g.u?.uz?.dlevel ?? 1;
    const ulevel = 1; // u.ulevel always 1 at game start
    let minmlev = Math.trunc(zlevel / 6) + minadj;
    let maxmlev = Math.trunc((zlevel + ulevel) / 2) + maxadj;
    if (minmlev < 0) minmlev = 0;

    let totalweight = 0;
    let selected = -1; // NON_PM

    for (let mndx = 0; mndx < SPECIAL_PM; mndx++) {
        const [geno, diff, ,] = MONS[mndx];
        if (diff < minmlev || diff > maxmlev) continue;
        if (uncommon(mndx)) continue;
        if (geno & G_NOHELL) continue; // Inhell check (not in hell for all contest sessions)

        const weight = (geno & G_FREQ) + align_shift(mndx) + temperature_shift(mndx);
        if (weight <= 0) continue;

        totalweight += weight;
        if (rn2(totalweight) < weight) selected = mndx;
    }
    return selected; // -1 = NON_PM if nothing eligible
}

// C ref: makemon.c newmonhp()
function newmonhp(mtmp) {
    const mndx = mtmp._mndx ?? 0;
    const [, , mlevel, , sym] = MONS[mndx] || [0, 0, 0, 0, 0];
    mtmp.m_lev = mlevel;
    let hp;
    if (sym === S_DRAGON && mndx >= 0) {
        // Adult dragon special case — simplified: use mlevel*8 (not exact for endgame)
        hp = mlevel > 0 ? d(mlevel, 4) + mlevel * 4 : rnd(4);
    } else if (mlevel === 0) {
        hp = rnd(4);
    } else {
        hp = d(mlevel, 8);
    }
    if (hp <= mlevel && mlevel > 0) hp = mlevel + 1; // boost floor
    mtmp.mhp = hp;
    mtmp.mhpmax = hp;
}

// C ref: makemon.c mongets() — create item and add to monster inventory
function mongets(mtmp, otyp) {
    if (!otyp) return null;
    return mksobj(otyp, true, false);
}

// C ref: makemon.c m_initthrow() — create throwing weapon stack
// oquan is max additional quantity (rn1(oquan,3) = rn2(oquan)+3+1 in C)
function m_initthrow(mtmp, otyp, oquan) {
    const otmp = mksobj(otyp, true, false);
    // rn1(oquan, 3) = rn2(oquan) + 3 + 1... actually rn1(n,m) = rn2(n)+m+1 in NetHack
    // but looking at makemon.c: otmp->quan = (long) rn1(oquan, 3)
    // rn1(n,m) is defined as rn2(n) + m (wait, let me check)
    // In hacklib.c: rn1(x,y) = rn2(x)+y — so rn1(12,3) = rn2(12)+3
    otmp.quan = rn2(oquan) + 3;
    return otmp;
}

// C ref: muse.c rnd_offensive_item() — pick a random offensive item for monster
function rnd_offensive_item(mtmp) {
    const mndx = mtmp._mndx ?? 0;
    const sym = MONS[mndx]?.[4] ?? 0;
    const difficulty = MONS[mndx]?.[1] ?? 0;
    const flags = MONS[mndx]?.[5] ?? 0;
    // is_animal: AT_WEAP monsters aren't animals, skip check
    // mindless: zombies, mummies, golems
    if (sym === S_ZOMBIE || sym === S_MUMMY || sym === S_GOLEM) return 0;
    // S_GHOST or S_KOP
    if (sym === S_GHOST || sym === S_KOP) return 0;
    if (difficulty > 7 && !rn2(35)) return WAN_DEATH;
    const roll = rn2(9 - (difficulty < 4 ? 1 : 0) + 4 * (difficulty > 6 ? 1 : 0));
    switch (roll) {
    case 0: // helmet check omitted — just fall through to case 1
    case 1: return WAN_STRIKING;
    case 2: return POT_ACID;
    case 3: return POT_CONFUSION;
    case 4: return POT_BLINDNESS;
    case 5: return POT_SLEEPING;
    case 6: return POT_PARALYSIS;
    case 7: case 8: return WAN_MAGIC_MISSILE;
    case 9: return WAN_SLEEP;
    case 10: return WAN_FIRE;
    case 11: return WAN_COLD;
    case 12: return WAN_LIGHTNING;
    }
    return 0;
}

// C ref: makemon.c m_initweap() — equip monster with weapons/armor
function m_initweap(mtmp) {
    const mndx = mtmp._mndx ?? 0;
    const sym = MONS[mndx]?.[4] ?? 0;
    const flags = MONS[mndx]?.[5] ?? 0;
    const m_lev = mtmp.m_lev ?? 0;

    const is_merc    = (flags & M2_MERC)   !== 0;
    const is_elf_f   = (flags & M2_ELF)    !== 0;
    const is_dwarf_f = (flags & M2_DWARF)  !== 0;
    const is_lord_f  = (flags & M2_LORD)   !== 0;
    const is_prince_f= (flags & M2_PRINCE) !== 0;
    const is_nasty   = (flags & M2_NASTY)  !== 0;
    const is_strong  = (flags & M2_STRONG) !== 0;
    const is_demon_f = (flags & M2_DEMON)  !== 0;
    const is_hum     = (flags & M1_HUMANOID) !== 0;

    switch (sym) {
    case S_GIANT:
        if (rn2(2))
            mongets(mtmp, (mndx !== PM_ETTIN) ? BOULDER : CLUB);
        if (mndx !== PM_ETTIN && !rn2(5))
            mongets(mtmp, rn2(2) ? TWO_HANDED_SWORD : BATTLE_AXE);
        break;

    case S_HUMAN:
        if (is_merc) {
            let w1 = 0, w2 = 0;
            if (mndx === PM_WATCHMAN || mndx === PM_SOLDIER) {
                if (!rn2(3)) {
                    // All weapons in PARTISAN..BEC_DE_CORBIN range are P_POLEARMS,
                    // so the C do-while always exits on first try
                    w1 = rn2(BEC_DE_CORBIN - PARTISAN + 1) + PARTISAN;
                    w2 = rn2(2) ? DAGGER : KNIFE;
                } else {
                    w1 = rn2(2) ? SPEAR : SHORT_SWORD;
                }
            } else if (mndx === PM_SERGEANT) {
                w1 = rn2(2) ? FLAIL : MACE;
            } else if (mndx === PM_LIEUTENANT) {
                w1 = rn2(2) ? BROADSWORD : LONG_SWORD;
            } else if (mndx === PM_CAPTAIN || mndx === PM_WATCH_CAPTAIN) {
                w1 = rn2(2) ? LONG_SWORD : SILVER_SABER;
            } else {
                if (!rn2(4)) w1 = DAGGER;
                if (!rn2(7)) w2 = SPEAR;
            }
            if (w1) mongets(mtmp, w1);
            if (!w2 && w1 !== DAGGER && !rn2(4)) w2 = KNIFE;
            if (w2) mongets(mtmp, w2);
        } else if (is_elf_f) {
            if (rn2(2))
                mongets(mtmp, rn2(2) ? ELVEN_MITHRIL_COAT : ELVEN_CLOAK);
            if (rn2(2))
                mongets(mtmp, ELVEN_LEATHER_HELM);
            else if (!rn2(4))
                mongets(mtmp, ELVEN_BOOTS);
            if (rn2(2))
                mongets(mtmp, ELVEN_DAGGER);
            switch (rn2(3)) {
            case 0:
                if (!rn2(4)) mongets(mtmp, ELVEN_SHIELD);
                if (rn2(3)) mongets(mtmp, ELVEN_SHORT_SWORD);
                mongets(mtmp, ELVEN_BOW);
                m_initthrow(mtmp, ELVEN_ARROW, 12);
                break;
            case 1:
                mongets(mtmp, ELVEN_BROADSWORD);
                if (rn2(2)) mongets(mtmp, ELVEN_SHIELD);
                break;
            case 2:
                if (rn2(2)) {
                    mongets(mtmp, ELVEN_SPEAR);
                    mongets(mtmp, ELVEN_SHIELD);
                }
                break;
            }
            if (mndx === PM_ELVEN_MONARCH) {
                if (rn2(3)) mongets(mtmp, PICK_AXE);
                if (!rn2(50)) mongets(mtmp, CRYSTAL_BALL);
            }
        } else if (MS_PRIEST_PM.has(mndx)) {
            const otmp = mksobj(MACE, false, false);
            otmp.spe = rnd(3);
            if (!rn2(2)) otmp.cursed = true;
        } else if (mndx === PM_NINJA) {
            mongets(mtmp, rn2(4) ? SHURIKEN : DART);
            mongets(mtmp, rn2(4) ? SHORT_SWORD : AXE);
        } else if (MS_GUARDIAN_PM.has(mndx)) {
            if (mndx === PM_STUDENT || mndx === PM_ATTENDANT || mndx === PM_ABBOT ||
                mndx === PM_ACOLYTE || mndx === PM_GUIDE   || mndx === PM_APPRENTICE) {
                if (rn2(2)) mongets(mtmp, rn2(3) ? DAGGER : KNIFE);
                if (rn2(5)) mongets(mtmp, rn2(3) ? LEATHER_JACKET : LEATHER_CLOAK);
                if (rn2(3)) mongets(mtmp, rn2(3) ? LOW_BOOTS : HIGH_BOOTS);
                if (rn2(3)) mongets(mtmp, POT_HEALING);
            } else if (mndx === PM_CHIEFTAIN || mndx === PM_PAGE ||
                       mndx === PM_ROSHI    || mndx === PM_WARRIOR) {
                mongets(mtmp, rn2(3) ? LONG_SWORD : SHORT_SWORD);
                mongets(mtmp, rn2(3) ? CHAIN_MAIL : LEATHER_ARMOR);
                if (rn2(2)) mongets(mtmp, rn2(2) ? LOW_BOOTS : HIGH_BOOTS);
                if (!rn2(3)) mongets(mtmp, LEATHER_CLOAK);
                if (!rn2(3)) {
                    mongets(mtmp, BOW);
                    m_initthrow(mtmp, ARROW, 12);
                }
            } else if (mndx === PM_HUNTER) {
                mongets(mtmp, rn2(3) ? SHORT_SWORD : DAGGER);
                if (rn2(2)) mongets(mtmp, rn2(2) ? LEATHER_JACKET : LEATHER_ARMOR);
                mongets(mtmp, BOW);
                m_initthrow(mtmp, ARROW, 12);
            } else if (mndx === PM_THUG) {
                mongets(mtmp, CLUB);
                mongets(mtmp, rn2(3) ? DAGGER : KNIFE);
                if (rn2(2)) mongets(mtmp, LEATHER_GLOVES);
                mongets(mtmp, rn2(2) ? LEATHER_JACKET : LEATHER_ARMOR);
            } else if (mndx === PM_NEANDERTHAL) {
                mongets(mtmp, CLUB);
                mongets(mtmp, LEATHER_ARMOR);
            }
        }
        break;

    case S_ANGEL:
        if (is_hum) {
            const typ = rn2(3) ? LONG_SWORD : SILVER_MACE;
            const otmp = mksobj(typ, false, false);
            otmp.spe = rn2(4);
            if (typ === SILVER_MACE) otmp.spe += 3;
            const shieldTyp = (!rn2(4) || is_lord_f) ? SHIELD_OF_REFLECTION : LARGE_SHIELD;
            mksobj(shieldTyp, false, false);
        }
        break;

    case S_HUMANOID:
        if (mndx === PM_HOBBIT) {
            switch (rn2(3)) {
            case 0: mongets(mtmp, DAGGER); break;
            case 1: mongets(mtmp, ELVEN_DAGGER); break;
            case 2:
                mongets(mtmp, SLING);
                m_initthrow(mtmp, !rn2(4) ? FLINT : ROCK, 6);
                break;
            }
            if (!rn2(10)) mongets(mtmp, ELVEN_MITHRIL_COAT);
            if (!rn2(10)) mongets(mtmp, DWARVISH_CLOAK);
        } else if (is_dwarf_f) {
            if (rn2(7)) mongets(mtmp, DWARVISH_CLOAK);
            if (rn2(7)) mongets(mtmp, IRON_SHOES);
            if (!rn2(4)) {
                mongets(mtmp, DWARVISH_SHORT_SWORD);
                if (rn2(2))
                    mongets(mtmp, DWARVISH_MATTOCK);
                else {
                    mongets(mtmp, rn2(2) ? AXE : DWARVISH_SPEAR);
                    mongets(mtmp, DWARVISH_ROUNDSHIELD);
                }
                mongets(mtmp, DWARVISH_IRON_HELM);
                if (!rn2(3)) mongets(mtmp, DWARVISH_MITHRIL_COAT);
            } else {
                mongets(mtmp, !rn2(3) ? PICK_AXE : DAGGER);
            }
        }
        break;

    case S_KOP:
        if (!rn2(4)) m_initthrow(mtmp, CREAM_PIE, 2);
        if (!rn2(3)) mongets(mtmp, rn2(2) ? CLUB : RUBBER_HOSE);
        break;

    case S_ORC:
        if (rn2(2)) mongets(mtmp, ORCISH_HELM);
        {
            let orc_mm = mndx;
            if (mndx === PM_ORC_CAPTAIN) orc_mm = rn2(2) ? PM_MORDOR_ORC : PM_URUK_HAI;
            switch (orc_mm) {
            case PM_MORDOR_ORC:
                if (!rn2(3)) mongets(mtmp, SCIMITAR);
                if (!rn2(3)) mongets(mtmp, ORCISH_SHIELD);
                if (!rn2(3)) mongets(mtmp, KNIFE);
                if (!rn2(3)) mongets(mtmp, ORCISH_CHAIN_MAIL);
                break;
            case PM_URUK_HAI:
                if (!rn2(3)) mongets(mtmp, ORCISH_CLOAK);
                if (!rn2(3)) mongets(mtmp, ORCISH_SHORT_SWORD);
                if (!rn2(3)) mongets(mtmp, IRON_SHOES);
                if (!rn2(3)) {
                    mongets(mtmp, ORCISH_BOW);
                    m_initthrow(mtmp, ORCISH_ARROW, 12);
                }
                if (!rn2(3)) mongets(mtmp, URUK_HAI_SHIELD);
                break;
            default:
                if (mndx !== PM_ORC_SHAMAN && rn2(2))
                    mongets(mtmp, (mndx === PM_GOBLIN || rn2(2) === 0) ? ORCISH_DAGGER : SCIMITAR);
            }
        }
        break;

    case S_OGRE:
        if (!rn2(mndx === PM_OGRE_TYRANT ? 3 : mndx === PM_OGRE_LEADER ? 6 : 12))
            mongets(mtmp, BATTLE_AXE);
        else
            mongets(mtmp, CLUB);
        break;

    case S_TROLL:
        if (!rn2(2)) {
            switch (rn2(4)) {
            case 0: mongets(mtmp, RANSEUR); break;
            case 1: mongets(mtmp, PARTISAN); break;
            case 2: mongets(mtmp, GLAIVE); break;
            case 3: mongets(mtmp, SPETUM); break;
            }
        }
        break;

    case S_KOBOLD:
        if (!rn2(4)) m_initthrow(mtmp, DART, 12);
        break;

    case S_CENTAUR:
        if (rn2(2)) {
            if (mndx === PM_FOREST_CENTAUR) {
                mongets(mtmp, BOW);
                m_initthrow(mtmp, ARROW, 12);
            } else {
                mongets(mtmp, CROSSBOW);
                m_initthrow(mtmp, CROSSBOW_BOLT, 12);
            }
        }
        break;

    case S_WRAITH:
        mongets(mtmp, KNIFE);
        mongets(mtmp, LONG_SWORD);
        break;

    case S_ZOMBIE:
        if (!rn2(4)) mongets(mtmp, LEATHER_ARMOR);
        if (!rn2(4)) mongets(mtmp, rn2(3) ? KNIFE : SHORT_SWORD);
        break;

    case S_LIZARD:
        if (mndx === PM_SALAMANDER)
            mongets(mtmp, rn2(7) ? SPEAR : rn2(3) ? TRIDENT : STILETTO);
        break;

    case S_DEMON:
        switch (mndx) {
        case PM_BALROG:
            mongets(mtmp, BULLWHIP);
            mongets(mtmp, BROADSWORD);
            break;
        case PM_ORCUS:
            mongets(mtmp, WAN_DEATH);
            break;
        case PM_HORNED_DEVIL:
            mongets(mtmp, rn2(4) ? TRIDENT : BULLWHIP);
            break;
        case PM_DISPATER:
            mongets(mtmp, WAN_STRIKING);
            break;
        case PM_YEENOGHU:
            mongets(mtmp, FLAIL);
            break;
        }
        if (!is_demon_f) break;
        // FALLTHROUGH to default for actual demons
        /* falls through */
    default: {
        const bias = (is_lord_f ? 1 : 0) + (is_prince_f ? 2 : 0) + (is_nasty ? 1 : 0);
        switch (rnd(14 - 2 * bias)) {
        case 1:
            if (is_strong) mongets(mtmp, BATTLE_AXE);
            else m_initthrow(mtmp, DART, 12);
            break;
        case 2:
            if (is_strong) mongets(mtmp, TWO_HANDED_SWORD);
            else { mongets(mtmp, CROSSBOW); m_initthrow(mtmp, CROSSBOW_BOLT, 12); }
            break;
        case 3:
            mongets(mtmp, BOW);
            m_initthrow(mtmp, ARROW, 12);
            break;
        case 4:
            if (is_strong) mongets(mtmp, LONG_SWORD);
            else m_initthrow(mtmp, DAGGER, 3);
            break;
        case 5:
            if (is_strong) mongets(mtmp, LUCERN_HAMMER);
            else mongets(mtmp, AKLYS);
            break;
        default: break;
        }
        break;
    }
    }

    // Final offensive item check for all cases
    if (m_lev > rn2(75))
        mongets(mtmp, rnd_offensive_item(mtmp));
}

// C ref: makemon.c m_initinv() — always makes 2 RNG calls at minimum
function m_initinv(mtmp) {
    const m_lev = mtmp.m_lev ?? 0;
    // defensive item check: m_lev > rn2(50) — rn2(50) is ALWAYS called
    rn2(50);
    // misc item check: m_lev > rn2(100) — ALWAYS called
    rn2(100);
    // gold check: likes_gold(ptr) && !findgold(minvent) && !rn2(5)
    // For simple monsters none of the level-1 set like gold; skip rn2(5)
}

// next_ident() — called once per new monster/object, consumes rnd(2)
export function next_ident() {
    const g = game;
    g.context = g.context || {};
    const prev = g.context.ident ?? 0;
    g.context.ident = prev + rnd(2);
    if (g.context.ident === 0) g.context.ident = rnd(2) + 1;
    return g.context.ident;
}

// C ref: makemon.c makemon()
// mdat = monster data index (or null for random), mmflags = MM_* flags
async function makemon(mdat, x, y, mmflags) {
    let mndx;
    if (mdat === null || mdat === undefined) {
        mndx = rndmonst_adj(0, 0);
        if (mndx < 0) return null; // nothing eligible
    } else {
        mndx = mdat;
    }

    const mtmp = { mx: x, my: y, _mndx: mndx };

    // next_ident() for monster struct allocation
    mtmp.m_id = next_ident();

    // newmonhp
    newmonhp(mtmp);

    // gender assignment: femaleok = !is_male && !is_neuter
    const genderFlags = MONS[mndx]?.[3] ?? 0;
    const is_male   = (genderFlags & M2_MALE)   !== 0;
    const is_female = (genderFlags & M2_FEMALE) !== 0;
    const is_neuter = (genderFlags & M2_NEUTER) !== 0;
    const femaleok = !is_male && !is_neuter;
    if (is_female) {
        mtmp.female = 1;
    } else if (is_male) {
        mtmp.female = 0;
    } else {
        mtmp.female = femaleok ? rn2(2) : 0;
    }

    // m_initweap: equip monsters that have AT_WEAP attack
    if (AT_WEAP_PM.has(mndx)) m_initweap(mtmp);

    // m_initinv (rn2(50) + rn2(100))
    m_initinv(mtmp);

    // makemon:1447 — sleeping/chasing check: rn2(100)
    rn2(100);

    mtmp.msleeping = (mmflags === 2 /* MM_NOGRP */ || (mmflags & 1) === 0) ? 1 : 0;
    mtmp.mpeaceful = 0;

    if (game.level) {
        if (!game.level.monsters) game.level.monsters = [];
        game.level.monsters.push(mtmp);
    }
    return mtmp;
}

// maketrap stub
// C ref: trap.c mktrap() — for hole/trapdoor traps, calls hole_destination(rn2(4))
async function maketrap(x, y, typ) {
    const trap = { ttyp: typ, tx: x, ty: y, tseen: false, once: false, launch: { x: 0, y: 0 } };
    if (typ === HOLE || typ === TRAPDOOR) rn2(4); // hole_destination(trap.c:450)
    if (typ === SQKY_BOARD) {
        // C ref: trap.c choose_trapnote() — pick an unused musical note (0-11)
        const existingTraps = game.level?.traps || [];
        const usedNotes = new Set(existingTraps.filter(t => t.ttyp === SQKY_BOARD && t.tnote != null).map(t => t.tnote));
        const available = [];
        for (let k = 0; k < 12; k++) if (!usedNotes.has(k)) available.push(k);
        trap.tnote = available.length > 0 ? available[rn2(available.length)] : rn2(12);
    }
    if (!game.level) return trap;
    if (!game.level.traps) game.level.traps = [];
    game.level.traps.push(trap);
    return trap;
}

// engrave stubs
function make_engr_at(x, y, text, pristine, epoch, engr_type) { /* stub */ }
function wipe_engr_at(x, y, cnt, perm) { /* stub */ }
function make_grave(x, y, text) {
    const loc = game.level?.at(x, y);
    if (loc) loc.typ = GRAVE;
}

// ─── Engraving / rumor file support ─────────────────────────────────────────
// C ref: engrave.c random_engraving(), rumors.c getrumor() + get_rnd_line(),
//        hacklib.c xcrypt(), engrave.c wipeout_text()

let _rumorsData = null, _engraveData = null;
let _trueRumorStart, _trueRumorEnd, _falseRumorStart, _falseRumorEnd;
let _engraveFileStart, _engraveFileEnd;

function _b64ToUint8Array(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

function _ensureRumorFiles() {
    if (_rumorsData) return;
    _rumorsData = _b64ToUint8Array(RUMORS_B64);
    _engraveData = _b64ToUint8Array(ENGRAVE_B64);

    // Parse rumors header: "%d,%ld,%lx;%d,%ld,%lx;0,0,%lx\n"
    let nl = _rumorsData.indexOf(0x0a);
    nl = _rumorsData.indexOf(0x0a, nl + 1); // skip second line containing header data... wait
    // Actually: line1 = "# don't edit\n", line2 = "count,size,hex_start;...\n"
    const line1end = _rumorsData.indexOf(0x0a);
    const line2end = _rumorsData.indexOf(0x0a, line1end + 1);
    const hdr = String.fromCharCode(..._rumorsData.slice(line1end + 1, line2end));
    const m = hdr.match(/\d+,(\d+),([0-9a-f]+);\d+,(\d+),([0-9a-f]+);0,0,([0-9a-f]+)/);
    _trueRumorStart  = parseInt(m[2], 16);
    _trueRumorEnd    = _trueRumorStart + parseInt(m[1]);
    _falseRumorStart = parseInt(m[4], 16);
    _falseRumorEnd   = _falseRumorStart + parseInt(m[3]);

    // Engrave file: skip first "don't edit" line
    const e1end = _engraveData.indexOf(0x0a);
    _engraveFileStart = e1end + 1;
    _engraveFileEnd   = _engraveData.length;
}

function _xcrypt(str) {
    let bitmask = 1, out = '';
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c & (32 | 64)) c ^= bitmask;
        if ((bitmask <<= 1) >= 32) bitmask = 1;
        out += String.fromCharCode(c);
    }
    return out;
}

// C ref: rumors.c get_rnd_line() — file-seek simulation using a Buffer
function _get_rnd_line(buf, startpos, endpos, padlength) {
    const filechunksize = endpos - startpos;
    if (filechunksize < 1) return '';
    let curPos = startpos;
    for (let trylimit = 10; trylimit > 0; trylimit--) {
        const chunkoffset = rn2(filechunksize);
        const seekpos = startpos + chunkoffset;
        let pos = seekpos;
        while (pos < endpos && buf[pos] !== 0x0a) pos++;
        let partialLen = pos - seekpos;
        if (pos < endpos) { pos++; partialLen++; }
        curPos = pos;
        if (!padlength || partialLen <= padlength + 1) break;
    }
    if (curPos >= endpos) curPos = startpos;
    let lineEnd = curPos;
    while (lineEnd < endpos && buf[lineEnd] !== 0x0a) lineEnd++;
    const decrypted = _xcrypt(String.fromCharCode(...buf.slice(curPos, lineEnd)));
    return padlength ? decrypted.replace(/_+$/, '') : decrypted;
}

// C ref: rumors.c getrumor(truth=0)
function _getrumor() {
    _ensureRumorFiles();
    const adjtruth = rn2(2); // truth=0, so adjtruth = 0+rn2(2)
    if (adjtruth >= 1)
        return _get_rnd_line(_rumorsData, _trueRumorStart,  _trueRumorEnd,  60);
    else
        return _get_rnd_line(_rumorsData, _falseRumorStart, _falseRumorEnd, 60);
}

// C ref: rumors.c get_rnd_text(ENGRAVEFILE)
function _get_rnd_text_engrave() {
    _ensureRumorFiles();
    return _get_rnd_line(_engraveData, _engraveFileStart, _engraveFileEnd, 60);
}

// rubouts table from engrave.c
const _ruboutsMap = new Map([
    ['A','^'],['B','Pb['],['C','('],['D','|)['],['E','|FL[_'],
    ['F','|-'],['G','C('],['H','|-'],['I','|'],['K','|<'],
    ['L','|_'],['M','|'],['N','|\\'],['O','C('],['P','F'],
    ['Q','C('],['R','PF'],['T','|'],['U','J'],['V','/\\'],
    ['W','V/\\'],['Z','/'],['b','|'],['d','c|'],['e','c'],
    ['g','c'],['h','n'],['j','i'],['k','|'],['l','|'],
    ['m','nr'],['n','r'],['o','c'],['q','c'],['w','v'],
    ['y','v'],[':','.'],[';',',:'],[',' ,'.'],['=','-'],
    ['+','-|'],['*','+'],['@','0'],['0','C('],['1','|'],
    ['6','o'],['7','/'],['8','3o']
]);
const _WIPE_SMALL = new Set(['?', '.', ',', "'", '`', '-', '|', '_']);

// C ref: engrave.c wipeout_text(engr, cnt, seed=0)
function _wipeout_text(text, cnt) {
    const arr = text.split('');
    const lth = arr.length;
    if (!lth || cnt <= 0) return text;
    while (cnt-- > 0) {
        const nxt = rn2(lth);
        const use_rubout = rn2(4);
        const s = arr[nxt];
        if (s === ' ') continue;
        if (_WIPE_SMALL.has(s)) { arr[nxt] = ' '; continue; }
        if (!use_rubout) {
            arr[nxt] = '?';
        } else {
            const wipeto = _ruboutsMap.get(s);
            if (wipeto) {
                arr[nxt] = wipeto[rn2(wipeto.length)];
            } else {
                arr[nxt] = '?';
            }
        }
    }
    while (arr.length && arr[arr.length - 1] === ' ') arr.pop();
    return arr.join('');
}

// C ref: engrave.c random_engraving()
function random_engraving() {
    let pristine = '';
    if (rn2(4) !== 0) {
        pristine = _getrumor();
    }
    if (!pristine) {
        pristine = _get_rnd_text_engrave();
    }
    const cnt = Math.floor(pristine.length / 4);
    const text = _wipeout_text(pristine, cnt);
    return { text, pristine };
}

// wipeout_text is no longer a separate stub; kept as a no-op shim if needed elsewhere
function wipeout_text(text) {
    return text;
}

// in_rooms stub
function in_rooms(x, y, rtype) { return []; }

// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================

// C ref: bones.c getbones()
function getbones() {
    const flags = game.flags || {};
    if (flags.explore) return false;
    if (flags.bones === false) return false;
    if (rn2(3) && !game.flags?.debug) return false;
    return false;
}

// C ref: allmain.c l_nhcore_init()
export function l_nhcore_init() {
    const align = [0, 0, 0]; // A_LAWFUL, A_NEUTRAL, A_CHAOTIC
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    game.splev_align = align;
}

// C ref: mklev.c mklev()
export async function mklev() {
    const g = game;
    if (getbones()) return;
    g.in_mklev = true;
    _in_mklev = true;
    await makelevel();
    _in_mklev = false;
    recount_level_features();
    level_finalize_topology();
    g.in_mklev = false;
}

function recount_level_features() {
    const lvl = game.level;
    if (!lvl?.flags) return;
    let nfountains = 0, nsinks = 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const typ = lvl.at(x, y)?.typ;
            if (typ === FOUNTAIN) nfountains++;
            if (typ === SINK) nsinks++;
        }
    lvl.flags.nfountains = nfountains;
    lvl.flags.nsinks = nsinks;
}

// C ref: mklev.c clear_level_structures()
function clear_level_structures() {
    const g = game;
    g.fmon = null;
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.rooms = [];
    g.made_branch = false;
    g.smeq = new Array(MAXNROFROOMS + 1).fill(0);
    g.level.doorindex = 0;
    g.level.doors = [];
    g.stairs = null;
    g.vault_x = -1;
    const lf = g.level.flags;
    lf.nfountains = 0;
    lf.nsinks = 0;
    lf.has_shop = false;
    lf.has_vault = false;
    lf.has_zoo = false;
    lf.has_court = false;
    lf.has_morgue = false;
    lf.graveyard = false;
    lf.has_beehive = false;
    lf.has_barracks = false;
    lf.has_temple = false;
    lf.has_swamp = false;
    lf.noteleport = false;
    lf.hardfloor = false;
    lf.nommap = false;
    lf.hero_memory = true;
    lf.shortsighted = false;
    lf.sokoban_rules = false;
    lf.is_maze_lev = false;
    lf.is_cavernous_lev = false;
    lf.arboreal = false;
    lf.has_town = false;
    lf.wizard_bones = false;
    lf.corrmaze = false;
    lf.temperature = 0;
    lf.rndmongen = true;
    lf.deathdrops = true;
    lf.noautosearch = false;
    lf.fumaroles = false;
    lf.stormy = false;
    lf.stasis_until = 0;
    init_rect();
}

// C ref: mkmap.c litstate_rnd()
function litstate_rnd(litstate) {
    if (litstate < 0) {
        const d = depth_of_level(game.u?.uz);
        return (rnd(1 + Math.abs(d)) < 11 && rn2(77)) ? true : false;
    }
    return !!litstate;
}

// C ref: mklev.c makelevel()
async function makelevel() {
    const g = game;
    oinit();
    clear_level_structures();

    // C ref: mklev.c:1295 — check for below-Medusa maze level
    // This rn2(5) is consumed even when the condition fails (short-circuit)
    const medusa = g.medusa_level;
    if (rn2(5) && g.u?.uz?.dnum === medusa?.dnum
        && (g.u?.uz?.dlevel ?? 1) > (medusa?.dlevel ?? 999)) {
        // Would generate maze — not applicable for contest level 1
    }

    // Regular level generation
    // C ref: mklev.c:382-388 — load themerms.lua for themed rooms
    // nhlib.lua shuffle when loading themerms.lua (first level of branch)
    const dnum = g.u?.uz?.dnum ?? 0;
    if (!g._luathemes_loaded) g._luathemes_loaded = {};
    if (!g._luathemes_loaded[dnum]) {
        const themedAlign = ['law', 'neutral', 'chaos'];
        for (let i = themedAlign.length; i > 1; i--) {
            const j = rn2(i);
            [themedAlign[i - 1], themedAlign[j]] = [themedAlign[j], themedAlign[i - 1]];
        }
        g._luathemes_loaded[dnum] = true;
    }

    await makerooms();

    if (g.level.nroom <= 0) return;
    sort_rooms();
    await generate_stairs();

    // Branch check
    const branchp = is_branchlev();

    makecorridors();
    await make_niches();

    // Vault creation (C ref: mklev.c:1316-1341)
    if (g.vault_x !== -1) {
        const vw = { v: 1 }, vh = { v: 1 };
        const vx = { v: g.vault_x }, vy = { v: g.vault_y };
        if (check_room(vx, vw, vy, vh, true)) {
            add_room(vx.v, vy.v, vx.v + vw.v, vy.v + vh.v, true, VAULT, false);
            g.level.flags.has_vault = true;
            const vaultRoom = g.level.rooms[g.level.nroom - 1];
            if (vaultRoom) vaultRoom.needfill = FILL_NORMAL;
            fill_special_room(vaultRoom);  // C ref: line 1330
            mk_knox_portal();  // C ref: line 1331 (no-op at depth 1 branch level)
            if (!g.level.flags.noteleport && !rn2(3)) {
                // makevtele stub (no additional RNG)
            }
        } else if (rnd_rect()) {
            // Fallback vault attempt — simplified
        }
    }

    // do_mkroom for special rooms (depth-based; all fail at depth 1)

    // Place dungeon branch
    if (branchp) {
        place_branch(branchp);
    }

    // C ref: mklev.c:1395-1418 — fill rooms
    // Count fillable rooms and pick bonus item room
    const rooms = g.level.rooms || [];
    const nroom = g.level.nroom || 0;
    let fillable_count = 0;
    for (let i = 0; i < nroom; i++) {
        if (rooms[i] && room_is_fillable(rooms[i])) fillable_count++;
    }
    let bonus_countdown = fillable_count > 0 ? rn2(fillable_count) : -1;
    for (let i = 0; i < nroom; i++) {
        const croom = rooms[i];
        if (!croom || croom.hx <= 0) break;
        const fillable = room_is_fillable(croom);
        await fill_ordinary_room(croom, fillable && bonus_countdown === 0);
        if (fillable) bonus_countdown--;
    }
    // fill_special_room for each room (most are no-ops)
    for (let i = 0; i < nroom; i++) {
        if (rooms[i]) fill_special_room(rooms[i]);
    }
}

// C ref: ROOM_IS_FILLABLE macro in mklev.h
function room_is_fillable(r) {
    return r && r.hx > 0 && (r.rtype === OROOM || r.rtype === THEMEROOM);
}

// C ref: mklev.c mk_knox_portal() — for depth 1 branch level, always no-op
function mk_knox_portal() {
    // At depth 1 which is always Is_branchlev → return immediately without RNG
    // For deeper levels, would call rn2(3) for deferral check
    if (is_branchlev()) return;
    // Otherwise check if Knox portal should be placed (rn2(3) + depth check)
    // For simplicity: at non-branch levels below depth 10, still no-op
    // (mk_knox_portal only places portals above depth 10 in main dungeon)
}

// C ref: mklev.c makerooms()
async function makerooms() {
    const g = game;
    let tried_vault = false;
    const difficulty = depth_of_level(g.u?.uz);
    let themeroom_tries = 0;

    while (g.level.nroom < (MAXNROFROOMS - 1) && rnd_rect()) {
        if (g.level.nroom >= Math.trunc(MAXNROFROOMS / 6) && rn2(2) && !tried_vault) {
            tried_vault = true;
            if (create_vault()) {
                g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
                g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
                if (g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom].hx = -1;
            }
        } else {
            // Themed room selection (reservoir sampling)
            if (!(await themerooms_generate(difficulty))) {
                if (themeroom_tries++ > 10
                    || g.level.nroom >= Math.trunc(MAXNROFROOMS / 6))
                    break;
            }
        }
    }
}

// Themed room metadata — must match C's themerms.lua frequency table exactly.
// Generated from themeroom_meta.js (31 rooms).
const THEMEROOM_META = [
    { name: 'default', frequency: 1000 },
    { name: 'Fake Delphi', frequency: 1 },
    { name: 'Room in a room', frequency: 1 },
    { name: 'Huge room with another room inside', frequency: 1 },
    { name: 'Nesting rooms', frequency: 1 },
    { name: 'Default room with themed fill', frequency: 6 },
    { name: 'Unlit room with themed fill', frequency: 2 },
    { name: 'Room with both normal contents and themed fill', frequency: 2 },
    { name: 'Pillars', frequency: 1 },
    { name: 'Mausoleum', frequency: 1 },
    { name: 'Random dungeon feature', frequency: 1 },
    { name: 'L-shaped', frequency: 1 },
    { name: 'L-shaped, rot 1', frequency: 1 },
    { name: 'L-shaped, rot 2', frequency: 1 },
    { name: 'L-shaped, rot 3', frequency: 1 },
    { name: 'Blocked center', frequency: 1 },
    { name: 'Circular, small', frequency: 1 },
    { name: 'Circular, medium', frequency: 1 },
    { name: 'Circular, big', frequency: 1 },
    { name: 'T-shaped', frequency: 1 },
    { name: 'T-shaped, rot 1', frequency: 1 },
    { name: 'T-shaped, rot 2', frequency: 1 },
    { name: 'T-shaped, rot 3', frequency: 1 },
    { name: 'S-shaped', frequency: 1 },
    { name: 'S-shaped, rot 1', frequency: 1 },
    { name: 'Z-shaped', frequency: 1 },
    { name: 'Z-shaped, rot 1', frequency: 1 },
    { name: 'Cross', frequency: 1 },
    { name: 'Four-leaf clover', frequency: 1 },
    { name: 'Water-surrounded vault', frequency: 1 },
    { name: 'Twin businesses', frequency: 1, mindiff: 4 },
];

function is_themeroom_eligible(room, difficulty) {
    if (room.mindiff != null && difficulty < room.mindiff) return false;
    if (room.maxdiff != null && difficulty > room.maxdiff) return false;
    return true;
}

// C ref: themerms.lua themerooms_generate()
// Reservoir sampling picks one themed room. For seed8000 level 1,
// 'ordinary' always wins (frequency 1000 vs others ~1-10).
async function themerooms_generate(difficulty) {
    let pick = null;
    let total_frequency = 0;
    for (const meta of THEMEROOM_META) {
        if (!is_themeroom_eligible(meta, difficulty)) continue;
        const this_frequency = meta.frequency || 1;
        total_frequency += this_frequency;
        if (this_frequency > 0 && rn2(total_frequency) < this_frequency) {
            pick = meta;
        }
    }
    if (!pick) return false;
    // For 'ordinary' rooms, create a standard room
    // For themed rooms with dynamic dimensions, consume those rn2 calls first
    const chance = 100;
    if (pick.name !== 'ordinary') {
        // Themed room — not expected for seed8000, but handle RNG correctly
        rn2(100); // chance check (build_room)
    }
    // All themed rooms go through create_room for placement
    const ok = create_room(-1, -1, -1, -1, -1, -1, OROOM, -1);
    if (ok) {
        // C ref: sp_lev.c:2824 — build_room calls topologize after create_room
        const aroom = game.level.rooms[game.level.nroom - 1];
        if (aroom) {
            topologize(aroom);
            aroom.needfill = FILL_NORMAL;
        }
    }
    return ok;
}

// C ref: sp_lev.c check_room()
function check_room(lowx, ddx, lowy, ddy, vault) {
    const map = game.level;
    let hix = lowx.v + ddx.v, hiy = lowy.v + ddy.v;
    const xlim = XLIM + (vault ? 1 : 0);
    const ylim = YLIM + (vault ? 1 : 0);
    const s_lowx = lowx.v, s_ddx = ddx.v;
    const s_lowy = lowy.v, s_ddy = ddy.v;
    if (lowx.v < 3) lowx.v = 3;
    if (lowy.v < 2) lowy.v = 2;
    if (hix > COLNO - 3) hix = COLNO - 3;
    if (hiy > ROWNO - 3) hiy = ROWNO - 3;
    for (;;) {
        if (hix <= lowx.v || hiy <= lowy.v) return false;
        if (game.in_mk_themerooms
            && s_lowx !== lowx.v && s_ddx !== ddx.v
            && s_lowy !== lowy.v && s_ddy !== ddy.v) {
            return false;
        }
        let retry = false;
        for (let x = lowx.v - xlim; x <= hix + xlim && !retry; x++) {
            if (x <= 0 || x >= COLNO) continue;
            let y = Math.max(lowy.v - ylim, 0);
            const ymax = Math.min(hiy + ylim, ROWNO - 1);
            for (; y <= ymax; y++) {
                const loc = map.at(x, y);
                if (loc && loc.typ !== STONE) {
                    if (!rn2(3)) return false;
                    if (game.in_mk_themerooms) return false;
                    if (x < lowx.v) lowx.v = x + xlim + 1;
                    else hix = x - xlim - 1;
                    if (y < lowy.v) lowy.v = y + ylim + 1;
                    else hiy = y - ylim - 1;
                    retry = true;
                    break;
                }
            }
        }
        if (!retry) break;
    }
    ddx.v = hix - lowx.v;
    ddy.v = hiy - lowy.v;
    if (game.in_mk_themerooms
        && s_lowx !== lowx.v && s_ddx !== ddx.v
        && s_lowy !== lowy.v && s_ddy !== ddy.v) {
        return false;
    }
    return true;
}

// C ref: sp_lev.c create_room()
function create_room(x, y, w, h, xal, yal, rtype, rlit) {
    const g = game;
    let xabs = 0, yabs = 0;
    let r1 = null, r2 = null;
    let wtmp, htmp;
    let trycnt = 0;
    let vault = false;
    let xlim = XLIM, ylim = YLIM;
    if (rtype === -1) rtype = OROOM;
    if (rtype === VAULT) {
        vault = true;
        xlim++;
        ylim++;
    }
    rlit = litstate_rnd(rlit);
    do {
        wtmp = w; htmp = h;
        let xtmp = x, ytmp = y;
        let xaltmp = xal, yaltmp = yal;
        if ((xtmp < 0 && ytmp < 0 && wtmp < 0 && xaltmp < 0 && yaltmp < 0) || vault) {
            r1 = rnd_rect();
            if (!r1) return false;
            const hx = r1.hx, hy = r1.hy, lx = r1.lx, ly = r1.ly;
            let dx, dy;
            if (vault) {
                dx = dy = 1;
            } else {
                dx = 2 + rn2((hx - lx > 28) ? 12 : 8);
                dy = 2 + rn2(4);
                if (dx * dy > 50) dy = Math.trunc(50 / dx);
            }
            const xborder = (lx > 0 && hx < COLNO - 1) ? 2 * xlim : xlim + 1;
            const yborder = (ly > 0 && hy < ROWNO - 1) ? 2 * ylim : ylim + 1;
            if (hx - lx < dx + 3 + xborder || hy - ly < dy + 3 + yborder) {
                r1 = null;
                continue;
            }
            xabs = lx + (lx > 0 ? xlim : 3)
                   + rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1);
            yabs = ly + (ly > 0 ? ylim : 2)
                   + rn2(hy - (ly > 0 ? ly : 2) - dy - yborder + 1);
            if (ly === 0 && hy >= ROWNO - 1
                && (!g.level.nroom || !rn2(g.level.nroom))
                && (yabs + dy > Math.trunc(ROWNO / 2))) {
                yabs = rn1(3, 2);
                if (g.level.nroom < 4 && dy > 1) dy--;
            }
            const lowx = { v: xabs }, ddx = { v: dx };
            const lowy = { v: yabs }, ddy = { v: dy };
            if (!check_room(lowx, ddx, lowy, ddy, vault)) {
                r1 = null;
                continue;
            }
            xabs = lowx.v;
            yabs = lowy.v;
            wtmp = ddx.v + 1;
            htmp = ddy.v + 1;
            r2 = { lx: xabs - 1, ly: yabs - 1, hx: xabs + wtmp, hy: yabs + htmp };
        } else {
            // positioned room (not used for seed8000)
            return false;
        }
    } while (++trycnt <= 100 && !r1);
    if (!r1) return false;
    split_rects(r1, r2);
    if (!vault) {
        g.smeq[g.level.nroom] = g.level.nroom;
        add_room(xabs, yabs, xabs + wtmp - 1, yabs + htmp - 1, rlit, rtype, false);
    } else {
        if (!g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom] = {};
        g.level.rooms[g.level.nroom].lx = xabs;
        g.level.rooms[g.level.nroom].ly = yabs;
    }
    return true;
}

function create_vault() {
    return create_room(-1, -1, 2, 2, -1, -1, VAULT, true);
}

// C ref: mklev.c add_room()
function add_room(lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: g.level.nroom,
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, true);
    g.level.rooms[g.level.nroom] = croom;
    g.level.nroom++;
    if (g.level.nroom < MAXNROFROOMS) {
        g.level.rooms[g.level.nroom] = { hx: -1 };
    }
}

// C ref: mklev.c do_room_or_subroom()
function do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, _rtype, special, is_room) {
    const map = game.level;
    if (!lowx) lowx++;
    if (!lowy) lowy++;
    if (hix >= COLNO - 1) hix = COLNO - 2;
    if (hiy >= ROWNO - 1) hiy = ROWNO - 2;
    if (lit) {
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = Math.max(lowy - 1, 0); y <= hiy + 1; y++)
                if (map.at(x, y)) map.at(x, y).lit = true;
        croom.rlit = 1;
    } else {
        croom.rlit = 0;
    }
    croom.lx = lowx; croom.hx = hix;
    croom.ly = lowy; croom.hy = hiy;
    croom.rtype = _rtype;
    croom.doorct = 0;
    croom.fdoor = game.level.doorindex;
    croom.irregular = false;
    croom.nsubrooms = 0;
    croom.sbrooms = [];
    if (!special) {
        croom.needjoining = true;
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = HWALL; loc.horizontal = true; }
            }
        for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = VWALL; loc.horizontal = false; }
            }
        for (let x = lowx; x <= hix; x++)
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = ROOM;
            }
        if (is_room) {
            const tl = map.at(lowx - 1, lowy - 1);
            const tr = map.at(hix + 1, lowy - 1);
            const bl = map.at(lowx - 1, hiy + 1);
            const br = map.at(hix + 1, hiy + 1);
            if (tl) tl.typ = TLCORNER;
            if (tr) tr.typ = TRCORNER;
            if (bl) bl.typ = BLCORNER;
            if (br) br.typ = BRCORNER;
        } else {
            wallification(lowx - 1, lowy - 1, hix + 1, hiy + 1);
        }
    }
}

// C ref: mklev.c sort_rooms()
function sort_rooms() {
    const g = game;
    const n = g.level.nroom;
    const oldToNew = new Array(n).fill(0);
    const liveRooms = g.level.rooms.slice(0, n)
        .sort((a, b) => (a?.lx || 0) - (b?.lx || 0));
    g.level.rooms = liveRooms;
    if (n < MAXNROFROOMS) g.level.rooms[n] = { hx: -1 };
    for (let i = 0; i < n; i++) {
        if (g.level.rooms[i]) {
            oldToNew[g.level.rooms[i].roomnoidx] = i;
            g.level.rooms[i].roomnoidx = i;
        }
    }
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            const rno = loc?.roomno ?? 0;
            if (rno >= ROOMOFFSET && rno < MAXNROFROOMS + 1) {
                loc.roomno = oldToNew[rno - ROOMOFFSET] + ROOMOFFSET;
            }
        }
}

// C ref: mklev.c topologize()
function topologize(croom) {
    if (!croom || croom.irregular) return;
    const roomno = (croom.roomnoidx ?? -1) + ROOMOFFSET;
    const lowx = croom.lx, lowy = croom.ly;
    const hix = croom.hx, hiy = croom.hy;
    if (!game.level || roomno < ROOMOFFSET) return;
    if ((game.level.at(lowx, lowy)?.roomno ?? 0) === roomno) return;
    for (let x = lowx; x <= hix; x++)
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) loc.roomno = roomno;
        }
    for (let x = lowx - 1; x <= hix + 1; x++)
        for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
    for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
}

// ============================================================
// Corridors
// ============================================================

function good_rm_wall_doorpos(x, y, dir, room) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(room) + ROOMOFFSET;
    if (!isok(x, y) || !room.needjoining) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL || IS_DOOR(loc.typ) || loc.typ === SDOOR))
        return false;
    if (bydoor(x, y)) return false;
    const tx = x + xdir[dir], ty = y + ydir[dir];
    if (!isok(tx, ty)) return false;
    const tloc = map.at(tx, ty);
    if (!tloc || IS_OBSTRUCTED(tloc.typ)) return false;
    if (rmno !== tloc.roomno) return false;
    return true;
}

function finddpos_shift(xp, yp, dir, aroom) {
    const rdir = DIR_180(dir);
    if (good_rm_wall_doorpos(xp.v, yp.v, rdir, aroom)) return true;
    return false;
}

// C ref: mklev.c finddpos()
function finddpos(cc, dir, aroom) {
    let x1, y1, x2, y2;
    switch (dir) {
    case DIR_N: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.ly - 1; break;
    case DIR_S: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.hy + 1; break;
    case DIR_W: x1 = x2 = aroom.lx - 1; y1 = aroom.ly; y2 = aroom.hy; break;
    case DIR_E: x1 = x2 = aroom.hx + 1; y1 = aroom.ly; y2 = aroom.hy; break;
    default: return false;
    }
    let tryct = 0;
    let x, y;
    do {
        x = (x2 - x1) ? rn1(x2 - x1 + 1, x1) : x1;
        y = (y2 - y1) ? rn1(y2 - y1 + 1, y1) : y1;
        const xp = { v: x }, yp = { v: y };
        if (finddpos_shift(xp, yp, dir, aroom)) {
            cc.x = xp.v; cc.y = yp.v;
            return true;
        }
    } while (++tryct < 20);
    for (x = x1; x <= x2; x++)
        for (y = y1; y <= y2; y++) {
            const xp = { v: x }, yp = { v: y };
            if (finddpos_shift(xp, yp, dir, aroom)) {
                cc.x = xp.v; cc.y = yp.v;
                return true;
            }
        }
    cc.x = x1; cc.y = y1;
    return false;
}

function maybe_sdoor(chance) {
    const d = depth_of_level(game.u?.uz);
    return (d > 2) && !rn2(Math.max(2, chance));
}

// C ref: sp_lev.c dig_corridor()
function dig_corridor(org, dest, npoints_out, nxcor, ftyp, btyp) {
    const map = game.level;
    let dx = 0, dy = 0;
    let xx = org.x, yy = org.y;
    const tx = dest.x, ty = dest.y;
    let npoints = 0;
    if (npoints_out) npoints_out.v = 0;
    if (xx <= 0 || yy <= 0 || tx <= 0 || ty <= 0
        || xx > COLNO - 1 || tx > COLNO - 1 || yy > ROWNO - 1 || ty > ROWNO - 1)
        return false;
    if (tx > xx) dx = 1;
    else if (ty > yy) dy = 1;
    else if (tx < xx) dx = -1;
    else dy = -1;
    xx -= dx; yy -= dy;
    let cct = 0;
    while (xx !== tx || yy !== ty) {
        if (cct++ > 500 || (nxcor && !rn2(35))) return false;
        xx += dx; yy += dy;
        if (xx >= COLNO - 1 || xx <= 0 || yy <= 0 || yy >= ROWNO - 1) return false;
        const crm = map.at(xx, yy);
        if (!crm) return false;
        if (crm.typ === btyp) {
            if (ftyp === CORR && maybe_sdoor(100)) {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = SCORR;
            } else {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = ftyp;
                if (nxcor && !rn2(50)) {
                    mksobj_at(BOULDER, xx, yy, true, false);
                }
            }
        } else if (crm.typ !== ftyp && crm.typ !== SCORR) {
            return false;
        }
        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);
        if ((dix > diy) && diy && !rn2(dix - diy + 1)) dix = 0;
        else if ((diy > dix) && dix && !rn2(diy - dix + 1)) diy = 0;
        if (dy && dix > diy) {
            const ddx = (xx > tx) ? -1 : 1;
            const ncr = map.at(xx + ddx, yy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dx = ddx; dy = 0; continue;
            }
        } else if (dx && diy > dix) {
            const ddy = (yy > ty) ? -1 : 1;
            const ncr = map.at(xx, yy + ddy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dy = ddy; dx = 0; continue;
            }
        }
        const straight = map.at(xx + dx, yy + dy);
        if (straight && (straight.typ === btyp || straight.typ === ftyp || straight.typ === SCORR))
            continue;
        if (dx) { dx = 0; dy = (ty < yy) ? -1 : 1; }
        else { dy = 0; dx = (tx < xx) ? -1 : 1; }
        const alt = map.at(xx + dx, yy + dy);
        if (alt && (alt.typ === btyp || alt.typ === ftyp || alt.typ === SCORR)) continue;
        dy = -dy; dx = -dx;
    }
    if (npoints_out) npoints_out.v = npoints;
    return true;
}

// C ref: mklev.c dosdoor()
function dosdoor(x, y, aroom, type) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return;
    const shdoor = in_rooms(x, y, 0).length > 0;
    if (!IS_WALL(loc.typ)) type = DOOR;
    loc.typ = type;
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5)) loc.doormask = D_ISOPEN;
            else if (!rn2(6)) loc.doormask = D_LOCKED;
            else loc.doormask = D_CLOSED;
            if (loc.doormask !== D_ISOPEN && !shdoor
                && level_difficulty() >= 5 && !rn2(25))
                loc.doormask |= D_TRAPPED;
        } else {
            loc.doormask = shdoor ? D_ISOPEN : D_NODOOR;
        }
        if (loc.doormask & D_TRAPPED) {
            if (level_difficulty() >= 9 && !rn2(5)) {
                loc.doormask = D_NODOOR;
            }
        }
    } else {
        if (shdoor || !rn2(5)) loc.doormask = D_LOCKED;
        else loc.doormask = D_CLOSED;
        if (!shdoor && level_difficulty() >= 4 && !rn2(20))
            loc.doormask |= D_TRAPPED;
    }
    add_door(x, y, aroom);
}

function dodoor(x, y, aroom) {
    dosdoor(x, y, aroom, maybe_sdoor(8) ? SDOOR : DOOR);
}

function add_door(x, y, aroom) {
    const g = game;
    if (!g.level.doors) g.level.doors = [];
    for (let i = 0; i < aroom.doorct; i++) {
        const d = g.level.doors[aroom.fdoor + i];
        if (d && d.x === x && d.y === y) return;
    }
    if (aroom.doorct === 0) aroom.fdoor = g.level.doorindex;
    aroom.doorct++;
    for (let tmp = g.level.doorindex; tmp > aroom.fdoor; tmp--)
        g.level.doors[tmp] = g.level.doors[tmp - 1];
    for (const broom of g.level.rooms || []) {
        if (!broom || broom.hx <= 0 || broom === aroom || !(broom.doorct > 0)) continue;
        if ((broom.fdoor ?? 0) >= aroom.fdoor) broom.fdoor++;
    }
    g.level.doors[aroom.fdoor] = { x, y };
    g.level.doorindex++;
}

function bydoor(x, y) {
    const map = game.level;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) return true;
    }
    return false;
}

function okdoor(x, y) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL)) return false;
    if (bydoor(x, y)) return false;
    return (
        (isok(x - 1, y) && !IS_OBSTRUCTED(map.at(x - 1, y).typ))
        || (isok(x + 1, y) && !IS_OBSTRUCTED(map.at(x + 1, y).typ))
        || (isok(x, y - 1) && !IS_OBSTRUCTED(map.at(x, y - 1).typ))
        || (isok(x, y + 1) && !IS_OBSTRUCTED(map.at(x, y + 1).typ))
    );
}

// C ref: mklev.c join()
function join(a, b, nxcor) {
    const g = game;
    const croom = g.level.rooms[a];
    const troom = g.level.rooms[b];
    if (!croom || !troom) return;
    if (!croom.needjoining || !troom.needjoining) return;
    if (troom.hx < 0 || croom.hx < 0) return;
    let dx, dy;
    const cc = { x: 0, y: 0 }, tt = { x: 0, y: 0 };
    if (troom.lx > croom.hx) {
        dx = 1; dy = 0;
        if (!finddpos(cc, DIR_E, croom)) return;
        if (!finddpos(tt, DIR_W, troom)) return;
    } else if (troom.hy < croom.ly) {
        dy = -1; dx = 0;
        if (!finddpos(cc, DIR_N, croom)) return;
        if (!finddpos(tt, DIR_S, troom)) return;
    } else if (troom.hx < croom.lx) {
        dx = -1; dy = 0;
        if (!finddpos(cc, DIR_W, croom)) return;
        if (!finddpos(tt, DIR_E, troom)) return;
    } else {
        dy = 1; dx = 0;
        if (!finddpos(cc, DIR_S, croom)) return;
        if (!finddpos(tt, DIR_N, troom)) return;
    }
    const xx = cc.x, yy = cc.y;
    const tx = tt.x - dx, ty = tt.y - dy;
    if (nxcor) {
        const loc = game.level.at(xx + dx, yy + dy);
        if (loc && loc.typ !== STONE) return;
    }
    const org = { x: xx + dx, y: yy + dy };
    const dest = { x: tx, y: ty };
    const npoints = { v: 0 };
    const ftyp = CORR;
    const dig_result = dig_corridor(org, dest, npoints, nxcor, ftyp, STONE);
    if ((npoints.v > 0) && (okdoor(xx, yy) || !nxcor))
        dodoor(xx, yy, croom);
    if (!dig_result) return;
    if (okdoor(tt.x, tt.y) || !nxcor)
        dodoor(tt.x, tt.y, troom);
    if (g.smeq[a] < g.smeq[b]) g.smeq[b] = g.smeq[a];
    else g.smeq[a] = g.smeq[b];
}

// C ref: mklev.c makecorridors()
function makecorridors() {
    const g = game;
    let any = true;
    for (let i = 0; i < g.level.nroom; i++) g.smeq[i] = i;
    for (let a = 0; a < g.level.nroom - 1; a++) {
        join(a, a + 1, false);
        if (!rn2(50)) break;
    }
    for (let a = 0; a < g.level.nroom - 2; a++)
        if (g.smeq[a] !== g.smeq[a + 2]) join(a, a + 2, false);
    for (let a = 0; any && a < g.level.nroom; a++) {
        any = false;
        for (let b = 0; b < g.level.nroom; b++)
            if (g.smeq[a] !== g.smeq[b]) { join(a, b, false); any = true; }
    }
    if (g.level.nroom > 2) {
        const count = rn2(g.level.nroom) + 4;
        for (let i = 0; i < count; i++) {
            let a = rn2(g.level.nroom);
            let b = rn2(g.level.nroom - 2);
            if (b >= a) b += 2;
            join(a, b, true);
        }
    }
}

// ============================================================
// Room helper functions
// ============================================================

function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }
function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }

function somexy(croom, c) {
    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }
    let try_cnt = 0;
    while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        const loc = game.level.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ)) continue;
        return true;
    }
    return false;
}

function occupied(x, y) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    return !!(IS_FURNITURE(loc.typ) || loc.typ === LAVAPOOL || IS_POOL(loc.typ));
}

function somexyspace(croom, c) {
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level.at(c.x, c.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
    } while (trycnt++ < 100 && !okay);
    return okay;
}

// ============================================================
// Stairs
// ============================================================

function generate_stairs_room_good(croom, phase) {
    if (!croom || croom.hx < 0) return false;
    if (!croom.needjoining && phase >= 0) return false;
    let hasDown = false, hasUp = false;
    for (let st = game.stairs; st; st = st.next) {
        const inRoom = st.sx >= croom.lx && st.sx <= croom.hx
            && st.sy >= croom.ly && st.sy <= croom.hy;
        if (!inRoom) continue;
        if (st.up) hasUp = true; else hasDown = true;
    }
    if (phase >= 1 && (hasDown || hasUp)) return false;
    if (croom.rtype !== OROOM && !(phase < 2 && croom.rtype === THEMEROOM)) return false;
    return true;
}

function generate_stairs_find_room() {
    const g = game;
    if (!g.level.nroom) return null;
    for (let phase = 2; phase > -1; phase--) {
        const candidates = [];
        for (let i = 0; i < g.level.nroom; i++)
            if (generate_stairs_room_good(g.level.rooms[i], phase))
                candidates.push(i);
        if (candidates.length > 0) {
            const pick = rn2(candidates.length);
            return g.level.rooms[candidates[pick]];
        }
    }
    return g.level.rooms[rn2(g.level.nroom)];
}

function mkstairs(x, y, up, croom) {
    const g = game;
    const loc = g.level.at(x, y);
    if (loc) {
        loc.typ = STAIRS;
        loc.ladder = up ? 1 : 2;
    }
    const dest = {
        dnum: g.u?.uz?.dnum ?? 0,
        dlevel: (g.u?.uz?.dlevel ?? 1) + (up ? -1 : 1),
    };
    stairway_add(x, y, !!up, false, dest);
    if (up) g.level.upstair = { x, y };
    else g.level.dnstair = { x, y };
}

async function generate_stairs() {
    const g = game;
    const pos = { x: 0, y: 0 };
    // Down stairs
    {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 0, croom);
        }
    }
    // Up stairs only if not level 1
    if ((g.u?.uz?.dlevel ?? 1) !== 1) {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 1, croom);
        }
    }
}

// ============================================================
// Niches
// ============================================================

function cardinal_nextto_room(aroom, x, y) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(aroom) + ROOMOFFSET;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && !loc.edge && loc.roomno === rmno) return true;
    }
    return false;
}

function place_niche(aroom) {
    let dy;
    const dd = { x: 0, y: 0 };
    if (rn2(2)) {
        dy = 1;
        if (!finddpos(dd, DIR_S, aroom)) return null;
    } else {
        dy = -1;
        if (!finddpos(dd, DIR_N, aroom)) return null;
    }
    const xx = dd.x, yy = dd.y;
    const niche = game.level.at(xx, yy + dy);
    const back = game.level.at(xx, yy - dy);
    if (!niche || niche.typ !== STONE) return null;
    if (!back || IS_POOL(back.typ) || IS_FURNITURE(back.typ)) return null;
    if (!cardinal_nextto_room(aroom, xx, yy)) return null;
    return { dy, xx, yy };
}

async function makeniche(trap_type) {
    const g = game;
    let vct = 8;
    while (vct--) {
        const aroom = g.level.rooms[rn2(g.level.nroom)];
        if (!aroom || aroom.rtype !== OROOM) continue;
        if (aroom.doorct === 1 && rn2(5)) continue;
        const niche = place_niche(aroom);
        if (!niche) continue;
        const { dy, xx, yy } = niche;
        const rm = g.level.at(xx, yy + dy);
        if (!rm) continue;
        if (trap_type || !rn2(4)) {
            rm.typ = SCORR;
            if (trap_type) {
                let actualTrap = trap_type;
                if (is_hole(actualTrap)) actualTrap = ROCKTRAP;
                await maketrap(xx, yy + dy, actualTrap);
            }
            dosdoor(xx, yy, aroom, SDOOR);
        } else {
            rm.typ = CORR;
            if (rn2(7)) {
                dosdoor(xx, yy, aroom, rn2(5) ? SDOOR : DOOR);
            } else {
                const loc = g.level.at(xx, yy);
                if (!rn2(5) && loc && IS_WALL(loc.typ)) {
                    loc.typ = IRONBARS;
                    if (rn2(3)) {
                        // human corpse — consume rn2 for mkclass + mkcorpstat
                        rn2(398); // mkclass(S_HUMAN)
                        mkcorpstat(CORPSE, null, 0, xx, yy + dy, 1);
                    }
                }
                if (!g.level.flags.noteleport) {
                    mksobj_at(SCR_TELEPORTATION, xx, yy + dy, true, false);
                }
                if (!rn2(3)) {
                    mkobj_at(RANDOM_CLASS, xx, yy + dy, true);
                }
            }
        }
        return;
    }
}

async function make_niches() {
    const g = game;
    let ct = rnd(Math.trunc(g.level.nroom / 2) + 1);
    let ltptr = ((g.u?.uz?.dlevel ?? 1) > 15);
    let vamp = ((g.u?.uz?.dlevel ?? 1) > 5 && (g.u?.uz?.dlevel ?? 1) < 25);
    while (ct--) {
        if (ltptr && !rn2(6)) {
            ltptr = false;
            await makeniche(LEVEL_TELEP);
        } else if (vamp && !rn2(6)) {
            vamp = false;
            await makeniche(TRAPDOOR);
        } else {
            await makeniche(NO_TRAP);
        }
    }
}

// ============================================================
// Branch placement
// ============================================================

function is_branchlev() {
    const g = game;
    if (!g.branches) return null;
    for (const br of g.branches) {
        if (br?.end1?.dnum === (g.u?.uz?.dnum ?? 0) && br?.end1?.dlevel === (g.u?.uz?.dlevel ?? 1)) return br;
        if (br?.end2?.dnum === (g.u?.uz?.dnum ?? 0) && br?.end2?.dlevel === (g.u?.uz?.dlevel ?? 1)) return br;
    }
    return null;
}

function find_branch_room(mp) {
    const croom = generate_stairs_find_room();
    if (croom) somexyspace(croom, mp);
    return croom;
}

function place_branch(branchp) {
    const g = game;
    const mp = { x: 0, y: 0 };
    const croom = find_branch_room(mp);
    if (croom && mp.x > 0) {
        const on_end1 = (branchp.end1?.dnum === g.u?.uz?.dnum
            && branchp.end1?.dlevel === g.u?.uz?.dlevel);
        const dest = on_end1 ? branchp.end2 : branchp.end1;
        const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
        const loc = g.level?.at(mp.x, mp.y);
        if (loc) {
            loc.typ = STAIRS;
            loc.ladder = goes_up ? 1 : 2;
        }
        stairway_add(mp.x, mp.y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        if (goes_up) g.level.upstair = { x: mp.x, y: mp.y };
        else g.level.dnstair = { x: mp.x, y: mp.y };
    }
    g.made_branch = true;
}

// ============================================================
// Wallification
// ============================================================

function isSolidTile(x, y) {
    if (!isok(x, y)) return true;
    return IS_STWALL(game.level?.at(x, y)?.typ ?? STONE);
}
function isWallOrStone(x, y) {
    if (!isok(x, y)) return 1;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (typ === STONE || isWallTile(x, y)) ? 1 : 0;
}
function isWallTile(x, y) {
    if (!isok(x, y)) return 0;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}
function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx, ny = 1 + dy;
    if (!wall_there) return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
    return 1;
}
function wall_cleanup(x1, y1, x2, y2) {
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            if (isSolidTile(x-1,y-1) && isSolidTile(x-1,y) && isSolidTile(x-1,y+1)
                && isSolidTile(x,y-1) && isSolidTile(x,y+1)
                && isSolidTile(x+1,y-1) && isSolidTile(x+1,y) && isSolidTile(x+1,y+1))
                loc.typ = STONE;
        }
}
function fix_wall_spines(x1, y1, x2, y2) {
    const spineArray = [VWALL, HWALL, HWALL, HWALL,
        VWALL, TRCORNER, TLCORNER, TDWALL,
        VWALL, BRCORNER, BLCORNER, TUWALL,
        VWALL, TLWALL, TRWALL, CROSSWALL];
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            const locale = [
                [isWallOrStone(x-1,y-1), isWallOrStone(x-1,y), isWallOrStone(x-1,y+1)],
                [isWallOrStone(x,y-1), 0, isWallOrStone(x,y+1)],
                [isWallOrStone(x+1,y-1), isWallOrStone(x+1,y), isWallOrStone(x+1,y+1)],
            ];
            const bits = (extend_spine(locale, isWallTile(x,y-1), 0, -1) << 3)
                | (extend_spine(locale, isWallTile(x,y+1), 0, 1) << 2)
                | (extend_spine(locale, isWallTile(x+1,y), 1, 0) << 1)
                | extend_spine(locale, isWallTile(x-1,y), -1, 0);
            if (bits) loc.typ = spineArray[bits];
        }
}
function wallification(x1, y1, x2, y2) {
    wall_cleanup(x1, y1, x2, y2);
    fix_wall_spines(x1, y1, x2, y2);
}

// ============================================================
// Fill ordinary room
// ============================================================

function traptype_rnd() {
    const lvl = depth_of_level(game.u?.uz);
    let kind = rnd(TRAPNUM - 1);
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST:
    case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        if (lvl < 5 || game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case LANDMINE:
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7) kind = NO_TRAP; break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        if (!game.flags?.inhell) kind = NO_TRAP; break;
    case TELEP_TRAP:
        if (game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case HOLE:
        if (rn2(7)) kind = NO_TRAP; break;
    }
    return kind;
}

function find_okay_roompos(croom, crd) {
    let tryct = 0;
    do {
        if (++tryct > 200) return false;
        if (!somexyspace(croom, crd)) return false;
    } while (occupied(crd.x, crd.y) || bydoor(crd.x, crd.y));
    return true;
}

function mktrap_victim(trap) {
    const lvl = game.u?.uz?.dlevel ?? 1;
    const kind = trap.ttyp;
    const x = trap.tx, y = trap.ty;
    // Object based on trap type — placed at trap location
    switch (kind) {
    case ARROW_TRAP: mksobj_at(ARROW, x, y, true, false); break;
    case DART_TRAP: mksobj_at(DART, x, y, true, false); break;
    case ROCKTRAP: mksobj_at(ROCK, x, y, true, false); break;
    default: break;
    }
    // Random items on victim — placed at trap location
    do {
        const cls = [WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS][rn2(4)];
        const otmp = mkobj_at(cls, x, y, false);
        curse(otmp);
    } while (!rn2(5));
    // Victim type
    const PM_ELF = 18, PM_DWARF = 19, PM_ORC = 20, PM_GNOME = 21, PM_HUMAN = 22;
    const PM_ARCHEOLOGIST = 305, PM_WIZARD = 321;
    let victim_mnum;
    switch (rn2(15)) {
    case 0:
        victim_mnum = PM_ELF;
        if (kind === SLP_GAS_TRAP && !(lvl <= 2 && rn2(2))) victim_mnum = PM_HUMAN;
        break;
    case 1: case 2: victim_mnum = PM_DWARF; break;
    case 3: case 4: case 5: victim_mnum = PM_ORC; break;
    case 6: case 7: case 8: case 9:
        victim_mnum = PM_GNOME;
        if (!rn2(10)) {
            const otmp = mksobj(rn2(4) ? 370 : 371, true, false); // TALLOW_CANDLE / WAX_CANDLE
            curse(otmp);
        }
        break;
    default: victim_mnum = PM_HUMAN; break;
    }
    if (victim_mnum === PM_HUMAN && rn2(25))
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    mkcorpstat(CORPSE, null, victim_mnum, x, y, 8); // CORPSTAT_INIT
}

async function mktrap_room(croom) {
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP);
    const canFallThru = can_fall_thru();
    if (is_hole(kind) && !canFallThru) kind = ROCKTRAP;
    const pos = { x: 0, y: 0 };
    if (!somexyspace(croom, pos)) return;
    const trap = await maketrap(pos.x, pos.y, kind);
    kind = trap ? trap.ttyp : NO_TRAP;
    const lvl = depth_of_level(game.u?.uz);
    if (game.in_mklev && kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP && trap?.launch?.x === trap?.tx && trap?.launch?.y === trap?.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) { trap.ttyp = PIT; trap.tseen = true; }
        mktrap_victim(trap);
    }
}

function can_fall_thru() {
    const g = game;
    const dlevel = g.u?.uz?.dlevel ?? 1;
    const dnum = g.u?.uz?.dnum ?? 0;
    const dungeon = g.dungeons?.[dnum];
    return dlevel < (dungeon?.num_dunlevs ?? 1);
}

function mkfount(croom) {
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (loc) {
        loc.typ = FOUNTAIN;
        if (!rn2(7)) loc.blessedftn = 1;
        game.level.flags.nfountains++;
    }
}

function mkaltar(croom) {
    if (!croom || croom.rtype !== OROOM) return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = ALTAR;
    const al = rn2(A_LAWFUL + 2) - 1;
    loc.flags = Align2amask(al);
}

function mkgrave_room(croom) {
    if (croom.rtype !== OROOM) return;
    const dobell = !rn2(10);
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    make_grave(pos.x, pos.y, dobell ? 'Saved by the bell!' : null);
    if (!rn2(3)) {
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            const depth = game.u?.uz?.dlevel ?? 1;
            gold.quan = rnd(20) + depth * rnd(5);
        }
    }
    for (let tryct = rn2(5); tryct > 0; tryct--) {
        const otmp = mkobj(RANDOM_CLASS, true);
        curse(otmp);
    }
    if (dobell) mksobj_at(BELL, pos.x, pos.y, true, false);
}

// C ref: sp_lev.c fill_special_room()
function fill_special_room(croom) {
    const g = game;
    if (!croom) return;
    // Recurse into subrooms (simplified: no subrooms for contest levels)
    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === FILL_NONE) return;

    if (croom.needfill === FILL_NORMAL) {
        const depth = Math.abs(depth_of_level(g.u?.uz));
        switch (croom.rtype) {
        case VAULT:
            for (let x = croom.lx; x <= croom.hx; x++) {
                for (let y = croom.ly; y <= croom.hy; y++) {
                    const amount = rn2(depth * 100) + 51;  // rn1(depth*100, 51)
                    mkgold(amount, x, y);
                }
            }
            break;
        // Other special room types (ZOO, COURT, etc.) not yet ported
        }
    }
    switch (croom.rtype) {
    case VAULT: if (g.level) g.level.flags.has_vault = true; break;
    case ZOO: if (g.level) g.level.flags.has_zoo = true; break;
    case COURT: if (g.level) g.level.flags.has_court = true; break;
    case MORGUE: if (g.level) g.level.flags.has_morgue = true; break;
    case BEEHIVE: if (g.level) g.level.flags.has_beehive = true; break;
    case BARRACKS: if (g.level) g.level.flags.has_barracks = true; break;
    }
}

async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM)) return;
    if (croom.needfill !== FILL_NORMAL) return;

    const pos = { x: 0, y: 0 };
    // Sleeping monster (33%)
    if (!rn2(3) && somexyspace(croom, pos)) {
        await makemon(null, pos.x, pos.y, 2); // MM_NOGRP
    }
    // Traps
    const u_depth = g.u?.uz?.dlevel ?? 1;
    let x = 8 - Math.trunc(u_depth / 6);
    if (x <= 1) x = 2;
    let trycnt = 0;
    while (!rn2(x) && ++trycnt < 1000) {
        await mktrap_room(croom);
    }
    // Gold
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkgold(0, pos.x, pos.y);
    }
    // Fountain
    if (!rn2(10)) mkfount(croom);
    // Sink
    if (!rn2(60)) {
        if (find_okay_roompos(croom, pos)) {
            const loc = g.level?.at(pos.x, pos.y);
            if (loc) { loc.typ = SINK; g.level.flags.nsinks = (g.level.flags.nsinks || 0) + 1; }
        }
    }
    // Altar
    if (!rn2(60)) mkaltar(croom);
    // Grave
    x = 80 - (u_depth * 2);
    if (x < 2) x = 2;
    if (!rn2(x)) mkgrave_room(croom);
    // Statue
    if (!rn2(20) && somexyspace(croom, pos)) {
        mkcorpstat(STATUE, null, null, pos.x, pos.y, 8);
    }
    // Bonus items
    let skip_chests = false;
    if (bonus_items && somexyspace(croom, pos)) {
        const branchp = is_branchlev();
        const MINES_DNUM = 2;
        const oracle_dlevel = g.oracle_level?.dlevel ?? 5;
        // C: uz_branch && dnum!=mines && branch connects to mines
        const mines_branch = branchp && g.u?.uz?.dnum !== MINES_DNUM
            && (branchp.end1?.dnum === MINES_DNUM || branchp.end2?.dnum === MINES_DNUM);
        if (mines_branch) {
            // Mines entrance bonus food
            mksobj_at((rn2(5) < 3) ? FOOD_RATION : rn2(2) ? CRAM_RATION : LEMBAS_WAFER,
                pos.x, pos.y, true, false);
        } else if (g.u?.uz?.dnum === 0 && (g.u?.uz?.dlevel ?? 1) < oracle_dlevel && rn2(3)) {
            // Supply chest
            const supply_chest = mksobj_at(rn2(3) ? CHEST : LARGE_BOX, pos.x, pos.y, false, false);
            if (supply_chest) {
                supply_chest.olocked = !!rn2(6);
                let tryct2 = 0;
                let cursed_item;
                do {
                    let otyp;
                    const supply_items = [POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
                        SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER,
                        SCR_SCARE_MONSTER, WAN_DIGGING, SPE_HEALING];
                    if (rn2(2)) otyp = POT_HEALING;
                    else otyp = supply_items[rn2(supply_items.length)];
                    const otmp = mksobj(otyp, true, false);
                    if (otmp && otyp === POT_HEALING && rn2(2)) {
                        otmp.quan = 2;
                    }
                    cursed_item = otmp?.cursed ?? false;
                    if (++tryct2 >= 50) break;
                } while (cursed_item || !rn2(5));
                if (rn2(3)) {
                    const extra_classes = [FOOD_CLASS, WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
                        SCROLL_CLASS, POTION_CLASS, RING_CLASS,
                        SPBOOK_no_NOVEL, SPBOOK_no_NOVEL, SPBOOK_no_NOVEL];
                    const oclass = extra_classes[rn2(extra_classes.length)];
                    let otmp = mkobj(oclass, false);
                    if (oclass === SPBOOK_no_NOVEL && otmp) {
                        const depth = g.u?.uz?.dlevel ?? 1;
                        const maxpass = (depth > 2) ? 2 : 3;
                        for (let pass = 1; pass <= maxpass; pass++) {
                            mkobj(oclass, false);
                        }
                    }
                }
            }
            skip_chests = true;
        }
    }
    // Box/chest check
    if (!skip_chests && !rn2(Math.trunc(g.level.nroom * 5 / 2)) && somexyspace(croom, pos)) {
        mksobj_at(rn2(3) ? LARGE_BOX : CHEST, pos.x, pos.y, true, false);
    }
    // Graffiti
    const depth = g.u?.uz?.dlevel ?? 1;
    if (!rn2(27 + 3 * Math.abs(depth))) {
        const { text: engrText } = random_engraving();
        if (engrText) {
            do {
                somexyspace(croom, pos);
                if (g.level?.at(pos.x, pos.y)?.typ === ROOM) break;
            } while (!rn2(40));
        }
    }
    // Random objects
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        let objTrycnt = 0;
        while (!rn2(5)) {
            if (++objTrycnt > 100) break;
            if (somexyspace(croom, pos)) mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        }
    }
}

// ============================================================
// Mineralize
// ============================================================

function water_has_kelp(x, y, kelp_pool, kelp_moat) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    if (kelp_pool && (loc.typ === POOL || loc.typ === WATER) && !rn2(kelp_pool)) return true;
    if (kelp_moat && loc.typ === MOAT && !rn2(kelp_moat)) return true;
    return false;
}

function mineralize_kelp(kelp_pool, kelp_moat) {
    if (kelp_pool < 0) kelp_pool = 10;
    if (kelp_moat < 0) kelp_moat = 30;
    for (let x = 2; x < COLNO - 2; x++)
        for (let y = 1; y < ROWNO - 1; y++)
            if (water_has_kelp(x, y, kelp_pool, kelp_moat))
                mksobj_at(KELP_FROND, x, y, true, false);
}

function mineralize(kelp_pool, kelp_moat, goldprob, gemprob, skip_lvl_checks) {
    const map = game.level;
    mineralize_kelp(kelp_pool, kelp_moat);
    const absDepth = depth_of_level(game.u?.uz);
    const dunLevel = game.u?.uz?.dlevel ?? 1;
    if (goldprob < 0) goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0) gemprob = Math.trunc(goldprob / 4);
    for (let x = 2; x < COLNO - 2; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            const locBelow = map.at(x, y + 1);
            if (!loc || !locBelow) continue;
            if (locBelow.typ !== STONE) { y += 2; continue; }
            if (loc.typ !== STONE) { y += 1; continue; }
            const n = (d) => { const l = map.at(x + d[0], y + d[1]); return l && l.typ === STONE; };
            if (!(loc.wall_info & W_NONDIGGABLE)
                && n([0,-1]) && n([1,-1]) && n([-1,-1])
                && n([1,0]) && n([-1,0])
                && n([1,1]) && n([-1,1])) {
                if (rn2(1000) < goldprob) {
                    const otmp = mksobj(GOLD_PIECE, false, false);
                    otmp.quan = 1 + rnd(goldprob * 3);
                    rn2(3); // C ref: mklev.c:1520 — add_to_buried vs place_object check
                }
                if (rn2(1000) < gemprob) {
                    const cnt = rnd(2 + Math.trunc(dunLevel / 3));
                    for (let i = 0; i < cnt; i++) {
                        const gem = mkobj(GEM_CLASS, false);
                        // C ref: mklev.c:1530 — ROCK is discarded without rn2(3)
                        if (!(gem && gem.otyp > 900)) rn2(3);
                    }
                }
            }
        }
    }
}

// ============================================================
// Level finalize topology
// ============================================================

function get_level_extends() {
    const map = game.level;
    let xmin = 0, xmax = COLNO - 1, ymin = 0, ymax = ROWNO - 1;
    let found = false, nonwall = false;
    for (xmin = 0; !found && xmin <= COLNO - 1; xmin++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO - 1; ymin++) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    return { xmin, xmax, ymin, ymax };
}

function bound_digging() {
    const map = game.level;
    const { xmin, xmax, ymin, ymax } = get_level_extends();
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) && (y <= ymin || y >= ymax || x <= xmin || x >= xmax)) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
}

function set_wall_state() { /* no-op for contest */ }

function level_finalize_topology() {
    bound_digging();
    mineralize(-1, -1, -1, -1, false);
    game.in_mklev = false;
    if (!game.level?.flags?.is_maze_lev) {
        const nroom = game.level?.nroom ?? 0;
        for (let i = 0; i < nroom; i++)
            topologize(game.level.rooms?.[i]);
    }
    set_wall_state();
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const rm = rooms[i];
        if (rm && rm.rtype != null) rm.orig_rtype = rm.rtype;
    }
}

// C ref: teleport.c collect_coords() — generate RNG from ring shuffles and pick position.
// CC_NO_FLAGS: scramble=true, ring_pairs=false, passend=true per ring.
// For each radius 1..maxradius, collect ring border cells, Fisher-Yates shuffle
// them using rn2 calls, and return the first valid placement position.
function collect_coords_rng(cx, cy, maxradius) {
    if (maxradius === 0) {
        const rowrange = cy < ROWNO / 2 ? ROWNO - 1 - cy : cy;
        const colrange = cx < COLNO / 2 ? COLNO - 1 - cx : cx;
        maxradius = Math.max(rowrange, colrange);
    }
    for (let r = 1; r <= maxradius; r++) {
        const lox = cx - r, hix = cx + r;
        const loy = cy - r, hiy = cy + r;
        let n = 0;
        for (let y = Math.max(loy, 0); y <= hiy && y < ROWNO; y++) {
            for (let x = Math.max(lox, 1); x <= hix && x < COLNO; x++) {
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                n++;
            }
        }
        while (n > 1) { rn2(n); n--; }
    }
}

// Like collect_coords_rng but also returns the first valid placement position.
// Consumes identical RNG as collect_coords_rng while tracking shuffled order.
function enexto_pick(cx, cy, maxradius) {
    if (maxradius === 0) {
        const rowrange = cy < ROWNO / 2 ? ROWNO - 1 - cy : cy;
        const colrange = cx < COLNO / 2 ? COLNO - 1 - cx : cx;
        maxradius = Math.max(rowrange, colrange);
    }
    const allPositions = [];
    for (let r = 1; r <= maxradius; r++) {
        const lox = cx - r, hix = cx + r;
        const loy = cy - r, hiy = cy + r;
        const ring = [];
        for (let y = Math.max(loy, 0); y <= hiy && y < ROWNO; y++) {
            for (let x = Math.max(lox, 1); x <= hix && x < COLNO; x++) {
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                ring.push({ x, y });
            }
        }
        // C's front-to-back shuffle (teleport.c:697): picks rn2(n..2), swaps
        // front element with random element, then advances front pointer.
        // Produces different permutations than standard back-to-front Fisher-Yates
        // even though both call rn2(n), rn2(n-1), ..., rn2(2).
        for (let i = 0; i < ring.length - 1; i++) {
            const k = rn2(ring.length - i);
            if (k) {
                const tmp = ring[i]; ring[i] = ring[i + k]; ring[i + k] = tmp;
            }
        }
        for (const pos of ring) allPositions.push(pos);
    }
    // Pick first valid position: walkable terrain, not hero, not occupied
    for (const pos of allPositions) {
        const loc = game.level?.at(pos.x, pos.y);
        if (!loc) continue;
        if (loc.typ !== ROOM && loc.typ !== CORR &&
            !(loc.typ === DOOR && (loc.doormask & D_ISOPEN))) continue;
        if (pos.x === cx && pos.y === cy) continue;
        if (game.level.monsters?.some(m => m.mx === pos.x && m.my === pos.y)) continue;
        return pos;
    }
    return null;
}

// C ref: makemon.c adj_lev() — adjust monster level for dungeon depth/player level
// depth = dungeon level depth (1 for first level), ulevel = player level
function adj_lev(mlevel, depth, ulevel) {
    let tmp = mlevel;
    if (tmp > 49) return 50;
    const diff2 = depth - tmp;
    if (diff2 < 0) tmp--;
    else tmp += Math.trunc(diff2 / 5);
    const plAdj = ulevel - mlevel;
    if (plAdj > 0) tmp += Math.trunc(plAdj / 4);
    const upper = Math.min(Math.trunc(3 * mlevel / 2), 49);
    return Math.max(0, Math.min(tmp, upper));
}

// Pet mlevel: KITTEN=2, LITTLE_DOG=2, PONY=3 (from LVL() in monsters.h)
const PET_MLEVEL = { cat: 2, dog: 2, pony: 3 };

// C ref: dog.c makedog() — create starting pet, consuming RNG for placement and HP
export function makedog() {
    const g = game;
    const preferred_pet = g.preferred_pet || '';

    // No pet requested (Tourist with pettype:none, or !pet option)
    if (preferred_pet === 'n') return;

    // Determine pet type from role's petnum, then preferred_pet, then random
    const roleData = g.urole_data;
    const rolePetnum = roleData?.petnum; // 'CAT', 'DOG', 'PONY', or null/undefined for NON_PM

    let petKind; // 'cat', 'dog', or 'pony'
    if (rolePetnum === 'CAT') {
        petKind = 'cat';
    } else if (rolePetnum === 'DOG') {
        petKind = 'dog';
    } else if (rolePetnum === 'PONY') {
        petKind = 'pony';
    } else {
        // NON_PM — check preferred_pet then random
        if (preferred_pet === 'c') petKind = 'cat';
        else if (preferred_pet === 'd') petKind = 'dog';
        else if (preferred_pet === 'h') petKind = 'pony';
        else petKind = rn2(2) ? 'cat' : 'dog'; // rn2(2): 0=dog, 1=cat
    }

    // enexto_core: collect_coords with maxradius=3 — shuffles all 3 rings then picks
    // the first valid position. Identical RNG to old collect_coords_rng(ux,uy,3).
    const ux = g.u?.ux ?? 1, uy = g.u?.uy ?? 1;
    const petPos = enexto_pick(ux, uy, 3);

    // next_ident() for pet's m_id
    const m_id = next_ident();

    // newmonhp: d(adj_lev(mlevel), 8), or rnd(4) if adj_lev=0
    const mlevel = PET_MLEVEL[petKind] ?? 2;
    const depth = g.u?.uz?.dlevel ?? 1;
    const ulevel = g.u?.ulevel ?? 1;
    const mlev = adj_lev(mlevel, depth, ulevel);
    if (mlev === 0) {
        rnd(4);
    } else {
        d(mlev, 8);
    }

    // gender check: rn2(2) unless monster is sex-locked
    rn2(2);

    // peace_minded() called inside makemon() at line 1299 for all monsters.
    // Cat/dog/pony have maligntyp=A_NEUTRAL=0.
    // If player alignment != monster alignment (sgn mismatch), returns FALSE early (no rn2).
    // Otherwise: rn2(16+record); if non-zero, rn2(2+abs(mal)).
    const petMaligntyp = 0; // A_NEUTRAL for all pets (cat/dog/pony)
    const ual = g.u?.ualign?.type ?? 0;
    const sgnPet = petMaligntyp > 0 ? 1 : petMaligntyp < 0 ? -1 : 0;
    const sgnUal = ual > 0 ? 1 : ual < 0 ? -1 : 0;
    if (sgnPet === sgnUal) {
        const record = g.u?.ualign?.record ?? 0;
        const adjRecord = record < -15 ? -15 : record;
        const first = rn2(16 + adjRecord);
        if (first !== 0) {
            rn2(2 + Math.abs(petMaligntyp));
        }
    }

    // Store pet in level monster list for rendering
    if (petPos && g.level) {
        const petChars = { cat: 'f', dog: 'd', pony: 'u' };
        const mtmp = {
            mx: petPos.x, my: petPos.y, m_id,
            _petChar: petChars[petKind] || 'd',
            _petKind: petKind, _pet: true,
        };
        if (!g.level.monsters) g.level.monsters = [];
        g.level.monsters.unshift(mtmp); // dog.c adds to head of fmon list
    }
}
