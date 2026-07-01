import { notFound } from "next/navigation";
import Link from "next/link";
import { submitQuizAttempt } from "@/app/actions/submit-quiz-attempt";
import { createClient } from "@/lib/supabase/server";
import { toPublicQuizQuestion } from "@/lib/quiz-review";
import type { Quiz, QuizQuestion } from "@/types/database";
import QuizRunner from "@/components/QuizRunner";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string; quizId: string }>;
}) {
  const { slug, quizId } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return <UnavailableQuizView />;
  }

  // Verify course exists
  const { data: courseData } = await supabase
    .from("courses")
    .select("id, title, course_number")
    .eq("slug", slug)
    .single();

  if (!courseData) notFound();
  const course = courseData as unknown as { id: string; title: string; course_number: string };

  const { data: quizData } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("course_id", course.id)
    .eq("is_published", true)
    .single();

  if (!quizData) notFound();
  const quiz = quizData as unknown as Quiz;

  const { data: questionsData } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("sort_order");

  if (!questionsData || questionsData.length === 0) notFound();
  const questions = questionsData as unknown as QuizQuestion[];
  const publicQuestions = questions.map(toPublicQuizQuestion);

  const { data: { user } } = await supabase.auth.getUser();
  let previousAttemptCount = 0;
  let bestScore: number | null = null;
  let latestScore: number | null = null;

  if (user) {
    const { data: attemptsData } = await supabase
      .from("quiz_attempts")
      .select("score, completed_at")
      .eq("user_id", user.id)
      .eq("quiz_id", quiz.id)
      .order("completed_at", { ascending: false });

    const attempts = (attemptsData ?? []) as { score: number | null; completed_at: string | null }[];
    previousAttemptCount = attempts.length;
    latestScore = attempts[0]?.score ?? null;
    bestScore = attempts.reduce<number | null>((best, attempt) => {
      if (attempt.score === null) return best;
      if (best === null) return Number(attempt.score);
      return Math.max(best, Number(attempt.score));
    }, null);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16">
      {/* Breadcrumb */}
      <nav className="eyebrow mb-8 flex items-center gap-2">
        <Link href="/courses" className="hover:text-[var(--color-accent)] transition-colors">
          Courses
        </Link>
        <span className="text-[var(--color-rule)]">/</span>
        <Link
          href={`/courses/${slug}`}
          className="hover:text-[var(--color-accent)] transition-colors"
        >
          {course.course_number}
        </Link>
        <span className="text-[var(--color-rule)]">/</span>
        <span className="text-[var(--color-muted)]">
          {quiz.kind === "practice_quiz" ? "Practice Quiz" : "Homework"}
        </span>
      </nav>

      <p className="eyebrow mb-4">
        {quiz.kind === "practice_quiz" ? "Practice Quiz" : "Homework"} · {quiz.difficulty}
      </p>
      <h1 className="font-[family-name:var(--font-display)] font-bold text-3xl lg:text-4xl leading-tight mb-4">
        {quiz.title}
      </h1>
      {quiz.description && (
        <p className="text-[var(--color-muted)] text-lg mb-8">{quiz.description}</p>
      )}
      <div className="flex flex-wrap gap-4 text-sm text-[var(--color-muted)] mb-8">
        {quiz.time_limit_minutes && <p>Suggested time: {quiz.time_limit_minutes} min</p>}
        {previousAttemptCount > 0 && <p>Previous attempts: {previousAttemptCount}</p>}
        {bestScore !== null && <p>Best score: {Math.round(bestScore)}%</p>}
      </div>

      <hr className="rule mb-10" />

      <QuizRunner
        questions={publicQuestions}
        isAuthenticated={Boolean(user)}
        courseSlug={slug}
        submitQuizAttemptAction={submitQuizAttempt.bind(null, quiz.id)}
        previousAttemptCount={previousAttemptCount}
        bestScore={bestScore}
        latestScore={latestScore}
      />
    </div>
  );
}

function UnavailableQuizView() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16">
      <p className="eyebrow mb-4">Assessment unavailable</p>
      <h1 className="font-[family-name:var(--font-display)] font-bold text-3xl lg:text-4xl mb-6">
        Configure Supabase to load quizzes.
      </h1>
      <p className="text-[var(--color-muted)] text-lg max-w-xl">
        Quiz questions and attempt history are fetched from Supabase, so this page is
        disabled until local env keys are available.
      </p>
      <Link href="/courses" className="btn mt-8 inline-block">
        Browse courses
      </Link>
    </div>
  );
}
