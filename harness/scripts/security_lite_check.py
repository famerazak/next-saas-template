#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

PATTERNS = {
    "possible private key": re.compile(r"-----BEGIN (RSA |EC )?PRIVATE KEY-----"),
    "possible live stripe key": re.compile(r"sk_live_[A-Za-z0-9]+"),
    "possible secret assignment": re.compile(r"\b(API_KEY|SECRET|TOKEN|PASSWORD)\s*=\s*['\"][^'\"]+['\"]"),
}

IGNORE_FILE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".pdf"}
IGNORE_DIRS = {".git", ".supervisor-artifacts", "node_modules", ".venv", "__pycache__"}


def should_scan(path: Path) -> bool:
    if path.suffix.lower() in IGNORE_FILE_SUFFIXES:
        return False
    return not any(part in IGNORE_DIRS for part in path.parts)


def main() -> int:
    findings: list[str] = []

    for path in ROOT.rglob("*"):
        if not path.is_file() or not should_scan(path):
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for name, pattern in PATTERNS.items():
            if pattern.search(content):
                findings.append(f"{path}: {name}")

    if findings:
        print("Security-lite check failed:")
        for finding in findings:
            print(f"- {finding}")
        return 1

    print("Security-lite check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
