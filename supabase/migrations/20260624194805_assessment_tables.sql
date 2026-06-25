-- ─── Enums ───────────────────────────────────────────────────────────────────
create type public.quiz_kind as enum ('practice_quiz', 'homework');
create type public.question_type as enum (
  'multiple_choice',
  'multi_select',
  'true_false',
  'short_answer'
);
create type public.difficulty as enum ('easy', 'medium', 'hard');

-- ─── quizzes ─────────────────────────────────────────────────────────────────
create table public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  course_page_id uuid references public.course_pages(id) on delete set null,
  title         text not null,
  description   text,
  kind          public.quiz_kind not null default 'practice_quiz',
  difficulty    public.difficulty default 'medium',
  time_limit_minutes integer,                        -- null = untimed
  is_published  boolean not null default false,
  generated_from text,                               -- source page/section used to generate
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.quizzes enable row level security;

create policy "quizzes_public_read" on public.quizzes
  for select using (is_published = true);

create index idx_quizzes_course_id on public.quizzes(course_id);

-- ─── quiz_questions ───────────────────────────────────────────────────────────
create table public.quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references public.quizzes(id) on delete cascade,
  sort_order      integer not null default 0,
  question_type   public.question_type not null,
  question_text   text not null,
  -- For multiple_choice / multi_select: [{id, text}]
  -- For true_false: null (answers are "true"/"false")
  -- For short_answer: null
  options         jsonb,
  -- For multiple_choice: option id string
  -- For multi_select: array of option id strings
  -- For true_false: "true" or "false"
  -- For short_answer: expected answer text (used for display/hints, not auto-graded)
  correct_answer  jsonb not null,
  explanation     text,                              -- shown after answering
  difficulty      public.difficulty default 'medium',
  created_at      timestamptz default now()
);

alter table public.quiz_questions enable row level security;

create policy "quiz_questions_public_read" on public.quiz_questions
  for select using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and q.is_published = true
    )
  );

create index idx_quiz_questions_quiz_id on public.quiz_questions(quiz_id);

create trigger quizzes_updated_at before update on public.quizzes
  for each row execute function public.set_updated_at();
