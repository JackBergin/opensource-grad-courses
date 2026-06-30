# Autonomous Status

## Goal

Continuously improve the MIT Sloan MBA learning platform through safe, reviewable increments that strengthen the learner experience, content reliability, and maintainability.

## Current Priorities

1. Complete and polish core learner journeys: homepage, courses, section reading, quizzes, auth, and dashboard progress.
2. Use Codex sessions to assist with manual seeding and assessment authoring in the repo-owned source files.
3. Improve reliability of Supabase-backed content and assessment seeding.
4. Tighten project docs and repo guidance so future autonomous runs can move faster with fewer mistakes.

## Operating Constraints

- Prefer one bounded improvement per run.
- Run the narrowest meaningful validation for the files touched.
- Before editing, decide whether to continue a relevant WIP feature branch or create a new brief descriptive branch from `develop`.
- Preserve the existing Editorial Ink design language unless a task says otherwise.
- Avoid destructive schema or content changes without strong evidence and validation.
- If local Supabase, env vars, or course context data are missing, choose a task that can still be completed safely or leave a clear blocker note.
- For assessment work, treat `context/assessments/*.json` as the durable source of truth and Supabase as the seeded output.
- Keep manual seeding work grounded in actual course pages and existing schema constraints.

## Completed Recently

- Initial autonomous scaffolding created:
  - root `AGENTS.md`
  - reusable `continuous-improve` skill
  - this status file
  - a project-specific automation prompt

## Current Focus

No implementation slice is active yet. Start by reading this file, `README.md`, `documentation/setup.md`, `documentation/architecture.md`, `documentation/seeding.md`, `context/assessments/README.md`, and any nested `AGENTS.md` in the directory you plan to edit.

## Next Candidate Tasks

1. Audit the current frontend routes for broken, placeholder, or thin learner experiences and implement the highest-value small improvement.
2. Review one course's repo-owned assessments in `context/assessments/` and improve quality, coverage, or `generated_from` alignment.
3. Review quiz and progress flows for missing validation, persistence issues, or rough edges.
4. Review `supabase/scripts` for seed ergonomics, missing checks, or idempotency gaps.
5. Replace boilerplate or stale docs that still describe the default Next.js starter instead of this platform.

## Manual Seeding Workflow

- Authoring happens in repo files first, especially `context/assessments/*.json`.
- Validation should usually start with `cd supabase/scripts && npm run parse:assessments`.
- When coverage is the goal, also run `npm run check:assessment-coverage`.
- When the environment is ready, seed to Supabase with `npm run seed:assessments`.
- Record whether a run changed source JSON only, validated locally, or also completed a real seed into Supabase.

## Blockers

- Local Supabase services, environment variables, and OCW context data may be required for some end-to-end work.
- The repo may contain generated or environment-dependent files that should only be updated when the relevant tooling is available locally.
- Assessment improvements may require careful reading of source course pages before drafting or revising questions.

## Handoff Template

When a run ends, append a new entry in this format:

### YYYY-MM-DD HH:MM TZ

- Summary: what was implemented
- Files changed: paths touched
- Validation: commands run and results
- Seeding status: source-only, validated-only, or seeded-to-Supabase
- Branch status: continued existing feature branch, created new feature branch, ready for PR, or should resume this branch next run
- Blockers: anything preventing the next step
- Next up:
  1. first recommended next task
  2. second recommended next task
  3. optional third task

### 2026-06-29 20:00 EDT

- Summary: Rebased the current local work onto `origin/develop`, preserved the quiz-review frontend changes, and corrected the repo automation guidance to prefer feature branches over worktrees.
- Files changed: `AGENTS.md`, `README.md`, `documentation/setup.md`, `documentation/continuous-improve-automation.md`, `frontend/src/components/QuizRunner.tsx`, `frontend/src/app/courses/[slug]/page.tsx`
- Validation: `cd frontend && npm run lint` ✅
- Seeding status: source-only
- Branch status: created `quiz-review-automation-flow`; the next run should continue this branch unless the work is merged first
- Blockers: no code blocker; branch/PR completion depends on whether you want one more bounded feature slice before review
- Next up:
  1. Decide whether `quiz-review-automation-flow` is ready for PR or needs one more bounded follow-up.
  2. If incomplete, continue `quiz-review-automation-flow` next run instead of creating a new branch.
  3. If complete, open the PR, merge into `develop`, and delete the feature branch.

### 2026-06-29 20:11 EDT

- Summary: Extended the quiz-review flow with shareable per-question anchors, extracted reusable quiz-review state helpers, and added automated tests for the quiz review logic.
- Files changed: `frontend/src/components/QuizRunner.tsx`, `frontend/src/lib/quiz-review.ts`, `frontend/src/lib/quiz-review.test.ts`, `frontend/package.json`
- Validation: `cd frontend && npm test` ✅, `cd frontend && npm run lint` ✅
- Seeding status: source-only
- Branch status: continued `quiz-review-automation-flow`; continue this branch next run unless the branch is promoted to PR first
- Blockers: no implementation blocker; the Node test script emits a non-failing module-type warning because `frontend/package.json` does not declare `"type": "module"`
- Next up:
  1. Decide whether to suppress the Node module-type warning or accept it as-is for the lightweight test harness.
  2. Consider a final bounded quiz-review improvement before opening a PR.
  3. If the feature is complete, open the PR from `quiz-review-automation-flow`, merge into `develop`, and delete the branch.

### 2026-06-29 20:16 EDT

- Summary: Removed the lightweight test-harness module warning by declaring the frontend package as ESM and added a clearer active review state when jumping to a quiz question from the review summary.
- Files changed: `frontend/package.json`, `frontend/src/components/QuizRunner.tsx`
- Validation: `cd frontend && npm test` ✅, `cd frontend && npm run lint` ✅
- Seeding status: source-only
- Branch status: continued `quiz-review-automation-flow`; this branch is ready for PR unless you want another feature slice first
- Blockers: no code blocker; PR creation depends on available GitHub tooling/auth in the local environment
- Next up:
  1. Open the PR from `quiz-review-automation-flow` into `develop` with the quiz-review scope description.
  2. Merge into `develop` once reviewed, then delete the feature branch.
  3. If review finds issues, continue this same branch for the follow-up fixes.
