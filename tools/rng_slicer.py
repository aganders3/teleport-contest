#!/usr/bin/env python3
"""
rng_slicer.py — Extract the golden RNG call sequence for a specific source file.

The session JSON rng arrays include caller annotations like:
    "rn2(11)=2 @ shuffle(o_init.c:129)"
    "rn2(3)=1 @ random src=nhlib.lua:8 parent=shuffle(nhlib.lua:19)"

This tool slices a session's flat RNG log into the subsequence belonging to
a given C file (or Lua file), including global call indices. Use the output
as a golden spec when verifying a hand-ported JS module.

Usage:
    # All calls from o_init.c in the init step of seed8000:
    python tools/rng_slicer.py sessions/seed8000-tourist-starter.session.json o_init.c

    # Across multiple sessions:
    python tools/rng_slicer.py sessions/*.session.json o_init.c

    # Lua files:
    python tools/rng_slicer.py sessions/seed8000-tourist-starter.session.json nhlib.lua

    # Show ALL calls with indices (no filter):
    python tools/rng_slicer.py sessions/seed8000-tourist-starter.session.json --all

Output format (one line per matched call):
    <global_index>  <step_label>  <call>
"""

import json
import re
import sys
from pathlib import Path

C_FILE_RE = re.compile(r'@\s+\w+\((\w+\.c):\d+\)')
LUA_FILE_RE = re.compile(r'src=(\w+\.lua)|parent=\w+\((\w+\.lua):\d+\)')


def file_of(call: str) -> str:
    m = C_FILE_RE.search(call)
    if m:
        return m.group(1)
    m = LUA_FILE_RE.search(call)
    if m:
        return m.group(1) or m.group(2)
    return None


def extract_calls(path: Path, target_file: str | None) -> list[tuple[int, str, str]]:
    """Returns list of (global_index, step_label, call_string)."""
    data = json.loads(path.read_text())
    results = []
    idx = 0
    for seg in data.get('segments', []):
        for i, step in enumerate(seg.get('steps', [])):
            label = 'init' if step.get('key') is None else f'step{i}({step["key"]!r})'
            for call in step.get('rng', []):
                f = file_of(call)
                if target_file is None or f == target_file:
                    results.append((idx, label, call))
                idx += 1
    return results


def main():
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    *session_paths, target = sys.argv[1:]
    show_all = target == '--all'
    target_file = None if show_all else target

    for path_str in session_paths:
        path = Path(path_str)
        calls = extract_calls(path, target_file)
        label = 'ALL' if show_all else target_file
        print(f"# {path.name}  [{label}]  {len(calls)} calls")
        for idx, step, call in calls:
            print(f"{idx:6d}  {step:25s}  {call}")
        print()


if __name__ == '__main__':
    main()
