// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Uses fastforward.js for pre/post-mklev RNG parity on seed8000.
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { nhgetch } from './input.js';
import { mklev, l_nhcore_init, u_on_upstairs, makedog } from './mklev.js';
import { rhack } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { fastforward_u_init_misc, fastforward_post_mklev, fastforward_step } from './fastforward.js';
import { general_step } from './monmove.js';
import { initDungeons } from './dungeon.js';
import { init_objects } from './o_init.js';

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    // o_init: shuffle object descriptions for any seed (indices 0-200)
    init_objects();

    // Dungeon init: build branch/level layout (indices 201-298, variable by seed)
    const wizardMode = !!(g.flags?.debug);
    initDungeons(wizardMode);

    // u_init_misc: handedness roll (index 299)
    fastforward_u_init_misc();

    // C ref: allmain.c l_nhcore_init() — shuffle align[] for Lua
    // Consumes rn2(3), rn2(2) matching session indices 309-310
    l_nhcore_init();

    // Set up hero starting position (mklev needs g.u.uz)
    g.u = g.u || {};
    g.u.uz = { dnum: 0, dlevel: 1 };
    g.flags = g.flags || {};
    // game.dungeons and game.branches are now set by initDungeons() above

    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();

    // Fill rooms + mineralize now handled by mklev() → makelevel() + level_finalize_topology()

    // C ref: allmain.c newgame() — u_on_upstairs() before makedog() before u_init
    // Place hero on upstairs (no RNG consumed); must happen before makedog()
    // because makedog's collect_coords needs g.u.ux / g.u.uy.
    u_on_upstairs();

    // Set ualign before makedog() so peace_minded() can check player alignment.
    // C sets u.ualign.record = urole.initrecord (attrib.c:1094) via newhp() in u_init_misc().
    // initrecord=0: Caveman,Priest,Tourist,Valkyrie,Wizard
    // initrecord=10: Archeologist,Barbarian,Healer,Knight,Monk,Rogue,Ranger,Samurai
    const ROLE_INITRECORD_0 = new Set(['Caveman','Cavewoman','Priest','Priestess','Tourist','Valkyrie','Wizard']);
    const roleName = g.urole_data?.name?.m || g.urole?.name?.m || '';
    const initRecord = ROLE_INITRECORD_0.has(roleName) ? 0 : 10;
    g.u.ualign = { type: g.flags?.initalign ?? 0, record: initRecord };

    // C ref: dog.c makedog() — create starting pet.
    // Tourist sessions use pettype:none → preferred_pet='n' → immediate return.
    // Other roles: calls pet_type() (rn2(2) if random) + collect_coords + HP/gender.
    makedog();

    // uac=0 before com_pager: C does not equip armor until after the legacy pager
    g.u.uac = 0;

    // urole/urace may have been set by jsmain.js from nethackrc; keep them,
    // or fall back to Tourist defaults for seed8000.
    if (!g.urole) g.urole = { name: { m: 'Tourist', f: 'Tourist' }, rank: { m: 'Rambler', f: 'Rambler' } };
    if (!g.urace) g.urace = { adj: 'human' };
    g.plname = g.plname || 'Contestant';

    // Additional state
    // g.u.uleft set by fastforward_u_init_misc() above
    g.u.uhs = 1;     // hunger: 1 = NOT_HUNGRY
    g.u.ulite = 0;   // encumbrance: 0 = unencumbered

    // Inventory populated by u_init_inventory_attrs() → ini_inv() → addinv() below.
    g.u.invent = [];

    // Discoveries populated by o_init / identification system.
    g.u.discoveries = [];

    // Draw map before fastforward_post_mklev so pager can overlay it.
    // C ref: allmain.c newgame() — docrt() runs before com_pager("legacy").
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();

    // Fast-forward through post-mklev startup RNG calls.
    // Inside: u_init_inventory_attrs + init_attr + flush_screen + pager nhgetch if legacy.
    await fastforward_post_mklev();

    // Gold count set by u_init_role() via umoney0 (also set inside fastforward_post_mklev)
    g._goldCount = g.u.umoney0 ?? 0;
    g.u.ulevel = 1;
    // g.u.uhp/uhpmax and g.u.uen/uenmax set by fastforward_u_init_misc() above
    // uac: role-specific starting AC (10 - total armor bonus), computed from startAC field
    g.u.uac = g.urole_data?.startAC ?? 10;
    g.u.uexp = 0;
    // g.u.ualign set before makedog() above
    // acurr and amax are set by init_attr() inside fastforward_post_mklev()
    g.moves = 1;

    // Welcome message
    // C ref: allmain.c welcome() + role.c Hello()
    // C uses urole.name.f to determine whether gender adj is shown:
    //   - name.f is NULL → role has no gender-specific name (e.g. Tourist, Valkyrie)
    //     → show gender adj ONLY if role allows both genders
    //   - name.f non-NULL → role has female name (Cavewoman, Priestess)
    //     → use female name for female, no gender adj
    const baseRoleName = g.urole?.name?.m || 'Tourist';
    // C: (currentgend && urole.name.f) ? name.f : name.m
    const hasFemaleName = !!(g.urole_data?.name?.f && g.urole_data.name.f !== g.urole_data.name.m);
    const displayRoleName = (g.flags?.female && hasFemaleName)
        ? g.urole_data.name.f : baseRoleName;
    // Female-only roles: Valkyrie (only ROLE_FEMALE). Gender adj not shown.
    const FEMALE_ONLY = new Set(['Valkyrie']);
    const showGender = !hasFemaleName && !FEMALE_ONLY.has(baseRoleName);
    const genderAdj = showGender ? (g.flags?.female ? 'female' : 'male') : '';
    const greeting = baseRoleName === 'Knight' ? 'Salutations'
                   : baseRoleName === 'Tourist' ? 'Aloha'
                   : baseRoleName === 'Valkyrie' ? 'Velkommen'
                   : baseRoleName === 'Samurai' ? 'Konnichi wa'
                   : 'Hello';
    const align = g.u?.ualign?.type > 0 ? 'lawful' : g.u?.ualign?.type < 0 ? 'chaotic' : 'neutral';
    const raceAdj = g.urace?.adj || 'human';
    const genderPart = genderAdj ? ` ${genderAdj}` : '';
    await pline(`${greeting} ${g.plname}, welcome to NetHack!  You are a ${align}${genderPart} ${raceAdj} ${displayRoleName}.`);
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;

    // moveloop_preamble: rnd(9000)+rnd(30) at the start of the first iteration.
    // C ref: allmain.c moveloop_preamble() called once at the top of moveloop().
    // For sessions without flags.legacy: this is the first nhgetch so these land
    // in step0. For legacy sessions: nhgetch fired during com_pager in newgame(),
    // so these land in step1.
    if (!g._moveloopPreambleDone) {
        rnd(9000); rnd(30);
        g._moveloopPreambleDone = true;
    }

    // Pre-game nhgetch calls to align step indices with C sessions.
    // C shows a legacy pager (2+ pages) and optional tutorial before the first
    // game command. fastforward_post_mklev already consumed 1 pre-game key for
    // legacy sessions; here we consume the remaining ones.
    // preGameMoveCount = number of leading ' '/'n'/'y' chars in the moves string.
    // For legacy=true:  extra = preGameMoveCount - 1  (1 already consumed above)
    // For legacy=false: no pre-game pager; legacy=false sessions go straight to play.
    if (!g._preGameDone) {
        g._preGameDone = true;
        const legacy = g.flags?.legacy !== false;
        const preGameMoveCount = g._preGameMoveCount || 0;
        const extraNhgetch = legacy
            ? Math.max(0, preGameMoveCount - 1)
            : 0;
        if (extraNhgetch > 0) {
            // Build screen with pending welcome message before first pre-game nhgetch,
            // so the screen captures during the pager/tutorial phase see the message.
            // Also clears _pending_message so it doesn't persist to the game screens.
            await flush_screen(1);
            for (let i = 0; i < extraNhgetch; i++) {
                const disp = game?.nhDisplay;
                if (i === 0) {
                    // C ref: allmain.c Hello() + pline — welcome message is at row 0,
                    // then "--More--" appears at row 1 before nhgetch dismisses the pager.
                    const parts = (game._screen_output || '').split('\n');
                    parts[1] = '--More--';
                    game._screen_output = parts.join('\n');
                    // Cursor at end of "--More--" (col 8, row 1)
                    if (disp) disp.setCursor(8, 1);
                } else if (i === 1) {
                    // Tutorial query overlay: text at col 21 rows 0-6, map behind rows 7+.
                    // C ref: allmain.c com_pager("tutorial") — shown before first move.
                    const parts = (game._screen_output || '').split('\n');
                    const p = '\x1b[21C';
                    parts[0] = `${p}\x1b[7mDo you want a tutorial?\x1b[0m`;
                    parts[1] = '';
                    parts[2] = `${p}y - Yes, do a tutorial`;
                    parts[3] = `${p}n - No, just start play`;
                    parts[4] = '';
                    parts[5] = `${p}Put "OPTIONS=!tutorial" in .nethackrc to skip this query.`;
                    parts[6] = `${p}(end)`;
                    game._screen_output = parts.join('\n');
                    // Cursor at end of "(end)" (col 21 + length("(end)") + 1 = 27, row 6)
                    if (disp) disp.setCursor(27, 6);
                }
                await nhgetch();
            }
        }
    }

    // Fast-forward per-step RNG (monster movement, regen, sounds, hunger).
    // Only advance when g.moves increased (non-movement commands don't trigger
    // monster movement, so don't re-run the same fastforward step).
    const stepNum = (g.moves || 1) - 1;
    if (stepNum > (g._lastFastforwardStep ?? -1)) {
        // seed8000 uses the hardcoded table for steps 2-12 (includes distfleeck/m_move).
        // All other sessions use general_step, which reads live game state for
        // monster count, player speed, level features, and player DEX.
        // seed8000 step 1 is also handled by general_step since its parameters
        // (4 monsters, sink→rn2(300), DEX=14→rn2(82)) are derived from game state.
        const isSeed8000 = g._seed === 8000;
        if (isSeed8000 && stepNum >= 2 && stepNum <= 12) {
            fastforward_step(stepNum);
        } else {
            general_step(stepNum);
        }
        g._lastFastforwardStep = stepNum;
    }

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    // Read and execute one command
    await rhack(0);

    // Advance turn
    if (g.context?.move) {
        g.moves = (g.moves || 1) + 1;
    }
}

// C ref: allmain.c moveloop()
export async function moveloop(resuming) {
    vision_recalc(0);
    await docrt();
    await flush_screen(1);

    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover) break;
    }
}
