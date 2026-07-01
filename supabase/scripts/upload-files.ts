/**
 * upload-files.ts
 *
 * Uploads all local course files (PDFs, images, etc.) from static_resources/
 * to the Supabase "course-files" storage bucket, then updates the
 * resources.storage_path column for each uploaded file.
 *
 * Run: npx tsx upload-files.ts
 *
 * Safe to re-run — already-uploaded files are skipped (upsert).
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, requireSupabaseServiceRoleKey } from "./config.js";
import { parseAllCourses, type ParsedCourse } from "./parse-courses.js";

const supabase = createClient(SUPABASE_URL, requireSupabaseServiceRoleKey(), {
  auth: { persistSession: false },
});

const BUCKET = "course-files";

function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".srt": "application/x-subrip",
    ".vtt": "text/vtt",
    ".webvtt": "text/vtt",
  };
  return map[ext] ?? "application/octet-stream";
}

async function uploadCourse(course: ParsedCourse) {
  // Fetch the course row so we have its UUID
  const { data: courseRow } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", course.slug)
    .single();

  if (!courseRow) {
    console.log(`  ⚠️   Course not found in DB (run seed-content first): ${course.slug}`);
    return;
  }

  const courseId = courseRow.id as string;

  for (const res of course.resources) {
    if (!res.local_file_path || !fs.existsSync(res.local_file_path)) continue;

    const fileName = path.basename(res.local_file_path);
    const storagePath = `${course.slug}/${fileName}`;
    const contentType = mimeType(res.local_file_path);

    const fileBuffer = fs.readFileSync(res.local_file_path);

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadErr) {
      console.error(`    ❌  upload failed (${fileName}): ${uploadErr.message}`);
      continue;
    }

    // Update the resource row with the storage path
    const { error: updateErr } = await supabase
      .from("resources")
      .update({ storage_path: storagePath })
      .eq("course_id", courseId)
      .eq("slug", res.slug);

    if (updateErr) {
      console.error(`    ⚠️   storage_path update failed (${res.slug}): ${updateErr.message}`);
    } else {
      console.log(`    ✅  ${storagePath}`);
    }
  }
}

async function main() {
  const courses = parseAllCourses();
  let total = 0;

  for (const course of courses) {
    const fileCount = course.resources.filter((r) => r.local_file_path).length;
    console.log(`\n📁  ${course.title} — ${fileCount} files to upload`);
    await uploadCourse(course);
    total += fileCount;
  }

  console.log(`\n✅  File upload complete. Processed ${total} files.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
