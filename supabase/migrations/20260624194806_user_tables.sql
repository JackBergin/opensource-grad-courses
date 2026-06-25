-- ─── profiles ────────────────────────────────────────────────────────────────
-- Mirrors auth.users; auto-created via trigger on signup.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id);

-- ─── enrollments ─────────────────────────────────────────────────────────────
-- Users bookmark/enroll in courses they're studying.
create table public.enrollments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz default now(),
  unique(user_id, course_id)
);

alter table public.enrollments enable row level security;

create policy "enrollments_owner_select" on public.enrollments
  for select using (auth.uid() = user_id);

create policy "enrollments_owner_insert" on public.enrollments
  for insert with check (auth.uid() = user_id);

create policy "enrollments_owner_delete" on public.enrollments
  for delete using (auth.uid() = user_id);

create index idx_enrollments_user_id on public.enrollments(user_id);
create index idx_enrollments_course_id on public.enrollments(course_id);

-- ─── progress ────────────────────────────────────────────────────────────────
-- Tracks which course sections a user has read/completed.
create table public.progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  course_id      uuid not null references public.courses(id) on delete cascade,
  course_page_id uuid not null references public.course_pages(id) on delete cascade,
  completed      boolean not null default false,
  completed_at   timestamptz,
  updated_at     timestamptz default now(),
  unique(user_id, course_page_id)
);

alter table public.progress enable row level security;

create policy "progress_owner_select" on public.progress
  for select using (auth.uid() = user_id);

create policy "progress_owner_insert" on public.progress
  for insert with check (auth.uid() = user_id);

create policy "progress_owner_update" on public.progress
  for update using (auth.uid() = user_id);

create index idx_progress_user_id on public.progress(user_id);
create index idx_progress_course_id on public.progress(course_id);

-- ─── quiz_attempts ────────────────────────────────────────────────────────────
create table public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  score        numeric(5,2),                         -- 0.00 - 100.00
  total_q      integer,
  correct_q    integer,
  started_at   timestamptz default now(),
  completed_at timestamptz,
  time_taken_s integer                               -- seconds elapsed
);

alter table public.quiz_attempts enable row level security;

create policy "quiz_attempts_owner_select" on public.quiz_attempts
  for select using (auth.uid() = user_id);

create policy "quiz_attempts_owner_insert" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

create policy "quiz_attempts_owner_update" on public.quiz_attempts
  for update using (auth.uid() = user_id);

create index idx_quiz_attempts_user_id on public.quiz_attempts(user_id);
create index idx_quiz_attempts_quiz_id on public.quiz_attempts(quiz_id);

-- ─── quiz_responses ───────────────────────────────────────────────────────────
create table public.quiz_responses (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id      uuid not null references public.quiz_questions(id) on delete cascade,
  user_answer      jsonb,                            -- mirrors correct_answer type
  is_correct       boolean,
  answered_at      timestamptz default now()
);

alter table public.quiz_responses enable row level security;

create policy "quiz_responses_owner_select" on public.quiz_responses
  for select using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = quiz_responses.attempt_id and a.user_id = auth.uid()
    )
  );

create policy "quiz_responses_owner_insert" on public.quiz_responses
  for insert with check (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = quiz_responses.attempt_id and a.user_id = auth.uid()
    )
  );

create index idx_quiz_responses_attempt_id on public.quiz_responses(attempt_id);

-- ─── handle_new_user trigger ─────────────────────────────────────────────────
-- Auto-create a profile row when a new user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── updated_at triggers ─────────────────────────────────────────────────────
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger progress_updated_at before update on public.progress
  for each row execute function public.set_updated_at();
