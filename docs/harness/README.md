# Supervisor Harness Runbook

## Purpose

Operational harness for task execution quality control against `TASKS.md`.

Process reference:

- `docs/harness/PR_PROCESS.md` (authoritative slice PR workflow + video evidence rule)

## Core Behavior

1. Parse tasks from `TASKS.md`.
2. Resolve profiles from task tags using `harness/supervisor_policy.json`.
3. Execute gates with retry (`max_retries=3`).
4. Escalate after final failed retry.
5. Emit JSON + Markdown artifacts.

## Local Usage

```bash
python3 -m harness.supervisor run --task-source pilot
```

Run all open tasks:

```bash
python3 -m harness.supervisor run --task-source all
```

Run specific tasks:

```bash
python3 -m harness.supervisor run --task-source ids --task-ids S02 S14
```

Artifacts are written to:

- `.supervisor-artifacts/<run_id>/summary.json`
- `.supervisor-artifacts/<run_id>/summary.md`
- `.supervisor-artifacts/<run_id>/<task_id>.json`
- `.supervisor-artifacts/<run_id>/<task_id>.md`

## CI Usage

Workflow: `.github/workflows/supervisor-run.yml`

On pull requests, the workflow:

1. Executes supervisor with blocking/advisory enforcement.
2. Uploads artifacts.
3. Posts/updates PR summary comment.

## Branch Protection Setup (manual)

In GitHub branch protection rules for your default branch:

1. Require status checks to pass before merging.
2. Mark the `Supervisor Harness / supervisor` job as required.

This enforces blocking profiles at merge time.

## Policy Files

- `harness/supervisor_policy.json`

Contains:

- tag-to-profile mapping
- profiles and gate sets
- gate commands
- blocking/advisory behavior
- pilot include list

## Pilot Scope

Current pilot task IDs:

- `S01`, `S07`
- `S02`, `S14`
- `S31`, `S35`
- `S48`, `S52`
- `S22`, `S66`

## Escalation Semantics

A task is escalated when any gate still fails after attempt 3.

Escalation output includes:

- failed gate list
- retry count
- root cause summary
- required human action
