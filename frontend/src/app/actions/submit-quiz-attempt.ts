"use server";

import { createClient } from "@/lib/supabase/server";
import {
  gradeQuizSubmission,
  prepareAnswers,
  type Answer,
  type QuizSubmissionResponse,
} from "@/lib/quiz-review";
import type { QuizQuestion } from "@/types/database";

interface SubmitQuizAttemptInput {
  startedAt: number;
  answers: Record<string, Answer>;
}

export async function submitQuizAttempt(
  quizId: string,
  input: SubmitQuizAttemptInput,
): Promise<QuizSubmissionResponse> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      code: "unavailable",
      message: "Quiz submission is unavailable until Supabase is configured.",
    };
  }

  const { data: quizRow, error: quizError } = await supabase
    .from("quizzes")
    .select("id")
    .eq("id", quizId)
    .eq("is_published", true)
    .single();

  if (quizError || !quizRow) {
    return {
      ok: false,
      code: "invalid",
      message: "We couldn't verify this assessment. Refresh the page and try again.",
    };
  }

  const { data: questionsData, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("sort_order");

  if (questionsError || !questionsData || questionsData.length === 0) {
    return {
      ok: false,
      code: "invalid",
      message: "This assessment is missing its questions right now. Please try again later.",
    };
  }

  const questions = questionsData as unknown as QuizQuestion[];
  const preparedAnswers = prepareAnswers(
    questions,
    input.answers as Record<string, unknown>,
  );
  const result = gradeQuizSubmission(questions, preparedAnswers);

  if (result.unansweredGradableQuestionIds.length > 0) {
    return {
      ok: false,
      code: "unanswered",
      message: "Answer every auto-graded question before submitting this attempt.",
      unansweredQuestionIds: result.unansweredGradableQuestionIds,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: true,
      result,
      savedAttempt: false,
      saveError: null,
    };
  }

  const startedAt = Number.isFinite(input.startedAt)
    ? new Date(input.startedAt)
    : new Date();
  const safeStartedAt = Number.isNaN(startedAt.getTime()) ? new Date() : startedAt;
  const timeTakenSeconds = Math.max(
    1,
    Math.round((Date.now() - safeStartedAt.getTime()) / 1000),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: attempt, error: attemptError } = await (supabase.from("quiz_attempts") as any)
    .insert({
      user_id: user.id,
      quiz_id: quizId,
      score: result.score,
      total_q: result.gradableCount,
      correct_q: result.correctCount,
      started_at: safeStartedAt.toISOString(),
      completed_at: new Date().toISOString(),
      time_taken_s: timeTakenSeconds,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return {
      ok: true,
      result,
      savedAttempt: false,
      saveError:
        "We couldn't save this attempt right now. Your score is shown below, but it wasn't added to your dashboard.",
    };
  }

  const attemptId = (attempt as { id: string }).id;
  const responseRows = questions.map((question) => ({
    attempt_id: attemptId,
    question_id: question.id,
    user_answer: preparedAnswers[question.id] ?? null,
    is_correct:
      question.question_type === "short_answer"
        ? null
        : result.questionResults[question.id]?.isCorrect ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: responseError } = await (supabase.from("quiz_responses") as any).insert(responseRows);

  if (responseError) {
    // Best-effort cleanup so partially saved attempts don't survive a response insert failure.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("quiz_attempts") as any).delete().eq("id", attemptId);

    return {
      ok: true,
      result,
      savedAttempt: false,
      saveError:
        "We couldn't save this attempt right now. Your score is shown below, but it wasn't added to your dashboard.",
    };
  }

  return {
    ok: true,
    result,
    savedAttempt: true,
    saveError: null,
  };
}
