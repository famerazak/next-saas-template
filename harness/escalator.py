from __future__ import annotations

from harness.types import EscalationReport


def build_escalation_report(
    run_id: str,
    task_id: str,
    failed_gates: list[str],
    attempts: int,
) -> EscalationReport:
    return EscalationReport(
        run_id=run_id,
        task_id=task_id,
        failed_gates=failed_gates,
        attempts=attempts,
        root_cause="One or more gates failed after maximum retries",
        required_human_action="Inspect gate logs, apply targeted fixes, and rerun supervisor",
    )
