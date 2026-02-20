#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys

from harness.task_diff import changed_task_ids_from_git


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Emit changed TASKS.md task IDs from a git range")
    parser.add_argument("--base", required=True, help="Base commit SHA")
    parser.add_argument("--head", required=True, help="Head commit SHA")
    parser.add_argument("--tasks-file", default="TASKS.md", help="Path to TASKS markdown file")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        ids = changed_task_ids_from_git(args.base, args.head, args.tasks_file)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(" ".join(ids))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
