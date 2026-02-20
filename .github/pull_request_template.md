## Summary

Describe the change and affected task IDs.

## Direct Video Evidence (Required For Slice PRs)

Add direct clickable `.webm` links for all relevant flows tested in this PR.

- Example: `[S02 signup success](https://github.com/<owner>/<repo>/blob/<branch>/docs/evidence/s02/s02-signup-success.webm)`
- Example: `[S02 signup error](https://github.com/<owner>/<repo>/blob/<branch>/docs/evidence/s02/s02-signup-error.webm)`

## TASKS.md Contract

- [ ] If this PR adds or edits tasks in `TASKS.md`, each task uses tag format:
  - `- [ ] **<ID> - <Title>** [tag1][tag2]`
- [ ] New tasks include at least one valid tag (`auth`, `rbac`, `billing`, `webhook`, `platform`, `security`, `storage`, `analytics`, `deploy`, `ui`, `app`, `infra`).

## Supervisor Harness

- [ ] Supervisor harness checks pass for blocking profiles.
- [ ] Advisory warnings reviewed (if any).
- [ ] Escalation report addressed (if any).
- [ ] Added direct `.webm` links in this PR description for the executed UI flows.
