# Port Progress Tracker

Last updated: 2026-05-25

## Current Score

| Metric | Value |
|--------|-------|
| Sessions passing | 1 / 44 |
| Screens matched | 69 / 11,405 (0.6%) |
| RNG matched | 53,032 / 792,838 (6.7%) |

## Per-Session Status

| Session | RNG% | Screens | Notes |
|---------|------|---------|-------|
| seed8000-tourist-starter | **100%** | **23/23 ✓** | FULL PASS — Tourist, no pet |
| seed0107-samurai-twoweapon | 92% | 30/98 | Diverges mid-game |
| seed1800-tourist-eat-throw | 97% | 10/26 | Diverges mid-game |
| seed0101-ranger-quiver-throw | 97% | 1/27 | Screen render wrong from start |
| seed0016-healer-newmoon-eat-zap | 68% | 3/36 | Healer w/ cat |
| seed0060-orc-rogue | 67% | 2/41 | Rogue w/ dog |
| seed0104-knight-ride-combat | 71% | 0/43 | Knight w/ pony |
| seed0017-samurai-altar-pray | 72% | 0/67 | Samurai w/ little dog |
| seed0373-barbarian-quest-tour | 63% | 0/124 | Barbarian |
| seed0700-samurai-explore-descend | 54% | 0/51 | Samurai |
| seed2200-wizard-quaff-zap-read | 50% | 0/230 | Wizard |
| seed0105-valk-chat-lamp-ration | 39% | 0/30 | Valkyrie |
| seed0015-valk-level2-pit-dog | 4% | 0/44 | Valk w/ cat |
| seed0013-friday13 | 11% | 0/99 | Rogue w/ dog |
| seed0013-rogue | 11% | 0/59 | Rogue w/ dog |
| seed0002-healer | 2.3% | 0/595 | Healer w/ cat |
| seed0006-wizard | 1.2% | 0/123 | Wizard, no pet |
| (many others) | <10% | 0 | Early mklev divergence |

## Known Bugs (by category)

### A. Initialization / makedog() — affects ~20 sessions

Sessions with pets (dog/cat/pony) diverge early because `makedog()` is not
implemented. Roles with starting pets: Caveman, Knight, Ranger, Rogue,
Samurai, Valkyrie, Healer, Archeologist, Barbarian.

Estimated impact: **+10-15 sessions** if fixed.

Key files: `js/mklev.js` (makedog hook), C ref: `dog.c` / `teleport.c`.

### B. Map item glyph rendering — affects seed0101 (and others)

Items on dungeon floor show wrong symbol/color. C shows `)` (weapon, cyan) 
but JS shows `(` (tool, bright white). Affects display of floor items.

Key files: `js/display.js`, item symbol lookup table.

### C. Pager line-drawing border — affects seed0101 screen 2

Tutorial pager uses VT100 alternate charset (`\x0e`/`\x0f`) for box-drawing
chars. JS pager outputs plain text without the SO/SI escape codes.

Key files: `js/cmd.js` showPager(), `js/display.js`.

### D. Per-move command gaps — affects seed0107, seed1800

After the first ~10 screens (basic movement), sessions diverge due to
unimplemented or incorrectly implemented commands:
- `seed0107`: samurai two-weapon / enhance skill screens
- `seed1800`: eat/throw actions

Key files: `js/cmd.js`, `js/allmain.js`.

### E. Early mklev divergence (<3000 RNG matched) — affects ~15 sessions

Some sessions diverge at call ~100-900, before initialization completes.
Possible causes:
- Role-specific `u_init` not fully implemented
- `sp_lev.c` Lua special levels generating different dungeon structures
- Different branch/level counts for some seeds

## Implemented Modules

| Module | Status | Notes |
|--------|--------|-------|
| `js/isaac64.js` | Frozen | PRNG engine |
| `js/rng.js` | Done | All RNG wrappers |
| `js/o_init.js` | Done | Object description shuffle |
| `js/dungeon.js` | Done | Branch/level layout |
| `js/mklev.js` | Done (core) | Room/corridor/door/stair/monster/item gen |
| `js/attrib.js` | Done | init_attr / vary_init_attr |
| `js/u_init.js` | Done (tourist) | Inventory init; other roles partial |
| `js/roles.js` | Done | Role/race tables |
| `js/mondata.js` | Done | 394-entry monster table, correct PM_ indices |
| `js/display.js` | Partial | Screen rendering, some glyphs wrong |
| `js/cmd.js` | Partial | Basic movement, inventory, discoveries |
| `js/monmove.js` | Partial | Monster AI per-move RNG |
| `js/vision.js` | Partial | Line-of-sight |

## Priority Queue

1. **makedog()** — fixes ~10-15 sessions immediately. Port `dog.c`.
2. **Map item glyphs** — fix symbol lookup for items on dungeon floor.
3. **Per-move command fixes** — help seed0107 (30→98 screens), seed1800.
4. **u_init for other roles** — fix role-specific inventory for non-tourist chars.

## History

| Date | Event |
|------|-------|
| 2026-05-25 | Fixed MON_NAMES (394 entries), tin BUC, discoveries sort → seed8000 **23/23** |
| earlier | seed8000 was 21/23; had MON_NAMES at 379 entries (wrong PM_LICHEN) |
| earlier | seed8000 was 0/23; mklev, attrib, u_init implemented |
