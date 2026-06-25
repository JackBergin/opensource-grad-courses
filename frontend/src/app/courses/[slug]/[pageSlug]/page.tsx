import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CoursePage, Resource } from "@/types/database";
import ProgressButton from "@/components/ProgressButton";
import { rewriteOcwLinks } from "@/lib/ocw-links";

const FILE_ICON: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "IMG",
  "image/png": "IMG",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default async function CourseSectionPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const supabase = await createClient();

  // Fetch course
  const { data: courseData } = await supabase
    .from("courses")
    .select("id, title, course_number")
    .eq("slug", slug)
    .single();

  if (!courseData) notFound();
  const course = courseData as unknown as { id: string; title: string; course_number: string };

  // Fetch page
  const { data: pageData } = await supabase
    .from("course_pages")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", pageSlug)
    .single();

  if (!pageData) notFound();
  const p = pageData as unknown as CoursePage;

  // Fetch related resources
  const { data: resourcesData } = await supabase
    .from("resources")
    .select("id, title, description, resource_type, file_type, file_size, storage_path, ocw_file_path, learning_resource_types")
    .eq("course_page_id", p.id)
    .order("title");

  const res = (resourcesData ?? []) as unknown as Pick<Resource, "id" | "title" | "description" | "resource_type" | "file_type" | "file_size" | "storage_path" | "ocw_file_path" | "learning_resource_types">[];
  const downloadableRes = res.filter((r) => r.storage_path);

  // Build slug/basename → storage_path maps across ALL course resources so that
  // legacy OCW links embedded in content_html (which reference resources by slug
  // anywhere in the course, not just on this page) resolve to real storage URLs.
  const { data: allResData } = await supabase
    .from("resources")
    .select("slug, storage_path")
    .eq("course_id", course.id)
    .not("storage_path", "is", null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const slugToPath = new Map<string, string>();
  const basenameToPath = new Map<string, string>();
  for (const r of (allResData ?? []) as { slug: string; storage_path: string | null }[]) {
    if (!r.storage_path) continue;
    slugToPath.set(r.slug, r.storage_path);
    const basename = r.storage_path.split("/").pop();
    if (basename) basenameToPath.set(basename, r.storage_path);
  }

  const contentHtml = rewriteOcwLinks(p.content_html, {
    supabaseUrl,
    slugToPath,
    basenameToPath,
  });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
      {/* Breadcrumb */}
      <nav className="eyebrow mb-8 flex items-center gap-2">
        <Link href="/courses" className="hover:text-[var(--color-accent)] transition-colors">
          Courses
        </Link>
        <span className="text-[var(--color-rule)]">/</span>
        <Link
          href={`/courses/${slug}`}
          className="hover:text-[var(--color-accent)] transition-colors"
        >
          {course.course_number}
        </Link>
        <span className="text-[var(--color-rule)]">/</span>
        <span className="text-[var(--color-muted)]">{p.title}</span>
      </nav>

      <div className="layout-grid">
        {/* Main content */}
        <div className="col-body">
          <p className="eyebrow mb-4">{course.title}</p>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-3xl lg:text-4xl leading-tight mb-10">
            {p.title}
          </h1>

          {contentHtml ? (
            <div
              className="prose-editorial dropcap"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <p className="text-[var(--color-muted)]">No content available for this section.</p>
          )}

          {/* Downloadable files */}
          {downloadableRes.length > 0 && (
            <div className="mt-12">
              <hr className="rule mb-8" />
              <p className="eyebrow mb-6">Files & Downloads</p>
              <div className="space-y-0">
                {downloadableRes.map((r) => (
                  <ResourceRow
                    key={r.id}
                    resource={r}
                    supabaseUrl={supabaseUrl}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Marginalia */}
        <aside className="hidden lg:block col-marginalia pt-16">
          <ProgressButton courseId={course.id} pageId={p.id} />

          {res.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow mb-4">
                {res.length} resource{res.length !== 1 ? "s" : ""}
              </p>
              {res.slice(0, 8).map((r) => (
                <p key={r.id} className="text-sm text-[var(--color-muted)] mb-1">
                  {FILE_ICON[r.file_type ?? ""] ?? "—"} {r.title}
                </p>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Navigation between pages */}
      <PageNav courseId={course.id} currentPageSlug={pageSlug} courseSlug={slug} />
    </div>
  );
}

function ResourceRow({
  resource,
  supabaseUrl,
}: {
  resource: Pick<Resource, "id" | "title" | "description" | "file_type" | "file_size" | "storage_path">;
  supabaseUrl: string;
}) {
  const fileUrl = resource.storage_path
    ? `${supabaseUrl}/storage/v1/object/public/course-files/${resource.storage_path}`
    : null;

  const typeLabel = FILE_ICON[resource.file_type ?? ""] ?? "FILE";

  return (
    <div className="flex items-center justify-between border-b border-[var(--color-rule)] py-4">
      <div className="flex items-start gap-4">
        <span className="eyebrow text-[10px] border border-[var(--color-rule)] px-2 py-1 mt-0.5 shrink-0">
          {typeLabel}
        </span>
        <div>
          <p className="text-sm font-medium leading-snug">{resource.title}</p>
          {resource.file_size && (
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              {formatBytes(resource.file_size)}
            </p>
          )}
        </div>
      </div>
      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn--text text-[11px] shrink-0 ml-4"
        >
          Download
        </a>
      )}
    </div>
  );
}

async function PageNav({
  courseId,
  currentPageSlug,
  courseSlug,
}: {
  courseId: string;
  currentPageSlug: string;
  courseSlug: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_pages")
    .select("id, slug, title, sort_order")
    .eq("course_id", courseId)
    .order("sort_order");

  const pages = (data ?? []) as unknown as { id: string; slug: string; title: string; sort_order: number }[];

  if (pages.length < 2) return null;

  const currentIdx = pages.findIndex((p) => p.slug === currentPageSlug);
  const prev = currentIdx > 0 ? pages[currentIdx - 1] : null;
  const next = currentIdx < pages.length - 1 ? pages[currentIdx + 1] : null;

  return (
    <nav className="border-t border-[var(--color-rule)] mt-16 pt-10 flex justify-between">
      {prev ? (
        <Link
          href={`/courses/${courseSlug}/${prev.slug}`}
          className="group flex flex-col"
        >
          <span className="eyebrow mb-1">← Previous</span>
          <span className="font-[family-name:var(--font-display)] font-bold text-lg group-hover:text-[var(--color-accent)] transition-colors">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/courses/${courseSlug}/${next.slug}`}
          className="group flex flex-col text-right"
        >
          <span className="eyebrow mb-1">Next →</span>
          <span className="font-[family-name:var(--font-display)] font-bold text-lg group-hover:text-[var(--color-accent)] transition-colors">
            {next.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
