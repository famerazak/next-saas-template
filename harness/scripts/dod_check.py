#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

from harness.dod_contract import DoDContractError, ensure_tag_has_test_coverage, load_contract


def main() -> int:
    task_id = os.getenv("HARNESS_TASK_ID", "").strip()
    if not task_id:
        print("HARNESS_TASK_ID is required for dod-contract gate", file=sys.stderr)
        return 2

    try:
        contract = load_contract(task_id)
        tag = contract["required_evidence"]["playwright"]["tag"]
        ensure_tag_has_test_coverage(tag)
    except DoDContractError as exc:
        print(f"DoD contract check failed: {exc}", file=sys.stderr)
        return 1

    print(f"DoD contract check passed for {task_id} ({tag})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
