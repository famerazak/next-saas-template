# Task-Agnostic Supervisor Mode Plan

## Summary
Implement a generic supervisor workflow that can run on any current or future task in `TASKS.md`.  
The workflow is tag-driven, retry-capable, and decision-complete for quality gates, escalation, and rollout readiness.

## Scope
1. Works for any task line in `TASKS.md`, not tied to `S01-S72`.
2. Uses task tags to select gate profiles automatically.
3. Runs implement/validate/fix loops with max 3 retries, then escalates.
4. Produces auditable run artifacts per task execution.

## Task Contract (Interface)
1. Task syntax in `TASKS.md`:
   - `- [ ] **<ID> - <Title>** [tag1][tag2][tag3]`
2. Example:
   - `- [ ] **S99 - User can archive project** [app][auth][rbac]`
3. Task identity:
   - Primary key = `<ID>` if present.
   - Fallback key = slug(title) if `<ID>` omitted.
4. Untagged policy:
   - Use `safe-baseline` profile by default.
5. Allowed initial tags:
   - `auth`, `rbac`, `billing`, `webhook`, `platform`, `security`, `storage`, `analytics`, `deploy`, `ui`, `app`, `infra`.

## Gate Profiles (Decision Complete)
1. `safe-baseline` (default for untagged tasks):
   - typecheck
   - lint
   - unit tests
   - security-lite checks
2. `auth-rbac` (tags: `auth` or `rbac`):
   - safe-baseline
   - auth flow tests
   - permission matrix tests
3. `billing-payments` (tags: `billing`):
   - safe-baseline
   - billing integration tests
   - owner-only billing authorization tests
4. `webhook-reliability` (tags: `webhook`):
   - safe-baseline
   - signature verification tests
   - idempotency/dedup tests
   - retry/dead-letter tests
5. `platform-admin` (tags: `platform`):
   - safe-baseline
   - platform route visibility/authorization tests
   - reason-required action tests
6. `security-hardening` (tags: `security` or `deploy`):
   - safe-baseline
   - headers/CSP assertions
   - sensitive logging checks
   - env validation checks
7. `storage-data` (tags: `storage`):
   - safe-baseline
   - tenant-isolation access tests
   - signed URL tests
8. `analytics-legal` (tags: `analytics`):
   - safe-baseline
   - consent-gating checks
   - PII payload checks

## Profile Resolution Rules
1. Resolve profiles by tag union.
2. Remove duplicate gates.
3. If conflicting settings exist, stricter gate wins.
4. If no tags, run `safe-baseline`.
5. If unknown tag appears, warn and continue with known tags plus baseline.

## Supervisor Runtime State Machine
1. `queued`
2. `implementing`
3. `validating`
4. `failed`
5. `retrying`
6. `passed`
7. `escalated`

## Retry and Escalation Policy
1. Max retries: 3.
2. On each failed validation:
   - classify failure by gate
   - apply targeted fix attempt
   - rerun only failed gates
3. If any gate still fails after retry 3:
   - mark `escalated`
   - create escalation report with failing gates and last logs

## Required Artifacts (Public Interfaces)
1. Task run record (JSON):
   - `taskKey`, `title`, `tags`, `resolvedProfiles`, `attempt`, `status`, `failedGates`, `startedAt`, `endedAt`
2. Validation summary (Markdown):
   - gates run
   - pass/fail per gate
   - retry history
   - escalation reason if applicable
3. Audit event for each supervisor run:
   - actor
   - task key
   - gate set
   - result
   - timestamp

## Changes to Existing Files (Planned)
1. `TASKS.md`
   - normalize task lines to include tags
   - keep checklist behavior unchanged
2. Add supervisor config file
   - defines tag-to-profile mapping and gate commands
3. Add supervisor docs
   - runbook and escalation process

## Acceptance Criteria
1. Any newly added tagged task in `TASKS.md` is auto-detected and mapped to gates.
2. Any untagged task runs `safe-baseline` automatically.
3. Supervisor retries failed tasks up to 3 times and escalates on final failure.
4. Each run produces machine-readable and human-readable artifacts.
5. Billing/webhook/platform/security tasks trigger their stricter profiles without manual selection.

## Test Cases and Scenarios
1. Tagged auth task:
   - task with `[auth][rbac]` resolves `auth-rbac` + baseline gates.
2. Untagged task:
   - resolves `safe-baseline` only.
3. Multi-tag task:
   - `[billing][webhook][platform]` resolves all related profiles with deduped gates.
4. Unknown tag:
   - warning emitted; baseline still runs.
5. Retry loop:
   - forced failing gate retries exactly 3 times, then escalates.
6. Escalation artifact:
   - contains final failed gates and retry history.
7. Permission-sensitive task:
   - viewer write attempt test fails correctly in validation phase.
8. Webhook idempotency:
   - duplicate event test must pass before task can be marked passed.

## Rollout Plan
1. Phase 1:
   - enable supervisor for `safe-baseline` tasks only.
2. Phase 2:
   - enable tag profiles for `auth`, `rbac`, `billing`, `platform`.
3. Phase 3:
   - enable `webhook`, `security`, `storage`, `analytics`, `deploy`.
4. Phase 4:
   - enforce merge gating on supervisor pass status.

## Assumptions and Defaults Chosen
1. Tag format is bracketed inline tags in `TASKS.md`.
2. Untagged tasks default to `safe-baseline`.
3. Retry count is fixed at 3 before escalation.
4. Gate strictness is additive by tag union.
5. Supervisor artifacts are mandatory for every run.

