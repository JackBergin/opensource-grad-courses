"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { QuizOption } from "@/types/database";
import {
  buildQuizReviewState,
  getQuestionElementId,
  getQuestionHash,
  isAnswered,
  type Answer,
  type PublicQuizQuestion,
  type QuizQuestionResult,
  type QuizSubmissionResponse,
} from "@/lib/quiz-review";

interface Props {
  questions: PublicQuizQuestion[];
  isAuthenticated: boolean;
  courseSlug: string;
  submitQuizAttemptAction: (input: {
    startedAt: number;
    answers: Record<string, Answer>;
  }) => Promise<QuizSubmissionResponse>;
  previousAttemptCount?: number;
  bestScore?: number | null;
  latestScore?: number | null;
}

export default function QuizRunner({
  questions,
  isAuthenticated,
  courseSlug,
  submitQuizAttemptAction,
  previousAttemptCount = 0,
  bestScore = null,
  latestScore = null,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submission, setSubmission] = useState<Extract<QuizSubmissionResponse, { ok: true }>["result"] | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const submitted = submission !== null;

  const handleAnswer = (questionId: string, value: string, type: string) => {
    if (submitted) return;
    if (type === "multi_select") {
      const current = (answers[questionId] as string[]) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setAnswers((prev) => ({ ...prev, [questionId]: next }));
    } else {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    }
  };

  const scrollToQuestion = (questionId: string) => {
    const el = document.getElementById(getQuestionElementId(questionId));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", getQuestionHash(questionId));
    }
    setActiveQuestionId(questionId);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#question-")) {
        setActiveQuestionId(null);
        return;
      }

      const id = hash.slice("#question-".length);
      if (!id) {
        setActiveQuestionId(null);
        return;
      }

      setActiveQuestionId(id);
      window.requestAnimationFrame(() => {
        const el = document.getElementById(getQuestionElementId(id));
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const handleSubmit = async () => {
    if (isPending) return;
    setSubmitAttempted(true);

    const unansweredGradableQuestions = questions.filter(
      (question) =>
        question.question_type !== "short_answer" && !isAnswered(answers[question.id]),
    );

    if (unansweredGradableQuestions.length > 0) {
      const firstUnanswered = unansweredGradableQuestions[0];
      scrollToQuestion(firstUnanswered.id);
      return;
    }

    setSubmitError(null);
    setSaveStatusMessage(null);

    startTransition(async () => {
      const response = await submitQuizAttemptAction({
        startedAt,
        answers,
      });

      if (!response.ok) {
        setSubmitError(response.message);
        if (response.unansweredQuestionIds?.[0]) {
          scrollToQuestion(response.unansweredQuestionIds[0]);
        }
        return;
      }

      setSubmission(response.result);
      setSaveStatusMessage(
        isAuthenticated
          ? response.saveError ?? "This attempt was saved to your dashboard."
          : "Sign in to save attempts and track progress over time.",
      );
    });
  };

  const reviewState = buildQuizReviewState(questions, answers, submission);
  const {
    answeredCount,
    gradableCount,
    reflectionCount,
    unansweredGradableQuestions,
    incorrectGradableQuestions,
    reflectionQuestions,
    correctCount,
    score,
  } = reviewState;

  return (
    <div>
      <div className="border border-[var(--color-rule)] p-6 mb-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow mb-2">Assessment progress</p>
            <p className="text-sm text-[var(--color-muted)]">
              Answered {answeredCount} of {questions.length} questions
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {gradableCount} auto-graded question{gradableCount !== 1 ? "s" : ""}
              {reflectionCount > 0
                ? ` · ${reflectionCount} self-reflection prompt${reflectionCount !== 1 ? "s" : ""}`
                : ""}
            </p>
            <div className="mt-3 h-[2px] w-64 max-w-full bg-[var(--color-rule)]">
              <div
                className="h-full bg-[var(--color-ink)] transition-all"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {(previousAttemptCount > 0 || bestScore !== null || latestScore !== null) && (
            <div className="text-sm text-[var(--color-muted)]">
              {previousAttemptCount > 0 && <p>{previousAttemptCount} previous attempt{previousAttemptCount !== 1 ? "s" : ""}</p>}
              {bestScore !== null && <p>Best score: {Math.round(bestScore)}%</p>}
              {latestScore !== null && <p>Latest score: {Math.round(latestScore)}%</p>}
            </div>
          )}
        </div>
      </div>

      {!submitted && submitAttempted && unansweredGradableQuestions.length > 0 && (
        <div className="border border-[var(--color-accent)] bg-[#FBF2F0] p-5 mb-10">
          <p className="eyebrow mb-2 text-[var(--color-accent)]">Finish before submitting</p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Answer the remaining {unansweredGradableQuestions.length} auto-graded question
            {unansweredGradableQuestions.length !== 1 ? "s" : ""} before this attempt is scored.
          </p>
        </div>
      )}

      {!submitted && submitError && (
        <div className="border border-[var(--color-accent)] bg-[#FBF2F0] p-5 mb-10">
          <p className="eyebrow mb-2 text-[var(--color-accent)]">Submission blocked</p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">{submitError}</p>
        </div>
      )}

      {/* Score banner (after submission) */}
      {submitted && score !== null && (
        <div className="border border-[var(--color-ink)] p-6 mb-10">
          <p className="eyebrow mb-2">Your score</p>
          <p className="font-[family-name:var(--font-display)] font-bold text-5xl mb-1">
            {score}
            <span className="text-2xl font-medium text-[var(--color-muted)]">%</span>
          </p>
          <p className="text-[var(--color-muted)] text-sm">
            {correctCount} of {gradableCount} correct
          </p>
          <p className="text-[var(--color-muted)] text-sm mt-2">
            {saveStatusMessage}
          </p>

          {(incorrectGradableQuestions.length > 0 || reflectionQuestions.length > 0) && (
            <div className="mt-6 border-t border-[var(--color-rule)] pt-5">
              <p className="eyebrow mb-3">Review next</p>
              {incorrectGradableQuestions.length > 0 ? (
                <div className="mb-4">
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                    Revisit {incorrectGradableQuestions.length} missed auto-graded question
                    {incorrectGradableQuestions.length !== 1 ? "s" : ""}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {incorrectGradableQuestions.map((question) => {
                      const questionIndex = questions.findIndex((q) => q.id === question.id) + 1;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => scrollToQuestion(question.id)}
                          className="border border-[var(--color-rule)] px-3 py-2 text-xs font-semibold tracking-[0.12em] uppercase hover:border-[var(--color-ink)]"
                        >
                          Question {questionIndex}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">
                  You answered every auto-graded question correctly.
                </p>
              )}

              {reflectionQuestions.length > 0 && (
                <div>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                    Compare your response to the expected answer for the reflection prompt
                    {reflectionQuestions.length !== 1 ? "s" : ""}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reflectionQuestions.map((question) => {
                      const questionIndex = questions.findIndex((q) => q.id === question.id) + 1;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => scrollToQuestion(question.id)}
                          className="border border-[var(--color-rule)] px-3 py-2 text-xs font-semibold tracking-[0.12em] uppercase hover:border-[var(--color-ink)]"
                        >
                          Question {questionIndex}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-12">
        {questions.map((q, i) => (
          <QuestionBlock
            key={q.id}
            question={q}
            index={i}
            answer={answers[q.id]}
            onAnswer={handleAnswer}
            submitted={submitted}
            submitAttempted={submitAttempted}
            isActiveReviewTarget={activeQuestionId === q.id}
            questionResult={submission?.questionResults[q.id]}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="mt-12 flex items-center gap-6">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="btn"
          >
            {isPending ? "Submitting…" : "Submit answers"}
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setAnswers({});
                setSubmission(null);
                setSubmitAttempted(false);
                setSubmitError(null);
                setSaveStatusMessage(null);
                setStartedAt(Date.now());
              }}
              className="btn"
            >
              Retake quiz
            </button>
            <Link href={`/courses/${courseSlug}`} className="btn--text">
              Back to course →
            </Link>
          </>
        )}
        {!isAuthenticated && (
          <p className="text-sm text-[var(--color-muted)]">
            <Link href="/auth/sign-in" className="link">
              Sign in
            </Link>{" "}
            to save your score.
          </p>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({
  question,
  index,
  answer,
  onAnswer,
  submitted,
  submitAttempted,
  isActiveReviewTarget,
  questionResult,
}: {
  question: PublicQuizQuestion;
  index: number;
  answer: Answer | undefined;
  onAnswer: (id: string, value: string, type: string) => void;
  submitted: boolean;
  submitAttempted: boolean;
  isActiveReviewTarget: boolean;
  questionResult?: QuizQuestionResult;
}) {
  const hasAnswer = isAnswered(answer);
  const correct = submitted && question.question_type !== "short_answer"
    ? questionResult?.isCorrect ?? false
    : null;
  const showMissingState =
    submitAttempted && !submitted && question.question_type !== "short_answer" && !hasAnswer;

  return (
    <div
      id={getQuestionElementId(question.id)}
      className={`scroll-mt-24 border px-4 py-4 transition-colors ${
        isActiveReviewTarget
          ? "border-[var(--color-accent)] bg-[#FBF2F0]"
          : "border-transparent"
      }`}
    >
      <div className="flex gap-4 mb-4">
        <span className="eyebrow text-[var(--color-accent)] shrink-0 pt-1">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <p className="font-medium text-lg leading-snug">{question.question_text}</p>
          {isActiveReviewTarget && submitted && (
            <p className="eyebrow text-[10px] text-[var(--color-accent)] mt-2">
              Review target
            </p>
          )}
          {showMissingState && (
            <p className="eyebrow text-[10px] text-[var(--color-accent)] mt-2">
              Required before scoring
            </p>
          )}
        </div>
      </div>

      {/* Multiple choice / True-False */}
      {(question.question_type === "multiple_choice" ||
        question.question_type === "true_false") && (
        <div className="pl-10 space-y-2">
          {(question.question_type === "true_false"
            ? [
                { id: "true", text: "True" },
                { id: "false", text: "False" },
              ]
            : ((question.options as QuizOption[]) ?? [])
          ).map((opt) => {
            const selected = answer === opt.id;
            const isThisCorrect =
              submitted &&
              !Array.isArray(questionResult?.correctAnswer) &&
              String(questionResult?.correctAnswer) === opt.id;
            const isThisWrong = submitted && selected && !isThisCorrect;

            return (
              <button
                key={opt.id}
                onClick={() => onAnswer(question.id, opt.id, question.question_type)}
                disabled={submitted}
                className={`w-full text-left flex items-start gap-3 border px-4 py-3 text-sm transition-colors ${
                  isThisCorrect
                    ? "border-[var(--color-ink)] bg-[#F5F3EF]"
                    : isThisWrong
                    ? "border-[var(--color-accent)] bg-red-50"
                    : selected
                    ? "border-[var(--color-ink)]"
                    : "border-[var(--color-rule)] hover:border-[var(--color-muted)]"
                }`}
              >
                <span className="eyebrow text-[10px] mt-0.5 shrink-0 w-14 sm:w-16 tabular-nums">
                  {opt.id.toUpperCase()}
                </span>
                <span className="min-w-0 leading-relaxed">{opt.text}</span>
                {isThisCorrect && <span className="ml-auto text-[var(--color-ink)] shrink-0">✓</span>}
                {isThisWrong && <span className="ml-auto text-[var(--color-accent)] shrink-0">✗</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Multi-select */}
      {question.question_type === "multi_select" && (
        <div className="pl-10 space-y-2">
          <p className="text-xs text-[var(--color-muted)] mb-3">Select all that apply.</p>
          {((question.options as QuizOption[]) ?? []).map((opt) => {
            const selected = Array.isArray(answer) && answer.includes(opt.id);
            const isThisCorrect =
              submitted &&
              Array.isArray(questionResult?.correctAnswer) &&
              questionResult.correctAnswer.includes(opt.id);
            const isThisWrong = submitted && selected && !isThisCorrect;

            return (
              <button
                key={opt.id}
                onClick={() => onAnswer(question.id, opt.id, question.question_type)}
                disabled={submitted}
                className={`w-full text-left flex items-start gap-3 border px-4 py-3 text-sm transition-colors ${
                  isThisCorrect
                    ? "border-[var(--color-ink)] bg-[#F5F3EF]"
                    : isThisWrong
                    ? "border-[var(--color-accent)] bg-red-50"
                    : selected
                    ? "border-[var(--color-ink)]"
                    : "border-[var(--color-rule)] hover:border-[var(--color-muted)]"
                }`}
              >
                <span className="shrink-0 w-4 h-4 mt-0.5 border border-current flex items-center justify-center text-[10px]">
                  {selected ? "✓" : ""}
                </span>
                <span>{opt.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Short answer */}
      {question.question_type === "short_answer" && (
        <div className="pl-10">
          <textarea
            disabled={submitted}
            value={(answer as string) ?? ""}
            onChange={(e) => onAnswer(question.id, e.target.value, question.question_type)}
            placeholder="Type your answer…"
            rows={4}
            className="w-full border border-[var(--color-rule)] p-3 text-sm font-[family-name:var(--font-body)] resize-y focus:outline-none focus:border-[var(--color-ink)] bg-[var(--color-bg)]"
          />
          {submitted && (
            <div className="mt-3 border-l-2 border-[var(--color-rule)] pl-4">
              <p className="eyebrow mb-1">Expected answer</p>
              <p className="text-sm text-[var(--color-muted)]">
                {String(questionResult?.correctAnswer ?? "")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Explanation */}
      {submitted && question.explanation && (
        <div className="pl-10 mt-4">
          <div className="border-l-2 border-[var(--color-accent)] pl-4">
            <p className="eyebrow mb-1">Explanation</p>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              {question.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Correct indicator */}
      {submitted && correct !== null && (
        <p
          className={`pl-10 mt-3 eyebrow text-[10px] ${
            correct ? "text-[var(--color-ink)]" : "text-[var(--color-accent)]"
          }`}
        >
          {correct ? "✓ Correct" : "✗ Incorrect"}
        </p>
      )}
    </div>
  );
}
