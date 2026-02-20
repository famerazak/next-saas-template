from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


class DoDContractError(ValueError):
    pass


TASK_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]+$")


def contract_path_for_task(task_id: str, root: str | Path = "harness/dod/slices") -> Path:
    return Path(root) / f"{task_id}.json"


def load_contract(task_id: str, root: str | Path = "harness/dod/slices") -> dict[str, Any]:
    if not TASK_ID_PATTERN.match(task_id):
        raise DoDContractError(f"Invalid task ID format: {task_id}")

    path = contract_path_for_task(task_id, root=root)
    if not path.exists():
        raise DoDContractError(f"DoD contract not found for task {task_id}: {path}")

    try:
        contract = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise DoDContractError(f"Invalid JSON in DoD contract: {path}: {exc}") from exc

    validate_contract(contract, expected_task_id=task_id)
    return contract


def validate_contract(contract: dict[str, Any], expected_task_id: str | None = None) -> None:
    required_top = ["task_id", "title", "definition_of_done", "required_evidence"]
    for key in required_top:
        if key not in contract:
            raise DoDContractError(f"Missing DoD contract field: {key}")

    task_id = contract["task_id"]
    if not isinstance(task_id, str) or not TASK_ID_PATTERN.match(task_id):
        raise DoDContractError("DoD contract task_id must be a valid string identifier")
    if expected_task_id and task_id != expected_task_id:
        raise DoDContractError(
            f"DoD contract task_id mismatch: expected {expected_task_id}, found {task_id}"
        )

    title = contract["title"]
    if not isinstance(title, str) or not title.strip():
        raise DoDContractError("DoD contract title must be a non-empty string")

    dod_items = contract["definition_of_done"]
    if not isinstance(dod_items, list) or not dod_items:
        raise DoDContractError("definition_of_done must be a non-empty array")
    for item in dod_items:
        if not isinstance(item, str) or not item.strip():
            raise DoDContractError("definition_of_done items must be non-empty strings")

    evidence = contract["required_evidence"]
    if not isinstance(evidence, dict):
        raise DoDContractError("required_evidence must be an object")
    playwright = evidence.get("playwright")
    if not isinstance(playwright, dict):
        raise DoDContractError("required_evidence.playwright is required")

    tag = playwright.get("tag")
    if not isinstance(tag, str) or not tag.startswith("@"):
        raise DoDContractError("required_evidence.playwright.tag must start with '@'")
    if tag != f"@{task_id}":
        raise DoDContractError(
            f"Playwright evidence tag must match task_id (@{task_id}); got {tag}"
        )

    video_required = playwright.get("video_required")
    if not isinstance(video_required, bool):
        raise DoDContractError("required_evidence.playwright.video_required must be boolean")


def ensure_tag_has_test_coverage(tag: str, test_root: str | Path = "e2e") -> None:
    root = Path(test_root)
    if not root.exists():
        raise DoDContractError(f"Playwright test root not found: {root}")

    found = False
    for path in root.rglob("*.spec.ts"):
        if tag in path.read_text(encoding="utf-8"):
            found = True
            break

    if not found:
        raise DoDContractError(
            f"No Playwright spec references evidence tag {tag} under {root}"
        )
