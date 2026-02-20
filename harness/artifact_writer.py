from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from harness.types import SupervisorRun


def _safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "-" for ch in value)


def write_task_artifacts(artifacts_dir: str | Path, run: SupervisorRun) -> dict[str, str]:
    base = Path(artifacts_dir) / run.run_id
    base.mkdir(parents=True, exist_ok=True)

    task_key = _safe_id(run.task_id)
    json_path = base / f"{task_key}.json"
    md_path = base / f"{task_key}.md"

    json_path.write_text(json.dumps(run.to_dict(), indent=2), encoding="utf-8")
    md_path.write_text(_render_task_markdown(run), encoding="utf-8")

    return {
        "json": str(json_path),
        "markdown": str(md_path),
    }


def write_summary_artifacts(artifacts_dir: str | Path, run_id: str, summary: dict[str, Any]) -> dict[str, str]:
    base = Path(artifacts_dir) / run_id
    base.mkdir(parents=True, exist_ok=True)

    json_path = base / "summary.json"
    md_path = base / "summary.md"

    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    md_path.write_text(_render_summary_markdown(summary), encoding="utf-8")

    return {
        "json": str(json_path),
        "markdown": str(md_path),
    }


def _render_task_markdown(run: SupervisorRun) -> str:
    lines = [
        f"# Supervisor Task Run: {run.task_id}",
        "",
        f"- **Title:** {run.task_title}",
        f"- **Status:** {run.status}",
        f"- **Attempt:** {run.attempt}",
        f"- **Profiles:** {', '.join(run.profiles_resolved)}",
        f"- **Tags:** {', '.join(run.tags) if run.tags else '(none)'}",
        f"- **Failed Gates:** {', '.join(run.failed_gates) if run.failed_gates else '(none)'}",
        "",
        "## Gate Results",
        "",
        "| Gate | Attempt | Status | Duration (ms) | Return Code |",
        "|---|---:|---|---:|---:|",
    ]
    for result in run.gate_results:
        lines.append(
            f"| `{result.gate_id}` | {result.attempt} | {result.status} | {result.duration_ms} | {result.return_code} |"
        )

    if run.warnings:
        lines.extend(["", "## Warnings", ""])
        lines.extend([f"- {warning}" for warning in run.warnings])

    if run.escalation:
        lines.extend(
            [
                "",
                "## Escalation",
                "",
                f"- **Root cause:** {run.escalation.root_cause}",
                f"- **Required human action:** {run.escalation.required_human_action}",
            ]
        )

    lines.extend(["", "## Retry Timeline", ""])
    attempts = sorted({result.attempt for result in run.gate_results})
    for attempt in attempts:
        per_attempt = [result for result in run.gate_results if result.attempt == attempt]
        failed = [result.gate_id for result in per_attempt if result.status == "failed"]
        lines.append(
            f"- Attempt {attempt}: {'failed gates ' + ', '.join(failed) if failed else 'all gates passed'}"
        )

    return "\n".join(lines) + "\n"


def _render_summary_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# Supervisor Run Summary",
        "",
        f"- **Run ID:** {summary['run_id']}",
        f"- **Task Source:** {summary['task_source']}",
        f"- **Total Tasks:** {summary['total_tasks']}",
        f"- **Passed:** {summary['passed_tasks']}",
        f"- **Escalated:** {summary['escalated_tasks']}",
        f"- **Blocking Failures:** {summary['blocking_failures']}",
        f"- **Advisory Failures:** {summary['advisory_failures']}",
        "",
        "## Task Outcomes",
        "",
        "| Task | Status | Profiles | Failed Gates |",
        "|---|---|---|---|",
    ]

    for task in summary["tasks"]:
        lines.append(
            "| "
            f"`{task['task_id']}` | {task['status']} | {', '.join(task['profiles'])} | "
            f"{', '.join(task['failed_gates']) if task['failed_gates'] else '(none)'} |"
        )

    return "\n".join(lines) + "\n"
