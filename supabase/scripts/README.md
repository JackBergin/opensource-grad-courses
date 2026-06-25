# Supabase Scripts

Seeding and local assessment authoring scripts for the MBA Sloan learning platform.

## Prerequisites

1. Copy `.env.example` to `.env` at the project root and fill in all values.
2. Ensure `context/mba_sloan_first_semester_classes/` exists (the OCW course data).
3. A running Supabase instance (local `supabase start` or remote) with migrations applied.

```bash
# Install dependencies
npm install
```

## Run order

### 1. Parse & inspect course data (optional, no side effects)

```bash
npm run parse
```

Prints the normalized course structure JSON to stdout. Useful for verifying the data before seeding.

### 2. Seed course content (metadata, pages, resources)

```bash
npm run seed:content
```

Upserts all 8 courses, their pages, and resource metadata into Postgres. Safe to re-run.

### 3. Upload course files to storage

```bash
npm run seed:files
```

Uploads all PDFs, images, and other static assets from `context/.../static_resources/` into the `course-files` Supabase storage bucket. Updates each resource row with `storage_path`. Safe to re-run (uses upsert).

### 4. Seed local assessments

```bash
npm run seed:assessments
```

Reads repo-owned JSON files from `context/assessments/*.json`, upserts quizzes plus questions, and prunes stale local quiz titles no longer present in the files.

Compatibility alias:

```bash
npm run seed:quizzes
```

### Rebuild local assessments

```bash
npm run expand:assessments
```

Rewrites the repo-owned assessment JSON in `context/assessments/` from the local section-authoring rules.

### Seed everything (steps 2 + 3)

```bash
npm run seed:all
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (never expose to browser) |
| `COURSE_CONTEXT_DIR` | Path to OCW data (default: `./context/mba_sloan_first_semester_classes`) |
| `ASSESSMENT_CONTEXT_DIR` | Path to local assessment JSON (default: `./context/assessments`) |

## Local assessment format

Each `context/assessments/<course-slug>.json` file has this shape:

```json
{
  "course_slug": "15.401-fall-2008",
  "assessments": [
    {
      "title": "Finance Theory I - Capital Budgeting Practice Set",
      "description": "Short practice set tied to the readings page.",
      "kind": "practice_quiz",
      "difficulty": "medium",
      "generated_from": "readings",
      "time_limit_minutes": 20,
      "is_published": true,
      "questions": [
        {
          "question_type": "multiple_choice",
          "question_text": "What is the primary goal of financial management?",
          "options": [
            { "id": "a", "text": "Maximizing revenue" },
            { "id": "b", "text": "Maximizing shareholder value" },
            { "id": "c", "text": "Minimizing costs" },
            { "id": "d", "text": "Maximizing market share" }
          ],
          "correct_answer": "b",
          "explanation": "Financial management aims to maximize the value of the firm for its shareholders.",
          "difficulty": "easy"
        }
      ]
    }
  ]
}
```
