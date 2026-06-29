# MBA Platform Agent Guide

## Mission

- Improve the MIT Sloan MBA learning platform in small, reviewable increments.
- Preserve the core product goal: a free, self-hosted learning experience for the first-semester curriculum.
- Favor shipping usable improvements over broad speculative refactors.
- Treat manual seeding and assessment authoring as core product work, not side chores.

## Project Map

- `frontend/`: Next.js 16 app with React 19, App Router, Tailwind v4, and Supabase SSR helpers.
- `supabase/`: migrations plus seed and authoring scripts.
- `context/`: source curriculum data and repo-owned assessment JSON.
- `documentation/`: setup, schema, seeding, deployment, and architecture notes.

## Source Of Truth

- `context/mba_sloan_first_semester_classes/` is the source OCW content used for parsing and seeding course structure and resources.
- `context/assessments/*.json` is the repo-owned source of truth for seeded quizzes and questions.
- Supabase is the runtime target, not the authoring source of truth. Durable content changes should land in the repo first, then be seeded.

## First Reads

- Start with `README.md`.
- For setup and commands, read `documentation/setup.md`.
- For architecture and data flow, read `documentation/architecture.md`.
- For content and assessment workflows, read `documentation/seeding.md` and `context/assessments/README.md`.
- When touching `frontend/`, also read `frontend/AGENTS.md` because nested guidance overrides this file there.

## Working Rules

- Keep changes narrow and easy to review.
- Prefer the smallest improvement that clearly moves the platform forward.
- Do not invent product requirements when the repo already implies them.
- Do not remove or regenerate course content in `context/` unless the task explicitly calls for it.
- Treat Supabase schema and seeded content as user data surfaces; validate assumptions before changing them.
- When doing manual assessment or seed-content work, prefer editing the repo-owned source files and scripts over making one-off database-only fixes.
- Keep authored educational content aligned to the course material it comes from; avoid generic filler questions or fabricated specificity unsupported by the source pages.

## Manual Seeding And Assessment Authoring

- These Codex sessions are part of the manual seeding workflow for this project.
- Content work may include drafting, revising, expanding, and validating `context/assessments/*.json` so that the repo-owned assessment source improves over time.
- When authoring or revising assessments, anchor them to real course pages via `generated_from` whenever possible.
- Preserve the existing local assessment schema used by `supabase/scripts/local-assessments.ts`.
- Prefer incremental improvement of one course, section, or assessment set at a time so reseeding and review stay manageable.
- Before claiming an assessment task is done, run the narrowest useful validation script and note whether reseeding was run.

## Frontend Rules

- `frontend` uses Next.js `16.2.9`; read the relevant docs under `frontend/node_modules/next/dist/docs/` before changing framework-specific behavior.
- Preserve the existing Editorial Ink visual language unless the task explicitly calls for a redesign.
- Prefer server components by default and keep client components focused on interactivity.
- Keep Supabase browser/server usage in the existing `src/lib/supabase/` patterns.

## Validation

- For frontend changes, run `npm run lint` in `frontend/`.
- For TypeScript or seeding changes in `supabase/scripts`, run the narrowest relevant script there.
- For assessment authoring, prefer this ladder:
  - `npm run parse:assessments`
  - `npm run check:assessment-coverage` when coverage is relevant
  - `npm run seed:assessments` when the environment is ready for a real seed
- When schema changes affect generated types, regenerate `frontend/src/types/database.ts` if the local environment supports it.
- If you cannot run a meaningful validation step because local services or data are missing, say so explicitly in the handoff.

## Autonomous Work Loop

- Read `AUTONOMOUS_STATUS.md` before choosing the next task.
- Pick one bounded improvement per run unless multiple tiny changes are tightly coupled.
- Update `AUTONOMOUS_STATUS.md` at the end of every run with:
  - what changed
  - what validation ran
  - blockers or uncertainties
  - the next 1-3 best follow-up tasks
- Stop and leave a crisp handoff instead of guessing when requirements, local data, or credentials are missing.
- If the best next task is content seeding work rather than code, do the content work and still leave the same validation and handoff trail.

## Good Targets

- Fix broken or incomplete user flows in browsing courses, reading sections, quizzes, auth, and dashboard progress.
- Improve data integrity, seed reliability, and authoring ergonomics for assessments.
- Expand or tighten repo-owned assessments so coverage and quality improve without breaking the seeding pipeline.
- Tighten documentation where setup or architecture would otherwise slow future work.

## Avoid By Default

- Broad renames or file moves without a strong payoff.
- Dependency churn unrelated to the task.
- Styling-only changes with no product value.
- Large unvalidated schema rewrites.
