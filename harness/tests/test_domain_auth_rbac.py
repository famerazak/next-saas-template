from __future__ import annotations

import unittest

from harness.policy_loader import load_policy


class DomainAuthRbacTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = load_policy("harness/supervisor_policy.json")

    def test_auth_profile_is_blocking(self) -> None:
        self.assertTrue(self.policy["profiles"]["auth-rbac"]["blocking"])

    def test_auth_profile_includes_required_gates(self) -> None:
        gates = set(self.policy["profiles"]["auth-rbac"]["gates"])
        self.assertTrue({"auth-flow-tests", "permission-matrix-tests"}.issubset(gates))


if __name__ == "__main__":
    unittest.main()
