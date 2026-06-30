import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Course, CoursePage, Quiz } from "@/types/database";

const PAGE_LABELS: Record<string, string> = {
  syllabus: "Syllabus",
  calendar: "Schedule",
  readings: "Readings",
  assignments: "Assignments",
  exams: "Exams",
  lecture_notes: "Lecture Notes",
  problem_sets: "Problem Sets",
  recitations: "Recitations",
  projects: "Projects",
  tools: "Tools",
  case_preparation: "Case Prep",
  simulation: "Simulations",
  instructor_insights: "Instructor Insights",
  other: "More",
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: courseData } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!courseData) notFound();

  const c = courseData as unknown as Course;

  const { data: pagesData } = await supabase
    .from("course_pages")
    .select("id, slug, title, page_type, description, sort_order")
    .eq("course_id", c.id)
    .order("sort_order");

  const { data: quizzesData } = await supabase
    .from("quizzes")
    .select("id, title, kind, difficulty, is_published")
    .eq("course_id", c.id)
    .eq("is_published", true)
    .order("created_at");

  const pageList = (pagesData ?? []) as unknown as Pick<CoursePage, "id" | "slug" | "title" | "page_type" | "description" | "sort_order">[];
  const quizzes = (quizzesData ?? []) as unknown as Pick<Quiz, "id" | "title" | "kind" | "difficulty" | "is_published">[];

  let completedPageIds = new Set<string>();
  const quizStats = new Map<string, { attempts: number; latestScore: number | null; bestScore: number | null }>();

  if (user) {
    const { data: progressData } = await supabase
      .from("progress")
      .select("course_page_id, completed")
      .eq("user_id", user.id)
      .eq("course_id", c.id);

    let attemptsData: { quiz_id: string; score: number | null; completed_at: string | null }[] = [];
    if (quizzes.length > 0) {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, score, completed_at")
        .eq("user_id", user.id)
        .in("quiz_id", quizzes.map((quiz) => quiz.id))
        .order("completed_at", { ascending: false });
      attemptsData = (data ?? []) as { quiz_id: string; score: number | null; completed_at: string | null }[];
    }

    completedPageIds = new Set(
      ((progressData ?? []) as { course_page_id: string; completed: boolean }[])
        .filter((row) => row.completed)
        .map((row) => row.course_page_id)
    );

    for (const attempt of attemptsData) {
      const current = quizStats.get(attempt.quiz_id) ?? {
        attempts: 0,
        latestScore: null,
        bestScore: null,
      };
      current.attempts += 1;
      if (current.latestScore === null && attempt.score !== null) {
        current.latestScore = Number(attempt.score);
      }
      if (attempt.score !== null) {
        current.bestScore =
          current.bestScore === null
            ? Number(attempt.score)
            : Math.max(current.bestScore, Number(attempt.score));
      }
      quizStats.set(attempt.quiz_id, current);
    }
  }

  const completedPages = pageList.filter((page) => completedPageIds.has(page.id)).length;
  const attemptedQuizzes = quizzes.filter((quiz) => quizStats.has(quiz.id)).length;
  const bestScores = [...quizStats.values()]
    .map((stat) => stat.bestScore)
    .filter((score): score is number => score !== null);
  const averageBestScore =
    bestScores.length > 0
      ? Math.round(bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length)
      : null;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
      {/* Breadcrumb */}
      <nav className="eyebrow mb-8">
        <Link href="/courses" className="hover:text-[var(--color-accent)] transition-colors">
          Courses
        </Link>{" "}
        <span className="text-[var(--color-rule)]">/</span>{" "}
        <span>{c.course_number}</span>
      </nav>

      {/* Course header */}
      <div className="layout-grid mb-16">
        <div className="col-body">
          <p className="eyebrow mb-4">
            {c.course_number}
            {c.term && ` · ${c.term} ${c.year ?? ""}`}
          </p>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl lg:text-5xl leading-tight mb-6">
            {c.title}
          </h1>
          {c.description && (
            <p className="text-[var(--color-muted)] text-lg leading-relaxed mb-8">
              {c.description}
            </p>
          )}
          {c.topics && c.topics.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {c.topics.map((t, i) => (
                <span
                  key={i}
                  className="eyebrow text-[10px] border border-[var(--color-rule)] px-2 py-1"
                >
                  {t[t.length - 1]}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:block col-marginalia pt-2">
          <p className="eyebrow mb-4">Faculty</p>
          {c.instructors?.map((inst) => (
            <div key={inst.uid} className="mb-4">
              <p className="font-medium text-sm">
                {inst.first_name} {inst.last_name}
              </p>
              <p className="text-xs text-[var(--color-muted)]">MIT Sloan</p>
            </div>
          ))}

          {user && (
            <div className="mt-10 border border-[var(--color-rule)] p-5">
              <p className="eyebrow mb-4">Your Progress</p>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium">{completedPages}/{pageList.length} sections completed</p>
                  <div className="mt-2 h-[2px] bg-[var(--color-rule)]">
                    <div
                      className="h-full bg-[var(--color-ink)]"
                      style={{
                        width: `${pageList.length > 0 ? (completedPages / pageList.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p className="font-medium">{attemptedQuizzes}/{quizzes.length} assessments attempted</p>
                  <p className="text-[var(--color-muted)] mt-1">
                    {averageBestScore !== null ? `Average best score: ${averageBestScore}%` : "No quiz attempts yet"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <hr className="rule" />

      {/* Course sections */}
      {pageList.length > 0 && (
        <section className="py-12">
          <p className="eyebrow mb-8">Course Sections</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {pageList.map((page) => (
              <Link
                key={page.id}
                href={`/courses/${slug}/${page.slug}`}
                className="group border border-[var(--color-rule)] p-6 hover:border-[var(--color-ink)] transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="eyebrow">
                    {PAGE_LABELS[page.page_type] ?? page.page_type}
                  </p>
                  {completedPageIds.has(page.id) && (
                    <span className="eyebrow text-[10px] text-[var(--color-accent)]">
                      Completed
                    </span>
                  )}
                </div>
                <h3 className="font-[family-name:var(--font-display)] font-bold text-xl leading-snug group-hover:text-[var(--color-accent)] transition-colors">
                  {page.title}
                </h3>
                {page.description && (
                  <p className="text-sm text-[var(--color-muted)] mt-2 leading-relaxed line-clamp-2">
                    {page.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quizzes */}
      {quizzes.length > 0 && (
        <>
          <hr className="rule" />
          <section className="py-12">
            <div className="flex items-baseline justify-between mb-8">
              <p className="eyebrow">Practice & Homework</p>
              <p className="text-sm text-[var(--color-muted)]">
                {quizzes.length} assessment{quizzes.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="space-y-0">
              {quizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/courses/${slug}/quiz/${quiz.id}`}
                  className="group flex items-center justify-between border-b border-[var(--color-rule)] py-5 hover:bg-[#F5F3EF] transition-colors"
                >
                  <div>
                    <p className="eyebrow mb-1">
                      {quiz.kind === "practice_quiz" ? "Practice Quiz" : "Homework"}{" "}
                      · {quiz.difficulty}
                    </p>
                    <h3 className="font-medium group-hover:text-[var(--color-accent)] transition-colors">
                      {quiz.title}
                    </h3>
                    {quizStats.has(quiz.id) && (
                      <p className="text-sm text-[var(--color-muted)] mt-1">
                        {quizStats.get(quiz.id)?.attempts} attempt{quizStats.get(quiz.id)?.attempts !== 1 ? "s" : ""}
                        {quizStats.get(quiz.id)?.latestScore !== null
                          ? ` · latest ${Math.round(quizStats.get(quiz.id)?.latestScore ?? 0)}%`
                          : ""}
                        {quizStats.get(quiz.id)?.bestScore !== null
                          ? ` · best ${Math.round(quizStats.get(quiz.id)?.bestScore ?? 0)}%`
                          : ""}
                      </p>
                    )}
                  </div>
                  <span className="eyebrow text-[var(--color-accent)] group-hover:translate-x-1 transition-transform inline-block">
                    {quizStats.has(quiz.id) ? "Continue →" : "Start →"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
