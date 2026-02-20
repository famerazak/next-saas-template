from __future__ import annotations

import unittest

from harness.policy_loader import load_policy


class DomainBillingWebhookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = load_policy("harness/supervisor_policy.json")

    def test_billing_profile_blocking(self) -> None:
        self.assertTrue(self.policy["profiles"]["billing-payments"]["blocking"])

    def test_webhook_profile_has_reliability_gates(self) -> None:
        gates = set(self.policy["profiles"]["webhook-reliability"]["gates"])
        self.assertTrue(
            {"signature-verification-tests", "idempotency-tests", "retry-dead-letter-tests"}.issubset(gates)
        )


if __name__ == "__main__":
    unittest.main()
