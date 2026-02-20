from __future__ import annotations

import unittest

from harness.policy_loader import load_policy


class PolicyLoaderTests(unittest.TestCase):
    def test_policy_loads(self) -> None:
        policy = load_policy("harness/supervisor_policy.json")
        self.assertEqual(policy["retry"]["max_retries"], 3)
        self.assertIn("safe-baseline", policy["profiles"])
        self.assertTrue(policy["gates"]["dod-contract"]["blocking"])
        self.assertTrue(policy["gates"]["slice-ui-evidence"]["blocking"])


if __name__ == "__main__":
    unittest.main()
