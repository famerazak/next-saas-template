from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class PolicyError(ValueError):
    pass


def load_policy(policy_file: str | Path) -> dict[str, Any]:
    path = Path(policy_file)
    if not path.exists():
        raise FileNotFoundError(f"Policy file not found: {path}")

    with path.open("r", encoding="utf-8") as handle:
        policy = json.load(handle)

    validate_policy(policy)
    return policy


def validate_policy(policy: dict[str, Any]) -> None:
    required_top = [
        "version",
        "retry",
        "defaults",
        "tags_to_profiles",
        "profiles",
        "gates",
        "pilot",
    ]
    for key in required_top:
        if key not in policy:
            raise PolicyError(f"Missing top-level policy key: {key}")

    if "max_retries" not in policy["retry"]:
        raise PolicyError("retry.max_retries is required")
    if not isinstance(policy["retry"]["max_retries"], int) or policy["retry"]["max_retries"] < 1:
        raise PolicyError("retry.max_retries must be an integer >= 1")

    default_profile = policy["defaults"].get("default_profile")
    if not default_profile:
        raise PolicyError("defaults.default_profile is required")
    if default_profile not in policy["profiles"]:
        raise PolicyError("defaults.default_profile must exist in profiles")

    for profile_name, profile_cfg in policy["profiles"].items():
        if "blocking" not in profile_cfg:
            raise PolicyError(f"profiles.{profile_name}.blocking is required")
        if "gates" not in profile_cfg:
            raise PolicyError(f"profiles.{profile_name}.gates is required")
        for gate_id in profile_cfg["gates"]:
            if gate_id not in policy["gates"]:
                raise PolicyError(
                    f"profiles.{profile_name} references missing gate: {gate_id}"
                )
        for parent in profile_cfg.get("extends", []):
            if parent not in policy["profiles"]:
                raise PolicyError(
                    f"profiles.{profile_name}.extends references unknown profile: {parent}"
                )

    include_ids = policy["pilot"].get("include_task_ids", [])
    if not isinstance(include_ids, list):
        raise PolicyError("pilot.include_task_ids must be a list")

    for gate_id, gate_cfg in policy["gates"].items():
        if not gate_cfg.get("command"):
            raise PolicyError(f"gates.{gate_id}.command is required")
        if "blocking" in gate_cfg and not isinstance(gate_cfg["blocking"], bool):
            raise PolicyError(f"gates.{gate_id}.blocking must be a boolean when set")
