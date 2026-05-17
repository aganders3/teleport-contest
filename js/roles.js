// roles.js — Role, race, gender, alignment data.
// C ref: role.c — roles[], races[], aligns[], genders[]
//
// Attribute order: A_STR=0 A_INT=1 A_WIS=2 A_DEX=3 A_CON=4 A_CHA=5
// attrbase: starting attribute values; attrdist: probability weights for rnd_attr (sum=100)
// attrmin/attrmax: bounds from race data (human: min=[3×6], max=[118,18,18,18,18,18])
// STR18(100) = 118 in the internal representation (18/100 exceptional strength)

export const roles = [
    { name: { m: 'Archeologist', f: 'Archeologist' }, mnum: 0,
      attrbase: [7, 10, 10, 7, 7, 7], attrdist: [20, 20, 20, 10, 20, 10],
      hpadv: { infix: 11, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
    { name: { m: 'Barbarian', f: 'Barbarian' }, mnum: 1,
      attrbase: [16, 7, 7, 15, 16, 6], attrdist: [30, 6, 7, 20, 30, 7],
      hpadv: { infix: 14, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
    { name: { m: 'Caveman', f: 'Cavewoman' }, mnum: 2,
      attrbase: [10, 7, 7, 7, 8, 6], attrdist: [30, 6, 7, 20, 30, 7],
      hpadv: { infix: 14, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
    { name: { m: 'Healer', f: 'Healer' }, mnum: 3,
      attrbase: [7, 7, 13, 7, 11, 16], attrdist: [15, 20, 20, 15, 25, 5],
      hpadv: { infix: 11, inrnd: 0 }, enadv: { infix: 1, inrnd: 4 } },
    { name: { m: 'Knight', f: 'Knight' }, mnum: 4,
      attrbase: [13, 7, 14, 8, 10, 17], attrdist: [30, 15, 15, 10, 20, 10],
      hpadv: { infix: 14, inrnd: 0 }, enadv: { infix: 1, inrnd: 4 } },
    { name: { m: 'Monk', f: 'Monk' }, mnum: 5,
      attrbase: [10, 7, 8, 8, 7, 7], attrdist: [25, 10, 20, 20, 15, 10],
      hpadv: { infix: 12, inrnd: 0 }, enadv: { infix: 2, inrnd: 2 } },
    { name: { m: 'Priest', f: 'Priestess' }, mnum: 6,
      attrbase: [7, 7, 10, 7, 7, 7], attrdist: [15, 10, 30, 15, 20, 10],
      hpadv: { infix: 12, inrnd: 0 }, enadv: { infix: 4, inrnd: 3 } },
    { name: { m: 'Ranger', f: 'Ranger' }, mnum: 7,
      attrbase: [13, 13, 13, 9, 13, 7], attrdist: [30, 10, 10, 20, 20, 10],
      hpadv: { infix: 13, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
    { name: { m: 'Rogue', f: 'Rogue' }, mnum: 8,
      attrbase: [7, 7, 7, 10, 7, 6], attrdist: [20, 10, 10, 30, 20, 10],
      hpadv: { infix: 10, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
    { name: { m: 'Samurai', f: 'Samurai' }, mnum: 9,
      attrbase: [10, 8, 7, 10, 17, 6], attrdist: [30, 10, 8, 30, 14, 8],
      hpadv: { infix: 13, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
    { name: { m: 'Tourist', f: 'Tourist' }, mnum: 10,
      attrbase: [7, 10, 6, 7, 7, 10], attrdist: [15, 10, 10, 15, 30, 20],
      hpadv: { infix: 8, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 },
      title: [
          { m: 'Rambler', f: 'Rambler' },
          { m: 'Sightseer', f: 'Sightseer' },
      ] },
    { name: { m: 'Valkyrie', f: 'Valkyrie' }, mnum: 11,
      attrbase: [10, 7, 7, 7, 10, 7], attrdist: [30, 6, 7, 20, 30, 7],
      hpadv: { infix: 14, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
    { name: { m: 'Wizard', f: 'Wizard' }, mnum: 12,
      attrbase: [7, 10, 7, 7, 7, 7], attrdist: [10, 30, 10, 20, 20, 10],
      hpadv: { infix: 10, inrnd: 0 }, enadv: { infix: 4, inrnd: 3 } },
];

export const races = [
    { name: 'human', adj: 'human', mnum: 0,
      attrmin: [3, 3, 3, 3, 3, 3], attrmax: [118, 18, 18, 18, 18, 18],
      hpadv: { infix: 2, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
    { name: 'elf', adj: 'elven', mnum: 1,
      attrmin: [3, 3, 3, 3, 3, 3], attrmax: [18, 20, 20, 18, 16, 18],
      hpadv: { infix: 1, inrnd: 0 }, enadv: { infix: 2, inrnd: 0 } },
    { name: 'dwarf', adj: 'dwarven', mnum: 2,
      attrmin: [3, 3, 3, 3, 3, 3], attrmax: [118, 16, 16, 20, 20, 16],
      hpadv: { infix: 4, inrnd: 0 }, enadv: { infix: 0, inrnd: 0 } },
    { name: 'gnome', adj: 'gnomish', mnum: 3,
      attrmin: [3, 3, 3, 3, 3, 3], attrmax: [118, 19, 18, 18, 18, 18],
      hpadv: { infix: 1, inrnd: 0 }, enadv: { infix: 2, inrnd: 0 } },
    { name: 'orc', adj: 'orcish', mnum: 4,
      attrmin: [3, 3, 3, 3, 3, 3], attrmax: [118, 16, 16, 18, 18, 16],
      hpadv: { infix: 1, inrnd: 0 }, enadv: { infix: 1, inrnd: 0 } },
];

export const aligns = [
    { name: 'lawful', value: 1 },
    { name: 'neutral', value: 0 },
    { name: 'chaotic', value: -1 },
];

export const genders = [
    { name: 'male', value: 0 },
    { name: 'female', value: 1 },
];

export function findRole(name) {
    if (!name || typeof name !== 'string') return null;
    const lc = name.toLowerCase();
    return roles.find(r => r.name.m.toLowerCase() === lc || r.name.f.toLowerCase() === lc);
}

export function findRace(name) {
    if (!name || typeof name !== 'string') return null;
    const lc = name.toLowerCase();
    return races.find(r => r.name.toLowerCase() === lc);
}
