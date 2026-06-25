# Architecture Overview

## System diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         User's Browser                           │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    nginx (port 80/443)                           │
│  Reverse proxy, gzip, TLS termination, static asset caching      │
└──────────────────────────┬───────────────────────────────────────┘
                           │ http://app:3000
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Next.js 16 (App Router)                        │
│  Server Components (SSR) + Client Components                     │
│  @supabase/ssr — server-side Supabase client with cookie auth    │
│  Middleware — session refresh on every request                   │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST / Auth / Storage
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Supabase (self-hosted)                          │
│  ┌─────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐   │
│  │  GoTrue  │  │  PostgREST   │  │ Storage  │  │  Realtime  │   │
│  │  (Auth)  │  │  (Data API)  │  │ (Files)  │  │ (optional) │   │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └────────────┘   │
│       │               │              │                           │
│  ┌────┴───────────────┴──────────────┴──────────────────────┐   │
│  │                    Postgres 17                            │   │
│  │   public schema — all tables with RLS                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

Seeding (one-time):
context/ OCW data → supabase/scripts → Supabase API
context/assessments JSON → supabase/scripts → Supabase API
```

## Frontend structure

```
frontend/src/
  app/
    layout.tsx              — Root layout (Nav, Footer, fonts)
    globals.css             — Editorial Ink design system
    page.tsx                — Homepage (hero + course list)
    courses/
      page.tsx              — Course listing
      [slug]/
        page.tsx            — Course detail (sections + quizzes)
        [pageSlug]/
          page.tsx          — Section reader (content + files + progress)
        quiz/
          [quizId]/
            page.tsx        — Quiz runner page
    auth/
      sign-in/page.tsx      — Email/password + magic link sign-in
      sign-up/page.tsx      — Account creation
      callback/route.ts     — OAuth/magic link exchange
    dashboard/
      page.tsx              — Progress overview + quiz history
  components/
    Nav.tsx                 — Global navigation (client)
    Footer.tsx              — Footer
    ProgressButton.tsx      — Mark-complete toggle (client)
    QuizRunner.tsx          — Interactive quiz UI (client)
  lib/supabase/
    client.ts               — Browser client (for client components)
    server.ts               — Server client (for server components)
  middleware.ts             — Session refresh + /dashboard auth guard
  types/
    database.ts             — Hand-authored TypeScript types for schema
```

## Data flow: Course section reader

```
User visits /courses/15-401-fall-2008/readings
    │
    ▼
[pageSlug]/page.tsx (Server Component)
    │
    ├── supabase.from("courses").select(...).eq("slug", "15-401-fall-2008")
    │   → course row { id, title, course_number }
    │
    ├── supabase.from("course_pages").select(*).eq("course_id", ...).eq("slug", "readings")
    │   → page row { title, content_html, ... }
    │
    └── supabase.from("resources").select(...).eq("course_page_id", ...)
        → resources array with storage_path for download links
            │
            ▼ (storage path)
        Storage URL: {SUPABASE_URL}/storage/v1/object/public/course-files/{path}
            │
            ▼ (rendered)
        <article class="prose-editorial">  (OCW HTML rendered server-side)
        <ProgressButton />                 (client component — reads/writes progress table)
```

## Auth flow

```
Sign-up:    supabase.auth.signUp() → email confirmation → /auth/callback
Magic link: supabase.auth.signInWithOtp() → email link → /auth/callback
            /auth/callback exchanges code → sets session cookie
            middleware refreshes session on every request
Dashboard:  middleware checks auth.getUser() → redirect /auth/sign-in if not authed
```

## Quiz scoring

Quiz scoring is done client-side in `QuizRunner.tsx`:
- `multiple_choice` / `true_false`: exact string match against `correct_answer`
- `multi_select`: sorted array comparison
- `short_answer`: not auto-graded (answer displayed for self-assessment)
- Score saved to `quiz_attempts` via Supabase insert
- Individual responses saved to `quiz_responses`

## Design system

The Editorial Ink design system lives entirely in `globals.css` using Tailwind v4's CSS-first configuration (`@theme inline`). No tailwind.config.js needed. All design tokens are CSS custom properties:

```css
--color-bg:     #FBFAF7   /* paper white */
--color-ink:    #14110E   /* dense black ink */
--color-muted:  #6B6256   /* warm gray */
--color-rule:   #DAD5CB   /* hairline */
--color-accent: #B3261E   /* editor's red */
--font-display: Fraunces  /* variable serif */
--font-body:    Inter     /* humanist sans */
```
