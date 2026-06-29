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
- Blockers: anything preventing the next step
- Next up:
  1. first recommended next task
  2. second recommended next task
  3. optional third task
