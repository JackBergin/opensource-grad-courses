# Local Assessments

This directory is the repo-owned source of truth for seeded assessments.

Each `*.json` file maps to a single course and contains one or more assessment
sets that seed the `quizzes` and `quiz_questions` tables through:

```bash
cd /Users/jackbergin/Documents/opensource/mba/supabase/scripts
npm run seed:assessments
```

## Format

```json
{
  "course_slug": "15.401-fall-2008",
  "course_title": "Finance Theory I",
  "assessments": [
    {
      "title": "Finance Theory I - Capital Budgeting Practice Set",
      "description": "Short practice set tied to the readings page.",
      "kind": "practice_quiz",
      "difficulty": "medium",
      "generated_from": "readings",
      "time_limit_minutes": 20,
      "is_published": true,
      "questions": [
        {
          "question_type": "multiple_choice",
          "question_text": "Question text",
          "options": [
            { "id": "a", "text": "Option A" },
            { "id": "b", "text": "Option B" }
          ],
          "correct_answer": "a",
          "explanation": "Why A is correct.",
          "difficulty": "medium"
        }
      ]
    }
  ]
}
```

## Notes

- `kind` must be `practice_quiz` or `homework`.
- Exam-style sets currently map to `homework` because that is the existing DB enum.
- `generated_from` should match a real `course_pages.slug` when possible.
- Re-seeding is idempotent: quizzes are upserted and their questions are replaced.
