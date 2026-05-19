import { runSegment } from './jsmain.js';
import { readFileSync } from 'fs';

const sessionFile = process.argv[2] || 'sessions/seed8000-tourist-starter.session.json';
const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
const golden = session.segments.flatMap(s => s.steps.flatMap(st => st.rng || []))
    .filter(e => /^(?:rn2|rnd|rn1|rne|rnz|d)\(/.test(e))
    .map(e => e.replace(/\s*@\s.*$/, ''));

const seg = session.segments[0];
const g = await runSegment({
    seed: seg.seed ?? session.seed,
    datetime: seg.datetime ?? session.datetime,
    nethackrc: seg.nethackrc ?? session.nethackrc ?? '',
    moves: seg.moves ?? '',
    storage: seg.storage ?? {},
});

const ourLog = g.getRngLog ? g.getRngLog() : [];
console.log('Golden length:', golden.length, 'Our length:', ourLog.length);

let firstMismatch = -1;
for (let i = 0; i < Math.min(golden.length, ourLog.length); i++) {
    if (golden[i] !== ourLog[i]) { firstMismatch = i; break; }
}
const di = firstMismatch >= 0 ? firstMismatch : Math.min(golden.length, ourLog.length);
console.log(`First mismatch at index ${di}:`);
for (let j = Math.max(0,di-3); j <= Math.min(Math.max(golden.length,ourLog.length)-1, di+5); j++) {
    const g2 = golden[j] || '(none)';
    const o = ourLog[j] || '(none)';
    const mark = j < di ? '✓' : (g2 === o ? '✓' : '✗');
    console.log(`  ${j}: ${mark} golden="${g2}" ours="${o}"`);
}
