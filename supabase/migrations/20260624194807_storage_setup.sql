-- ─── Storage: course-files bucket ────────────────────────────────────────────
-- Public bucket for course PDFs, images, and other static resources.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-files',
  'course-files',
  true,
  104857600,  -- 100 MiB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Anyone can read files from the public bucket.
create policy "course_files_public_read" on storage.objects
  for select using (bucket_id = 'course-files');

-- Only service role can insert/update (via seeding scripts).
-- Enforced at the application level; no anon insert policy.
-- Storage upsert requires INSERT + SELECT + UPDATE — seeding uses service_role key directly.
