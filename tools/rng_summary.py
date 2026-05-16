#!/usr/bin/env python3
"""
rng_summary.py — Summarize RNG call counts by source file across session JSONs.

Usage:
    python tools/rng_summary.py sessions/*.session.json
    python tools/rng_summary.py sessions/seed8000-tourist-starter.session.json
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

C_FILE_RE = re.compile(r'@\s+\w+\((\w+\.c):\d+\)')
LUA_FILE_RE = re.compile(r'src=(\w+\.lua)')


def file_of(call: str) -> str:
    m = C_FILE_RE.search(call)
    if m:
        return m.group(1)
    m = LUA_FILE_RE.search(call)
    if m:
        return m.group(1)
    return 'unknown'


def summarize_session(path: Path) -> dict:
    data = json.loads(path.read_text())
    counts = defaultdict(int)
    step_counts = defaultdict(int)
    for seg in data.get('segments', []):
        for i, step in enumerate(seg.get('steps', [])):
            label = 'init' if step.get('key') is None else f'step{i}'
            for call in step.get('rng', []):
                f = file_of(call)
                counts[f] += 1
                step_counts[(label, f)] += 1
    return dict(counts), dict(step_counts)


def main():
    if len(sys.argv) < 2:
        print("Usage: python rng_summary.py sessions/*.session.json", file=sys.stderr)
        sys.exit(1)

    paths = [Path(p) for p in sys.argv[1:]]
    aggregate = defaultdict(int)

    for path in paths:
        counts, _ = summarize_session(path)
        print(f"\n=== {path.name} ===")
        for f, n in sorted(counts.items(), key=lambda x: -x[1]):
            print(f"  {f:30s}  {n:6d}")
        total = sum(counts.values())
        print(f"  {'TOTAL':30s}  {total:6d}")
        for f, n in counts.items():
            aggregate[f] += n

    if len(paths) > 1:
        print(f"\n=== AGGREGATE ({len(paths)} sessions) ===")
        for f, n in sorted(aggregate.items(), key=lambda x: -x[1]):
            print(f"  {f:30s}  {n:6d}")
        print(f"  {'TOTAL':30s}  {sum(aggregate.values()):6d}")


if __name__ == '__main__':
    main()
