# Per-Slice DoD Contracts

Each slice that the supervisor executes must have a contract file:

- `harness/dod/slices/<TASK_ID>.json`

Minimum required fields:

1. `task_id`
2. `title`
3. `definition_of_done` (non-empty array)
4. `required_evidence.playwright.tag` (must equal `@<TASK_ID>`)
5. `required_evidence.playwright.video_required` (boolean)

The supervisor enforces:

1. Contract validity via `dod-contract` gate.
2. Matching Playwright evidence via `slice-ui-evidence` gate.
