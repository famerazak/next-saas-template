#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

from harness.dod_contract import DoDContractError, load_contract


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def main() -> int:
    try:
        task_id = _require_env("HARNESS_TASK_ID")
        run_id = _require_env("HARNESS_RUN_ID")
    except RuntimeError as exc:
        print(f"Playwright evidence gate failed: {exc}", file=sys.stderr)
        return 2

    if shutil.which("npx") is None:
        print("Playwright evidence gate failed: npx is not available in PATH", file=sys.stderr)
        return 2

    try:
        contract = load_contract(task_id)
    except DoDContractError as exc:
        print(f"Playwright evidence gate failed: {exc}", file=sys.stderr)
        return 1

    tag = contract["required_evidence"]["playwright"]["tag"]
    video_required = contract["required_evidence"]["playwright"]["video_required"]

    artifacts_dir = Path(os.getenv("HARNESS_ARTIFACTS_DIR", ".supervisor-artifacts"))
    evidence_dir = artifacts_dir / run_id / "ui-evidence" / task_id
    test_output_dir = evidence_dir / "test-results"
    html_report_dir = evidence_dir / "html-report"
    json_report_file = evidence_dir / "results.json"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env["PLAYWRIGHT_TEST_OUTPUT_DIR"] = str(test_output_dir)
    env["PLAYWRIGHT_HTML_REPORT_DIR"] = str(html_report_dir)
    env["PLAYWRIGHT_JSON_REPORT_FILE"] = str(json_report_file)

    cmd = [
        "npx",
        "playwright",
        "test",
        "--config",
        "playwright.config.ts",
        "--grep",
        tag,
    ]
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True)
    print(proc.stdout, end="")
    if proc.stderr:
        print(proc.stderr, file=sys.stderr, end="")

    if proc.returncode != 0:
        return proc.returncode

    if video_required:
        videos = list(test_output_dir.rglob("*.webm"))
        if not videos:
            print(
                f"Playwright evidence gate failed: no video artifact found for {task_id} in {test_output_dir}",
                file=sys.stderr,
            )
            return 1

    print(f"Playwright evidence gate passed for {task_id}; artifacts in {evidence_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
