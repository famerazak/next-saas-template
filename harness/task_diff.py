from __future__ import annotations

import re
import subprocess
from pathlib import Path


_TASK_DIFF_LINE = re.compile(
    r"^\+\s*-\s\[(?P<status>[ xX])]\s\*\*(?P<body>.+?)\*\*(?P<tags>(?:\s*\[[A-Za-z0-9_-]+])*)\s*$"
)
_TASK_ID_BODY = re.compile(r"^(?P<id>[A-Za-z0-9._-]+)\s-\s.+$")


def extract_changed_task_ids(diff_text: str) -> list[str]:
    ids: set[str] = set()
    for line in diff_text.splitlines():
        if not line.startswith("+") or line.startswith("+++"):
            continue
        match = _TASK_DIFF_LINE.match(line)
        if not match:
            continue
        body = match.group("body").strip()
        id_match = _TASK_ID_BODY.match(body)
        if id_match:
            ids.add(id_match.group("id"))
    return sorted(ids)


def changed_task_ids_from_git(base_sha: str, head_sha: str, tasks_file: str | Path) -> list[str]:
    for sha in (base_sha, head_sha):
        verify = subprocess.run(
            ["git", "rev-parse", "--verify", f"{sha}^{{commit}}"],
            check=False,
            capture_output=True,
            text=True,
        )
        if verify.returncode != 0:
            raise RuntimeError(f"Invalid git commit for task diff: {sha}: {verify.stderr.strip()}")

    diff = subprocess.run(
        ["git", "diff", "--unified=0", f"{base_sha}...{head_sha}", "--", str(tasks_file)],
        check=False,
        capture_output=True,
        text=True,
    )
    if diff.returncode not in {0, 1}:
        raise RuntimeError(
            f"Failed to diff tasks file ({tasks_file}) between {base_sha} and {head_sha}: {diff.stderr}"
        )
    return extract_changed_task_ids(diff.stdout)
