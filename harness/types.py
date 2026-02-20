from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TaskRecord:
    id: str
    title: str
    tags: list[str]
    status: str  # "open" or "done"
    source_line: int


@dataclass
class ProfileResolution:
    profiles: list[str]
    blocking_profiles: list[str]
    advisory_profiles: list[str]
    unknown_tags: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class GateResult:
    gate_id: str
    status: str  # "passed" | "failed"
    attempt: int
    duration_ms: int
    command: str
    stdout: str
    stderr: str
    return_code: int
    log_ref: str = ""


@dataclass
class EscalationReport:
    run_id: str
    task_id: str
    failed_gates: list[str]
    attempts: int
    root_cause: str
    required_human_action: str


@dataclass
class SupervisorRun:
    run_id: str
    task_id: str
    task_title: str
    tags: list[str]
    profiles_resolved: list[str]
    gates_run: list[str]
    attempt: int
    status: str  # "passed" | "escalated"
    failed_gates: list[str]
    started_at: str
    ended_at: str
    duration_ms: int
    escalation: EscalationReport | None
    warnings: list[str] = field(default_factory=list)
    gate_results: list[GateResult] = field(default_factory=list)
    state_transitions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        escalation: dict[str, Any] | None = None
        if self.escalation:
            escalation = {
                "run_id": self.escalation.run_id,
                "task_id": self.escalation.task_id,
                "failed_gates": self.escalation.failed_gates,
                "attempts": self.escalation.attempts,
                "root_cause": self.escalation.root_cause,
                "required_human_action": self.escalation.required_human_action,
            }

        return {
            "run_id": self.run_id,
            "task_id": self.task_id,
            "task_title": self.task_title,
            "tags": self.tags,
            "profiles_resolved": self.profiles_resolved,
            "gates_run": self.gates_run,
            "attempt": self.attempt,
            "status": self.status,
            "failed_gates": self.failed_gates,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "duration_ms": self.duration_ms,
            "warnings": self.warnings,
            "escalation": escalation,
            "gate_results": [
                {
                    "gate_id": g.gate_id,
                    "status": g.status,
                    "attempt": g.attempt,
                    "duration_ms": g.duration_ms,
                    "command": g.command,
                    "stdout": g.stdout,
                    "stderr": g.stderr,
                    "return_code": g.return_code,
                    "log_ref": g.log_ref,
                }
                for g in self.gate_results
            ],
            "state_transitions": self.state_transitions,
        }
