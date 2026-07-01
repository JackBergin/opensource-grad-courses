import test from "node:test";
import assert from "node:assert/strict";
import type { QuizQuestion } from "@/types/database";
import {
  buildQuizReviewState,
  gradeQuizSubmission,
  getQuestionElementId,
  getQuestionHash,
  isAnswered,
  isCorrect,
  prepareAnswers,
  toPublicQuizQuestion,
} from "./quiz-review.ts";

const questions: QuizQuestion[] = [
  {
    id: "q1",
    quiz_id: "quiz-1",
    question_text: "Select the best answer",
    question_type: "multiple_choice",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    correct_answer: "b",
    explanation: null,
    difficulty: "medium",
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "q2",
    quiz_id: "quiz-1",
    question_text: "Pick all true statements",
    question_type: "multi_select",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
    ],
    correct_answer: ["a", "c"],
    explanation: null,
    difficulty: "medium",
    sort_order: 2,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "q3",
    quiz_id: "quiz-1",
    question_text: "Reflect on the concept",
    question_type: "short_answer",
    options: null,
    correct_answer: "A thoughtful response",
    explanation: null,
    difficulty: "medium",
    sort_order: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
];

test("isAnswered handles strings and arrays", () => {
  assert.equal(isAnswered(undefined), false);
  assert.equal(isAnswered(""), false);
  assert.equal(isAnswered("  "), false);
  assert.equal(isAnswered("value"), true);
  assert.equal(isAnswered([]), false);
  assert.equal(isAnswered(["a"]), true);
});

test("isCorrect handles multi-select answers independent of order", () => {
  assert.equal(isCorrect(questions[0], "b"), true);
  assert.equal(isCorrect(questions[0], "a"), false);
  assert.equal(isCorrect(questions[1], ["c", "a"]), true);
  assert.equal(isCorrect(questions[1], ["a"]), false);
});

test("prepareAnswers filters invalid option ids and trims strings", () => {
  const prepared = prepareAnswers(questions, {
    q1: "b",
    q2: ["a", "nope", "c", "a"],
    q3: "  My reflection  ",
  });

  assert.deepEqual(prepared, {
    q1: "b",
    q2: ["a", "c"],
    q3: "My reflection",
  });
});

test("gradeQuizSubmission computes score and review ids", () => {
  const result = gradeQuizSubmission(questions, {
    q1: "b",
    q2: ["a"],
    q3: "My reflection",
  });

  assert.equal(result.answeredCount, 3);
  assert.equal(result.gradableCount, 2);
  assert.equal(result.reflectionCount, 1);
  assert.equal(result.correctCount, 1);
  assert.equal(result.score, 50);
  assert.deepEqual(result.unansweredGradableQuestionIds, []);
  assert.deepEqual(result.incorrectGradableQuestionIds, ["q2"]);
  assert.deepEqual(result.reflectionQuestionIds, ["q3"]);
});

test("buildQuizReviewState uses submission results without exposing answers pre-submit", () => {
  const publicQuestions = questions.map(toPublicQuizQuestion);
  const submission = gradeQuizSubmission(questions, {
    q1: "b",
    q2: ["a"],
    q3: "My reflection",
  });

  const state = buildQuizReviewState(
    publicQuestions,
    {
      q1: "b",
      q2: ["a"],
      q3: "My reflection",
    },
    submission,
  );

  assert.equal(state.score, 50);
  assert.equal(state.correctCount, 1);
  assert.deepEqual(state.unansweredGradableQuestions.map((question) => question.id), []);
  assert.deepEqual(state.incorrectGradableQuestions.map((question) => question.id), ["q2"]);
  assert.deepEqual(state.reflectionQuestions.map((question) => question.id), ["q3"]);
});

test("buildQuizReviewState does not expose incorrect lists before submit", () => {
  const publicQuestions = questions.map(toPublicQuizQuestion);
  const state = buildQuizReviewState(
    publicQuestions,
    {
      q1: "b",
    },
    null,
  );

  assert.equal(state.score, null);
  assert.equal(state.correctCount, 0);
  assert.deepEqual(state.unansweredGradableQuestions.map((question) => question.id), ["q2"]);
  assert.deepEqual(state.incorrectGradableQuestions, []);
  assert.deepEqual(state.reflectionQuestions, []);
});

test("question anchors stay stable", () => {
  assert.equal(getQuestionElementId("abc"), "question-abc");
  assert.equal(getQuestionHash("abc"), "#question-abc");
});
