import fs from "fs";
import path from "path";
import { ASSESSMENT_CONTEXT_DIR } from "./config.js";
import { parseAllCourses, type ParsedCourse, type ParsedPage, type ParsedResource } from "./parse-courses.js";
import {
  type AssessmentDifficulty,
  type AssessmentKind,
  type LocalAssessment,
  type LocalAssessmentFile,
  normalizeCourseSlug,
} from "./local-assessments.js";

const EXCLUDED_PAGE_SLUGS = new Set(["syllabus", "calendar", "instructor-insights"]);

type CourseVoice = {
  shortTitle: string;
  domain: string;
  learnerAction: string;
  evidence: string[];
  commonMistake: string;
  deliverable: string;
};

const COURSE_VOICES: Record<string, CourseVoice> = {
  "15-010-fall-2004": {
    shortTitle: "Economic Analysis",
    domain: "managerial economics",
    learnerAction: "connect incentives, costs, market structure, and demand behavior to a business decision",
    evidence: ["elasticity", "marginal analysis", "strategic interaction", "opportunity cost"],
    commonMistake: "treating accounting costs or average outcomes as the relevant economic benchmark",
    deliverable: "a pricing, entry, or market-structure recommendation with assumptions stated clearly",
  },
  "15-060-fall-2014": {
    shortTitle: "Data, Models, and Decisions",
    domain: "decision modeling and analytics",
    learnerAction: "translate an ambiguous business choice into variables, uncertainty, constraints, and a defensible recommendation",
    evidence: ["optimization logic", "simulation", "regression", "sensitivity analysis", "decision trees"],
    commonMistake: "confusing a precise model output with a robust managerial recommendation",
    deliverable: "a model-backed decision memo that explains assumptions, tradeoffs, and sensitivity",
  },
  "15-280-fall-2016": {
    shortTitle: "Communication for Managers",
    domain: "managerial communication",
    learnerAction: "shape a message around audience needs, evidence, and a clear requested action",
    evidence: ["audience analysis", "persuasive structure", "concise language", "delivery choices"],
    commonMistake: "leading with process details before the audience understands the point and stakes",
    deliverable: "a concise recommendation, presentation, or written message tailored to a specific audience",
  },
  "15-311-fall-2003": {
    shortTitle: "Organizational Processes",
    domain: "organizations and leadership",
    learnerAction: "diagnose behavior through incentives, norms, power, coordination, and group dynamics",
    evidence: ["team process", "motivation", "authority", "culture", "change-management signals"],
    commonMistake: "attributing organizational outcomes only to individual personality or effort",
    deliverable: "an intervention plan that aligns structure, incentives, communication, and leadership action",
  },
  "15-401-fall-2008": {
    shortTitle: "Finance Theory I",
    domain: "corporate finance",
    learnerAction: "value risky cash flows and choose investments using opportunity cost of capital",
    evidence: ["present value", "risk-return logic", "diversification", "asset pricing", "capital budgeting"],
    commonMistake: "using a rule of thumb without matching the discount rate or payoff structure to the risk",
    deliverable: "a valuation or investment recommendation with cash-flow assumptions and risk logic",
  },
  "15-515-fall-2003": {
    shortTitle: "Financial Accounting",
    domain: "financial reporting and analysis",
    learnerAction: "interpret transactions and statements through accrual accounting and economic substance",
    evidence: ["recognition", "measurement", "working capital", "cash flow", "ratio analysis"],
    commonMistake: "equating reported earnings with current-period cash generation",
    deliverable: "a statement analysis that connects accounting treatment to performance and risk",
  },
  "15-761-spring-2013": {
    shortTitle: "Operations Management",
    domain: "operations and process design",
    learnerAction: "diagnose process performance using flow, capacity, variability, and bottleneck logic",
    evidence: ["throughput", "utilization", "waiting time", "inventory", "quality", "process constraints"],
    commonMistake: "improving a non-bottleneck activity and expecting system throughput to rise",
    deliverable: "an operating recommendation that identifies the constraint and expected service impact",
  },
  "15-810-fall-2015": {
    shortTitle: "Marketing Management",
    domain: "marketing strategy and analytics",
    learnerAction: "connect customer insight, segmentation, positioning, pricing, and experimentation to growth choices",
    evidence: ["customer value", "targeting", "conjoint logic", "diffusion", "acquisition economics", "brand response"],
    commonMistake: "optimizing a tactic without specifying the target segment or value proposition",
    deliverable: "a go-to-market recommendation with customer economics and evidence behind the choice",
  },
};

type SectionCategory =
  | "exams"
  | "assignments"
  | "lectures"
  | "readings"
  | "recitations"
  | "projects"
  | "tools"
  | "cases"
  | "other";

type SectionContext = {
  page: ParsedPage;
  childPages: ParsedPage[];
  resources: ParsedResource[];
  topics: string[];
  distractors: string[];
  category: SectionCategory;
  summary: string;
};

const SECTION_TOPIC_OVERRIDES: Record<string, string[]> = {
  "15-010-fall-2004::assignments": [
    "Cost analysis",
    "Pricing decisions",
    "Market structure",
    "Strategic interaction",
  ],
  "15-010-fall-2004::exams": [
    "Demand analysis",
    "Cost curves",
    "Market power",
    "Game theory",
  ],
  "15-010-fall-2004::lecture-notes": [
    "Competition and market structure",
    "Antitrust and monopoly",
    "Asymmetric information",
    "Elasticity and surplus",
  ],
  "15-010-fall-2004::readings": [
    "Price theory",
    "Demand estimation",
    "Costs and production",
    "Strategic behavior",
  ],
  "15-010-fall-2004::recitations": [
    "Common property",
    "Elasticity and surplus",
    "Information asymmetry",
    "Auctions",
  ],
  "15-060-fall-2014::assignments": [
    "Probability",
    "Simulation",
    "Regression",
    "Decision trees",
  ],
  "15-060-fall-2014::case-learning-modules": [
    "Kendall Crab and Lobster",
    "Gentle Lentil Restaurant",
    "Great Apps",
    "Decision framing",
  ],
  "15-060-fall-2014::lecture-summaries": [
    "Decision analysis",
    "Optimization",
    "Simulation logic",
    "Regression insights",
  ],
  "15-060-fall-2014::readings": [
    "Probability models",
    "Optimization methods",
    "Regression analysis",
    "Managerial decisions",
  ],
  "15-280-fall-2016::assignments": [
    "Persuasive writing",
    "Argument structure",
    "Evidence",
    "Audience adaptation",
  ],
  "15-280-fall-2016::readings": [
    "Audience analysis",
    "Executive writing",
    "Persuasion",
    "Message design",
  ],
  "15-311-fall-2003::assignments": [
    "Case write-ups",
    "Leadership diagnosis",
    "Change interventions",
    "Coordination problems",
  ],
  "15-311-fall-2003::projects": [
    "Team project",
    "Organizational diagnosis",
    "Power and incentives",
    "Group dynamics",
  ],
  "15-311-fall-2003::readings": [
    "Motivation",
    "Culture",
    "Leadership",
    "Communication",
  ],
  "15-401-fall-2008::exams": [
    "Midterm review",
    "Final review",
    "Sample exams",
    "Sample solutions",
  ],
  "15-401-fall-2008::problem-sets": [
    "Present value relations",
    "Fixed-income securities",
    "Equities",
    "CAPM and APT",
  ],
  "15-401-fall-2008::readings": [
    "Corporate valuation",
    "Discount rates",
    "Capital budgeting",
    "Asset pricing",
  ],
  "15-401-fall-2008::recitations": [
    "Capital Asset Pricing Model",
    "Capital Budgeting",
    "Equities",
    "Forward and Futures Contracts",
  ],
  "15-401-fall-2008::video-lectures-and-slides": [
    "Capital Budgeting",
    "Efficient Markets",
    "Portfolio Theory",
    "Risk and Return",
  ],
  "15-515-fall-2003::assignments": [
    "Revenue recognition",
    "Working capital",
    "Cash flow analysis",
    "Ratio analysis",
  ],
  "15-515-fall-2003::lecture-notes": [
    "Course framework",
    "Recognition and measurement",
    "Accrual accounting",
    "Statement analysis",
  ],
  "15-515-fall-2003::readings": [
    "Financial accounting and economic context",
    "Recognition",
    "Measurement",
    "Analysis",
  ],
  "15-515-fall-2003::recitations": [
    "Review sessions",
    "Statement mechanics",
    "Cash flow adjustments",
    "Exam review",
  ],
  "15-761-spring-2013::assignments": [
    "Toyota",
    "Zara and M&S",
    "Process analysis",
    "Capacity choices",
  ],
  "15-761-spring-2013::case-preparation-questions": [
    "McDonald's",
    "Toyota",
    "Southwest Airlines",
    "Littlefield Technologies",
  ],
  "15-761-spring-2013::cases-and-readings": [
    "Bottlenecks",
    "Process flow",
    "Inventory",
    "Quality",
  ],
  "15-761-spring-2013::simulation-exercises": [
    "Littlefield Technologies",
    "Capacity management",
    "Queueing",
    "Inventory decisions",
  ],
  "15-810-fall-2015::assignments": [
    "Action learning",
    "Analytics funnel",
    "Customer acquisition",
    "Marketing ROI",
  ],
  "15-810-fall-2015::lecture-notes": [
    "Strategic positioning",
    "Pricing",
    "Promotion",
    "Customer analytics",
  ],
  "15-810-fall-2015::readings": [
    "Strategic positioning",
    "Consumer behavior",
    "Conjoint analysis",
    "Voice of the customer",
  ],
  "15-810-fall-2015::tools": [
    "Conjoint analysis",
    "Diffusion model",
    "Analytics funnel",
    "Customer response modeling",
  ],
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function getVoice(course: ParsedCourse): CourseVoice {
  return COURSE_VOICES[normalizeCourseSlug(course.slug)] ?? {
    shortTitle: course.title,
    domain: "MBA coursework",
    learnerAction: "connect the section material to a practical management decision",
    evidence: ["course concepts", "assumptions", "tradeoffs", "supporting evidence"],
    commonMistake: "answering from memory without tying the claim to the decision context",
    deliverable: "a concise recommendation supported by course evidence",
  };
}

function isTopLevelPage(course: ParsedCourse, page: ParsedPage): boolean {
  return fs.existsSync(path.join(course.courseDir, "pages", page.slug, "data.json"));
}

function categoryForPage(page: ParsedPage): SectionCategory {
  const slug = page.slug;
  if (slug.includes("exam")) return "exams";
  if (slug.includes("assignment") || slug.includes("problem")) return "assignments";
  if (slug.includes("lecture") || slug.includes("video")) return "lectures";
  if (slug.includes("reading")) return "readings";
  if (slug.includes("recitation")) return "recitations";
  if (slug.includes("project")) return "projects";
  if (slug.includes("tool")) return "tools";
  if (slug.includes("case") || slug.includes("simulation")) return "cases";
  return "other";
}

function difficultyForPage(page: ParsedPage): AssessmentDifficulty {
  switch (categoryForPage(page)) {
    case "exams":
    case "assignments":
    case "projects":
      return "hard";
    case "lectures":
    case "readings":
    case "cases":
    case "recitations":
      return "medium";
    case "tools":
    case "other":
    default:
      return "medium";
  }
}

function extractTitleCasePhrases(text: string): string[] {
  const matches = text.match(/\b(?:[A-Z0-9][A-Za-z0-9/&'-]*)(?:\s+(?:[A-Z0-9][A-Za-z0-9/&'-]*)){0,5}\b/g) ?? [];
  return matches
    .map((match) => match.trim())
    .filter((match) => {
      if (match.length < 4 || match.length > 60) return false;
      if (/^(Objectives|Topics|Preparation|Readings|Files|Lecture|Session|Course|Overview)$/i.test(match)) {
        return false;
      }
      return /[A-Z]/.test(match);
    });
}

function normalizeTopic(value: string): string {
  return value
    .replace(/\.(pdf|xlsx|xls|docx|doc|pptx|ppt)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableTopic(value: string): boolean {
  const normalized = normalizeTopic(value);
  if (!normalized) return false;
  if (normalized.length < 4 || normalized.length > 80) return false;
  if (
    /^(These|This|Your|Files|Readings|Preparation|Objectives|Topics|Course|Section|Review|Some|Periodically)$/i.test(
      normalized
    )
  ) {
    return false;
  }
  if (/^(lec\d+|mit\d+|session \d+)$/i.test(normalized)) return false;
  if (/^[a-z0-9 ]+$/i.test(normalized) && !/[A-Za-z]/.test(normalized)) return false;
  if (/graded assignments your/i.test(normalized)) return false;
  if (/^(TOPICS READINGS|Class Preparation Questions|EXAMS FILES|TA Amir Khandani|Optional Questions)/i.test(normalized)) {
    return false;
  }
  return true;
}

function isHumanReadableResourceTitle(value: string): boolean {
  const normalized = normalizeTopic(value);
  if (!isUsableTopic(normalized)) return false;
  if (/^(lec\d+|session \d+|problem sets? \d)/i.test(normalized)) return false;
  if (/\b(example|sheet)\b/i.test(normalized) && /\d/.test(normalized)) return false;
  return true;
}

function topLevelPages(course: ParsedCourse): ParsedPage[] {
  return course.pages.filter(
    (page) =>
      isTopLevelPage(course, page) &&
      !EXCLUDED_PAGE_SLUGS.has(page.slug) &&
      (stripHtml(page.content_html).length >= 180 ||
        course.pages.some((candidate) => candidate.slug.startsWith(`${page.slug}-`)))
  );
}

function childPagesFor(course: ParsedCourse, page: ParsedPage): ParsedPage[] {
  return course.pages.filter((candidate) => candidate.slug.startsWith(`${page.slug}-`));
}

function resourcesForPage(course: ParsedCourse, page: ParsedPage): ParsedResource[] {
  return course.resources.filter((resource) => resource.parent_title.toLowerCase() === page.title.toLowerCase());
}

function sectionTopics(page: ParsedPage, childPages: ParsedPage[], resources: ParsedResource[]): string[] {
  const fromChildren = childPages.map((child) => child.title);
  const fromResources = resources.map((resource) => resource.title).filter(isHumanReadableResourceTitle);
  const excerpts = [
    stripHtml(page.content_html),
    ...childPages.slice(0, 6).map((child) => stripHtml(child.content_html).slice(0, 500)),
  ].join(" ");
  const fromText = extractTitleCasePhrases(excerpts);

  return uniq([...fromChildren, ...fromResources, ...fromText].map(normalizeTopic)).filter(
    (topic) => topic.toLowerCase() !== page.title.toLowerCase() && isUsableTopic(topic)
  );
}

function fallbackTopics(page: ParsedPage, voice: CourseVoice): string[] {
  return uniq([page.title, ...voice.evidence.map((item) => item[0].toUpperCase() + item.slice(1))]);
}

function buildSectionContext(course: ParsedCourse, page: ParsedPage): SectionContext {
  const childPages = childPagesFor(course, page);
  const resources = resourcesForPage(course, page);
  const voice = getVoice(course);
  const overrideKey = `${normalizeCourseSlug(course.slug)}::${page.slug}`;
  const overrideTopics = SECTION_TOPIC_OVERRIDES[overrideKey] ?? [];
  const topics = uniq([
    ...overrideTopics,
    ...sectionTopics(page, childPages, resources),
    ...fallbackTopics(page, voice),
  ]);
  const allOtherTopics = topLevelPages(course)
    .filter((candidate) => candidate.slug !== page.slug)
    .flatMap((candidate) => {
      const candidateOverrideKey = `${normalizeCourseSlug(course.slug)}::${candidate.slug}`;
      const candidateOverrideTopics = SECTION_TOPIC_OVERRIDES[candidateOverrideKey] ?? [];
      return uniq([
        ...candidateOverrideTopics,
        ...sectionTopics(candidate, childPagesFor(course, candidate), resourcesForPage(course, candidate)),
        ...fallbackTopics(candidate, voice),
      ]);
    });

  const summaryBits = uniq([
    ...childPages.map((child) => child.title),
    ...resources.map((resource) => resource.title),
    ...topics,
  ]).slice(0, 5);

  return {
    page,
    childPages,
    resources,
    topics,
    distractors: uniq(allOtherTopics).filter((topic) => !topics.includes(topic)).slice(0, 20),
    category: categoryForPage(page),
    summary:
      summaryBits.length > 0
        ? `${page.title} brings together ${summaryBits.join(", ")}.`
        : `${page.title} is a core ${course.title} section.`,
  };
}

function pickTopic(section: SectionContext, index: number, voice: CourseVoice): string {
  return section.topics[index] ?? fallbackTopics(section.page, voice)[index] ?? section.page.title;
}

function pickDistractors(section: SectionContext, count: number, fallbacks: string[]): string[] {
  return uniq([...section.distractors, ...fallbacks]).slice(0, count);
}

function option(id: string, text: string) {
  return { id, text };
}

function multipleChoice(question_text: string, correct: string, distractors: string[], explanation: string) {
  return {
    question_type: "multiple_choice" as const,
    question_text,
    options: [
      option("a", correct),
      option("b", distractors[0]),
      option("c", distractors[1]),
      option("d", distractors[2]),
    ],
    correct_answer: "a",
    explanation,
    difficulty: "medium" as AssessmentDifficulty,
  };
}

function multiSelect(
  question_text: string,
  correct: string[],
  wrong: string[],
  explanation: string,
  difficulty: AssessmentDifficulty = "medium"
) {
  return {
    question_type: "multi_select" as const,
    question_text,
    options: [
      option("a", correct[0]),
      option("b", correct[1]),
      option("c", correct[2]),
      option("d", wrong[0]),
    ],
    correct_answer: ["a", "b", "c"],
    explanation,
    difficulty,
  };
}

function trueFalse(question_text: string, answer: "true" | "false", explanation: string, difficulty: AssessmentDifficulty) {
  return {
    question_type: "true_false" as const,
    question_text,
    correct_answer: answer,
    explanation,
    difficulty,
  };
}

function shortAnswer(question_text: string, answer: string, explanation: string, difficulty: AssessmentDifficulty) {
  return {
    question_type: "short_answer" as const,
    question_text,
    correct_answer: answer,
    explanation,
    difficulty,
  };
}

function sectionStudyFrame(section: SectionContext): string {
  switch (section.category) {
    case "exams":
      return "synthesizing the full section under exam-style pressure";
    case "assignments":
      return "working through structured problems with assumptions made explicit";
    case "lectures":
      return "connecting the teaching sequence into one coherent logic chain";
    case "readings":
      return "extracting the common managerial logic across the assigned materials";
    case "recitations":
      return "reinforcing the trickiest ideas through guided practice";
    case "projects":
      return "turning concepts into a polished project recommendation";
    case "tools":
      return "choosing the right framework or instrument for the job";
    case "cases":
      return "using the section to diagnose a live managerial situation";
    case "other":
    default:
      return "building a usable decision framework from the section";
  }
}

function sectionScenario(section: SectionContext): string {
  switch (section.category) {
    case "exams":
      return "while preparing for a timed cumulative check";
    case "assignments":
      return "while turning a draft analysis into a defensible submission";
    case "lectures":
      return "while linking the section's teaching arc into one argument";
    case "readings":
      return "while synthesizing several assigned sources into one position";
    case "recitations":
      return "while stress-testing understanding in guided practice";
    case "projects":
      return "while shaping a team recommendation for leadership review";
    case "tools":
      return "while choosing the right model or instrument for a decision";
    case "cases":
      return "while diagnosing a messy operating or strategic case";
    case "other":
    default:
      return "while turning the section into a real managerial recommendation";
  }
}

function sectionOutput(section: SectionContext, voice: CourseVoice): string {
  switch (section.category) {
    case "exams":
      return `a concise exam-ready argument that still leads to ${voice.deliverable}`;
    case "assignments":
      return `a worked recommendation that ends in ${voice.deliverable}`;
    case "lectures":
      return `a synthesis of the lecture logic that supports ${voice.deliverable}`;
    case "readings":
      return `a reading synthesis that sharpens ${voice.deliverable}`;
    case "recitations":
      return `a corrected practice solution that reinforces ${voice.deliverable}`;
    case "projects":
      return `a project-ready recommendation tied to ${voice.deliverable}`;
    case "tools":
      return `a tool choice and interpretation that support ${voice.deliverable}`;
    case "cases":
      return `a case diagnosis that leads to ${voice.deliverable}`;
    case "other":
    default:
      return voice.deliverable;
  }
}

function sectionEvidence(section: SectionContext, voice: CourseVoice): string {
  const topics = section.topics.slice(0, 3);
  if (topics.length === 0) return voice.evidence.slice(0, 3).join(", ");
  return topics.join(", ");
}

function buildPracticeQuestions(course: ParsedCourse, section: SectionContext, voice: CourseVoice) {
  const topicA = pickTopic(section, 0, voice);
  const topicB = pickTopic(section, 1, voice);
  const topicC = pickTopic(section, 2, voice);
  const topicD = pickTopic(section, 3, voice);
  const distractorTopics = pickDistractors(section, 6, [
    `${course.title} syllabus policies`,
    `administrative logistics for ${course.title}`,
    `standalone memorization with no decision context`,
    voice.commonMistake,
    voice.evidence[0],
    voice.evidence[1] ?? voice.evidence[0],
  ]);
  const scenario = sectionScenario(section);
  const output = sectionOutput(section, voice);
  const evidence = sectionEvidence(section, voice);

  return [
    multipleChoice(
      `A student says the ${section.page.title} section is mostly about memorizing isolated definitions. Which reply is more accurate?`,
      `No. The section connects ${topicA}${topicB ? `, ${topicB},` : ""} and ${topicC} to ${voice.learnerAction}.`,
      [
        `Yes. The main goal is to recall terms, even if they never shape ${voice.deliverable}.`,
        `Yes. The section works best when ${topicA} is studied separately from ${topicB || topicC}.`,
        `Yes. It is safer to avoid assumptions and tradeoffs until after the decision is made.`,
      ],
      `${section.page.title} is valuable because it organizes section material into a decision logic, not a vocabulary drill.`
    ),
    multiSelect(
      `When someone is reviewing ${section.page.title} ${scenario}, which moves usually strengthen the review?`,
      [
        `Link ${topicA} to ${topicB || topicC} instead of treating them as separate facts`,
        `State the assumptions that connect ${topicC} to the decision`,
        `Explain how the section changes ${output}`,
      ],
      [`Ignore tradeoffs and rely on the first plausible answer about ${distractorTopics[0]}`],
      `Good review work in ${section.page.title} ties section concepts together, states assumptions, and ends with a usable managerial implication.`,
      "easy"
    ),
    trueFalse(
      `True or false: A solid answer from the ${section.page.title} section should use evidence like ${evidence} and still make the tradeoffs explicit.`,
      "true",
      `That is the core standard for this section: use section evidence and convert it into a defended managerial judgment.`,
      "medium"
    ),
    multipleChoice(
      `Which study plan would best prepare someone to use ${section.page.title} ${scenario}?`,
      `Compare ${topicA}, ${topicB || topicC}, and ${topicD}; test the assumptions; then connect the section to ${voice.deliverable}.`,
      [
        `Skim ${topicA} for terminology, then answer from memory without naming the decision.`,
        `Focus on polished wording first and postpone the ${voice.domain} reasoning until the end.`,
        `Pick the first familiar framework and ignore whether it fits ${sectionStudyFrame(section)}.`,
      ],
      `The strongest study plan uses multiple section concepts, explicit assumptions, and a concrete decision output.`
    ),
  ];
}

function buildHomeworkQuestions(section: SectionContext, voice: CourseVoice) {
  const topicA = pickTopic(section, 0, voice);
  const topicB = pickTopic(section, 1, voice);
  const topicC = pickTopic(section, 2, voice);
  const topicD = pickTopic(section, 3, voice);
  const distractorTopics = pickDistractors(section, 6, [
    "generic study habits with no course-specific evidence",
    "a recommendation that ignores assumptions",
    "an answer that summarizes the page but avoids the decision",
    voice.commonMistake,
    voice.evidence[0],
    voice.evidence[1] ?? voice.evidence[0],
  ]);
  const scenario = sectionScenario(section);
  const output = sectionOutput(section, voice);
  const evidence = sectionEvidence(section, voice);

  return [
    multipleChoice(
      `In the ${section.page.title} homework-style response, which draft sounds the most decision-ready?`,
      `A response that uses ${topicA}${topicB ? ` and ${topicB}` : ""} to produce ${output}.`,
      [
        "A response that repeats section terminology but never commits to a recommendation.",
        `A response that names ${topicA} yet skips assumptions and tradeoffs.`,
        `A response built on ${voice.commonMistake}.`,
      ],
      `The strongest draft turns section material into a recommendation, not just a recap.`
    ),
    multiSelect(
      `Suppose a manager is using ${section.page.title} ${scenario}. Which elements belong in the written answer?`,
      [
        `Evidence from ${topicA}${topicB ? ` or ${topicB}` : ""}`,
        "The assumptions or constraints shaping the recommendation",
        `A managerial implication tied to ${output}`,
      ],
      [distractorTopics[0]],
      `A strong written answer for this section uses evidence, assumptions, and a concrete implication in the same response.`,
      "hard"
    ),
    multipleChoice(
      `Which next step best shows that someone understands how to use ${section.page.title} in practice?`,
      `Use ${topicC}${topicD ? ` and ${topicD}` : ""} to frame the recommendation, then check whether it still holds when assumptions move.`,
      [
        "Lock in the first intuitive answer before checking whether the source material supports it.",
        `Treat the section as background reading and leave the actual recommendation unspecified.`,
        `Ignore uncertainty because mentioning it would complicate the write-up.`,
      ],
      `The best next step is to pressure-test the recommendation instead of hiding uncertainty or avoiding the decision.`
    ),
    shortAnswer(
      `Name one sentence-level takeaway a strong answer from ${section.page.title} should land on after weighing ${topicA}, ${topicB}, and ${topicC}.`,
      `It should end with ${voice.deliverable}, grounded in ${evidence} and explicit assumptions.`,
      `Short answers should still name the decision output, the supporting section evidence, and the assumptions behind the choice.`,
      "hard"
    ),
  ];
}

function buildAssessment(course: ParsedCourse, section: SectionContext, kind: AssessmentKind): LocalAssessment {
  const voice = getVoice(course);
  const label = kind === "practice_quiz" ? "Practice Quiz" : "Applied Homework";
  const difficulty = kind === "practice_quiz" ? "medium" : difficultyForPage(section.page);
  const questions =
    kind === "practice_quiz"
      ? buildPracticeQuestions(course, section, voice)
      : buildHomeworkQuestions(section, voice);

  const topicPreview = uniq(section.topics).slice(0, 4).join(", ");

  return {
    title: `${voice.shortTitle} - ${section.page.title} ${label}`,
    description:
      topicPreview.length > 0
        ? `${label} for the ${section.page.title} section, covering ${topicPreview}.`
        : `${label} for the ${section.page.title} section.`,
    kind,
    difficulty,
    generated_from: section.page.slug,
    time_limit_minutes: kind === "practice_quiz" ? 18 : 35,
    is_published: true,
    questions,
  };
}

function assessmentFilePath(course: ParsedCourse): string {
  return path.join(ASSESSMENT_CONTEXT_DIR, `${normalizeCourseSlug(course.slug)}.json`);
}

function writeAssessmentFile(course: ParsedCourse, file: LocalAssessmentFile) {
  fs.writeFileSync(assessmentFilePath(course), `${JSON.stringify(file, null, 2)}\n`);
}

function rebuildCourse(course: ParsedCourse): number {
  const sections = topLevelPages(course).map((page) => buildSectionContext(course, page));
  const assessments: LocalAssessment[] = [];

  for (const section of sections) {
    assessments.push(buildAssessment(course, section, "homework"));
    assessments.push(buildAssessment(course, section, "practice_quiz"));
  }

  assessments.sort((a, b) => {
    const fromCompare = String(a.generated_from).localeCompare(String(b.generated_from));
    if (fromCompare !== 0) return fromCompare;
    return a.kind.localeCompare(b.kind);
  });

  writeAssessmentFile(course, {
    course_slug: normalizeCourseSlug(course.slug),
    course_title: course.title,
    assessments,
  });

  return assessments.length;
}

function main() {
  fs.mkdirSync(ASSESSMENT_CONTEXT_DIR, { recursive: true });

  let rewritten = 0;
  for (const course of parseAllCourses()) {
    const count = rebuildCourse(course);
    rewritten += count;
    console.log(`${course.slug}: wrote ${count} assessment(s)`);
  }

  console.log(`\nRewrite complete. Wrote ${rewritten} assessment(s).`);
}

main();
