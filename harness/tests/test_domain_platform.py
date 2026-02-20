from __future__ import annotations

import unittest

from harness.policy_loader import load_policy


class DomainPlatformTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = load_policy("harness/supervisor_policy.json")

    def test_platform_profile_blocking(self) -> None:
        self.assertTrue(self.policy["profiles"]["platform-admin"]["blocking"])

    def test_platform_profile_requires_reason_checks(self) -> None:
        gates = set(self.policy["profiles"]["platform-admin"]["gates"])
        self.assertIn("reason-required-action-tests", gates)


if __name__ == "__main__":
    unittest.main()
