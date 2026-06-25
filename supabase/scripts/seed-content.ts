/**
 * seed-content.ts
 *
 * Upserts all courses, course_pages, and resources (metadata only — no files)
 * into Supabase using the service-role key.
 *
 * Run: npx tsx seed-content.ts
 */

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./config.js";
import { parseAllCourses } from "./parse-courses.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function seedCourses() {
  const courses = parseAllCourses();

  for (const course of courses) {
    console.log(`\n📚  Seeding: ${course.title} (${course.course_number})`);

    // ── Upsert course ────────────────────────────────────────────────────────
    const { data: courseRow, error: courseErr } = await supabase
      .from("courses")
      .upsert(
        {
          slug: course.slug,
          course_number: course.course_number,
          title: course.title,
          description: course.description,
          description_html: course.description_html,
          term: course.term,
          year: course.year,
          level: course.level === "Graduate" ? "Graduate" : "Undergraduate",
          instructors: course.instructors,
          topics: course.topics,
          learning_resource_types: course.learning_resource_types,
          site_uid: course.site_uid,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (courseErr) {
      console.error(`  ❌  course upsert failed: ${courseErr.message}`);
      continue;
    }

    const courseId = courseRow.id as string;
    console.log(`  ✅  course id: ${courseId}`);

    // ── Upsert pages ─────────────────────────────────────────────────────────
    const pageIds: Record<string, string> = {};
    for (let i = 0; i < course.pages.length; i++) {
      const page = course.pages[i];
      const { data: pageRow, error: pageErr } = await supabase
        .from("course_pages")
        .upsert(
          {
            course_id: courseId,
            uid: page.uid || null,
            slug: page.slug,
            title: page.title,
            page_type: page.page_type,
            description: page.description,
            content_html: page.content_html,
            sort_order: i,
          },
          { onConflict: "course_id,slug" }
        )
        .select("id")
        .single();

      if (pageErr) {
        console.error(`  ⚠️   page upsert failed (${page.slug}): ${pageErr.message}`);
        continue;
      }
      pageIds[page.slug] = pageRow.id as string;
    }
    console.log(`  ✅  ${Object.keys(pageIds).length} pages upserted`);

    // ── Upsert resources ─────────────────────────────────────────────────────
    let resCount = 0;
    for (const res of course.resources) {
      // Try to link to a parent page by parent_title
      let coursePageId: string | null = null;
      if (res.parent_title) {
        const matchingSlug = Object.keys(pageIds).find((slug) =>
          slug.toLowerCase().includes(res.parent_title.toLowerCase().replace(/\s+/g, "-"))
        );
        if (matchingSlug) coursePageId = pageIds[matchingSlug];
      }

      const { error: resErr } = await supabase.from("resources").upsert(
        {
          course_id: courseId,
          course_page_id: coursePageId,
          uid: res.uid || null,
          slug: res.slug,
          title: res.title,
          description: res.description,
          content_html: res.content_html,
          resource_type: res.resource_type,
          file_type: res.file_type || null,
          file_size: res.file_size || null,
          ocw_file_path: res.ocw_file_path || null,
          parent_title: res.parent_title || null,
          license: res.license || null,
          learning_resource_types: res.learning_resource_types,
        },
        { onConflict: "course_id,slug" }
      );

      if (resErr) {
        console.error(`  ⚠️   resource upsert failed (${res.slug}): ${resErr.message}`);
      } else {
        resCount++;
      }
    }
    console.log(`  ✅  ${resCount} resources upserted`);
  }

  console.log("\n✅  Content seeding complete.");
}

seedCourses().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
