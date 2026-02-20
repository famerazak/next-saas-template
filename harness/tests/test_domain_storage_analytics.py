from __future__ import annotations

import unittest

from harness.policy_loader import load_policy


class DomainStorageAnalyticsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = load_policy("harness/supervisor_policy.json")

    def test_storage_profile_is_advisory(self) -> None:
        self.assertFalse(self.policy["profiles"]["storage-data"]["blocking"])

    def test_analytics_profile_has_pii_gate(self) -> None:
        gates = set(self.policy["profiles"]["analytics-legal"]["gates"])
        self.assertIn("pii-payload-tests", gates)


if __name__ == "__main__":
    unittest.main()
