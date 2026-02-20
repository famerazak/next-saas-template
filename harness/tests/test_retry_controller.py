from __future__ import annotations

import unittest

from harness.retry_controller import run_with_retries
from harness.types import GateResult


class RetryControllerTests(unittest.TestCase):
    def test_single_retry_then_pass(self) -> None:
        attempts: dict[str, int] = {}

        def run_gate(gate_id: str, attempt: int) -> GateResult:
            attempts[gate_id] = attempts.get(gate_id, 0) + 1
            should_fail = gate_id == "g1" and attempts[gate_id] == 1
            return GateResult(
                gate_id=gate_id,
                status="failed" if should_fail else "passed",
                attempt=attempt,
                duration_ms=1,
                command="mock",
                stdout="",
                stderr="",
                return_code=1 if should_fail else 0,
            )

        status, attempt, failed, all_results, transitions = run_with_retries(["g1", "g2"], 3, run_gate)
        self.assertEqual(status, "passed")
        self.assertEqual(attempt, 2)
        self.assertEqual(failed, [])
        self.assertGreaterEqual(len(all_results), 3)
        self.assertEqual(transitions[0], "implementing")
        self.assertEqual(transitions[-1], "passed")

    def test_escalates_after_max_retries(self) -> None:
        def run_gate(gate_id: str, attempt: int) -> GateResult:
            return GateResult(
                gate_id=gate_id,
                status="failed",
                attempt=attempt,
                duration_ms=1,
                command="mock",
                stdout="",
                stderr="",
                return_code=1,
            )

        status, attempt, failed, _, transitions = run_with_retries(["g1"], 3, run_gate)
        self.assertEqual(status, "escalated")
        self.assertEqual(attempt, 3)
        self.assertEqual(failed, ["g1"])
        self.assertEqual(transitions[-1], "escalated")


if __name__ == "__main__":
    unittest.main()
