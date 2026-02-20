from __future__ import annotations

import argparse
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from time import monotonic

from harness.artifact_writer import write_summary_artifacts, write_task_artifacts
from harness.escalator import build_escalation_report
from harness.gate_runner import run_gate
from harness.policy_loader import load_policy
from harness.profile_resolver import resolve_gates, resolve_profiles
from harness.retry_controller import run_with_retries
from harness.task_loader import load_tasks
from harness.types import SupervisorRun


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _filter_target_tasks(tasks, task_source: str, policy: dict, task_ids: list[str]):
    open_tasks = [task for task in tasks if task.status == "open"]

    if task_source == "all":
        return open_tasks
    if task_source == "ids":
        wanted = set(task_ids)
        return [task for task in open_tasks if task.id in wanted]

    pilot_ids = set(policy.get("pilot", {}).get("include_task_ids", []))
    return [task for task in open_tasks if task.id in pilot_ids]


def _status_for_profile_failure(
    status: str,
    has_blocking_profile: bool,
    failed_gates: list[str],
    policy: dict,
) -> tuple[bool, bool]:
    if status == "passed":
        return (False, False)
    has_blocking_gate_failure = any(
        bool(policy["gates"].get(gate_id, {}).get("blocking", False)) for gate_id in failed_gates
    )
    if has_blocking_gate_failure:
        return (True, False)
    if has_blocking_profile:
        return (True, False)
    return (False, True)


def run_supervisor(args: argparse.Namespace) -> int:
    policy = load_policy(args.policy_file)
    all_tasks = load_tasks(args.tasks_file)
    selected_tasks = _filter_target_tasks(all_tasks, args.task_source, policy, args.task_ids)

    run_id = str(uuid.uuid4())
    max_retries = int(policy["retry"]["max_retries"])

    blocking_failures = 0
    advisory_failures = 0
    passed_tasks = 0
    escalated_tasks = 0
    task_summaries = []

    for task in selected_tasks:
        started = monotonic()
        started_at = _utc_now()

        resolution = resolve_profiles(task.tags, policy)
        gate_ids = resolve_gates(resolution.profiles, policy)
        task_artifact_root = str((Path(args.artifacts_dir) / run_id).resolve())
        gate_env = {
            "HARNESS_RUN_ID": run_id,
            "HARNESS_TASK_ID": task.id,
            "HARNESS_TASK_TITLE": task.title,
            "HARNESS_TASK_TAGS": ",".join(task.tags),
            "HARNESS_TASK_SOURCE_LINE": str(task.source_line),
            "HARNESS_ARTIFACTS_DIR": str(Path(args.artifacts_dir).resolve()),
            "HARNESS_TASK_ARTIFACT_DIR": task_artifact_root,
        }

        def _run_gate(gate_id: str, attempt: int):
            gate_cfg = policy["gates"][gate_id]
            return run_gate(gate_id, gate_cfg, attempt, extra_env=gate_env)

        status, attempt, failed_gates, gate_results, transitions = run_with_retries(
            gate_ids, max_retries, _run_gate
        )
        for gate in gate_results:
            gate.log_ref = "task-markdown-artifact"

        escalation = None
        if status == "escalated":
            escalated_tasks += 1
            escalation = build_escalation_report(
                run_id=run_id,
                task_id=task.id,
                failed_gates=failed_gates,
                attempts=attempt,
            )
        else:
            passed_tasks += 1

        task_run = SupervisorRun(
            run_id=run_id,
            task_id=task.id,
            task_title=task.title,
            tags=task.tags,
            profiles_resolved=resolution.profiles,
            gates_run=gate_ids,
            attempt=attempt,
            status=status,
            failed_gates=failed_gates,
            started_at=started_at,
            ended_at=_utc_now(),
            duration_ms=int((monotonic() - started) * 1000),
            escalation=escalation,
            warnings=resolution.warnings,
            gate_results=gate_results,
            state_transitions=["queued"] + transitions,
        )

        refs = write_task_artifacts(args.artifacts_dir, task_run)
        for gate in task_run.gate_results:
            gate.log_ref = refs["markdown"]

        has_blocking_profile = len(resolution.blocking_profiles) > 0
        blocking, advisory = _status_for_profile_failure(
            status=status,
            has_blocking_profile=has_blocking_profile,
            failed_gates=failed_gates,
            policy=policy,
        )
        if blocking:
            blocking_failures += 1
        if advisory:
            advisory_failures += 1

        task_summaries.append(
            {
                "task_id": task.id,
                "task_title": task.title,
                "status": status,
                "profiles": resolution.profiles,
                "failed_gates": failed_gates,
                "warnings": resolution.warnings,
            }
        )

    summary = {
        "run_id": run_id,
        "task_source": args.task_source,
        "total_tasks": len(selected_tasks),
        "passed_tasks": passed_tasks,
        "escalated_tasks": escalated_tasks,
        "blocking_failures": blocking_failures,
        "advisory_failures": advisory_failures,
        "tasks": task_summaries,
    }

    refs = write_summary_artifacts(args.artifacts_dir, run_id, summary)
    print(json.dumps(summary, indent=2))
    print(f"Summary artifact: {refs['json']}")

    step_summary = os.getenv("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as handle:
            handle.write(Path(refs["markdown"]).read_text(encoding="utf-8"))

    return 1 if blocking_failures > 0 else 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run supervisor harness on TASKS.md")
    sub = parser.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="Run supervisor")
    run.add_argument("--tasks-file", default="TASKS.md")
    run.add_argument("--policy-file", default="harness/supervisor_policy.json")
    run.add_argument("--artifacts-dir", default=".supervisor-artifacts")
    run.add_argument("--task-source", choices=["pilot", "all", "ids"], default="pilot")
    run.add_argument("--task-ids", nargs="*", default=[])

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "run":
        return run_supervisor(args)
    parser.error("Unknown command")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
