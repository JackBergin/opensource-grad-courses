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
npm run expand:assessments
npm run seed:assessments
```

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
