#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def should_scan(path: Path) -> bool:
    skip_parts = {".git", ".supervisor-artifacts", "node_modules", ".venv", "__pycache__"}
    return not any(part in skip_parts for part in path.parts)


def main() -> int:
    failures: list[str] = []
    for path in ROOT.rglob("*.py"):
        if not should_scan(path):
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if line.rstrip() != line:
                failures.append(f"{path}:{lineno}: trailing whitespace")
            if "\t" in line:
                failures.append(f"{path}:{lineno}: tab character not allowed")

    if failures:
        print("Lint check failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Lint check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
