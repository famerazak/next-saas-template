from __future__ import annotations

from typing import Callable

from harness.types import GateResult


RunGateFn = Callable[[str, int], GateResult]


def run_with_retries(
    gate_ids: list[str], max_retries: int, run_gate_fn: RunGateFn
) -> tuple[str, int, list[str], list[GateResult], list[str]]:
    all_results: list[GateResult] = []
    pending = list(gate_ids)
    transitions = ["implementing", "validating"]

    for attempt in range(1, max_retries + 1):
        attempt_results: list[GateResult] = []
        for gate_id in pending:
            result = run_gate_fn(gate_id, attempt)
            attempt_results.append(result)
            all_results.append(result)

        failed = [result.gate_id for result in attempt_results if result.status == "failed"]
        if not failed:
            transitions.append("passed")
            return ("passed", attempt, [], all_results, transitions)

        if attempt == max_retries:
            transitions.extend(["failed", "escalated"])
            return ("escalated", attempt, failed, all_results, transitions)

        transitions.extend(["failed", "retrying", "validating"])
        pending = failed

    # Defensive fallback; loop always returns.
    transitions.append("escalated")
    return ("escalated", max_retries, pending, all_results, transitions)
