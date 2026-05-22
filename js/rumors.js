// rumors.js — Fortune cookie rumors via getrumor().
// C ref: rumors.c getrumor(), get_rnd_line()
//
// The compiled rumors file uses fixed-length padded lines.
// Random selection is byte-offset based, not line-number based.
// Lines are XOR-encoded with key [0x01, 0x02, 0x04, 0x08, 0x10] cycling.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { rn2 } from './rng.js';

const XOR_KEY = [0x01, 0x02, 0x04, 0x08, 0x10];

let _rumorData = null;
let _trueStart = 0, _trueSize = 0;
let _falseStart = 0, _falseSize = 0;

function loadRumors() {
    if (_rumorData) return;
    try {
        const here = dirname(fileURLToPath(import.meta.url));
        const path = join(here, 'dat', 'rumors');
        _rumorData = readFileSync(path);
    } catch (e) {
        _rumorData = new Uint8Array(0);
        return;
    }
    // Header line 2: count,size,start_hex;count2,size2,start2_hex;0,0,end_hex
    const nl1 = _rumorData.indexOf(10);
    const nl2 = _rumorData.indexOf(10, nl1 + 1);
    const header = String.fromCharCode(..._rumorData.slice(nl1 + 1, nl2));
    const parts = header.split(';');
    const p0 = parts[0].split(',');
    const p1 = parts[1].split(',');
    _trueSize  = parseInt(p0[1], 10);
    _trueStart = parseInt(p0[2], 16);
    _falseSize  = parseInt(p1[1], 10);
    _falseStart = parseInt(p1[2], 16);
}

function decodeLine(bytes) {
    const out = [];
    for (let i = 0; i < bytes.length; i++) {
        out.push(bytes[i] ^ XOR_KEY[i % 5]);
    }
    // Strip trailing padding (underscores decoded as spaces or '_' → strip)
    // After XOR, padding bytes XOR to printable chars; strip them:
    // The padding in the source file is underscores '_'(0x5f), which after
    // XOR with cycling key becomes specific bytes. After decode, strip
    // trailing chars ≤ 32 or trailing '_' (unused padding artifact).
    let end = out.length;
    while (end > 0 && (out[end-1] <= 32 || out[end-1] === 95 /* '_' */)) end--;
    return String.fromCharCode(...out.slice(0, end));
}

// C ref: get_rnd_line() — pick a random line from [startPos, endPos) by byte offset.
// padlength: if non-zero, only accept lines where decoded len ≤ padlength.
function getRndLine(startPos, endPos, padlength) {
    const size = endPos - startPos;
    if (size < 1) return '';

    for (let tries = 10; tries > 0; tries--) {
        const offset = rn2(size);
        const seekPos = startPos + offset;

        // Find end of current partial line
        let lineEnd = _rumorData.indexOf(10, seekPos);
        if (lineEnd < 0 || lineEnd >= endPos) {
            // Past last newline → wrap: use first line
            const firstNl = _rumorData.indexOf(10, startPos);
            if (firstNl < 0 || firstNl >= endPos) return '';
            const raw = _rumorData.slice(startPos, firstNl);
            return decodeLine(raw);
        }

        // Read the NEXT line after the current partial
        const nextStart = lineEnd + 1;
        if (nextStart >= endPos) {
            // Wrap to first line
            const firstNl = _rumorData.indexOf(10, startPos);
            if (firstNl < 0 || firstNl >= endPos) return '';
            const raw = _rumorData.slice(startPos, firstNl);
            return decodeLine(raw);
        }

        const nextNl = _rumorData.indexOf(10, nextStart);
        const lineEndPos = (nextNl >= 0 && nextNl < endPos) ? nextNl : endPos;
        const raw = _rumorData.slice(nextStart, lineEndPos);

        // padlength check: if padlength > 0, only accept if raw.length ≤ padlength + 1
        if (padlength > 0 && raw.length > padlength + 1) continue;

        return decodeLine(raw);
    }
    return '';
}

// C ref: rumors.c getrumor(truth)
// truth: 1 = true rumor, 0 = false rumor, -1 = either (picks randomly)
// Makes: rn2(2) if truth=-1 (or truth >= 0: uses rn2(2) for adjtruth),
//        then rn2(section_size) for offset.
//
// C code: adjtruth = truth + rn2(2); if adjtruth >= 2: true, if 1: true, if 0: false
// truth=1: adjtruth = 1 or 2 → always true rumors
// truth=0: adjtruth = 0 or 1 → random
// truth=-1: not called with negative in this build
export function getrumor(truth) {
    loadRumors();
    if (!_trueSize || !_falseSize) return 'Unknown rumor.';

    // C: switch (adjtruth = truth + rn2(2)) { case 2,1: true; case 0: false }
    const adjtruth = truth + rn2(2);
    const useTrue = adjtruth >= 1;
    const startPos = useTrue ? _trueStart : _falseStart;
    const size     = useTrue ? _trueSize  : _falseSize;
    const endPos   = startPos + size;

    // padlength: rumors are padded to 59 chars (lines are 60 bytes incl. newline)
    return getRndLine(startPos, endPos, 59);
}
