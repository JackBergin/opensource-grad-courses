-- ─── Enums ───────────────────────────────────────────────────────────────────
create type public.course_level as enum ('Graduate', 'Undergraduate');
create type public.page_type as enum (
  'syllabus',
  'calendar',
  'readings',
  'assignments',
  'exams',
  'lecture_notes',
  'problem_sets',
  'recitations',
  'projects',
  'tools',
  'case_preparation',
  'simulation',
  'instructor_insights',
  'other'
);
create type public.resource_type as enum ('Document', 'Image', 'Video', 'Other');

-- ─── courses ─────────────────────────────────────────────────────────────────
create table public.courses (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,              -- e.g. "15-401-finance-theory-i-fall-2008"
  course_number    text not null,                     -- e.g. "15.401"
  title            text not null,
  description      text,
  description_html text,
  term             text,                              -- "Fall" | "Spring"
  year             text,
  level            public.course_level default 'Graduate',
  instructors      jsonb default '[]',                -- [{first_name, last_name, title, uid}]
  topics           jsonb default '[]',                -- [["Business","Finance"], ...]
  learning_resource_types text[],
  site_uid         text unique,
  ocw_url          text,
  image_path       text,                              -- storage path for course image
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.courses enable row level security;

create policy "courses_public_read" on public.courses
  for select using (true);

-- ─── course_pages ────────────────────────────────────────────────────────────
create table public.course_pages (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  uid          text,                                 -- OCW uid
  slug         text not null,                        -- e.g. "syllabus", "readings"
  title        text not null,
  page_type    public.page_type default 'other',
  description  text,
  content_html text,                                 -- raw OCW HTML content
  sort_order   integer default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(course_id, slug)
);

alter table public.course_pages enable row level security;

create policy "course_pages_public_read" on public.course_pages
  for select using (true);

create index idx_course_pages_course_id on public.course_pages(course_id);

-- ─── resources ───────────────────────────────────────────────────────────────
create table public.resources (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references public.courses(id) on delete cascade,
  course_page_id  uuid references public.course_pages(id) on delete set null,
  uid             text,                              -- OCW uid
  slug            text,                              -- directory name
  title           text not null,
  description     text,
  content_html    text,
  resource_type   public.resource_type default 'Document',
  file_type       text,                              -- MIME type
  file_size       bigint,
  ocw_file_path   text,                              -- original /courses/... path
  storage_path    text,                              -- supabase storage path after upload
  learning_resource_types text[],
  parent_title    text,
  license         text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.resources enable row level security;

create policy "resources_public_read" on public.resources
  for select using (true);

create index idx_resources_course_id on public.resources(course_id);
create index idx_resources_course_page_id on public.resources(course_page_id);

-- ─── updated_at trigger function ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

create trigger course_pages_updated_at before update on public.course_pages
  for each row execute function public.set_updated_at();

create trigger resources_updated_at before update on public.resources
  for each row execute function public.set_updated_at();
