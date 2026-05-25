// u_init.js — Port of u_init.c: starting inventory for all 13 roles + race extras.
// C ref: nethack-c/upstream/src/u_init.c

import { rn2, rnd, rn1 } from "./rng.js";
import { mksobj, mkobj } from "./mklev.js";
import { game } from "./gstate.js";
import { MON_NAMES } from "./mondata.js";

// Object classes (must match mklev.js)
const WEAPON_CLASS = 2;
const ARMOR_CLASS  = 3;
const RING_CLASS   = 4;
const AMULET_CLASS = 5;
const TOOL_CLASS   = 6;
const FOOD_CLASS   = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS   = 11;
const COIN_CLASS   = 12;
const GEM_CLASS    = 13;

// Sentinel values for trobj fields
const UNDEF_TYP   = 0;    // STRANGE_OBJECT
const UNDEF_SPE   = -127; // (schar)-127
const UNDEF_BLESS = -1;   // char sentinel for "don't set blessed"

// Spell skill disciplines
const P_ATTACK_SPELL      = 28;
const P_HEALING_SPELL     = 29;
const P_DIVINATION_SPELL  = 30;
const P_ENCHANTMENT_SPELL = 31;
const P_CLERIC_SPELL      = 32;
const P_ESCAPE_SPELL      = 33;
const P_MATTER_SPELL      = 34;

// otyp constants — from cpp -DOBJECTS_ENUM on objects.h (verified)
const ARROW                    = 18;
const YA                       = 22;
const DART                     = 24;
const SPEAR                    = 27;
const DAGGER                   = 34;
const SCALPEL                  = 39;
const AXE                      = 44;
const BATTLE_AXE               = 45;
const SHORT_SWORD              = 46;
const LONG_SWORD               = 54;
const TWO_HANDED_SWORD         = 55;
const KATANA                   = 56;
const LANCE                    = 72;
const MACE                     = 73;
const CLUB                     = 77;
const QUARTERSTAFF             = 79;
const BULLWHIP                 = 82;
const BOW                      = 83;
const YUMI                     = 86;
const SLING                    = 87;

const FEDORA                   = 92;
const HELMET                   = 97;
const SPLINT_MAIL              = 124;
const RING_MAIL                = 132;
const ORCISH_RING_MAIL         = 133;
const LEATHER_ARMOR            = 134;
const LEATHER_JACKET           = 135;
const HAWAIIAN_SHIRT           = 136;
const ROBE                     = 143;
const CLOAK_OF_MAGIC_RESISTANCE = 148;
const CLOAK_OF_DISPLACEMENT    = 149;
const SMALL_SHIELD             = 150;
const LEATHER_GLOVES           = 159;

const SKELETON_KEY             = 221;
const SACK                     = 217;
const OILSKIN_SACK             = 218;
const LOCK_PICK                = 222;
const CREDIT_CARD              = 223;
const OIL_LAMP                 = 227;
const EXPENSIVE_CAMERA         = 229;
const BLINDFOLD                = 233;
const TOWEL                    = 234;
const LEASH                    = 236;
const STETHOSCOPE              = 237;
const TINNING_KIT              = 238;
const TIN_OPENER               = 239;
const MAGIC_MARKER             = 242;
const PICK_AXE                 = 259;
const WOODEN_FLUTE             = 247;
const TOOLED_HORN              = 249;
const WOODEN_HARP              = 253;
const BELL                     = 255;
const BUGLE                    = 256;
const LEATHER_DRUM             = 257;
const TOUCHSTONE               = 471;

const TRIPE_RATION             = 264;
const EGG                      = 266;
const EUCALYPTUS_LEAF          = 276;
const APPLE                    = 277;
const ORANGE                   = 278;
const PEAR                     = 279;
const MELON                    = 280;
const BANANA                   = 281;
const CARROT                   = 282;
const SPRIG_OF_WOLFSBANE       = 283;
const CLOVE_OF_GARLIC          = 284;
const SLIME_MOLD               = 285;
const CREAM_PIE                = 287;
const CANDY_BAR                = 288;
const FORTUNE_COOKIE           = 289;
const PANCAKE                  = 290;
const LEMBAS_WAFER             = 291;
const CRAM_RATION              = 292;
const FOOD_RATION              = 293;
const TIN                      = 296;

const POT_HALLUCINATION        = 304;
const POT_HEALING              = 307;
const POT_EXTRA_HEALING        = 308;
const POT_ACID                 = 320;
const POT_SICKNESS             = 318;
const POT_WATER                = 322;
const POT_POLYMORPH            = 316;

const RIN_LEVITATION           = 183;
const RIN_AGGRAVATE_MONSTER    = 185;
const RIN_HUNGER               = 184;
const RIN_POISON_RESISTANCE    = 188;
const RIN_POLYMORPH            = 196;
const RIN_POLYMORPH_CONTROL    = 197;

const SCR_ENCHANT_WEAPON       = 328;
const SCR_MAGIC_MAPPING        = 337;
const SCR_AMNESIA              = 338;
const SCR_FIRE                 = 339;
const SCR_BLANK_PAPER          = 364;

const SPE_DIG                  = 365;
const SPE_MAGIC_MISSILE        = 366;
const SPE_FIREBALL             = 367;
const SPE_CONE_OF_COLD         = 368;
const SPE_SLEEP                = 369;
const SPE_FINGER_OF_DEATH      = 370;
const SPE_LIGHT                = 371;
const SPE_DETECT_MONSTERS      = 372;
const SPE_HEALING              = 373;
const SPE_KNOCK                = 374;
const SPE_FORCE_BOLT           = 375;
const SPE_CONFUSE_MONSTER      = 376;
const SPE_CURE_BLINDNESS       = 377;
const SPE_DRAIN_LIFE           = 378;
const SPE_SLOW_MONSTER         = 379;
const SPE_WIZARD_LOCK          = 380;
const SPE_CREATE_MONSTER       = 381;
const SPE_DETECT_FOOD          = 382;
const SPE_CAUSE_FEAR           = 383;
const SPE_CLAIRVOYANCE         = 384;
const SPE_CURE_SICKNESS        = 385;
const SPE_CHARM_MONSTER        = 386;
const SPE_HASTE_SELF           = 387;
const SPE_DETECT_UNSEEN        = 388;
const SPE_LEVITATION           = 389;
const SPE_EXTRA_HEALING        = 390;
const SPE_RESTORE_ABILITY      = 391;
const SPE_INVISIBILITY         = 392;
const SPE_DETECT_TREASURE      = 393;
const SPE_REMOVE_CURSE         = 394;
const SPE_MAGIC_MAPPING        = 395;
const SPE_IDENTIFY             = 396;
const SPE_TURN_UNDEAD          = 397;
const SPE_POLYMORPH            = 398;
const SPE_TELEPORT_AWAY        = 399;
const SPE_CREATE_FAMILIAR      = 400;
const SPE_CANCELLATION         = 401;
const SPE_PROTECTION           = 402;
const SPE_JUMPING              = 403;
const SPE_STONE_TO_FLESH       = 404;
const SPE_CHAIN_LIGHTNING      = 405;
const SPE_BLANK_PAPER          = 406;
const SPE_NOVEL                = 407;
const SPE_BOOK_OF_THE_DEAD     = 408;

const WAN_NOTHING              = 415;
const WAN_WISHING              = 413;
const WAN_POLYMORPH            = 421;
const WAN_SLEEP                = 431;

const GOLD_PIECE               = 437;

const LUCKSTONE                = 469;
const LOADSTONE                = 470;
const FLINT                    = 472;
const ROCK                     = 473;

const STRANGE_OBJECT           = 0;

// Spell discipline for each spellbook otyp (from SPELL macro sub field)
// Used by restricted_spell_discipline() for ini_inv_mkobj_filter
const SPE_SKILL = {
    [SPE_DIG]:            P_MATTER_SPELL,
    [SPE_MAGIC_MISSILE]:  P_ATTACK_SPELL,
    [SPE_FIREBALL]:       P_ATTACK_SPELL,
    [SPE_CONE_OF_COLD]:   P_ATTACK_SPELL,
    [SPE_SLEEP]:          P_ENCHANTMENT_SPELL,
    [SPE_FINGER_OF_DEATH]: P_ATTACK_SPELL,
    [SPE_LIGHT]:          P_DIVINATION_SPELL,
    [SPE_DETECT_MONSTERS]: P_DIVINATION_SPELL,
    [SPE_HEALING]:        P_HEALING_SPELL,
    [SPE_KNOCK]:          P_MATTER_SPELL,
    [SPE_FORCE_BOLT]:     P_ATTACK_SPELL,
    [SPE_CONFUSE_MONSTER]: P_ENCHANTMENT_SPELL,
    [SPE_CURE_BLINDNESS]: P_HEALING_SPELL,
    [SPE_DRAIN_LIFE]:     P_ATTACK_SPELL,
    [SPE_SLOW_MONSTER]:   P_ENCHANTMENT_SPELL,
    [SPE_WIZARD_LOCK]:    P_MATTER_SPELL,
    [SPE_CREATE_MONSTER]: P_CLERIC_SPELL,
    [SPE_DETECT_FOOD]:    P_DIVINATION_SPELL,
    [SPE_CAUSE_FEAR]:     P_ENCHANTMENT_SPELL,
    [SPE_CLAIRVOYANCE]:   P_DIVINATION_SPELL,
    [SPE_CURE_SICKNESS]:  P_HEALING_SPELL,
    [SPE_CHARM_MONSTER]:  P_ENCHANTMENT_SPELL,
    [SPE_HASTE_SELF]:     P_ESCAPE_SPELL,
    [SPE_DETECT_UNSEEN]:  P_DIVINATION_SPELL,
    [SPE_LEVITATION]:     P_ESCAPE_SPELL,
    [SPE_EXTRA_HEALING]:  P_HEALING_SPELL,
    [SPE_RESTORE_ABILITY]: P_HEALING_SPELL,
    [SPE_INVISIBILITY]:   P_ESCAPE_SPELL,
    [SPE_DETECT_TREASURE]: P_DIVINATION_SPELL,
    [SPE_REMOVE_CURSE]:   P_CLERIC_SPELL,
    [SPE_MAGIC_MAPPING]:  P_DIVINATION_SPELL,
    [SPE_IDENTIFY]:       P_DIVINATION_SPELL,
    [SPE_TURN_UNDEAD]:    P_CLERIC_SPELL,
    [SPE_POLYMORPH]:      P_MATTER_SPELL,
    [SPE_TELEPORT_AWAY]:  P_ESCAPE_SPELL,
    [SPE_CREATE_FAMILIAR]: P_CLERIC_SPELL,
    [SPE_CANCELLATION]:   P_MATTER_SPELL,
    [SPE_PROTECTION]:     P_CLERIC_SPELL,
    [SPE_JUMPING]:        P_ESCAPE_SPELL,
    [SPE_STONE_TO_FLESH]: P_HEALING_SPELL,
    [SPE_CHAIN_LIGHTNING]: P_ATTACK_SPELL,
};

// Spell level for each spellbook otyp (from SPELL macro level field)
const SPE_LEVEL = {
    [SPE_LIGHT]:          1,
    [SPE_DETECT_MONSTERS]:1,
    [SPE_HEALING]:        1,
    [SPE_KNOCK]:          1,
    [SPE_FORCE_BOLT]:     1,
    [SPE_CONFUSE_MONSTER]:1,
    [SPE_PROTECTION]:     1,
    [SPE_JUMPING]:        1,
    [SPE_STONE_TO_FLESH]: 1,
    [SPE_MAGIC_MISSILE]:  2,
    [SPE_CURE_BLINDNESS]: 2,
    [SPE_DRAIN_LIFE]:     2,
    [SPE_SLOW_MONSTER]:   2,
    [SPE_WIZARD_LOCK]:    2,
    [SPE_CREATE_MONSTER]: 2,
    [SPE_DETECT_FOOD]:    2,
    [SPE_CHAIN_LIGHTNING]:2,
    [SPE_SLEEP]:          3,
    [SPE_CAUSE_FEAR]:     3,
    [SPE_CLAIRVOYANCE]:   3,
    [SPE_CURE_SICKNESS]:  3,
    [SPE_HASTE_SELF]:     3,
    [SPE_DETECT_UNSEEN]:  3,
    [SPE_EXTRA_HEALING]:  3,
    [SPE_REMOVE_CURSE]:   3,
    [SPE_IDENTIFY]:       3,
    [SPE_FIREBALL]:       4,
    [SPE_CONE_OF_COLD]:   4,
    [SPE_LEVITATION]:     4,
    [SPE_RESTORE_ABILITY]:4,
    [SPE_INVISIBILITY]:   4,
    [SPE_DETECT_TREASURE]:4,
    [SPE_DIG]:            5,
    [SPE_CHARM_MONSTER]:  5,
    [SPE_MAGIC_MAPPING]:  5,
    [SPE_TURN_UNDEAD]:    6,
    [SPE_POLYMORPH]:      6,
    [SPE_TELEPORT_AWAY]:  6,
    [SPE_CREATE_FAMILIAR]:6,
    [SPE_FINGER_OF_DEATH]:7,
    [SPE_CANCELLATION]:   7,
    [SPE_BLANK_PAPER]:    0,
};

// Allowed spell disciplines per role (Priest is the only restrictor; Wizard allows all)
// A role NOT listed here allows all spell disciplines.
// Priest: only healing, divination, cleric spells
const PRIEST_ALLOWED_SPELL_SKILLS = new Set([
    P_HEALING_SPELL, P_DIVINATION_SPELL, P_CLERIC_SPELL,
]);

function is_graystone(otyp) {
    return otyp === LUCKSTONE || otyp === LOADSTONE || otyp === FLINT;
}

// Returns true if the spell is restricted for this role (can't be a starting book)
function restricted_spell_discipline(otyp, roleName) {
    const skill = SPE_SKILL[otyp];
    if (skill === undefined) return true; // unknown spell → restrict
    if (roleName === 'Priest') {
        return !PRIEST_ALLOWED_SPELL_SKILLS.has(skill);
    }
    // Wizard and all others: no restriction by discipline
    return false;
}

// C ref: u_init.c trquan() — randomize quantity from trobj entry
function trquan(trop) {
    const min = trop.qmin;
    if (!min) return 1; // trquan_min == 0: return 1 without RNG
    return min + rn2(trop.qmax - min + 1);
}

// C ref: u_init.c ini_inv_mkobj_filter() — create random object avoiding forbidden items
// Retries until a suitable item is found (each retry consumes RNG calls).
function ini_inv_mkobj_filter(oclass, got_sp1, roleName, raceName) {
    const g = game;
    while (true) {
        const obj = mkobj(oclass, false);
        const otyp = obj.otyp;
        let ok = true;

        if (otyp === WAN_WISHING) ok = false;
        if (g.nocreate  && otyp === g.nocreate)  ok = false;
        if (g.nocreate2 && otyp === g.nocreate2) ok = false;
        if (g.nocreate3 && otyp === g.nocreate3) ok = false;
        if (g.nocreate4 && otyp === g.nocreate4) ok = false;
        if (otyp === RIN_LEVITATION) ok = false;
        // Useless items
        if (otyp === POT_HALLUCINATION || otyp === POT_ACID) ok = false;
        if (otyp === SCR_AMNESIA || otyp === SCR_FIRE || otyp === SCR_BLANK_PAPER) ok = false;
        if (otyp === SPE_BLANK_PAPER || otyp === SPE_NOVEL) ok = false;
        if (otyp === RIN_AGGRAVATE_MONSTER || otyp === RIN_HUNGER) ok = false;
        if (otyp === WAN_NOTHING) ok = false;
        // Race-specific
        if (otyp === RIN_POISON_RESISTANCE && raceName === 'orc') ok = false;
        // Role-specific
        if (otyp === SCR_ENCHANT_WEAPON && roleName === 'Monk') ok = false;
        // Wizard already has SPE_FORCE_BOLT from their trobj array
        if (otyp === SPE_FORCE_BOLT && roleName === 'Wizard') ok = false;
        // Spellbook restrictions
        if (ok && obj.oclass === SPBOOK_CLASS) {
            const level = SPE_LEVEL[otyp] ?? 99;
            const maxLevel = got_sp1 ? 3 : 1;
            if (level > maxLevel) ok = false;
            if (restricted_spell_discipline(otyp, roleName)) ok = false;
        }
        // Polymorph prevention
        if (otyp === RIN_POLYMORPH || otyp === RIN_POLYMORPH_CONTROL
            || otyp === SPE_POLYMORPH || otyp === POT_POLYMORPH) {
            if (otyp === RIN_POLYMORPH || otyp === WAN_POLYMORPH || otyp === POT_POLYMORPH) {
                if (ok) {
                    g.nocreate = g.nocreate || RIN_POLYMORPH_CONTROL;
                }
            } else if (otyp === RIN_POLYMORPH_CONTROL) {
                if (ok) {
                    g.nocreate = g.nocreate || RIN_POLYMORPH;
                    g.nocreate2 = g.nocreate2 || SPE_POLYMORPH;
                    g.nocreate3 = g.nocreate3 || POT_POLYMORPH;
                }
            }
        }

        if (ok) {
            // Track duplicate prevention for rings and spellbooks
            if (obj.oclass === RING_CLASS || obj.oclass === SPBOOK_CLASS) {
                g.nocreate4 = otyp;
            }
            // Track first level-1 spellbook for got_sp1 flag
            return obj;
        }
        // Retry — obj is discarded, mkobj called again
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// addinv: letter assignment, stacking, and description generation
// ─────────────────────────────────────────────────────────────────────────────

// Per-otyp display metadata: name, optional plural, optional typeStr for
// appearance lookup, noUncursed flag for items that omit BUC prefix.
const ITEM_NAMES = {
    // Weapons
    [ARROW]:     { name: 'arrow' },
    [YA]:        { name: 'ya', plural: 'ya' },
    [DART]:      { name: 'dart' },
    [SPEAR]:     { name: 'spear' },
    [DAGGER]:    { name: 'dagger' },
    [SCALPEL]:   { name: 'scalpel' },
    [AXE]:       { name: 'axe' },
    [BATTLE_AXE]:{ name: 'battle-axe', plural: 'battle-axes' },
    [SHORT_SWORD]:{ name: 'short sword' },
    [LONG_SWORD]: { name: 'long sword' },
    [TWO_HANDED_SWORD]: { name: 'two-handed sword' },
    [KATANA]:    { name: 'katana' },
    [LANCE]:     { name: 'lance' },
    [MACE]:      { name: 'mace' },
    [CLUB]:      { name: 'club' },
    [QUARTERSTAFF]: { name: 'quarterstaff' },
    [BULLWHIP]:  { name: 'bullwhip' },
    [BOW]:       { name: 'bow' },
    [YUMI]:      { name: 'yumi' },
    [SLING]:     { name: 'sling' },
    // Armor
    [FEDORA]:    { name: 'fedora' },
    [HELMET]:    { name: 'helmet' },
    [SPLINT_MAIL]: { name: 'splint mail' },
    [RING_MAIL]: { name: 'ring mail' },
    [LEATHER_ARMOR]: { name: 'leather armor' },
    [LEATHER_JACKET]: { name: 'leather jacket' },
    [HAWAIIAN_SHIRT]: { name: 'Hawaiian shirt' },
    [ROBE]:      { name: 'robe' },
    [CLOAK_OF_MAGIC_RESISTANCE]: { name: 'cloak of magic resistance' },
    [CLOAK_OF_DISPLACEMENT]: { name: 'cloak of displacement' },
    [SMALL_SHIELD]: { name: 'small shield' },
    [LEATHER_GLOVES]: { name: 'pair of leather gloves', plural: 'pairs of leather gloves' },
    // Tools
    [SKELETON_KEY]: { name: 'skeleton key' },
    [SACK]:      { name: 'sack' },
    [OILSKIN_SACK]: { name: 'oilskin sack' },
    [LOCK_PICK]: { name: 'lock pick' },
    [CREDIT_CARD]: { name: 'credit card' },
    [OIL_LAMP]:  { name: 'oil lamp' },
    [EXPENSIVE_CAMERA]: { name: 'expensive camera', noUncursed: true },
    [BLINDFOLD]: { name: 'blindfold' },
    [TOWEL]:     { name: 'towel' },
    [LEASH]:     { name: 'leash' },
    [STETHOSCOPE]: { name: 'stethoscope' },
    [TINNING_KIT]: { name: 'tinning kit' },
    [TIN_OPENER]: { name: 'tin opener' },
    [MAGIC_MARKER]: { name: 'magic marker' },
    [PICK_AXE]:  { name: 'pick-axe', plural: 'pick-axes' },
    // Food
    [TRIPE_RATION]: { name: 'tripe ration' },
    [EGG]:       { name: 'egg' },
    [EUCALYPTUS_LEAF]: { name: 'eucalyptus leaf', plural: 'eucalyptus leaves' },
    [APPLE]:     { name: 'apple' },
    [ORANGE]:    { name: 'orange' },
    [PEAR]:      { name: 'pear' },
    [MELON]:     { name: 'melon' },
    [BANANA]:    { name: 'banana' },
    [CARROT]:    { name: 'carrot' },
    [SPRIG_OF_WOLFSBANE]: { name: 'sprig of wolfsbane' },
    [CLOVE_OF_GARLIC]: { name: 'clove of garlic' },
    [SLIME_MOLD]: { name: 'slime mold' },
    [CREAM_PIE]: { name: 'cream pie' },
    [CANDY_BAR]: { name: 'candy bar' },
    [FORTUNE_COOKIE]: { name: 'fortune cookie' },
    [PANCAKE]:   { name: 'pancake' },
    [LEMBAS_WAFER]: { name: 'lembas wafer' },
    [CRAM_RATION]: { name: 'cram ration' },
    [FOOD_RATION]: { name: 'food ration' },
    [TIN]:       { name: 'tin' },
    // Potions
    [POT_HEALING]: { name: 'potion of healing', typeStr: 'potion of healing' },
    [POT_EXTRA_HEALING]: { name: 'potion of extra healing', typeStr: 'potion of extra healing' },
    [POT_SICKNESS]: { name: 'potion of sickness', typeStr: 'potion of sickness' },
    [POT_WATER]: { name: 'potion of water', typeStr: 'potion of water' },
    // Scrolls
    [SCR_MAGIC_MAPPING]: { name: 'scroll of magic mapping', typeStr: 'scroll of magic mapping' },
    // Spellbooks
    [SPE_HEALING]: { name: 'spellbook of healing' },
    [SPE_EXTRA_HEALING]: { name: 'spellbook of extra healing' },
    [SPE_STONE_TO_FLESH]: { name: 'spellbook of stone to flesh' },
    [SPE_FORCE_BOLT]: { name: 'spellbook of force bolt' },
    [SPE_CONFUSE_MONSTER]: { name: 'spellbook of confuse monster' },
    [SPE_PROTECTION]: { name: 'spellbook of protection' },
    // Wands
    [WAN_SLEEP]: { name: 'wand of sleep' },
    // Gold
    [GOLD_PIECE]: { name: 'gold piece' },
    // Gems/stones
    [LUCKSTONE]:  { name: 'luckstone' },
    [LOADSTONE]:  { name: 'loadstone' },
    [TOUCHSTONE]: { name: 'touchstone' },
    [FLINT]:      { name: 'flint stone', plural: 'flint stones' },
    [ROCK]:       { name: 'rock' },
};

function oclass_to_category(oclass) {
    switch (oclass) {
        case WEAPON_CLASS: return 'Weapons';
        case ARMOR_CLASS:  return 'Armor';
        case RING_CLASS:   return 'Rings';
        case AMULET_CLASS: return 'Amulets';
        case TOOL_CLASS:   return 'Tools';
        case FOOD_CLASS:   return 'Comestibles';
        case POTION_CLASS: return 'Potions';
        case SCROLL_CLASS: return 'Scrolls';
        case SPBOOK_CLASS: return 'Spellbooks';
        case WAND_CLASS:   return 'Wands';
        case COIN_CLASS:   return 'Coins';
        case GEM_CLASS:    return 'Gems/Stones';
        default:           return 'Miscellaneous';
    }
}

function next_inv_letter() {
    const invent = game.u.invent || [];
    const used = new Set(invent.map(i => i.letter));
    for (let i = 0; i < 26; i++) {
        const c = String.fromCharCode(97 + i); // 'a'-'z'
        if (!used.has(c)) return c;
    }
    for (let i = 0; i < 26; i++) {
        const c = String.fromCharCode(65 + i); // 'A'-'Z'
        if (!used.has(c)) return c;
    }
    return '?';
}

// Pluralize a simple word, or for "X of Y" compounds pluralize only X.
function pluralize(name, explicitPlural) {
    if (explicitPlural) return explicitPlural;
    const ofIdx = name.indexOf(' of ');
    if (ofIdx >= 0) {
        const first = name.slice(0, ofIdx);
        const rest  = name.slice(ofIdx);
        const fplu  = first.endsWith('s') || first.endsWith('x') || first.endsWith('z')
            ? first + 'es' : first + 's';
        return fplu + rest;
    }
    if (name.endsWith('s') || name.endsWith('x') || name.endsWith('z')) return name + 'es';
    return name + 's';
}

// Build the human-readable description for an inventory slot.
// tinPm: monster index for flesh tins; tinSpinach: true for spinach tins.
function build_item_desc(otyp, oclass, quan, blessed, cursed, spe, tinPm, tinSpinach) {
    if (oclass === COIN_CLASS) return `${quan} gold pieces`;

    const meta = ITEM_NAMES[otyp];
    let baseName = meta ? meta.name : `item #${otyp}`;
    const noUncursed = meta?.noUncursed || false;

    // TIN: include contents in name
    if (oclass === FOOD_CLASS && otyp === TIN) {
        let contents = 'unknown creature';
        if (tinSpinach) contents = 'spinach';
        else if (tinPm !== undefined && tinPm >= 0) contents = MON_NAMES[tinPm] || 'unknown creature';
        baseName = `tin of ${contents}`;
    }

    // BUC prefix — for weapons (implicit_uncursed default): omit "uncursed"
    let buc = '';
    if (!noUncursed) {
        if (blessed) buc = 'blessed ';
        else if (cursed) buc = 'cursed ';
        else if (oclass !== WEAPON_CLASS) buc = 'uncursed ';
        // WEAPON_CLASS: implicit_uncursed is on by default — enhancement implies uncursed
    }

    // Enhancement prefix (+N/-N) for weapons and armor
    let speStr = '';
    if (oclass === WEAPON_CLASS || oclass === ARMOR_CLASS) {
        speStr = `${spe >= 0 ? '+' : ''}${spe} `;
    }

    // Charges suffix for tools
    let suffix = '';
    if (oclass === TOOL_CLASS && otyp === EXPENSIVE_CAMERA) {
        suffix = ` (0:${spe})`;
        speStr = '';
    } else if (oclass === TOOL_CLASS && (otyp === TINNING_KIT || otyp === MAGIC_MARKER)) {
        suffix = ` (${spe}:0)`;
        speStr = '';
    } else if (oclass === WAND_CLASS) {
        suffix = ` (${spe}:0)`;
        speStr = '';
    }

    if (quan === 1) {
        const first = buc || baseName;
        const article = 'aeiouAEIOU'.includes(first[0]) ? 'an' : 'a';
        return `${article} ${buc}${speStr}${baseName}${suffix}`;
    } else {
        const pl = pluralize(baseName, meta?.plural);
        return `${quan} ${buc}${speStr}${pl}${suffix}`;
    }
}

// C ref: invent.c addinv() — add object to player inventory.
// Stacks items of same otyp+bless+spe into one slot; assigns new letter otherwise.
// Returns the inventory item slot that was created or updated.
export function addinv(obj) {
    const g = game;
    if (!g.u) g.u = {};
    if (!g.u.invent) g.u.invent = [];

    const oclass = obj.oclass;
    const otyp   = obj.otyp;
    const quan   = obj.quan || 1;
    const blessed = !!obj.blessed;
    const cursed  = !!obj.cursed;
    const spe     = obj.spe || 0;
    const tinPm     = obj._tin_pm;
    const tinSpinach = obj._tin_spinach;

    if (oclass === COIN_CLASS) {
        const existing = g.u.invent.find(i => i.letter === '$');
        if (existing) {
            existing._quan = (existing._quan || 0) + quan;
            existing.desc = build_item_desc(otyp, oclass, existing._quan, false, false, 0);
            return existing;
        } else {
            const slot = { letter: '$', category: 'Coins',
                desc: build_item_desc(otyp, oclass, quan, false, false, 0),
                _otyp: otyp, _quan: quan, _blessed: false, _cursed: false, _spe: 0 };
            g.u.invent.push(slot);
            return slot;
        }
    }

    // Try to merge with existing slot of same otyp+bless+cursed+spe
    const existing = g.u.invent.find(i =>
        i._otyp === otyp && i._blessed === blessed && i._cursed === cursed && i._spe === spe
    );
    if (existing) {
        existing._quan += quan;
        existing.desc = build_item_desc(otyp, oclass, existing._quan, blessed, cursed, spe, tinPm, tinSpinach);
        return existing;
    }

    // New inventory slot
    const slot = {
        letter: next_inv_letter(),
        category: oclass_to_category(oclass),
        desc: build_item_desc(otyp, oclass, quan, blessed, cursed, spe, tinPm, tinSpinach),
        _otyp: otyp, _quan: quan, _blessed: blessed, _cursed: cursed, _spe: spe,
    };
    g.u.invent.push(slot);
    return slot;
}

// C ref: u_init.c ini_inv_adjust_obj() — post-creation adjustments
// Returns true (stop) for WEAPON_CLASS and TOOL_CLASS items.
function ini_inv_adjust_obj(trop, otmp) {
    let stop = false;
    if (trop.cls === COIN_CLASS) {
        otmp.quan = game.u?.umoney0 ?? 0;
    } else {
        otmp.cursed = false; // C: ini_inv_adjust_obj always clears cursed flag
        if (otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS) {
            otmp.quan = trquan(trop);
            stop = true;
        } else if (otmp.oclass === GEM_CLASS && is_graystone(otmp.otyp) && otmp.otyp !== FLINT) {
            otmp.quan = 1;
        }
        if (trop.spe !== UNDEF_SPE) {
            otmp.spe = trop.spe;
            if (trop.otyp === MAGIC_MARKER && otmp.spe < 96) {
                otmp.spe += rn2(4);
            }
        }
        if (trop.bless !== UNDEF_BLESS) {
            otmp.blessed = !!trop.bless;
        }
    }
    return stop;
}

// Ammo/missile otyp range (ARROW=18 through shuriken area ~26)
// These are the weapon types that go to uquiver in ini_inv_use_obj.
const AMMO_MISSILE_MIN = 18, AMMO_MISSILE_MAX = 26;

// C ref: u_init.c ini_inv_use_obj() — assign worn/wielded/quivered state
// and discover identified items (scrolls, potions).
function ini_inv_use_obj_js(obj, slot) {
    const g = game;
    const oclass = obj.oclass;
    const otyp = obj.otyp;

    if (oclass === WEAPON_CLASS || otyp === TIN_OPENER) {
        // Ammo/missile → uquiver; others → uwep (ignored for display)
        const isAmmoMissile = otyp >= AMMO_MISSILE_MIN && otyp <= AMMO_MISSILE_MAX;
        if (isAmmoMissile && !g.u.uquiver) {
            g.u.uquiver = slot.letter;
        }
    } else if (oclass === ARMOR_CLASS) {
        slot._worn = true;
    } else if (oclass === SCROLL_CLASS || oclass === POTION_CLASS) {
        // C: discover_object if has description (appearance) and known
        const meta = ITEM_NAMES[otyp];
        const typeStr = meta?.typeStr || meta?.name;
        if (typeStr && game.obj_appearances) {
            const appearance = game.obj_appearances[typeStr];
            if (appearance) {
                if (!g.u.discoveries) g.u.discoveries = [];
                const catName = oclass_to_category(oclass);
                let group = g.u.discoveries.find(d => d.category === catName);
                if (!group) {
                    group = { category: catName, items: [] };
                    g.u.discoveries.push(group);
                }
                const entry = `${typeStr} (${appearance})`;
                if (!group.items.includes(entry)) group.items.push(entry);
            }
        }
    }
}

// C ref: u_init.c ini_inv() — main inventory initialization loop
function ini_inv(trobj_arr, roleName, raceName) {
    const g = game;
    let got_sp1 = false;
    let i = 0;
    let quan = trquan(trobj_arr[i]);

    while (trobj_arr[i].cls !== 0) {
        const trop = trobj_arr[i];
        let obj;
        if (trop.otyp !== UNDEF_TYP) {
            obj = mksobj(trop.otyp, true, false);
        } else {
            obj = ini_inv_mkobj_filter(trop.cls, got_sp1, roleName, raceName);
        }

        if (ini_inv_adjust_obj(trop, obj)) {
            quan = 1;
        }
        const slot = addinv(obj);
        ini_inv_use_obj_js(obj, slot);
        if (obj.oclass === SPBOOK_CLASS && (SPE_LEVEL[obj.otyp] ?? 0) === 1) {
            got_sp1 = true;
        }

        if (--quan) continue;
        i++;
        quan = trquan(trobj_arr[i]);
    }
}

// =============================================================================
// Role trobj arrays — trobj entry format: { otyp, spe, cls, qmin, qmax, bless }
// where bless is the trflags (trbless) field: 0=uncursed, 1=blessed, -1=UNDEF_BLESS
// =============================================================================

const Archeologist = [
    { otyp: BULLWHIP,      spe: 2,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LEATHER_JACKET,spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FEDORA,        spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,   spe: 0,        cls: FOOD_CLASS,   qmin: 3, qmax: 3, bless: 0 },
    { otyp: PICK_AXE,      spe: UNDEF_SPE,cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: TINNING_KIT,   spe: UNDEF_SPE,cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: TOUCHSTONE,    spe: 0,        cls: GEM_CLASS,    qmin: 1, qmax: 1, bless: 0 },
    { otyp: SACK,          spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Barbarian_0 = [
    { otyp: TWO_HANDED_SWORD,spe: 0,     cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: AXE,           spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: RING_MAIL,     spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,   spe: 0,        cls: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Barbarian_1 = [
    { otyp: BATTLE_AXE,    spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SHORT_SWORD,   spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: RING_MAIL,     spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,   spe: 0,        cls: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Cave_man = [
    { otyp: CLUB,          spe: 1,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SLING,         spe: 2,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FLINT,         spe: 0,        cls: GEM_CLASS,    qmin: 10,qmax: 20,bless: UNDEF_BLESS },
    { otyp: ROCK,          spe: 0,        cls: GEM_CLASS,    qmin: 3, qmax: 3, bless: 0 },
    { otyp: LEATHER_ARMOR, spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Healer = [
    { otyp: SCALPEL,       spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LEATHER_GLOVES,spe: 1,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: STETHOSCOPE,   spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: POT_HEALING,   spe: 0,        cls: POTION_CLASS, qmin: 4, qmax: 4, bless: UNDEF_BLESS },
    { otyp: POT_EXTRA_HEALING,spe: 0,     cls: POTION_CLASS, qmin: 4, qmax: 4, bless: UNDEF_BLESS },
    { otyp: WAN_SLEEP,     spe: UNDEF_SPE,cls: WAND_CLASS,   qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SPE_HEALING,   spe: 0,        cls: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: SPE_EXTRA_HEALING,spe: 0,     cls: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: SPE_STONE_TO_FLESH,spe: 0,   cls: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: APPLE,         spe: 0,        cls: FOOD_CLASS,   qmin: 5, qmax: 5, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Knight = [
    { otyp: LONG_SWORD,    spe: 1,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LANCE,         spe: 1,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: RING_MAIL,     spe: 1,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: HELMET,        spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD,  spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LEATHER_GLOVES,spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: APPLE,         spe: 0,        cls: FOOD_CLASS,   qmin: 10,qmax: 10,bless: 0 },
    { otyp: CARROT,        spe: 0,        cls: FOOD_CLASS,   qmin: 10,qmax: 10,bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Monk = [
    { otyp: LEATHER_GLOVES,spe: 2,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: ROBE,          spe: 1,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: SCROLL_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: POT_HEALING,   spe: 0,        cls: POTION_CLASS, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,   spe: 0,        cls: FOOD_CLASS,   qmin: 3, qmax: 3, bless: 0 },
    { otyp: APPLE,         spe: 0,        cls: FOOD_CLASS,   qmin: 5, qmax: 5, bless: UNDEF_BLESS },
    { otyp: ORANGE,        spe: 0,        cls: FOOD_CLASS,   qmin: 5, qmax: 5, bless: UNDEF_BLESS },
    { otyp: FORTUNE_COOKIE,spe: 0,        cls: FOOD_CLASS,   qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Priest = [
    { otyp: MACE,          spe: 1,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: ROBE,          spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD,  spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: POT_WATER,     spe: 0,        cls: POTION_CLASS, qmin: 4, qmax: 4, bless: 1 },
    { otyp: CLOVE_OF_GARLIC,spe: 0,       cls: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: SPRIG_OF_WOLFSBANE,spe: 0,    cls: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: SPBOOK_CLASS, qmin: 2, qmax: 2, bless: UNDEF_BLESS },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Ranger = [
    { otyp: DAGGER,        spe: 1,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: BOW,           spe: 1,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: ARROW,         spe: 2,        cls: WEAPON_CLASS, qmin: 50,qmax: 59,bless: UNDEF_BLESS },
    { otyp: ARROW,         spe: 0,        cls: WEAPON_CLASS, qmin: 30,qmax: 39,bless: UNDEF_BLESS },
    { otyp: CLOAK_OF_DISPLACEMENT,spe: 2, cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: CRAM_RATION,   spe: 0,        cls: FOOD_CLASS,   qmin: 4, qmax: 4, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Rogue = [
    { otyp: SHORT_SWORD,   spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: DAGGER,        spe: 0,        cls: WEAPON_CLASS, qmin: 6, qmax: 15,bless: 0 },
    { otyp: LEATHER_ARMOR, spe: 1,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: POT_SICKNESS,  spe: 0,        cls: POTION_CLASS, qmin: 1, qmax: 1, bless: 0 },
    { otyp: LOCK_PICK,     spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: SACK,          spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Samurai = [
    { otyp: KATANA,        spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SHORT_SWORD,   spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: YUMI,          spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: YA,            spe: 0,        cls: WEAPON_CLASS, qmin: 26,qmax: 45,bless: UNDEF_BLESS },
    { otyp: SPLINT_MAIL,   spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Tourist = [
    { otyp: DART,          spe: 2,        cls: WEAPON_CLASS, qmin: 21,qmax: 40,bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: FOOD_CLASS,   qmin: 10,qmax: 10,bless: 0 },
    { otyp: POT_EXTRA_HEALING,spe: 0,     cls: POTION_CLASS, qmin: 2, qmax: 2, bless: UNDEF_BLESS },
    { otyp: SCR_MAGIC_MAPPING,spe: 0,     cls: SCROLL_CLASS, qmin: 4, qmax: 4, bless: UNDEF_BLESS },
    { otyp: HAWAIIAN_SHIRT,spe: 0,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: EXPENSIVE_CAMERA,spe: UNDEF_SPE,cls: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
    { otyp: CREDIT_CARD,   spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Valkyrie = [
    { otyp: SPEAR,         spe: 1,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: DAGGER,        spe: 0,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD,  spe: 3,        cls: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,   spe: 0,        cls: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Wizard = [
    { otyp: QUARTERSTAFF,  spe: 1,        cls: WEAPON_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: CLOAK_OF_MAGIC_RESISTANCE,spe: 0,cls: ARMOR_CLASS,qmin: 1,qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: WAND_CLASS,   qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: RING_CLASS,   qmin: 2, qmax: 2, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: POTION_CLASS, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: SCROLL_CLASS, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: SPE_FORCE_BOLT,spe: 0,        cls: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: MAGIC_MARKER,  spe: 19,       cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];

// Extra inventory arrays
const Healing_book = [
    { otyp: SPE_HEALING,    spe: UNDEF_SPE,cls: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Protection_book = [
    { otyp: SPE_PROTECTION, spe: UNDEF_SPE,cls: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Confuse_monster_book = [
    { otyp: SPE_CONFUSE_MONSTER,spe: UNDEF_SPE,cls: SPBOOK_CLASS,qmin: 1,qmax: 1,bless: 1 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Tinopener = [
    { otyp: TIN_OPENER,    spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Magicmarker = [
    { otyp: MAGIC_MARKER,  spe: 19,       cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Lamp = [
    { otyp: OIL_LAMP,      spe: 1,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Blindfold = [
    { otyp: BLINDFOLD,     spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Xtra_food = [
    { otyp: UNDEF_TYP,     spe: UNDEF_SPE,cls: FOOD_CLASS,   qmin: 2, qmax: 2, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Leash = [
    { otyp: LEASH,         spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];
const Towel = [
    { otyp: TOWEL,         spe: 0,        cls: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];

// C ref: u_init.c u_init_role() — role-specific inventory initialization
export function u_init_role() {
    const g = game;
    const roleName = g.urole_data?.name?.m || g.urole?.name?.m || 'Tourist';
    const raceName = (g.urace_data?.name || g.urace?.adj || 'human').toLowerCase();

    // Initialize nocreate/polymorph guards
    g.nocreate  = g.nocreate  || STRANGE_OBJECT;
    g.nocreate2 = g.nocreate2 || STRANGE_OBJECT;
    g.nocreate3 = g.nocreate3 || STRANGE_OBJECT;
    g.nocreate4 = g.nocreate4 || STRANGE_OBJECT;

    const call = (arr) => ini_inv(arr, roleName, raceName);

    switch (roleName) {
    case 'Archeologist':
        call(Archeologist);
        if (!rn2(10))      call(Tinopener);
        else if (!rn2(4))  call(Lamp);
        else if (!rn2(5))  call(Magicmarker);
        break;

    case 'Barbarian':
        if (rn2(100) >= 50) call(Barbarian_0);
        else                call(Barbarian_1);
        if (!rn2(6)) call(Lamp);
        break;

    case 'Caveman': case 'Cavewoman':
        call(Cave_man);
        break;

    case 'Healer':
        g.u = g.u || {};
        g.u.umoney0 = rn1(1000, 1001); // rn2(1000) + 1001
        call(Healer);
        if (!rn2(25)) call(Lamp);
        break;

    case 'Knight':
        call(Knight);
        break;

    case 'Monk': {
        const M_spell = [Healing_book, Protection_book, Confuse_monster_book];
        call(Monk);
        call(M_spell[Math.trunc(rn2(90) / 30)]);
        if (!rn2(4))       call(Magicmarker);
        else if (!rn2(10)) call(Lamp);
        break;
    }

    case 'Priest': case 'Priestess':
        call(Priest);
        if (!rn2(5))       call(Magicmarker);
        else if (!rn2(10)) call(Lamp);
        break;

    case 'Ranger':
        call(Ranger);
        break;

    case 'Rogue':
        g.u = g.u || {};
        g.u.umoney0 = 0;
        call(Rogue);
        if (!rn2(5)) call(Blindfold);
        break;

    case 'Samurai':
        call(Samurai);
        if (!rn2(5)) call(Blindfold);
        break;

    case 'Tourist':
        g.u = g.u || {};
        g.u.umoney0 = rnd(1000);
        call(Tourist);
        if (!rn2(25))      call(Tinopener);
        else if (!rn2(25)) call(Leash);
        else if (!rn2(25)) call(Towel);
        else if (!rn2(20)) call(Magicmarker);
        break;

    case 'Valkyrie':
        call(Valkyrie);
        if (!rn2(6)) call(Lamp);
        break;

    case 'Wizard':
        call(Wizard);
        if (!rn2(5)) call(Blindfold);
        break;

    default:
        call(Tourist); // fallback
        break;
    }

    g.nocreate  = STRANGE_OBJECT;
    g.nocreate2 = STRANGE_OBJECT;
    g.nocreate3 = STRANGE_OBJECT;
    g.nocreate4 = STRANGE_OBJECT;
}

const Money = [
    { otyp: GOLD_PIECE, spe: 0, cls: COIN_CLASS, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
];

// C ref: u_init.c u_init_inventory_attrs() — top-level init wrapper
// Called from fastforward_post_mklev after mklev/makedog.
export function u_init_inventory_attrs() {
    const g = game;
    const roleName = g.urole_data?.name?.m || g.urole?.name?.m || 'Tourist';
    const raceName = (g.urace_data?.name || g.urace?.adj || 'human').toLowerCase();
    g.u.umoney0 = 0;
    u_init_role();
    u_init_race();
    // C: if (u.umoney0) ini_inv(Money)
    if (g.u.umoney0) {
        ini_inv(Money, roleName, raceName);
    }
    // Note: init_attr / vary_init_attr are called from fastforward_post_mklev
}

// C ref: u_init.c u_init_race() — race-specific inventory initialization
export function u_init_race() {
    const g = game;
    const roleName = g.urole_data?.name?.m || g.urole?.name?.m || 'Tourist';
    const raceName = (g.urace_data?.name || g.urace?.adj || 'human').toLowerCase();

    const call = (arr) => ini_inv(arr, roleName, raceName);

    if (raceName === 'orc' || raceName === 'orcish') {
        if (roleName !== 'Wizard') {
            call(Xtra_food);
        }
    } else if (raceName === 'elf' || raceName === 'elven') {
        if (roleName === 'Priest' || roleName === 'Priestess' || roleName === 'Wizard') {
            const instruments = [WOODEN_FLUTE, TOOLED_HORN, WOODEN_HARP, BELL, BUGLE, LEATHER_DRUM];
            const Instrument = [
                { otyp: instruments[Math.trunc(rn2(6))], spe: 0, cls: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
                { otyp: 0, spe: 0, cls: 0, qmin: 0, qmax: 0, bless: 0 },
            ];
            call(Instrument);
        }
    }
}
