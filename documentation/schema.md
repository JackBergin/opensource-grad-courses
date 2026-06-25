# Database Schema

All tables live in the `public` schema. Row Level Security (RLS) is enabled on every table.

## Content tables (public read)

### `courses`
Stores one row per MIT OCW course.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Auto-generated |
| `slug` | text UNIQUE | e.g. `15-401-fall-2008` |
| `course_number` | text | e.g. `15.401` |
| `title` | text | Course title |
| `description` | text | Plain-text description |
| `description_html` | text | HTML description from OCW |
| `term` | text | `Fall` or `Spring` |
| `year` | text | e.g. `2008` |
| `level` | enum | `Graduate` or `Undergraduate` |
| `instructors` | jsonb | `[{first_name, last_name, title, uid}]` |
| `topics` | jsonb | `[["Business", "Finance"], ...]` |
| `learning_resource_types` | text[] | e.g. `["Lecture Notes", "Problem Sets"]` |
| `site_uid` | text | OCW site UUID |
| `image_path` | text | Storage path for course image |

RLS: anyone can `SELECT`.

### `course_pages`
Sections within a course (syllabus, readings, assignments, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `course_id` | uuid FK → courses | |
| `slug` | text | e.g. `syllabus`, `readings` |
| `title` | text | Display title |
| `page_type` | enum | One of `syllabus`, `calendar`, `readings`, `assignments`, `exams`, `lecture_notes`, `problem_sets`, `recitations`, `projects`, `tools`, `case_preparation`, `simulation`, `instructor_insights`, `other` |
| `description` | text | Short description |
| `content_html` | text | Raw OCW HTML content |
| `sort_order` | int | Display order |

RLS: anyone can `SELECT`.

### `resources`
Individual files (PDFs, images) associated with a course or page.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `course_id` | uuid FK → courses | |
| `course_page_id` | uuid FK → course_pages | Nullable |
| `slug` | text | OCW resource directory name |
| `title` | text | |
| `resource_type` | enum | `Document`, `Image`, `Video`, `Other` |
| `file_type` | text | MIME type |
| `file_size` | bigint | Bytes |
| `ocw_file_path` | text | Original OCW path (`/courses/...`) |
| `storage_path` | text | Supabase Storage path after upload |

RLS: anyone can `SELECT`.

## Assessment tables (public read for published quizzes)

### `quizzes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `course_id` | uuid FK → courses | |
| `course_page_id` | uuid FK → course_pages | Nullable |
| `title` | text | |
| `kind` | enum | `practice_quiz` or `homework` |
| `difficulty` | enum | `easy`, `medium`, `hard` |
| `time_limit_minutes` | int | Null = untimed |
| `is_published` | bool | Only published quizzes visible publicly |
| `generated_from` | text | Source page slug used for generation |

RLS: anyone can `SELECT` where `is_published = true`.

Implementation note: locally authored exam-style sets are currently stored as `kind = 'homework'` and distinguished through title/description metadata.

### `quiz_questions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `quiz_id` | uuid FK → quizzes | |
| `sort_order` | int | |
| `question_type` | enum | `multiple_choice`, `multi_select`, `true_false`, `short_answer` |
| `question_text` | text | |
| `options` | jsonb | `[{id, text}]` for choice questions |
| `correct_answer` | jsonb | String or array of strings |
| `explanation` | text | Shown after answering |

RLS: visible only if parent quiz is published.

## User tables (owner-only access)

### `profiles`
Auto-created via trigger when a user signs up.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK → auth.users | |
| `display_name` | text | |
| `avatar_url` | text | |

RLS: only the owner can `SELECT` and `UPDATE`.

### `enrollments`
Courses a user has bookmarked/enrolled in.

### `progress`
Per-page completion tracking. Unique on `(user_id, course_page_id)`.

| Column | Notes |
|--------|-------|
| `completed` | bool |
| `completed_at` | timestamptz |

### `quiz_attempts`
One row per quiz attempt.

| Column | Notes |
|--------|-------|
| `score` | 0–100 decimal |
| `total_q` | Total questions |
| `correct_q` | Correctly answered count |

### `quiz_responses`
Per-question response within an attempt.

## Storage

**Bucket:** `course-files` (public)

Path structure: `{course-slug}/{filename}`

Example: `15-401-fall-2008/ecfe2e9d4bba810207c1fefcb216a852_MIT15_401F08_rec07.pdf`

Public URL: `<SUPABASE_URL>/storage/v1/object/public/course-files/{path}`
