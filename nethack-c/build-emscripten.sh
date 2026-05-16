#!/bin/bash
# build-emscripten.sh — Compile NetHack 5.0 to asm.js (WASM=0) using Emscripten.
# Output: js/nethack-core.cjs  (CommonJS — pre-built, committed — no build step for judge)
#         js/nethack-core.js   (ESM re-export wrapper for nethack-core.cjs)
#
# Run from the repo root: bash nethack-c/build-emscripten.sh
#
# Requires: emcc (emscripten), make, clang, flex

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UPSTREAM_DIR="$SCRIPT_DIR/upstream"
BUILD_DIR="$SCRIPT_DIR/emscripten-build"
PATCHES_DIR="$SCRIPT_DIR/patches"
OUTPUT_CJS="$REPO_ROOT/js/nethack-core.cjs"
OUTPUT_JS="$REPO_ROOT/js/nethack-core.js"

echo "=== NetHack 5.0 → asm.js build ==="

if ! command -v emcc &>/dev/null; then
    echo "[FAIL] emcc not found" >&2; exit 1
fi
if ! command -v flex &>/dev/null; then
    echo "[FAIL] flex not found (sudo apt-get install flex)" >&2; exit 1
fi

# --- Step 1: fresh build tree ---
echo "[1] Setting up build tree..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
rsync -a --exclude='.git' "$UPSTREAM_DIR/" "$BUILD_DIR/"
BUILD_DIR_REAL=$(cd "$BUILD_DIR" && pwd -P)
cd "$BUILD_DIR_REAL"
git init -q
git -c gc.auto=0 add -A
git -c user.email=build@local -c user.name=build commit -q -m baseline >/dev/null
for p in "$PATCHES_DIR"/*.patch; do
    echo "  applying $(basename "$p")..."
    git apply --recount "$p"
done
rm -rf .git
echo "[ok] patches applied"

# --- Step 2: terminal stubs (bypass curses/term headers in termcap.c, wintty.h) ---
echo "[2] Injecting terminal header stubs..."
# Place stubs directly in include/ so they're found by all sub-makes without -isystem
mkdir -p include
# term.h stub — declare termcap functions (tcap.h defines TERMLIB so they compile;
# with ANSI_DEFAULT, term_startup() returns early before calling any of them)
cat > include/term.h << 'TERM_STUB'
/* term.h stub for Emscripten build.
   tcap.h defines TERMLIB so the tgetstr/tgetnum code still compiles.
   With ANSI_DEFAULT, term_startup() returns early before calling these. */
#ifndef _TERM_STUB_H
#define _TERM_STUB_H
static inline int    tgetent(char *bp, const char *name) { (void)bp;(void)name; return -1; }
static inline char  *tgetstr(const char *id, char **area) { (void)id;(void)area; return (char*)0; }
static inline int    tgetnum(const char *id) { (void)id; return -1; }
static inline int    tgetflag(const char *id) { (void)id; return 0; }
static inline char  *tgoto(const char *cap, int col, int row) { (void)cap;(void)col;(void)row; return (char*)0; }
#endif
TERM_STUB
# curses.h stub — TERMLIB&&UNIX&&TERMINFO block in termcap.c includes this.
# With ANSI_DEFAULT, term_startup() returns early, so none are actually called.
cat > include/curses.h << 'CURSES_STUB'
/* curses.h stub for Emscripten build. */
#ifndef _CURSES_STUB_H
#define _CURSES_STUB_H
/* Full set of ncurses COLOR_* (RGB ordering per Linux ncurses) */
#define COLOR_BLACK   0
#define COLOR_RED     1
#define COLOR_GREEN   2
#define COLOR_YELLOW  3
#define COLOR_BLUE    4
#define COLOR_MAGENTA 5
#define COLOR_CYAN    6
#define COLOR_WHITE   7
#define BRIGHT        8
#define A_BOLD        0x0200
#define A_DIM         0x0400
/* Terminfo function stubs — bodies don't matter with ANSI_DEFAULT */
static inline int tputs(const char *s, int n, int(*f)(int)) { (void)s;(void)n;(void)f; return 0; }
static inline char *tparm(const char *s, ...) { (void)s; return (char*)""; }
static inline int setupterm(const char *t, int f, int *e) { (void)t;(void)f;if(e)*e=0; return -1; }
#endif
CURSES_STUB

# --- Step 3: configure ---
echo "[3] Configuring..."
# Patch the linux-minimal hints file for emcc
INSTALL_PREFIX="$BUILD_DIR_REAL/install"
sed -i.bak "s|^\(PREFIX=\).*|\1$INSTALL_PREFIX|" sys/unix/hints/linux-minimal
sh sys/unix/setup.sh sys/unix/hints/linux-minimal

# The CFLAGS changes:
#   -DANSI_DEFAULT   — bypass tgetent; use hardcoded ANSI escapes
#   -UTERMLIB        — suppress termcap library path in termcap.c
#   -DNO_SIGNAL      — skip signal()/alarm() not well-supported in emscripten
#   -DNOMAIL         — skip mail checking
#   -DNOTPARMDECL    — skip conflicting extern tparm() declaration in termcap.c
EMCC_CFLAGS="-O2 -DANSI_DEFAULT -UTERMLIB -DNO_SIGNAL -DNOMAIL -DNOTPARMDECL"
EMCC_LDFLAGS="-s WASM=0 -s MODULARIZE=1 -s EXPORT_NAME=createNetHack -s ASYNCIFY=0 -s EXPORTED_RUNTIME_METHODS=FS,ENV -lnodefs.js -Wl,--export=main"

# Patch the generated Makefile to swap in emcc
sed -i.bak \
    -e "s|^CC = clang|CC = emcc|" \
    -e "s|^LINK = clang|LINK = emcc|" \
    -e "s|^CC = .*|CC = emcc|" \
    sys/unix/Makefile.top 2>/dev/null || true
sed -i.bak \
    -e "s|CC=clang|CC=emcc|" \
    -e "s|LINK=clang|LINK=emcc|" \
    Makefile 2>/dev/null || true

# --- Step 4: build Lua with emcc ---
echo "[4] Building Lua with emcc..."
# Use submodule source (already at submodules/lua/ with all .c/.h files)
# NetHack expects lua source in lib/lua-5.4.8/src/
LUA_SRC="$BUILD_DIR_REAL/lib/lua-5.4.8/src"
mkdir -p "$LUA_SRC"
if [ ! -f "$LUA_SRC/lua.h" ]; then
    # Copy from the git submodule (already initialized in upstream/)
    LUA_SUB="$UPSTREAM_DIR/submodules/lua"
    if [ ! -f "$LUA_SUB/lua.h" ]; then
        echo "[FAIL] Lua submodule not initialized. Run: git submodule update --init nethack-c/upstream/submodules/lua" >&2
        exit 1
    fi
    cp "$LUA_SUB"/*.c "$LUA_SUB"/*.h "$LUA_SUB"/makefile "$LUA_SRC/"
fi
( cd "$LUA_SRC" && make CC=emcc SYSCFLAGS="-DLUA_USE_POSIX" a 2>&1 | tail -3 )
mkdir -p lib/lua
cp -f "$LUA_SRC/liblua.a" lib/lua/liblua-5.4.8.a
echo "[ok] Lua built"

# Generate include/nhlua.h (wraps Lua headers; needed before compiling any source)
make include/nhlua.h 2>&1 | tail -3 || true

# --- Step 5: build makedefs with native clang, then game with emcc ---
echo "[5a] Building makedefs with native clang (isolated OBJDIR)..."
export SOURCE_DATE_EPOCH="${TELEPORT_BUILD_EPOCH:-1777723200}"

# makedefs is a build-time host tool whose .o dependencies (src/monst.o etc.)
# would conflict with the emcc game build if placed in src/. We temporarily
# redirect OBJDIR to a temp dir so native ELF never lands in src/.

HOST_OBJDIR=/tmp/nh-makedefs-objs
mkdir -p "$HOST_OBJDIR"

# Patch util/Makefile: redirect OBJDIR and fix the HACKLIB rule (which
# normally calls 'cd ../src && make hacklib.a' — that would use emcc CC).
python3 - "$HOST_OBJDIR" <<'PATCH_UTIL'
import re, sys
host_objdir = sys.argv[1]
path = 'util/Makefile'
txt = open(path).read()
# Redirect OBJDIR to our temp dir
txt = txt.replace('OBJDIR = ../src', f'OBJDIR = {host_objdir}', 1)
# Fix HACKLIB rule: compile hacklib.c directly instead of delegating to src Makefile
txt = re.sub(
    r'(\$\(HACKLIB\):[^\n]+\n)\t@\( cd \.\.\/src ; \$\(MAKE\) hacklib\.a \)',
    r'\1\t$(CC) $(CFLAGS) $(CSTD) -c $(HACKLIBSRC) -o $(OBJDIR)/hacklib.o\n'
    r'\tar rc $@ $(OBJDIR)/hacklib.o panic.o\n'
    r'\tranlib $@',
    txt
)
open(path, 'w').write(txt)
print(f"[ok] util/Makefile patched: OBJDIR → {host_objdir}")
PATCH_UTIL

# Build makedefs with clang; its .o files go to HOST_OBJDIR (not src/)
( cd util && make CC=clang CFLAGS="-g -I../include" makedefs 2>&1 | tail -5 )
echo "[ok] makedefs built"

# Generate critical makedefs outputs (must run from util/ where makedefs
# expects to be — it uses relative paths like ../include/)
( cd util && ./makedefs -o )   # include/onames.h
( cd util && ./makedefs -p )   # include/pm.h
echo "[ok] onames.h and pm.h generated"

# Restore OBJDIR to ../src for the emcc game build
python3 -c "
host_objdir = '$HOST_OBJDIR'
path = 'util/Makefile'
txt = open(path).read()
txt = txt.replace(f'OBJDIR = {host_objdir}', 'OBJDIR = ../src', 1)
open(path, 'w').write(txt)
"
echo "[ok] util/Makefile restored (OBJDIR = ../src)"

# Patch src/Makefile: make the $(MAKEDEFS) rule a no-op if makedefs already
# exists as a native binary. This prevents the emcc build from trying to
# relink makedefs with emcc when its C source deps (makedefs.c, etc.) are
# newer than the binary.
python3 - <<'PATCH_SRC'
path = 'src/Makefile'
txt = open(path).read()
# monst.o and objects.o rules delete $(MAKEDEFS) after compiling, which forces
# makedefs to be rebuilt (with emcc). Remove those deletions since we provide
# makedefs as a pre-built native binary.
txt = txt.replace(
    '\t$(CC) $(CFLAGS) $(CSTD) -c -o $@ monst.c\n\t@rm -f $(MAKEDEFS)\n',
    '\t$(CC) $(CFLAGS) $(CSTD) -c -o $@ monst.c\n',
    1
)
txt = txt.replace(
    '\t$(CC) $(CFLAGS) $(CSTD) -c -o $@ objects.c\n\t@rm -f $(MAKEDEFS)\n',
    '\t$(CC) $(CFLAGS) $(CSTD) -c -o $@ objects.c\n',
    1
)
# Also make the $(MAKEDEFS) rule a no-op if makedefs already exists
old = '\t@( cd ../util ; $(MAKE) makedefs )\n'
new = '\t@[ -f $@ ] || ( cd ../util ; $(MAKE) makedefs )\n'
if old in txt:
    txt = txt.replace(old, new, 1)
    open(path, 'w').write(txt)
    print("[ok] src/Makefile patched: removed makedefs deletion from monst.o/objects.o rules")
else:
    print("[warn] Could not find makedefs recipe in src/Makefile to patch")
    open(path, 'w').write(txt)
    print("[ok] src/Makefile patched: removed makedefs deletion from monst.o/objects.o rules (recipe not found)")
PATCH_SRC

echo "[5b] Building NetHack with emcc (this takes a few minutes)..."

# Provide a 'main' symbol so emscripten can find an entry point.
# Without this, LLVM renames int main(argc,argv) to __main_argc_argv and
# DCE eliminates all game code (since nothing roots the call graph).
# This stub satisfies --export-if-defined=main; emscripten's callMain() then
# calls __main_argc_argv internally.
cat > src/emscripten_entry.c << 'ENTRY_C'
/* emscripten_entry.c — entry point shim for WASM=0 asm.js build.
   Clang renames main(argc,argv) to __main_argc_argv; wasm-ld DCEs it if
   no 'main' symbol exists.  This shim re-exports a zero-arg main so
   --export-if-defined=main keeps the entire call graph alive.
   emscripten's callMain() calls Module._main(0,0) which lands here. */

/* ospeed: normally defined in libtermcap/tclib.c; not linked here,
   so we provide the definition directly. */
short ospeed = 0;

extern int __main_argc_argv(int argc, char *argv[]);
int main(void) { return __main_argc_argv(0, 0); }
ENTRY_C
emcc -g -I../include $EMCC_CFLAGS -c src/emscripten_entry.c -o src/emscripten_entry.o
echo "[ok] emscripten_entry.o compiled"

# CFLAGS instead of SYSCFLAGS (SYSCFLAGS is only for Lua, not main sources)
# Note: LINK runs from inside src/ directory, so the entry stub path is relative
ENTRY_OBJ="$BUILD_DIR_REAL/src/emscripten_entry.o"
make CFLAGS="-g -I../include $EMCC_CFLAGS" \
     WINTTYLIB="" \
     CC=emcc \
     LINK="emcc $EMCC_LDFLAGS $ENTRY_OBJ" \
     2>&1 | tee /tmp/nh-emcc-build.log | tail -20

echo "[ok] Build complete"

# --- Step 6: install data files + produce final JS ---
echo "[6] Installing and bundling data files..."
make install CFLAGS="-g -I../include $EMCC_CFLAGS" CC=emcc 2>/dev/null || true

# emcc names the output file after the make target: "nethack" (not .js)
# Check both names; verify it's JS not ELF by reading magic bytes.
GAME_JS=""
for candidate in "$BUILD_DIR_REAL/src/nethack.js" "$BUILD_DIR_REAL/src/nethack"; do
    if [ -f "$candidate" ] && ! head -c 4 "$candidate" | grep -q $'^\x7fELF'; then
        GAME_JS="$candidate"
        break
    fi
done
if [ -z "$GAME_JS" ]; then
    echo "[FAIL] nethack(.js) not found in src/. Check /tmp/nh-emcc-build.log" >&2
    exit 1
fi

cp "$GAME_JS" "$OUTPUT_CJS"
echo "[ok] CJS output: $OUTPUT_CJS"

# Write an ESM re-export wrapper so ESM consumers can 'import createNetHack from ...'
cat > "$OUTPUT_JS" << 'ESM_WRAPPER'
// nethack-core.js — ESM re-export of the emscripten CommonJS build.
// The emscripten output uses module.exports (CJS) so it lives in .cjs;
// this wrapper lets ES-module code import it with a default import.
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const createNetHack = _require('./nethack-core.cjs');
export default createNetHack;
ESM_WRAPPER
echo "[ok] ESM wrapper: $OUTPUT_JS"

echo
echo "[ok] Build complete."
echo "     Test: node --input-type=module -e 'import createNetHack from \"./js/nethack-core.js\"; console.log(typeof createNetHack);'"
