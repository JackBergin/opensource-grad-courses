import fs from "fs";
import path from "path";
import { ASSESSMENT_CONTEXT_DIR } from "./config.js";

export type AssessmentKind = "practice_quiz" | "homework";
export type AssessmentDifficulty = "easy" | "medium" | "hard";
export type AssessmentQuestionType =
  | "multiple_choice"
  | "multi_select"
  | "true_false"
  | "short_answer";

export interface LocalAssessmentOption {
  id: string;
  text: string;
}

export interface LocalAssessmentQuestion {
  question_type: AssessmentQuestionType;
  question_text: string;
  options?: LocalAssessmentOption[] | null;
  correct_answer: string | string[];
  explanation?: string | null;
  difficulty?: AssessmentDifficulty;
}

export interface LocalAssessment {
  title: string;
  description?: string | null;
  kind: AssessmentKind;
  difficulty?: AssessmentDifficulty;
  generated_from?: string | null;
  time_limit_minutes?: number | null;
  is_published?: boolean;
  questions: LocalAssessmentQuestion[];
}

export interface LocalAssessmentFile {
  course_slug: string;
  course_title?: string;
  assessments: LocalAssessment[];
}

export function normalizeCourseSlug(slug: string): string {
  return slug.trim().replace(/\./g, "-").toLowerCase();
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function validateQuestion(
  question: LocalAssessmentQuestion,
  filePath: string,
  assessmentTitle: string,
  index: number
) {
  const ref = `${path.basename(filePath)} :: ${assessmentTitle} :: question ${index + 1}`;
  assert(question.question_text?.trim(), `${ref} is missing question_text`);
  assert(
    ["multiple_choice", "multi_select", "true_false", "short_answer"].includes(
      question.question_type
    ),
    `${ref} has invalid question_type`
  );

  if (question.question_type === "multiple_choice" || question.question_type === "multi_select") {
    assert(Array.isArray(question.options) && question.options.length >= 2, `${ref} must define options`);
    const optionIds = new Set(question.options.map((option) => option.id));
    assert(optionIds.size === question.options.length, `${ref} contains duplicate option ids`);

    if (question.question_type === "multiple_choice") {
      assert(typeof question.correct_answer === "string", `${ref} must have a string correct_answer`);
      assert(optionIds.has(question.correct_answer), `${ref} correct_answer must match an option id`);
    } else {
      assert(Array.isArray(question.correct_answer), `${ref} must have an array correct_answer`);
      assert(question.correct_answer.length > 0, `${ref} must include at least one correct option`);
      for (const optionId of question.correct_answer) {
        assert(optionIds.has(optionId), `${ref} correct_answer includes unknown option id "${optionId}"`);
      }
    }
    return;
  }

  assert(!question.options || question.options.length === 0, `${ref} should not define options`);

  if (question.question_type === "true_false") {
    assert(
      question.correct_answer === "true" || question.correct_answer === "false",
      `${ref} must use "true" or "false" as correct_answer`
    );
    return;
  }

  assert(typeof question.correct_answer === "string", `${ref} must have a string correct_answer`);
}

function validateAssessment(assessment: LocalAssessment, filePath: string) {
  const ref = `${path.basename(filePath)} :: ${assessment.title}`;
  assert(assessment.title?.trim(), `${ref} is missing title`);
  assert(["practice_quiz", "homework"].includes(assessment.kind), `${ref} has invalid kind`);
  assert(Array.isArray(assessment.questions) && assessment.questions.length > 0, `${ref} must include questions`);

  if (assessment.difficulty) {
    assert(["easy", "medium", "hard"].includes(assessment.difficulty), `${ref} has invalid difficulty`);
  }

  if (assessment.time_limit_minutes != null) {
    assert(
      Number.isInteger(assessment.time_limit_minutes) && assessment.time_limit_minutes > 0,
      `${ref} time_limit_minutes must be a positive integer`
    );
  }

  assessment.questions.forEach((question, index) =>
    validateQuestion(question, filePath, assessment.title, index)
  );
}

function validateFile(data: LocalAssessmentFile, filePath: string) {
  assert(data.course_slug?.trim(), `${path.basename(filePath)} is missing course_slug`);
  assert(Array.isArray(data.assessments), `${path.basename(filePath)} must include an assessments array`);
  data.assessments.forEach((assessment) => validateAssessment(assessment, filePath));
}

export function getAssessmentFiles(): string[] {
  if (!fs.existsSync(ASSESSMENT_CONTEXT_DIR)) {
    console.error(`❌  Assessment context directory not found: ${ASSESSMENT_CONTEXT_DIR}`);
    process.exit(1);
  }

  return fs
    .readdirSync(ASSESSMENT_CONTEXT_DIR)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => path.join(ASSESSMENT_CONTEXT_DIR, entry));
}

export function parseLocalAssessments(): LocalAssessmentFile[] {
  const files = getAssessmentFiles();
  const parsed = files.map((filePath) => {
    const data = readJson<LocalAssessmentFile>(filePath);
    data.course_slug = normalizeCourseSlug(data.course_slug);
    validateFile(data, filePath);
    return data;
  });

  console.log(`✅  Parsed ${parsed.length} local assessment files`);
  return parsed;
}

if (process.argv[1] && process.argv[1].endsWith("local-assessments.ts")) {
  const files = parseLocalAssessments();
  console.log(JSON.stringify(files, null, 2));
}
