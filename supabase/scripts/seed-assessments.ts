/**
 * seed-assessments.ts
 *
 * Reads local assessment definitions from context/assessments/*.json and
 * upserts quizzes + quiz_questions into Supabase from the repo-owned local
 * assessment source under context/assessments/*.json.
 *
 * Run: npx tsx seed-assessments.ts
 */

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, requireSupabaseServiceRoleKey } from "./config.js";
import { parseLocalAssessments } from "./local-assessments.js";

const supabase = createClient(SUPABASE_URL, requireSupabaseServiceRoleKey(), {
  auth: { persistSession: false },
});

async function seedCourseAssessments() {
  const files = parseLocalAssessments();
  let failureCount = 0;
  let totalQuizCount = 0;
  let totalQuestionCount = 0;

  for (const file of files) {
    const { data: courseRow, error: courseErr } = await supabase
      .from("courses")
      .select("id, title")
      .eq("slug", file.course_slug)
      .single();

    if (courseErr || !courseRow) {
      console.error(`  ❌  Course not found for ${file.course_slug}. Run seed-content.ts first.`);
      failureCount++;
      continue;
    }

    const courseId = courseRow.id as string;
    let quizCount = 0;
    let questionCount = 0;
    const desiredTitles = new Set(file.assessments.map((assessment) => assessment.title));

    console.log(`\n📝  Seeding assessments for ${courseRow.title} (${file.course_slug})`);

    const { data: existingQuizzes, error: existingErr } = await supabase
      .from("quizzes")
      .select("id, title")
      .eq("course_id", courseId)
      .not("generated_from", "is", null);

    if (existingErr) {
      console.error(`  ⚠️   Existing quiz lookup failed: ${existingErr.message}`);
      failureCount++;
    } else {
      const staleQuizIds = ((existingQuizzes ?? []) as { id: string; title: string }[])
        .filter((quiz) => !desiredTitles.has(quiz.title))
        .map((quiz) => quiz.id);

      if (staleQuizIds.length > 0) {
        const { error: pruneErr } = await supabase.from("quizzes").delete().in("id", staleQuizIds);
        if (pruneErr) {
          console.error(`  ⚠️   Could not prune stale local quizzes: ${pruneErr.message}`);
          failureCount++;
        } else {
          console.log(`  🧹  pruned ${staleQuizIds.length} stale local quiz title(s)`);
        }
      }
    }

    for (const assessment of file.assessments) {
      let coursePageId: string | null = null;

      if (assessment.generated_from) {
        const { data: pageRow, error: pageErr } = await supabase
          .from("course_pages")
          .select("id")
          .eq("course_id", courseId)
          .eq("slug", assessment.generated_from)
          .maybeSingle();

        if (pageErr) {
          console.error(
            `  ⚠️   Page lookup failed (${assessment.generated_from}): ${pageErr.message}`
          );
          failureCount++;
        } else {
          coursePageId = pageRow?.id ?? null;
        }
      }

      const { data: quizRow, error: quizErr } = await supabase
        .from("quizzes")
        .upsert(
          {
            course_id: courseId,
            course_page_id: coursePageId,
            title: assessment.title,
            description: assessment.description ?? null,
            kind: assessment.kind,
            difficulty: assessment.difficulty ?? "medium",
            time_limit_minutes: assessment.time_limit_minutes ?? null,
            is_published: assessment.is_published ?? true,
            generated_from: assessment.generated_from ?? null,
          },
          { onConflict: "course_id,title" }
        )
        .select("id")
        .single();

      if (quizErr || !quizRow) {
        console.error(`  ⚠️   Quiz upsert failed (${assessment.title}): ${quizErr?.message}`);
        failureCount++;
        continue;
      }

      const quizId = quizRow.id as string;
      quizCount++;

      const { error: deleteErr } = await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
      if (deleteErr) {
        console.error(`  ⚠️   Could not clear existing questions for ${assessment.title}: ${deleteErr.message}`);
        failureCount++;
        continue;
      }

      const questionRows = assessment.questions.map((question, index) => ({
        quiz_id: quizId,
        sort_order: index,
        question_type: question.question_type,
        question_text: question.question_text,
        options: question.options ?? null,
        correct_answer: question.correct_answer,
        explanation: question.explanation ?? null,
        difficulty: question.difficulty ?? assessment.difficulty ?? "medium",
      }));

      const { error: questionErr } = await supabase.from("quiz_questions").insert(questionRows);
      if (questionErr) {
        console.error(`  ⚠️   Question insert failed (${assessment.title}): ${questionErr.message}`);
        failureCount++;
        continue;
      }

      questionCount += questionRows.length;
      totalQuestionCount += questionRows.length;
    }

    totalQuizCount += quizCount;
    console.log(`  ✅  ${quizCount} assessments, ${questionCount} questions seeded`);
  }

  if (failureCount > 0) {
    console.error(
      `\n❌  Local assessment seeding finished with ${failureCount} issue(s). Seeded ${totalQuizCount} assessments and ${totalQuestionCount} questions.`
    );
    process.exit(1);
  }

  console.log(
    `\n✅  Local assessment seeding complete. Seeded ${totalQuizCount} assessments and ${totalQuestionCount} questions.`
  );
}

seedCourseAssessments().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
