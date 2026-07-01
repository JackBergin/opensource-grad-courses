import type { QuizQuestion } from "@/types/database";

export type Answer = string | string[];

export interface QuizReviewState {
  answeredCount: number;
  gradableCount: number;
  reflectionCount: number;
  unansweredGradableQuestions: QuizQuestion[];
  incorrectGradableQuestions: QuizQuestion[];
  reflectionQuestions: QuizQuestion[];
  correctCount: number;
  score: number | null;
}

export function getQuestionElementId(questionId: string): string {
  return `question-${questionId}`;
}

export function getQuestionHash(questionId: string): string {
  return `#${getQuestionElementId(questionId)}`;
}

export function isAnswered(answer: Answer | undefined): boolean {
  if (Array.isArray(answer)) return answer.length > 0;
  return String(answer ?? "").trim().length > 0;
}

export function isCorrect(question: QuizQuestion, answer: Answer): boolean {
  const correct = question.correct_answer;
  if (question.question_type === "multi_select") {
    const ca = Array.isArray(correct) ? [...correct].sort() : [];
    const ua = Array.isArray(answer) ? [...answer].sort() : [];
    return JSON.stringify(ca) === JSON.stringify(ua);
  }
  return String(correct) === String(answer);
}

export function buildQuizReviewState(
  questions: QuizQuestion[],
  answers: Record<string, Answer>,
  submitted: boolean,
): QuizReviewState {
  const gradableQuestions = questions.filter((q) => q.question_type !== "short_answer");
  const reflectionQuestions = questions.filter((q) => q.question_type === "short_answer");
  const unansweredGradableQuestions = gradableQuestions.filter(
    (q) => !isAnswered(answers[q.id]),
  );
  const incorrectGradableQuestions = submitted
    ? gradableQuestions.filter((q) => !isCorrect(q, answers[q.id] ?? ""))
    : [];
  const correctCount = submitted
    ? gradableQuestions.filter((q) => isCorrect(q, answers[q.id] ?? "")).length
    : 0;
  const score =
    submitted && gradableQuestions.length > 0
      ? Math.round((correctCount / gradableQuestions.length) * 100)
      : null;

  return {
    answeredCount: questions.filter((q) => isAnswered(answers[q.id])).length,
    gradableCount: gradableQuestions.length,
    reflectionCount: reflectionQuestions.length,
    unansweredGradableQuestions,
    incorrectGradableQuestions,
    reflectionQuestions: submitted ? reflectionQuestions : [],
    correctCount,
    score,
  };
}
