import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/types/database";

export const metadata = {
  title: "Courses — MIT Sloan MBA",
  description: "Browse all eight first-semester MIT Sloan MBA courses.",
};

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("course_number");

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
      <p className="eyebrow mb-4">MIT Sloan — First Semester</p>
      <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl lg:text-5xl mb-4">
        Courses
      </h1>
      <p className="lede text-[var(--color-muted)] mb-16 max-w-xl">
        Eight MBA core courses. Open syllabi, readings, lecture notes, and practice quizzes.
      </p>

      <hr className="rule" />

      {courses && courses.length > 0 ? (
        <div>
          {(courses as Course[]).map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group block border-b border-[var(--color-rule)] py-10"
            >
              <div className="layout-grid">
                <div className="col-body">
                  <p className="eyebrow mb-3">
                    {course.course_number}
                    {course.term && ` · ${course.term} ${course.year ?? ""}`}
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] font-bold text-3xl lg:text-4xl leading-tight mb-4 group-hover:text-[var(--color-accent)] transition-colors">
                    {course.title}
                  </h2>
                  {course.description && (
                    <p className="body text-[var(--color-muted)] text-base leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                  )}
                  {course.topics && course.topics.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-5">
                      {course.topics.slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          className="eyebrow text-[10px] border border-[var(--color-rule)] px-2 py-1"
                        >
                          {t[t.length - 1]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hidden lg:block col-marginalia">
                  <p className="eyebrow mb-4">Faculty</p>
                  {course.instructors?.map((inst) => (
                    <div key={inst.uid} className="mb-3">
                      <p className="text-sm font-medium">
                        {inst.first_name} {inst.last_name}
                      </p>
                    </div>
                  ))}
                  {course.learning_resource_types &&
                    course.learning_resource_types.length > 0 && (
                      <>
                        <p className="eyebrow mt-6 mb-3">Includes</p>
                        {course.learning_resource_types.slice(0, 4).map((t) => (
                          <p key={t} className="text-sm text-[var(--color-muted)] leading-relaxed">
                            {t}
                          </p>
                        ))}
                      </>
                    )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="lede text-[var(--color-muted)] mb-4">No courses loaded yet.</p>
          <p className="text-sm text-[var(--color-muted)]">
            Run{" "}
            <code className="bg-[var(--color-rule)] px-2 py-1 text-xs">
              npm run seed:content
            </code>{" "}
            in <code className="bg-[var(--color-rule)] px-2 py-1 text-xs">supabase/scripts</code> to seed the database.
          </p>
        </div>
      )}
    </div>
  );
}
