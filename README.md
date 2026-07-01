# MIT Sloan MBA Learning Platform

A free, open, self-hosted learning platform for MIT Sloan's first-semester MBA curriculum. Built with Next.js, Supabase, and styled with the Editorial Ink design system.

## Courses included

| # | Course | Code |
|---|--------|------|
| 1 | Communication for Managers | 15.280 |
| 2 | Data, Models and Decisions | 15.060 |
| 3 | Economic Analysis for Business Decisions | 15.010 |
| 4 | Finance Theory I | 15.401 |
| 5 | Financial Accounting | 15.515 |
| 6 | Introduction to Operations Management | 15.761 |
| 7 | Marketing Management | 15.810 |
| 8 | Organizational Processes | 15.311 |

Content sourced from [MIT OpenCourseWare](https://ocw.mit.edu) under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

## Project structure

```
mba/
  frontend/        Next.js app (TypeScript, Tailwind, App Router, src/)
  supabase/        Database migrations, Supabase config, seeding scripts
  docker/          Docker Compose for the application stack
  nginx/           Reverse-proxy configuration
  documentation/   Setup, schema, seeding, deployment, architecture docs
  context/         Raw OCW course data and local assessment JSON used for seeding
  .env.example     Environment variable template
```

## Quick start (local development)

See [documentation/setup.md](documentation/setup.md) for the full guide.

The main local checkout is expected to stay on `develop`. Autonomous and manual work should usually happen on short-lived feature branches created from `develop`, or by continuing the current in-progress feature branch when that slice is not finished yet. The expected flow is: choose the next feature, continue or create a brief descriptive branch, build, test, open a PR if the slice is complete, and otherwise leave precise next-session notes.

```bash
# 1. Copy env template
cp .env.example .env
# Edit .env with your values

# 2. Start local Supabase
cd supabase && supabase start

# 3. Run migrations
supabase db push

# 4. Seed course content and assessments
cd scripts && npm install
npm run seed:content
npm run seed:assessments

# 5. Start the frontend
cd ../frontend && npm install && npm run dev
```

## Self-hosting

See [documentation/deployment.md](documentation/deployment.md) for production self-hosting with Docker Compose + nginx.

## License

Application code: MIT. Course content: CC BY-NC-SA 4.0 (MIT OpenCourseWare).
