/**
 * Rewrites legacy MIT OCW relative links embedded in stored `content_html`
 * to point at the real files in Supabase Storage.
 *
 * OCW exports reference resources with paths relative to the original course
 * site, e.g. `../../resources/midterm_2004_ans/index.html` or
 * `../../static_resources/HASH_name.pdf`. When rendered under our routes
 * (`/courses/<slug>/<pageSlug>`) the browser resolves these to non-existent
 * paths like `/resources/midterm_2004_ans/index.html`, producing a 404.
 *
 * Resolving them at render time keeps the stored HTML untouched while making
 * every embedded link (PDF views, images, downloads) work.
 */

export interface OcwLinkMaps {
  /** Public Supabase URL, e.g. http://127.0.0.1:54321 (no trailing slash). */
  supabaseUrl: string;
  /** OCW resource slug → storage_path (e.g. "midterm_2004_ans" → "course/HASH_file.pdf"). */
  slugToPath: Map<string, string>;
  /** Storage file basename → storage_path (for static_resources / direct file links). */
  basenameToPath: Map<string, string>;
}

const BUCKET = "course-files";

// Matches optional leading `./`, `../`, or `/` segments followed by
// `resources/<slug>/index.html`. The negative lookbehind avoids matching the
// `resources` inside `static_resources` (handled separately below).
const RESOURCE_LINK_RE = /(?:\.{0,2}\/)*(?<!static_)resources\/([^/"'\s]+)\/index\.html/g;

// Matches optional leading `./`, `../`, or `/` segments followed by
// `static_resources/<filename>`.
const STATIC_RESOURCE_LINK_RE = /(?:\.{0,2}\/)*static_resources\/([^"'\s)]+)/g;

export function rewriteOcwLinks(html: string | null, maps: OcwLinkMaps): string {
  if (!html) return html ?? "";

  const base = maps.supabaseUrl.replace(/\/$/, "");
  const fileUrl = (storagePath: string) =>
    `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  return html
    .replace(RESOURCE_LINK_RE, (match, slug: string) => {
      const storagePath = maps.slugToPath.get(slug);
      return storagePath ? fileUrl(storagePath) : match;
    })
    .replace(STATIC_RESOURCE_LINK_RE, (match, filename: string) => {
      const basename = filename.split("/").pop() ?? filename;
      const storagePath = maps.basenameToPath.get(basename);
      return storagePath ? fileUrl(storagePath) : match;
    });
}
