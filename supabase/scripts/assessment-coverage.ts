import { parseAllCourses, type ParsedCourse, type ParsedPage } from "./parse-courses.js";
import { parseLocalAssessments } from "./local-assessments.js";

const EXCLUDED_PAGE_SLUGS = new Set(["syllabus", "calendar", "instructor-insights"]);
const REQUIRED_KINDS = ["practice_quiz", "homework"] as const;
const PASSING_COVERAGE = 0.9;

function isAssessmentWorthyPage(page: ParsedPage): boolean {
  if (EXCLUDED_PAGE_SLUGS.has(page.slug)) return false;
  if (page.slug.startsWith("instructor-insights-")) return false;
  return page.content_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length >= 250;
}

function getCoverageUnits(course: ParsedCourse): ParsedPage[] {
  return course.pages.filter(isAssessmentWorthyPage);
}

function slugForCourse(slug: string): string {
  return slug.replace(/\./g, "-").toLowerCase();
}

export function calculateAssessmentCoverage() {
  const courses = parseAllCourses();
  const assessmentsByCourse = new Map(
    parseLocalAssessments().map((file) => [slugForCourse(file.course_slug), file.assessments])
  );

  let coveredUnits = 0;
  let totalUnits = 0;
  const rows: {
    courseSlug: string;
    courseTitle: string;
    covered: number;
    total: number;
    percent: number;
    missing: string[];
  }[] = [];

  for (const course of courses) {
    const units = getCoverageUnits(course);
    const assessments = assessmentsByCourse.get(slugForCourse(course.slug)) ?? [];
    const missing: string[] = [];
    let courseCovered = 0;

    for (const unit of units) {
      const kinds = new Set(
        assessments
          .filter((assessment) => assessment.generated_from === unit.slug)
          .map((assessment) => assessment.kind)
      );
      const hasCoverage = REQUIRED_KINDS.every((kind) => kinds.has(kind));
      if (hasCoverage) {
        courseCovered++;
      } else {
        const missingKinds = REQUIRED_KINDS.filter((kind) => !kinds.has(kind));
        missing.push(`${unit.slug} (${missingKinds.join(", ")})`);
      }
    }

    coveredUnits += courseCovered;
    totalUnits += units.length;
    rows.push({
      courseSlug: course.slug,
      courseTitle: course.title,
      covered: courseCovered,
      total: units.length,
      percent: units.length > 0 ? courseCovered / units.length : 1,
      missing,
    });
  }

  return {
    coveredUnits,
    totalUnits,
    percent: totalUnits > 0 ? coveredUnits / totalUnits : 1,
    rows,
  };
}

if (process.argv[1] && process.argv[1].endsWith("assessment-coverage.ts")) {
  const result = calculateAssessmentCoverage();

  console.log("\nAssessment coverage by course:");
  for (const row of result.rows) {
    console.log(
      `- ${row.courseSlug}: ${row.covered}/${row.total} units (${Math.round(row.percent * 100)}%)`
    );
    if (row.missing.length > 0) {
      console.log(`  Missing: ${row.missing.join("; ")}`);
    }
  }

  console.log(
    `\nOverall coverage: ${result.coveredUnits}/${result.totalUnits} units (${Math.round(
      result.percent * 100
    )}%)`
  );

  if (result.percent < PASSING_COVERAGE) {
    console.error(`Coverage is below ${Math.round(PASSING_COVERAGE * 100)}%.`);
    process.exit(1);
  }
}
