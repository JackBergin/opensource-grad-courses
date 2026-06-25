# Content Seeding Guide

The `supabase/scripts/` directory contains TypeScript scripts to populate the database from the OCW course data in `context/` and the repo-owned local assessments in `context/assessments/`.

## Prerequisites

- Local Supabase running (`supabase start`)
- Migrations applied (`supabase db push`)
- `context/mba_sloan_first_semester_classes/` exists with all 8 course directories
- `.env` filled with correct values

## Install dependencies

```bash
cd supabase/scripts
npm install
```

## Step 1: Inspect parsed data (optional)

```bash
npm run parse
```

Prints the normalized JSON for all 8 courses to stdout. No database writes. Pipe to a file to review:

```bash
npm run parse > /tmp/parsed.json
```

## Step 2: Seed content (courses, pages, resources)

```bash
npm run seed:content
```

Upserts rows into `courses`, `course_pages`, and `resources`. Safe to re-run — uses `onConflict: "slug"`.

Expected output:
```
✅  Parsed 8 courses
📚  Seeding: Finance Theory I (15.401)
  ✅  course id: ...
  ✅  12 pages upserted
  ✅  147 resources upserted
...
✅  Content seeding complete.
```

## Step 3: Upload files to storage

```bash
npm run seed:files
```

Reads every resource's local file path and uploads to the `course-files` bucket. Updates `resources.storage_path` for each uploaded file. Safe to re-run (upsert).

Expected output:
```
📁  Finance Theory I — 147 files to upload
    ✅  15-401-fall-2008/06195cdf...MIT15_401F08_rec01.pdf
    ✅  15-401-fall-2008/0c0d8c56...MIT15_401F08_midterm_sol.pdf
...
✅  File upload complete. Processed 216 files.
```

## Step 4: Build and seed local assessments

```bash
npm run expand:assessments
npm run seed:assessments
```

Reads all `context/assessments/*.json` files and upserts quizzes + questions. Re-seeding is safe: quizzes are upserted, each quiz's questions are replaced, and stale local quiz titles for that course are pruned.

The compatibility alias below also works:

```bash
npm run seed:quizzes
```

## Shortcut: seed content + files

```bash
npm run seed:all
```

Runs `seed:content` then `seed:files` in sequence.

## Re-seeding

All seed scripts are idempotent:
- `seed:content` uses upsert on `(course_id, slug)`
- `seed:files` uses storage upsert
- `seed:assessments` deletes and re-inserts questions per quiz

## OCW data structure

Each course directory contains:
```
<course_name>/
  data.json          — course metadata (title, number, instructors, topics)
  content_map.json   — UUID → path mapping
  pages/
    syllabus/
      data.json      — { content: "<html>...", title, description, uid }
    readings/
      data.json
    assignments/
      ...
  resources/
    <resource-slug>/
      data.json      — { file: "/courses/.../hash_name.pdf", file_type, ... }
  static_resources/  — actual binary files (PDFs, images)
```

Local assessments live alongside that source data:

```text
context/
  assessments/
    15.401-fall-2008.json
    15.515-fall-2003.json
    ...
```
