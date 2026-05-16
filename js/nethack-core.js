// nethack-core.js — ESM re-export of the emscripten CommonJS build.
// The emscripten output uses module.exports (CJS) so it lives in .cjs;
// this wrapper lets ES-module code import it with a default import.
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const createNetHack = _require('./nethack-core.cjs');
export default createNetHack;
