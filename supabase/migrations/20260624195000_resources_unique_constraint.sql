-- Add missing unique constraint on resources(course_id, slug)
-- Required for upsert conflict resolution in seed-content.ts
alter table public.resources
  add constraint resources_course_id_slug_unique unique (course_id, slug);
