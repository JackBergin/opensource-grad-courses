import test from "node:test";
import assert from "node:assert/strict";
import type { QuizQuestion } from "@/types/database";
import {
  buildQuizReviewState,
  getQuestionElementId,
  getQuestionHash,
  isAnswered,
  isCorrect,
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
    points: 1,
    sort_order: 1,
    created_at: null,
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
    points: 1,
    sort_order: 2,
    created_at: null,
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
    points: 1,
    sort_order: 3,
    created_at: null,
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

test("buildQuizReviewState computes progress and review lists", () => {
  const state = buildQuizReviewState(
    questions,
    {
      q1: "b",
      q2: ["a"],
      q3: "My reflection",
    },
    true,
  );

  assert.equal(state.answeredCount, 3);
  assert.equal(state.gradableCount, 2);
  assert.equal(state.reflectionCount, 1);
  assert.equal(state.correctCount, 1);
  assert.equal(state.score, 50);
  assert.deepEqual(state.unansweredGradableQuestions.map((q) => q.id), []);
  assert.deepEqual(state.incorrectGradableQuestions.map((q) => q.id), ["q2"]);
  assert.deepEqual(state.reflectionQuestions.map((q) => q.id), ["q3"]);
});

test("buildQuizReviewState does not expose incorrect lists before submit", () => {
  const state = buildQuizReviewState(
    questions,
    {
      q1: "b",
    },
    false,
  );

  assert.equal(state.score, null);
  assert.equal(state.correctCount, 0);
  assert.deepEqual(state.unansweredGradableQuestions.map((q) => q.id), ["q2"]);
  assert.deepEqual(state.incorrectGradableQuestions, []);
  assert.deepEqual(state.reflectionQuestions, []);
});

test("question anchors stay stable", () => {
  assert.equal(getQuestionElementId("abc"), "question-abc");
  assert.equal(getQuestionHash("abc"), "#question-abc");
});
