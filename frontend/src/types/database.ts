/**
 * Supabase database types — hand-authored to match the migration schema.
 * Regenerate with: supabase gen types typescript --local > src/types/database.ts
 */

export type CourseLevel = "Graduate" | "Undergraduate";

export type PageType =
  | "syllabus"
  | "calendar"
  | "readings"
  | "assignments"
  | "exams"
  | "lecture_notes"
  | "problem_sets"
  | "recitations"
  | "projects"
  | "tools"
  | "case_preparation"
  | "simulation"
  | "instructor_insights"
  | "other";

export type ResourceType = "Document" | "Image" | "Video" | "Other";

export type QuizKind = "practice_quiz" | "homework";

export type QuestionType =
  | "multiple_choice"
  | "multi_select"
  | "true_false"
  | "short_answer";

export type Difficulty = "easy" | "medium" | "hard";

export interface Instructor {
  first_name: string;
  last_name: string;
  title: string;
  uid: string;
}

// ─── Row types ────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  slug: string;
  course_number: string;
  title: string;
  description: string | null;
  description_html: string | null;
  term: string | null;
  year: string | null;
  level: CourseLevel;
  instructors: Instructor[];
  topics: string[][];
  learning_resource_types: string[] | null;
  site_uid: string | null;
  ocw_url: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoursePage {
  id: string;
  course_id: string;
  uid: string | null;
  slug: string;
  title: string;
  page_type: PageType;
  description: string | null;
  content_html: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  course_id: string;
  course_page_id: string | null;
  uid: string | null;
  slug: string;
  title: string;
  description: string | null;
  content_html: string | null;
  resource_type: ResourceType;
  file_type: string | null;
  file_size: number | null;
  ocw_file_path: string | null;
  storage_path: string | null;
  learning_resource_types: string[] | null;
  parent_title: string | null;
  license: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  course_page_id: string | null;
  title: string;
  description: string | null;
  kind: QuizKind;
  difficulty: Difficulty;
  time_limit_minutes: number | null;
  is_published: boolean;
  generated_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  sort_order: number;
  question_type: QuestionType;
  question_text: string;
  options: QuizOption[] | null;
  correct_answer: string | string[];
  explanation: string | null;
  difficulty: Difficulty;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  course_id: string;
  course_page_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number | null;
  total_q: number | null;
  correct_q: number | null;
  started_at: string;
  completed_at: string | null;
  time_taken_s: number | null;
}

export interface QuizResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  user_answer: string | string[] | null;
  is_correct: boolean | null;
  answered_at: string;
}

// ─── Supabase Database shape ───────────────────────────────────────────────
// Must include Views, Functions, Enums, CompositeTypes for supabase-js v2
// generic constraints to resolve table types correctly.

export type Database = {
  public: {
    Tables: {
      courses: {
        Row: Course;
        Insert: Omit<Course, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Course, "id">>;
        Relationships: [];
      };
      course_pages: {
        Row: CoursePage;
        Insert: Omit<CoursePage, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CoursePage, "id">>;
        Relationships: [];
      };
      resources: {
        Row: Resource;
        Insert: Omit<Resource, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Resource, "id">>;
        Relationships: [];
      };
      quizzes: {
        Row: Quiz;
        Insert: Omit<Quiz, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Quiz, "id">>;
        Relationships: [];
      };
      quiz_questions: {
        Row: QuizQuestion;
        Insert: Omit<QuizQuestion, "id" | "created_at">;
        Update: Partial<Omit<QuizQuestion, "id">>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
      enrollments: {
        Row: Enrollment;
        Insert: Omit<Enrollment, "id" | "enrolled_at">;
        Update: Partial<Omit<Enrollment, "id">>;
        Relationships: [];
      };
      progress: {
        Row: Progress;
        Insert: Omit<Progress, "id" | "updated_at">;
        Update: Partial<Omit<Progress, "id">>;
        Relationships: [];
      };
      quiz_attempts: {
        Row: QuizAttempt;
        Insert: Omit<QuizAttempt, "id" | "started_at">;
        Update: Partial<Omit<QuizAttempt, "id">>;
        Relationships: [];
      };
      quiz_responses: {
        Row: QuizResponse;
        Insert: Omit<QuizResponse, "id" | "answered_at">;
        Update: Partial<Omit<QuizResponse, "id">>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      course_level: CourseLevel;
      page_type: PageType;
      resource_type: ResourceType;
      quiz_kind: QuizKind;
      question_type: QuestionType;
      difficulty: Difficulty;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
