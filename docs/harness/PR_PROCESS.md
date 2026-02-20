# PR Process (Harness + Evidence)

This file is the canonical process checklist for slice implementation PRs.

## Scope

Use this for every `Sxx` slice PR.

## Required Steps

1. Implement exactly one slice.
2. Update `TASKS.md` for that slice (`[ ]` -> `[x]`).
3. Run local checks:
   - `npm run typecheck`
   - `npm run build`
   - `npm run test:e2e`
   - `python3 -m unittest discover -s harness/tests -p 'test_*.py'`
   - `python3 -m harness.supervisor run --tasks-file TASKS.md --policy-file harness/supervisor_policy.json --artifacts-dir .supervisor-artifacts --task-source pilot`
4. Copy `.webm` evidence files into `docs/evidence/<slice>/`.
5. Open PR and include direct clickable links to those `.webm` files.
6. Wait for required `supervisor` check to pass.
7. Merge and move to next slice.

## Evidence Link Rule (Mandatory)

Every slice PR must contain a **Direct Video Evidence** section with links like:

- `https://github.com/<owner>/<repo>/blob/<branch>/docs/evidence/<slice>/<file>.webm`

If there are no UI flows in a slice, explicitly state that and link to relevant non-UI evidence artifacts instead.

## Prompt To Start A Slice

`Use $workflows-work to implement Sxx from TASKS.md end-to-end with tests and PR.`
