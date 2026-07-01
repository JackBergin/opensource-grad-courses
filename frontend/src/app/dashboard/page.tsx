import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Course, Quiz } from "@/types/database";

export const metadata = {
  title: "Dashboard — MIT Sloan MBA",
};

interface ProgressRow { course_id: string; course_page_id: string; completed: boolean }
interface AttemptRow { quiz_id: string; score: number | null; correct_q: number | null; total_q: number | null; completed_at: string | null }

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <p className="eyebrow mb-4">Dashboard unavailable</p>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl lg:text-5xl mb-6">
          Configure Supabase to load learner progress.
        </h1>
        <p className="text-[var(--color-muted)] text-lg max-w-xl">
          The dashboard depends on authenticated Supabase data, so it stays unavailable
          until the local URL and anon key are configured.
        </p>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const profile = profileData as unknown as { display_name: string | null } | null;

  // Progress across all pages
  const { data: progressData } = await supabase
    .from("progress")
    .select("course_id, course_page_id, completed")
    .eq("user_id", user.id);

  const progress = (progressData ?? []) as unknown as ProgressRow[];

  // All quiz attempts
  const { data: attemptsData } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, score, correct_q, total_q, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  const attempts = (attemptsData ?? []) as unknown as AttemptRow[];

  const quizIdsForAttempts = [...new Set(attempts.map((attempt) => attempt.quiz_id))];
  let attemptedQuizRows: Pick<Quiz, "id" | "title" | "course_id">[] = [];
  if (quizIdsForAttempts.length > 0) {
    const { data } = await supabase
      .from("quizzes")
      .select("id, title, course_id")
      .in("id", quizIdsForAttempts);
    attemptedQuizRows = (data ?? []) as unknown as typeof attemptedQuizRows;
  }

  // Courses with progress or assessment activity
  const courseIds = [...new Set([
    ...progress.map((p) => p.course_id),
    ...attemptedQuizRows.map((quiz) => quiz.course_id),
  ])];

  let courses: Pick<Course, "id" | "slug" | "title" | "course_number">[] = [];
  if (courseIds.length > 0) {
    const { data } = await supabase
      .from("courses")
      .select("id, slug, title, course_number")
      .in("id", courseIds)
      .order("course_number");
    courses = (data ?? []) as unknown as typeof courses;
  }

  // Page counts per course
  const pageCounts: Record<string, number> = {};
  for (const cid of courseIds) {
    const { count } = await supabase
      .from("course_pages")
      .select("*", { count: "exact", head: true })
      .eq("course_id", cid);
    pageCounts[cid] = count ?? 0;
  }

  const completedCount = progress.filter((p) => p.completed).length;
  const recentAttempts = attempts.slice(0, 5);
  const completedQuizIds = new Set(attempts.map((attempt) => attempt.quiz_id));
  const scoredAttempts = attempts.filter((attempt) => attempt.score !== null);
  const averageScore =
    scoredAttempts.length > 0
      ? Math.round(
          scoredAttempts.reduce((sum, attempt) => sum + Number(attempt.score ?? 0), 0) /
            scoredAttempts.length
        )
      : null;

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "Student";

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
      <p className="eyebrow mb-4">Dashboard</p>
      <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl lg:text-5xl mb-2">
        Welcome back, {displayName}
      </h1>
      <p className="text-[var(--color-muted)] text-lg mb-16">
        Here&apos;s where you left off.
      </p>

      <div className="layout-grid gap-y-16">
        <div className="col-body">
          {/* Course progress */}
          <section>
            <p className="eyebrow mb-6">Course Progress</p>
            {courses.length === 0 ? (
              <div>
                <p className="text-[var(--color-muted)] mb-4">
                  You haven&apos;t started any courses yet.
                </p>
                <Link href="/courses" className="btn">
                  Browse courses
                </Link>
              </div>
            ) : (
              <div className="space-y-0">
                {courses.map((course) => {
                  const courseProgress = progress.filter(
                    (p) => p.course_id === course.id
                  );
                  const totalPages = pageCounts[course.id] ?? 1;
                  const completedPages = courseProgress.filter((p) => p.completed).length;
                  const pct = Math.round((completedPages / totalPages) * 100);
                  const courseQuizIds = attemptedQuizRows
                    .filter((quiz) => quiz.course_id === course.id)
                    .map((quiz) => quiz.id);
                  const attemptedAssessments = courseQuizIds.length;

                  return (
                    <Link
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      className="group flex items-center gap-6 border-b border-[var(--color-rule)] py-6 hover:bg-[#F5F3EF] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="eyebrow mb-1">{course.course_number}</p>
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-xl group-hover:text-[var(--color-accent)] transition-colors">
                          {course.title}
                        </h3>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-[2px] bg-[var(--color-rule)] max-w-48">
                            <div
                              className="h-full bg-[var(--color-ink)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="eyebrow text-[10px]">
                            {completedPages}/{totalPages} sections
                          </span>
                        </div>
                        {attemptedAssessments > 0 && (
                          <p className="text-xs text-[var(--color-muted)] mt-2">
                            {attemptedAssessments} assessment{attemptedAssessments !== 1 ? "s" : ""} attempted
                          </p>
                        )}
                      </div>
                      <span className="eyebrow text-[var(--color-accent)] group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quiz history */}
          {recentAttempts.length > 0 && (
            <section className="mt-16">
              <hr className="rule mb-8" />
              <p className="eyebrow mb-6">Recent Quiz Attempts</p>
              <div className="space-y-0">
                {recentAttempts.map((attempt, i) => {
                  const quiz = attemptedQuizRows.find((q) => q.id === attempt.quiz_id);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-[var(--color-rule)] py-5"
                    >
                      <div>
                          <p className="font-medium text-sm">
                            {quiz?.title ?? "Quiz"}
                          </p>
                        {attempt.completed_at && (
                          <p className="text-xs text-[var(--color-muted)] mt-0.5">
                            {new Date(attempt.completed_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      {attempt.score !== null && (
                        <div className="text-right">
                          <p className="font-[family-name:var(--font-display)] font-bold text-2xl">
                            {Math.round(attempt.score)}%
                          </p>
                          <p className="text-xs text-[var(--color-muted)]">
                            {attempt.correct_q}/{attempt.total_q} correct
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar stats */}
        <aside className="hidden lg:block col-marginalia">
          <div className="border border-[var(--color-rule)] p-6">
            <p className="eyebrow mb-6">Summary</p>
            <div className="space-y-5">
              <div>
                <p className="font-[family-name:var(--font-display)] font-bold text-3xl">
                  {completedCount}
                </p>
                <p className="eyebrow text-[10px] mt-1">Sections completed</p>
              </div>
              <hr className="rule" />
              <div>
                <p className="font-[family-name:var(--font-display)] font-bold text-3xl">
                  {attempts.length}
                </p>
                <p className="eyebrow text-[10px] mt-1">Quizzes attempted</p>
              </div>
              <hr className="rule" />
              <div>
                <p className="font-[family-name:var(--font-display)] font-bold text-3xl">
                  {completedQuizIds.size}
                </p>
                <p className="eyebrow text-[10px] mt-1">Assessments completed</p>
              </div>
              <hr className="rule" />
              <div>
                <p className="font-[family-name:var(--font-display)] font-bold text-3xl">
                  {averageScore !== null ? `${averageScore}%` : "—"}
                </p>
                <p className="eyebrow text-[10px] mt-1">Average quiz score</p>
              </div>
              <hr className="rule" />
              <div>
                <p className="font-[family-name:var(--font-display)] font-bold text-3xl">
                  {courses.length}
                </p>
                <p className="eyebrow text-[10px] mt-1">Courses started</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/courses" className="btn w-full text-center block">
              Browse all courses
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
