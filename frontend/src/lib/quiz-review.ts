import type { QuestionType, QuizQuestion } from "@/types/database";

export type Answer = string | string[];
export type AnswerRecord = Record<string, Answer>;

export type PublicQuizQuestion = Omit<QuizQuestion, "correct_answer">;

export interface QuizQuestionResult {
  isCorrect: boolean | null;
  correctAnswer: string | string[];
}

export interface QuizGradingResult {
  answeredCount: number;
  gradableCount: number;
  reflectionCount: number;
  unansweredGradableQuestionIds: string[];
  incorrectGradableQuestionIds: string[];
  reflectionQuestionIds: string[];
  correctCount: number;
  score: number | null;
  questionResults: Record<string, QuizQuestionResult>;
}

export interface QuizSubmissionSuccess {
  ok: true;
  result: QuizGradingResult;
  savedAttempt: boolean;
  saveError: string | null;
}

export interface QuizSubmissionFailure {
  ok: false;
  code: "invalid" | "unanswered" | "unavailable";
  message: string;
  unansweredQuestionIds?: string[];
}

export type QuizSubmissionResponse =
  | QuizSubmissionSuccess
  | QuizSubmissionFailure;

export interface QuizReviewState<TQuestion> {
  answeredCount: number;
  gradableCount: number;
  reflectionCount: number;
  unansweredGradableQuestions: TQuestion[];
  incorrectGradableQuestions: TQuestion[];
  reflectionQuestions: TQuestion[];
  correctCount: number;
  score: number | null;
}

type MinimalQuizQuestion = {
  id: string;
  question_type: QuestionType;
};

function getValidOptionIds(question: Pick<QuizQuestion, "question_type" | "options">) {
  if (question.question_type === "true_false") {
    return new Set(["true", "false"]);
  }

  return new Set((question.options ?? []).map((option) => option.id));
}

export function toPublicQuizQuestion(question: QuizQuestion): PublicQuizQuestion {
  const { correct_answer, ...publicQuestion } = question;
  void correct_answer;
  return publicQuestion;
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

export function isCorrect(
  question: Pick<QuizQuestion, "question_type" | "correct_answer">,
  answer: Answer,
): boolean {
  const correct = question.correct_answer;
  if (question.question_type === "multi_select") {
    const expectedAnswers = Array.isArray(correct) ? [...correct].sort() : [];
    const submittedAnswers = Array.isArray(answer) ? [...answer].sort() : [];
    return JSON.stringify(expectedAnswers) === JSON.stringify(submittedAnswers);
  }

  return String(correct) === String(answer);
}

export function normalizeAnswer(
  question: Pick<QuizQuestion, "question_type" | "options">,
  rawAnswer: unknown,
): Answer | undefined {
  if (question.question_type === "multi_select") {
    if (!Array.isArray(rawAnswer)) return undefined;

    const validOptionIds = getValidOptionIds(question);
    const filtered = rawAnswer
      .filter((value): value is string => typeof value === "string")
      .filter((value) => validOptionIds.has(value));

    return filtered.length > 0 ? [...new Set(filtered)] : undefined;
  }

  if (typeof rawAnswer !== "string") return undefined;

  const normalized = rawAnswer.trim();
  if (!normalized) return undefined;

  if (question.question_type === "short_answer") {
    return normalized;
  }

  return getValidOptionIds(question).has(normalized) ? normalized : undefined;
}

export function prepareAnswers(
  questions: Pick<QuizQuestion, "id" | "question_type" | "options">[],
  rawAnswers: Record<string, unknown>,
): AnswerRecord {
  const preparedAnswers: AnswerRecord = {};

  for (const question of questions) {
    const normalizedAnswer = normalizeAnswer(question, rawAnswers[question.id]);
    if (normalizedAnswer !== undefined) {
      preparedAnswers[question.id] = normalizedAnswer;
    }
  }

  return preparedAnswers;
}

export function gradeQuizSubmission(
  questions: QuizQuestion[],
  answers: AnswerRecord,
): QuizGradingResult {
  const gradableQuestions = questions.filter(
    (question) => question.question_type !== "short_answer",
  );
  const reflectionQuestions = questions.filter(
    (question) => question.question_type === "short_answer",
  );
  const unansweredGradableQuestionIds = gradableQuestions
    .filter((question) => !isAnswered(answers[question.id]))
    .map((question) => question.id);
  const incorrectGradableQuestionIds = gradableQuestions
    .filter((question) => isAnswered(answers[question.id]) && !isCorrect(question, answers[question.id]!))
    .map((question) => question.id);
  const correctCount = gradableQuestions.filter((question) =>
    isAnswered(answers[question.id]) && isCorrect(question, answers[question.id]!),
  ).length;
  const score =
    gradableQuestions.length > 0
      ? Math.round((correctCount / gradableQuestions.length) * 100)
      : null;

  const questionResults = Object.fromEntries(
    questions.map((question) => [
      question.id,
      {
        isCorrect:
          question.question_type === "short_answer"
            ? null
            : isAnswered(answers[question.id])
              ? isCorrect(question, answers[question.id]!)
              : false,
        correctAnswer: question.correct_answer,
      },
    ]),
  ) as Record<string, QuizQuestionResult>;

  return {
    answeredCount: questions.filter((question) => isAnswered(answers[question.id])).length,
    gradableCount: gradableQuestions.length,
    reflectionCount: reflectionQuestions.length,
    unansweredGradableQuestionIds,
    incorrectGradableQuestionIds,
    reflectionQuestionIds: reflectionQuestions.map((question) => question.id),
    correctCount,
    score,
    questionResults,
  };
}

export function buildQuizReviewState<TQuestion extends MinimalQuizQuestion>(
  questions: TQuestion[],
  answers: Record<string, Answer>,
  submission: QuizGradingResult | null,
): QuizReviewState<TQuestion> {
  const gradableQuestions = questions.filter(
    (question) => question.question_type !== "short_answer",
  );
  const reflectionQuestions = questions.filter(
    (question) => question.question_type === "short_answer",
  );
  const unansweredGradableQuestions = gradableQuestions.filter(
    (question) => !isAnswered(answers[question.id]),
  );
  const incorrectQuestionIds = new Set(
    submission?.incorrectGradableQuestionIds ?? [],
  );

  return {
    answeredCount: questions.filter((question) => isAnswered(answers[question.id])).length,
    gradableCount: gradableQuestions.length,
    reflectionCount: reflectionQuestions.length,
    unansweredGradableQuestions,
    incorrectGradableQuestions: submission
      ? gradableQuestions.filter((question) => incorrectQuestionIds.has(question.id))
      : [],
    reflectionQuestions: submission ? reflectionQuestions : [],
    correctCount: submission?.correctCount ?? 0,
    score: submission?.score ?? null,
  };
}
