from __future__ import annotations

import unittest

from harness.supervisor import _status_for_profile_failure


class SupervisorStatusTests(unittest.TestCase):
    def test_blocking_when_failed_gate_is_marked_blocking(self) -> None:
        policy = {"gates": {"slice-ui-evidence": {"blocking": True}}}
        blocking, advisory = _status_for_profile_failure(
            status="escalated",
            has_blocking_profile=False,
            failed_gates=["slice-ui-evidence"],
            policy=policy,
        )
        self.assertEqual((blocking, advisory), (True, False))

    def test_advisory_when_no_blocking_signal(self) -> None:
        policy = {"gates": {"safe-gate": {"blocking": False}}}
        blocking, advisory = _status_for_profile_failure(
            status="escalated",
            has_blocking_profile=False,
            failed_gates=["safe-gate"],
            policy=policy,
        )
        self.assertEqual((blocking, advisory), (False, True))


if __name__ == "__main__":
    unittest.main()
