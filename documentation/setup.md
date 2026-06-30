# Local Development Setup

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 22 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | bundled with Node |
| Supabase CLI | ≥ 2.51 | `brew install supabase/tap/supabase` |
| Docker Desktop | ≥ 4 | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git | any | bundled with macOS/Linux |

## 1. Clone and configure

```bash
git clone <your-repo-url> mba && cd mba

# Copy env template
cp .env.example .env
```

Edit `.env` and fill in placeholder values. For local dev, the Supabase keys come from `supabase start` output (step 3).

## Branch workflow

The main local checkout should remain on `develop`. For normal development in this repo, create short-lived feature branches from `develop` or continue the current in-progress feature branch if that slice is not done yet.

Typical flow:

```bash
# start from the main checkout on develop
git checkout develop
git pull
git checkout -b quiz-review-summary

# after validating on the feature branch
# open a PR when the slice is complete
git checkout develop
git merge --no-ff quiz-review-summary

# after the merge is safely on develop
git branch -d quiz-review-summary
```

At the beginning of an autonomous run, check whether the relevant feature branch is already in progress. If it is, continue there. Only create a new branch when the previous slice is complete and ready to stay merged in `develop`.

Recommended automation sequence:

1. Identify the best bounded feature or follow-up slice.
2. Decide whether to continue the current WIP feature branch or create a new brief descriptive branch from `develop`.
3. Implement the slice end to end.
4. Run the narrowest meaningful validation.
5. If complete, open a PR and merge back into `develop`, then delete the feature branch.
6. If not complete, leave exact next-session notes in `AUTONOMOUS_STATUS.md` so the next run can resume without rediscovery.

## Ignored local inputs

The repo-root `.env`, optional `frontend/.env.local`, and the `context/` source tree are required for realistic local validation but are ignored by Git.

When you stay in the same checkout and switch feature branches, those local inputs stay available automatically. If you deliberately use a separate checkout or worktree anyway, copy those ignored inputs over before running seeds, tests, or the frontend.

## 2. Restore course context data

The OCW course content is gitignored (too large for the repo). Place it at:

```
context/
  mba_sloan_first_semester_classes/
    communication_for_managers_15.280/
    data_models_and_decisions_15.060/
    ... (8 course directories)
```

If you have the original `mba_sloan_first_semester_classes/` folder, just move it:

```bash
mkdir -p context
mv mba_sloan_first_semester_classes context/
```

If you are already working from a prepared checkout, the existing local `context/` tree can be reused directly across feature branches in that checkout.

## 3. Start local Supabase

```bash
cd supabase
supabase start
```

This downloads and starts all Supabase services in Docker. First run takes a few minutes. On subsequent runs it's fast.

After starting, you'll see output like:
```
API URL: http://localhost:54321
Anon key: eyJ...
Service role key: eyJ...
Studio URL: http://localhost:54323
```

Copy the **Anon key** and **Service role key** into your `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

## 4. Apply database migrations

```bash
# From the supabase/ directory
supabase db push
```

This applies all migrations in `supabase/migrations/` in order.

## 5. Seed course content

```bash
cd scripts
npm install
npm run seed:content   # Upserts courses, pages, resources (metadata)
npm run seed:files     # Uploads PDFs/images to Supabase Storage
```

This reads from `context/mba_sloan_first_semester_classes/` and populates the database.

## 6. Build local assessments

```bash
npm run parse:assessments
npm run expand:assessments
npm run seed:assessments
```

The repo-owned assessment source lives in `context/assessments/`. Start with
`context/assessments/README.md` before authoring or revising quiz content.

## 7. Start the frontend

```bash
cd ../frontend
npm install

# Copy Supabase values into frontend env
cp ../.env.example .env.local
# Edit .env.local with your local Supabase URL and anon key

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 8. Open Supabase Studio

[http://localhost:54323](http://localhost:54323) — explore tables, run SQL, check storage buckets.

## Useful commands

```bash
# Stop Supabase
supabase stop

# Reset database (re-applies all migrations)
supabase db reset

# View Supabase logs
supabase logs

# Generate TypeScript types from DB
supabase gen types typescript --local > frontend/src/types/database.ts
```
