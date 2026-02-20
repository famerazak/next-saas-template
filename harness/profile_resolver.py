from __future__ import annotations

from collections import OrderedDict
from typing import Any

from harness.types import ProfileResolution


def _expand_profile(profile: str, profiles_cfg: dict[str, Any], ordered: OrderedDict[str, None]) -> None:
    cfg = profiles_cfg.get(profile)
    if not cfg:
        return
    for parent in cfg.get("extends", []):
        _expand_profile(parent, profiles_cfg, ordered)
    ordered.setdefault(profile, None)


def resolve_profiles(task_tags: list[str], policy: dict[str, Any]) -> ProfileResolution:
    profiles_cfg = policy["profiles"]
    tags_map = policy["tags_to_profiles"]
    default_profile = policy["defaults"]["default_profile"]

    unknown_tags: list[str] = []
    warnings: list[str] = []
    selected: OrderedDict[str, None] = OrderedDict()

    for tag in task_tags:
        mapped = tags_map.get(tag)
        if not mapped:
            unknown_tags.append(tag)
            warnings.append(f"Unknown task tag: {tag}")
            continue
        for profile in mapped:
            _expand_profile(profile, profiles_cfg, selected)

    if not selected:
        _expand_profile(default_profile, profiles_cfg, selected)

    profiles = list(selected.keys())
    blocking_profiles = [p for p in profiles if profiles_cfg[p]["blocking"]]
    advisory_profiles = [p for p in profiles if not profiles_cfg[p]["blocking"]]

    return ProfileResolution(
        profiles=profiles,
        blocking_profiles=blocking_profiles,
        advisory_profiles=advisory_profiles,
        unknown_tags=unknown_tags,
        warnings=warnings,
    )


def resolve_gates(profiles: list[str], policy: dict[str, Any]) -> list[str]:
    seen: OrderedDict[str, None] = OrderedDict()
    for profile in profiles:
        for gate in policy["profiles"][profile]["gates"]:
            seen.setdefault(gate, None)
    return list(seen.keys())
