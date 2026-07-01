import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Course } from "@/types/database";

const COURSE_DESCRIPTIONS: Record<string, string> = {
  "15.280": "Master the written and oral communication skills essential for business leadership.",
  "15.060": "Probability, statistics, and optimization models for data-driven decisions.",
  "15.010": "Microeconomic analysis and competitive strategy for business contexts.",
  "15.401": "Valuation, risk, and the fundamental principles of modern finance.",
  "15.515": "How firms account for their activities and how to read financial statements.",
  "15.761": "Design and improvement of operating systems in manufacturing and services.",
  "15.810": "Marketing strategy grounded in consumer behavior and analytical frameworks.",
  "15.311": "Organizational design, culture, politics, and leading change.",
};

export default async function HomePage() {
  const { isConfigured } = getSupabaseEnv();
  type HomeCourse = Pick<
    Course,
    "id" | "slug" | "course_number" | "title" | "term" | "year" | "instructors" | "topics"
  >;
  let courses: HomeCourse[] | null = null;

  if (isConfigured) {
    const supabase = await createClient();
    const { data } = await supabase!
      .from("courses")
      .select("id, slug, course_number, title, term, year, instructors, topics")
      .order("course_number");
    courses = (data ?? []) as HomeCourse[];
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-rule)] py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <p className="eyebrow mb-6">MIT Sloan School of Management</p>
          <h1 className="headline max-w-3xl mb-8">
            First-semester MBA.<br />
            <span className="text-[var(--color-accent)]">Free for everyone.</span>
          </h1>
          <p className="lede max-w-xl mb-12 text-[var(--color-muted)]">
            Eight courses from MIT&apos;s first-semester MBA curriculum — with readings,
            lecture notes, practice quizzes, and homework — open to anyone who wants
            to learn.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/courses" className="btn">
              Browse courses
            </Link>
            <Link href="/auth/sign-up" className="btn--text">
              Create free account →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Course grid ──────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-baseline justify-between mb-12">
            <p className="eyebrow">Curriculum</p>
            <p className="text-sm text-[var(--color-muted)]">
              {courses?.length ?? 8} courses
            </p>
          </div>

          <hr className="rule mb-0" />

          {courses && courses.length > 0 ? (
            <div>
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group block border-b border-[var(--color-rule)] py-8 hover:bg-[#F5F3EF] transition-colors"
                >
                  <div className="layout-grid">
                    <div className="col-body">
                      <p className="eyebrow mb-2">
                        {course.course_number} &nbsp;·&nbsp;{" "}
                        {[course.term, course.year].filter(Boolean).join(" ")}
                      </p>
                      <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl lg:text-3xl leading-snug mb-3 group-hover:text-[var(--color-accent)] transition-colors">
                        {course.title}
                      </h2>
                      <p className="text-[var(--color-muted)] text-base leading-relaxed max-w-prose">
                        {COURSE_DESCRIPTIONS[course.course_number] ??
                          course.topics?.flat().slice(0, 3).join(" · ")}
                      </p>
                    </div>
                    <div className="hidden lg:block col-marginalia pt-1">
                      <p className="eyebrow mb-3">Instructors</p>
                      {course.instructors?.slice(0, 3).map((inst) => (
                        <p
                          key={inst.uid}
                          className="text-sm text-[var(--color-muted)] leading-relaxed"
                        >
                          {inst.title}
                        </p>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Skeleton/placeholder before DB is seeded */
            <FallbackCourseList />
          )}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[var(--color-rule)] py-20 bg-[#F5F3EF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <p className="eyebrow mb-12">What&apos;s included</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              { label: "Readings & Cases", desc: "Full syllabi, reading lists, and case study guides from each course." },
              { label: "Lecture Materials", desc: "Lecture notes, recitation notes, and supplementary course materials." },
              { label: "Practice Quizzes", desc: "AI-generated quizzes that test conceptual understanding per topic." },
              { label: "Progress Tracking", desc: "Mark sections complete and track your learning across all 8 courses." },
            ].map((f) => (
              <div key={f.label} className="border-t border-[var(--color-rule)] pt-8 pr-8 pb-8">
                <p className="eyebrow mb-3">{f.label}</p>
                <p className="text-base text-[var(--color-muted)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FallbackCourseList() {
  const courses = [
    { number: "15.280", title: "Communication for Managers" },
    { number: "15.060", title: "Data, Models and Decisions" },
    { number: "15.010", title: "Economic Analysis for Business Decisions" },
    { number: "15.401", title: "Finance Theory I" },
    { number: "15.515", title: "Financial Accounting" },
    { number: "15.761", title: "Introduction to Operations Management" },
    { number: "15.810", title: "Marketing Management" },
    { number: "15.311", title: "Organizational Processes" },
  ];

  return (
    <div>
      {courses.map((c) => (
        <div
          key={c.number}
          className="border-b border-[var(--color-rule)] py-8 opacity-50"
        >
          <p className="eyebrow mb-2">{c.number}</p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl">
            {c.title}
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-2">
            Run{" "}
            <code className="bg-[var(--color-rule)] px-1 py-0.5 text-xs">
              npm run seed:content
            </code>{" "}
            in supabase/scripts to load course data.
          </p>
        </div>
      ))}
    </div>
  );
}
