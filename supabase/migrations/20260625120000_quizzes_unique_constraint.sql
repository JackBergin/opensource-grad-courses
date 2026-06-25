-- Add missing unique constraint on quizzes(course_id, title)
-- Required for upsert conflict resolution in seed-assessments.ts
alter table public.quizzes
  add constraint quizzes_course_id_title_unique unique (course_id, title);
