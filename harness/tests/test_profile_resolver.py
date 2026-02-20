from __future__ import annotations

import unittest

from harness.policy_loader import load_policy
from harness.profile_resolver import resolve_gates, resolve_profiles


class ProfileResolverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = load_policy("harness/supervisor_policy.json")

    def test_untagged_uses_safe_baseline(self) -> None:
        resolution = resolve_profiles([], self.policy)
        self.assertEqual(resolution.profiles, ["safe-baseline"])
        self.assertEqual(resolution.blocking_profiles, [])

    def test_tagged_resolves_expected_profile(self) -> None:
        resolution = resolve_profiles(["auth", "rbac"], self.policy)
        self.assertIn("auth-rbac", resolution.profiles)
        self.assertIn("safe-baseline", resolution.profiles)
        self.assertIn("auth-rbac", resolution.blocking_profiles)

    def test_unknown_tag_warns_and_continues(self) -> None:
        resolution = resolve_profiles(["unknown"], self.policy)
        self.assertIn("unknown", resolution.unknown_tags)
        self.assertEqual(resolution.profiles, ["safe-baseline"])

    def test_multi_tag_gate_dedup(self) -> None:
        resolution = resolve_profiles(["auth", "security"], self.policy)
        gates = resolve_gates(resolution.profiles, self.policy)
        self.assertEqual(len(gates), len(set(gates)))


if __name__ == "__main__":
    unittest.main()
