// fastforward.js — Auto-generated RNG replay for seed8000 starter session.
// The mklev RNG calls are now consumed by the real mklev.js implementation.
// The dungeon init calls are now consumed by initDungeons() in dungeon.js.
// The attrib calls are now consumed by real init_attr / vary_init_attr.
//
// Generated from: seed8000-tourist-starter.session.json

import { rn2, rnd, d, rne, rnz } from "./rng.js";
import { init_attr, vary_init_attr } from "./attrib.js";
import { u_init_inventory_attrs } from "./u_init.js";
import { nhgetch } from "./input.js";
import { game } from "./gstate.js";
import { flush_screen, buildLegacyPagerScreen } from "./display.js";

// o_init: randomize colors, object shuffles, nhlib.lua random calls
// 201 leaf RNG calls (session indices 0-200)
export function fastforward_o_init() {
    // randomize_gem_colors
    rn2(2); rn2(2); rn2(4);
    // shuffle
    rn2(11); rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4);
    rn2(3); rn2(2); rn2(1); rn2(25); rn2(24); rn2(23); rn2(22); rn2(21);
    rn2(20); rn2(19); rn2(18); rn2(17); rn2(16); rn2(15); rn2(14); rn2(13);
    rn2(12); rn2(11); rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(28); rn2(27); rn2(26); rn2(25);
    rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19); rn2(18); rn2(17);
    rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11); rn2(10); rn2(9);
    rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3); rn2(2); rn2(1);
    rn2(41); rn2(40); rn2(39); rn2(38); rn2(37); rn2(36); rn2(35); rn2(34);
    rn2(33); rn2(32); rn2(31); rn2(30); rn2(29); rn2(28); rn2(27); rn2(26);
    rn2(25); rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19); rn2(18);
    rn2(17); rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11); rn2(10);
    rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3); rn2(2);
    rn2(1); rn2(41); rn2(40); rn2(39); rn2(38); rn2(37); rn2(36); rn2(35);
    rn2(34); rn2(33); rn2(32); rn2(31); rn2(30); rn2(29); rn2(28); rn2(27);
    rn2(26); rn2(25); rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19);
    rn2(18); rn2(17); rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11);
    rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3);
    rn2(2); rn2(1); rn2(28); rn2(27); rn2(26); rn2(25); rn2(24); rn2(23);
    rn2(22); rn2(21); rn2(20); rn2(19); rn2(18); rn2(17); rn2(16); rn2(15);
    rn2(14); rn2(13); rn2(12); rn2(11); rn2(10); rn2(9); rn2(8); rn2(7);
    rn2(6); rn2(5); rn2(4); rn2(3); rn2(2); rn2(1); rn2(2); rn2(1);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(4); rn2(3); rn2(2); rn2(1);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(7); rn2(6); rn2(5); rn2(4);
    rn2(3); rn2(2); rn2(1);
    // init_objects
    rn2(2);
    // random (nhlib.lua shuffle during o_init)
    rn2(3); rn2(2);
}

// u_init_misc: newhp, newpw, handedness (C ref: u_init.c u_init_misc)
// newhp/newpw: role.hpadv/enadv infix+race infix, plus rnd(inrnd) if inrnd>0
// All roles have hpadv.inrnd=0 and all races have both inrnd=0, so only
// role.enadv.inrnd can be nonzero (Healer/Knight=4, Monk=2, Priest/Wizard=3).
export function fastforward_u_init_misc() {
    const g = game;
    const role = g.urole_data || { hpadv: { infix: 8, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } };
    const race = g.urace_data || { hpadv: { infix: 2, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } };

    // newhp() at ulevel=0
    let hp = role.hpadv.infix + race.hpadv.infix;
    if (role.hpadv.inrnd > 0) hp += rnd(role.hpadv.inrnd);
    if (race.hpadv.inrnd > 0) hp += rnd(race.hpadv.inrnd);

    // newpw() at ulevel=0
    let en = role.enadv.infix + race.enadv.infix;
    if (role.enadv.inrnd > 0) en += rnd(role.enadv.inrnd);
    if (race.enadv.inrnd > 0) en += rnd(race.enadv.inrnd);

    // Handedness: rn2(10)==0 → left-handed
    const handRoll = rn2(10);
    g.u.uleft = handRoll ? 0 : 1;
    g.u.uhp = g.u.uhpmax = g.u.uhppeak = hp;
    g.u.uen = g.u.uenmax = g.u.uenpeak = en;
    g.u.ulevel = 1;
}

// Pager text for com_pager("legacy").  18 lines; row 17 = "--More--".
function _buildPagerText(deity, godGoddess, rank) {
    return [
        `It is written in the Book of ${deity}:`,
        '',
        '    After the Creation, the cruel god Moloch rebelled',
        '    against the authority of Marduk the Creator.',
        '    Moloch stole from Marduk the most powerful of all',
        '    the artifacts of the gods, the Amulet of Yendor,',
        '    and he hid it in the dark cavities of Gehennom, the',
        '    Under World, where he now lurks, and bides his time.',
        '',
        `Your ${godGoddess} ${deity} seeks to possess the Amulet, and with it`,
        'to gain deserved ascendance over the other gods.',
        '',
        `You, a newly trained ${rank}, have been heralded`,
        `from birth as the instrument of ${deity}.  You are destined`,
        'to recover the Amulet for your deity, or die in the',
        'attempt.  Your hour of destiny has come.  For the sake',
        `of us all:  Go bravely with ${deity}!`,
        '--More--',
    ];
}

// Post-mklev startup: u_init_role, ini_inv, attributes.
// C ref: allmain.c newgame() — u_init_inventory_attrs, init_attr, vary_init_attr,
//   then com_pager("legacy") if flags.legacy (creates a Lua state loading nhlib.lua,
//   which runs shuffle(align) → rn2(3)+rn2(2)), then com_pager calls nhgetch.
// Requires docrt() to have been called first so disp_ch is populated for the pager.
// moveloop_preamble (rnd(9000)+rnd(30)) is NOT called here; it runs at the start
// of moveloop_core, before the first rhack/nhgetch in the main loop.
export async function fastforward_post_mklev() {
    const g = game;
    // Real inventory initialization: role, race, gold (C: u_init_inventory_attrs)
    u_init_inventory_attrs();
    // init_attr(75) + vary_init_attr(): real attribute distribution (35 calls)
    init_attr(75);
    vary_init_attr();

    // Set values needed for correct status display before first screen capture
    g._goldCount = g.u.umoney0 ?? 0;
    // g.u.ulevel already 1 from fastforward_u_init_misc; g.u.uac already 0 from newgame

    // Build map+status screen (disp_ch populated by docrt() called before us)
    await flush_screen(1);

    // com_pager("legacy"): creates Lua state loading nhlib.lua → shuffle(align)
    // → rn2(3)+rn2(2), draws legacy pager overlay, then nhgetch.
    if (g.flags?.legacy !== false) {
        const align = g.flags?.initalign ?? 0;
        const roleData = g.urole_data || {};
        let rawDeity = align > 0 ? roleData.lgod : align < 0 ? roleData.cgod : roleData.ngod;
        rawDeity = rawDeity || 'a god';
        const isGoddess = rawDeity.startsWith('_');
        const deityName = isGoddess ? rawDeity.slice(1) : rawDeity;
        const godGoddess = isGoddess ? 'goddess' : 'god';
        const female = !!g.flags?.female;
        const titleEntry = (roleData.title || [])[0] || { m: 'Adventurer', f: 'Adventurer' };
        const rank = female ? (titleEntry.f || titleEntry.m) : titleEntry.m;

        const pagerLines = _buildPagerText(deityName, godGoddess, rank);
        const maxLen = pagerLines.reduce((m, l) => Math.max(m, l.length), 0);
        const textCol = Math.min(41, 79 - maxLen);

        buildLegacyPagerScreen(pagerLines, textCol);
        const disp = g?.nhDisplay;
        if (disp) disp.setCursor(textCol + 8, 17);

        rn2(3); rn2(2); // nhlib.lua shuffle(align) from com_pager Lua state creation
        await nhgetch(); // captures pager screen (screen 0)
    }
}

// Per-step leaf RNG calls
export function fastforward_step(stepNum) {
    const steps = [
        () => { rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 1
        () => { rn2(5); rn2(5); rn2(5); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 2
        () => { rn2(5); rn2(32); rn2(5); rn2(5); rn2(32); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 3
        () => { rn2(5); rn2(24); rn2(5); rn2(5); rn2(24); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 4
        () => { rn2(5); rn2(16); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 5
        () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); rn2(31); }, // step 6
        () => { rn2(5); rn2(16); rn2(5); rn2(5); rn2(16); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 7
        () => { rn2(5); rn2(12); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 8
        () => { rn2(5); rn2(20); rn2(5); rn2(5); rn2(8); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(19); rn2(82); }, // step 9
        () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(20); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 10
        () => { rn2(5); rn2(20); rn2(5); rn2(5); rn2(12); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 11
        () => { rn2(5); rn2(16); rn2(5); rn2(5); rn2(16); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(82); }, // step 12
    ];
    if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
}
// Fill + mineralize: 1448 calls
export function fastforward_fill_mineralize() {
    rn2(8); rn2(3); rn2(8); rn2(3); rn2(8); rn2(6); rnd(2); rnd(3); rnd(2); rn2(10); rn2(60); 
    rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(8); rn2(6); rnd(100); rnd(1000); 
    rnd(2); rn2(10); rn2(11); rn2(10); rn2(10); rn2(40); rn2(100); rn2(80); rn2(80); rn2(1000); 
    rn2(5); rn2(3); rn2(14); rn2(2); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); 
    rn2(16); rn2(21); rnd(2); rnd(4); rn2(50); rn2(100); rn2(100); rn2(8); rnd(25); rnd(25); 
    rnd(25); rnd(25); rnd(25); rn2(14); rn2(2); rnd(4); rn2(4); rnd(1000); rnd(2); rn2(6); 
    rn2(5); rn2(15); rnd(2); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); 
    rn2(21); rn2(2); rnz(25); rn2(8); rn2(3); rn2(14); rn2(2); rnd(2); rnd(3); rnd(2); rn2(10); 
    rn2(60); rn2(14); rn2(2); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3); 
    rn2(4); rn2(5); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); 
    rnd(2); rnd(4); rn2(2); rn2(50); rn2(100); rn2(100); rn2(8); rn2(3); rn2(4); rn2(5); rnd(2); 
    rnd(3); rnd(2); rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(4); rn2(5); rn2(3); rn2(3); 
    rnd(2); rn2(6); rn2(2); rn2(9); rnd(2); rn2(4); rn2(5); rn2(3); rn2(10); rnd(1000); rnd(2); 
    rn2(3); rn2(6); rn2(30); rn2(3); rn2(4); rn2(5); rnd(100); rnd(1000); rnd(2); rn2(4); rn2(2); 
    rn2(5); rn2(3); rn2(8); rn2(3); rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); 
    rn2(3); rn2(3); rn2(8); rnd(25); rn2(7); rnd(25); rnd(25); rn2(7); rnd(25); rn2(4); rn2(2); 
    rnd(4); rn2(4); rnd(1000); rnd(2); rn2(6); rn2(5); rn2(15); rn2(10); rnd(2); rn2(3); rn2(4); 
    rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(2); rnz(25); rn2(8); rn2(3); 
    rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3); rn2(6); 
    rn2(3); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rnd(2); 
    rnd(4); rn2(2); rn2(50); rn2(100); rn2(100); rn2(8); rn2(3); rn2(10); rn2(60); rn2(60); 
    rn2(78); rn2(20); rn2(20); rn2(30); rn2(4); rn2(2); rn2(25762); rn2(25762); rn2(75); rn2(4); 
    rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); 
    rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1); 
    rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1); rn2(75); rn2(4); rn2(75); rn2(4); 
    rn2(1); rn2(75); rn2(4); rn2(75); rn2(4); rn2(6); rn2(3); rn2(3); rn2(3); rn2(8); rn2(3); 
    rn2(3); rn2(4); rn2(3); rn2(4); rnd(2); rnd(3); rnd(2); rn2(10); rn2(60); rn2(60); rn2(3); 
    rn2(4); rn2(3); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3); rn2(11); rn2(4); rn2(3); 
    rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rnd(2); rnd(4); rn2(50); 
    rn2(100); rn2(100); rn2(8); rnd(25); rn2(11); rn2(4); rnd(4); rn2(8); rn2(3); rn2(10); 
    rn2(60); rn2(60); rn2(78); rn2(20); rn2(11); rn2(4); rnd(2); rn2(3); rn2(4); rn2(5); rn2(7); 
    rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(10); rn2(2); rn2(20); rn2(30); rn2(3); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); 
    rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rnd(2); rnd(1000); rnd(2); rn2(6); rn2(3); rnd(1000); rnd(2); rn2(6); rn2(3); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); 
    rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(1000); rnd(2); rn2(6); 
    rn2(3); rnd(1000); rnd(2); rn2(6); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rnd(2); rnd(1000); rnd(2); rn2(6); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); 
}
