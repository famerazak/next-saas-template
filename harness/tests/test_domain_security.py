from __future__ import annotations

import unittest

from harness.policy_loader import load_policy


class DomainSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = load_policy("harness/supervisor_policy.json")

    def test_security_profile_blocking(self) -> None:
        self.assertTrue(self.policy["profiles"]["security-hardening"]["blocking"])

    def test_security_profile_has_env_and_csp_gates(self) -> None:
        gates = set(self.policy["profiles"]["security-hardening"]["gates"])
        self.assertTrue({"headers-csp-tests", "env-validation-tests"}.issubset(gates))


if __name__ == "__main__":
    unittest.main()
