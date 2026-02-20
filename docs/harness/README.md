# Supervisor Harness Runbook

## Purpose

Operational harness for task execution quality control against `TASKS.md`.

## Core Behavior

1. Parse tasks from `TASKS.md`.
2. Resolve profiles from task tags using `harness/supervisor_policy.json`.
3. Load per-slice DoD contract from `harness/dod/slices/<TASK_ID>.json`.
4. Execute gates with retry (`max_retries=3`).
5. Enforce Playwright UI evidence for each slice (`@<TASK_ID>` tagged test).
6. Escalate after final failed retry.
7. Emit JSON + Markdown artifacts.

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
- `.supervisor-artifacts/<run_id>/ui-evidence/<task_id>/html-report/`
- `.supervisor-artifacts/<run_id>/ui-evidence/<task_id>/test-results/` (includes video)

## Per-Slice DoD Contract

Each enforced task needs `harness/dod/slices/<TASK_ID>.json`:

```json
{
  "task_id": "S01",
  "title": "Public auth pages render",
  "definition_of_done": [
    "..."
  ],
  "required_evidence": {
    "playwright": {
      "tag": "@S01",
      "video_required": true
    }
  }
}
```

Contract gate requirements:

1. Contract file exists and validates.
2. `playwright.tag` must match `@<TASK_ID>`.
3. At least one Playwright spec references that tag.

## CI Usage

Workflow: `.github/workflows/supervisor-run.yml`

On pull requests, the workflow:

1. Installs Python and Node dependencies.
2. Installs Playwright browser runtime (Chromium).
3. Executes supervisor with blocking/advisory enforcement.
4. Uploads artifacts.
5. Posts/updates PR summary comment.

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

## Local Prerequisites

Before running supervisor with UI evidence locally:

```bash
npm install
npx playwright install chromium
python3 -m harness.supervisor run --task-source pilot
```
