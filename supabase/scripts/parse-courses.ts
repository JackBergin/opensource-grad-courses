/**
 * parse-courses.ts
 *
 * Reads every course directory under COURSE_CONTEXT_DIR and normalises the
 * OCW JSON/HTML content into a structured in-memory representation that the
 * other seed scripts consume.
 *
 * Run: npx tsx parse-courses.ts
 * Output: parsed data printed as JSON to stdout (pipe to a file if needed).
 */

import fs from "fs";
import path from "path";
import { COURSE_CONTEXT_DIR } from "./config.js";

export interface ParsedInstructor {
  first_name: string;
  last_name: string;
  title: string;
  uid: string;
}

export interface ParsedPage {
  uid: string;
  slug: string;
  title: string;
  description: string;
  content_html: string;
  page_type: string;
}

export interface ParsedResource {
  uid: string;
  slug: string;
  title: string;
  description: string;
  content_html: string;
  resource_type: string;
  file_type: string;
  file_size: number;
  ocw_file_path: string;
  local_file_path: string; // absolute path on disk, empty if not found
  parent_title: string;
  license: string;
  learning_resource_types: string[];
}

export interface ParsedCourse {
  courseDir: string; // absolute path to the course directory
  slug: string;
  course_number: string;
  title: string;
  description: string;
  description_html: string;
  term: string;
  year: string;
  level: string;
  instructors: ParsedInstructor[];
  topics: string[][];
  learning_resource_types: string[];
  site_uid: string;
  pages: ParsedPage[];
  resources: ParsedResource[];
}

const PAGE_TYPE_MAP: Record<string, string> = {
  syllabus: "syllabus",
  calendar: "calendar",
  readings: "readings",
  assignments: "assignments",
  exams: "exams",
  "lecture-notes": "lecture_notes",
  "problem-sets": "problem_sets",
  recitations: "recitations",
  projects: "projects",
  tools: "tools",
  "case-preparation-questions": "case_preparation",
  "cases-and-readings": "readings",
  "simulation-exercises": "simulation",
  "instructor-insights": "instructor_insights",
  "lecture-summaries": "lecture_notes",
  "case-learning-modules": "other",
  "video-lectures-and-slides": "lecture_notes",
};

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function slugFromDir(dirName: string): string {
  // e.g. "finance_theory_1_15.401" → "finance-theory-1-15-401"
  return dirName.replace(/_/g, "-").replace(/\./g, "-").toLowerCase();
}

function parseCourse(courseDir: string): ParsedCourse {
  const dirName = path.basename(courseDir);
  const meta = readJson<Record<string, unknown>>(path.join(courseDir, "data.json")) ?? {};

  const pages: ParsedPage[] = [];
  const resources: ParsedResource[] = [];

  // ── Pages ───────────────────────────────────────────────────────────────────
  const pagesDir = path.join(courseDir, "pages");
  if (fs.existsSync(pagesDir)) {
    for (const entry of fs.readdirSync(pagesDir)) {
      const entryPath = path.join(pagesDir, entry);
      if (!fs.statSync(entryPath).isDirectory()) continue;

      const dataPath = path.join(entryPath, "data.json");
      const data = readJson<Record<string, unknown>>(dataPath);
      if (!data) continue;

      pages.push({
        uid: (data.uid as string) ?? "",
        slug: entry,
        title: (data.title as string) ?? entry,
        description: (data.description as string) ?? "",
        content_html: (data.content as string) ?? "",
        page_type: PAGE_TYPE_MAP[entry] ?? "other",
      });

      // Sub-pages (e.g. calendar/overview)
      for (const sub of fs.readdirSync(entryPath)) {
        const subPath = path.join(entryPath, sub);
        if (!fs.statSync(subPath).isDirectory()) continue;
        const subData = readJson<Record<string, unknown>>(path.join(subPath, "data.json"));
        if (!subData) continue;
        pages.push({
          uid: (subData.uid as string) ?? "",
          slug: `${entry}-${sub}`,
          title: (subData.title as string) ?? sub,
          description: (subData.description as string) ?? "",
          content_html: (subData.content as string) ?? "",
          page_type: PAGE_TYPE_MAP[entry] ?? "other",
        });
      }
    }
  }

  // ── Resources ────────────────────────────────────────────────────────────────
  const resourcesDir = path.join(courseDir, "resources");
  if (fs.existsSync(resourcesDir)) {
    for (const entry of fs.readdirSync(resourcesDir)) {
      const entryPath = path.join(resourcesDir, entry);
      if (!fs.statSync(entryPath).isDirectory()) continue;

      const dataPath = path.join(entryPath, "data.json");
      const data = readJson<Record<string, unknown>>(dataPath);
      if (!data) continue;

      const ocwFilePath = (data.file as string) ?? "";
      let localFilePath = "";

      // Map /courses/.../HASH_name.ext → static_resources/HASH_name.ext
      if (ocwFilePath) {
        const fileName = path.basename(ocwFilePath);
        const candidate = path.join(courseDir, "static_resources", fileName);
        if (fs.existsSync(candidate)) {
          localFilePath = candidate;
        }
      }

      const rt = ((data.resourcetype as string) ?? "").toLowerCase();
      let resource_type: string;
      if (rt === "image") resource_type = "Image";
      else if (rt === "video") resource_type = "Video";
      else if (rt === "document") resource_type = "Document";
      else resource_type = "Other";

      resources.push({
        uid: (data.uid as string) ?? "",
        slug: entry,
        title: (data.title as string) ?? entry,
        description: (data.description as string) ?? "",
        content_html: (data.content as string) ?? "",
        resource_type,
        file_type: (data.file_type as string) ?? "",
        file_size: (data.file_size as number) ?? 0,
        ocw_file_path: ocwFilePath,
        local_file_path: localFilePath,
        parent_title: (data.parent_title as string) ?? "",
        license: (data.license as string) ?? "",
        learning_resource_types: (data.learning_resource_types as string[]) ?? [],
      });
    }
  }

  return {
    courseDir,
    slug: (meta.site_short_id as string)
      ? String(meta.site_short_id).replace(/\./g, "-")
      : slugFromDir(dirName),
    course_number: (meta.primary_course_number as string) ?? "",
    title: (meta.course_title as string) ?? dirName,
    description: (meta.course_description as string) ?? "",
    description_html: (meta.course_description_html as string) ?? "",
    term: (meta.term as string) ?? "",
    year: (meta.year as string) ?? "",
    level: (Array.isArray(meta.level) ? (meta.level as string[])[0] : (meta.level as string)) ?? "Graduate",
    instructors: ((meta.instructors as ParsedInstructor[]) ?? []).map((i) => ({
      first_name: i.first_name ?? "",
      last_name: i.last_name ?? "",
      title: i.title ?? "",
      uid: i.uid ?? "",
    })),
    topics: (meta.topics as string[][]) ?? [],
    learning_resource_types: (meta.learning_resource_types as string[]) ?? [],
    site_uid: (meta.site_uid as string) ?? "",
    pages,
    resources,
  };
}

export function parseAllCourses(): ParsedCourse[] {
  const courseDir = COURSE_CONTEXT_DIR;
  if (!fs.existsSync(courseDir)) {
    console.error(`❌  Course context directory not found: ${courseDir}`);
    console.error("    Run: mv mba_sloan_first_semester_classes context/");
    process.exit(1);
  }

  const courses: ParsedCourse[] = [];
  for (const entry of fs.readdirSync(courseDir)) {
    const entryPath = path.join(courseDir, entry);
    if (!fs.statSync(entryPath).isDirectory()) continue;
    if (!fs.existsSync(path.join(entryPath, "data.json"))) continue;
    courses.push(parseCourse(entryPath));
  }

  console.log(`✅  Parsed ${courses.length} courses`);
  return courses;
}

// If run directly, print parsed data
if (process.argv[1] && process.argv[1].endsWith("parse-courses.ts")) {
  const courses = parseAllCourses();
  console.log(JSON.stringify(courses, null, 2));
}
