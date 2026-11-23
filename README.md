# Lumzi LMS: local staging

Lumzi LMS (branding from lumzi.io) with a PostgreSQL database behind it.

## Run locally

```powershell
npm install
npm run staging
```

- **Student site:** http://127.0.0.1:5520/ (Coursera-style: browse, course pages, learning view, quizzes, My Learning, certificates)
- **Admin panel:** http://127.0.0.1:5520/admin/ (Studio, quiz builder, learners)

On first start the server creates the database, runs migrations, seeds the course catalog and creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.

## Sign-in

- Students sign up on the student site with name, email and password.
- Admins can't be created by signing up. Use `.env` (first admin), the **Make admin** button on the admin Learners page, or:
  `npm run db:set-password -- someone@example.com "new password" --admin`
- Passwords are hashed with scrypt. Sessions are HttpOnly cookies (30 days). Changing a password signs out other devices.
- 8 wrong passwords for the same email from the same address in 15 minutes blocks further tries for a while.
- Every Studio/editing API is admin-only; students only see published courses and need to enroll to open lessons and quizzes.

## Folders

- `public/app/` student site, `public/admin/` admin panel, `public/assets/` shared images
- `api.js` (auth, admin state), `api-content.js` (modules, content, quizzes), `api-student.js` (catalog, learning, progress, learners), `auth.js` (password hashing)

With no `DATABASE_URL`, the app uses **PGlite**: the real Postgres engine running inside Node, stored in `.data/pglite-staging/`. Nothing to install.

## Move to Neon

1. Create a project at neon.tech and copy its connection string (Project > Connect).
2. `copy .env.example .env` and set `DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require`.
3. `npm run db:migrate` then `npm run db:seed` (or just start the server: it migrates on boot and seeds an empty catalog).
4. `npm run staging`. The `/healthz` response shows `"db":"postgres"`.

The same SQL migrations run on both. Local PGlite data is not copied to Neon; Neon starts from the seed.

## Database commands

| Command | Does |
|---|---|
| `npm run db:migrate` | Applies new files in `db/migrations/` (tracked in `schema_migrations`) |
| `npm run db:seed` | Adds the default courses; never overwrites existing ones |
| `npm run db:reset` | Drops everything and re-creates it. Refuses on a hosted DB unless you add `-- --yes-really` |

Add schema changes as new numbered files (`002_xxx.sql`), never by editing `001_init.sql` once it has run on Neon.

## Schema

- `users`: name, email (unique), notification prefs, last opened course
- `sessions`: sign-in sessions (SHA-256 of an HttpOnly cookie token, 30 days)
- `courses`: Lumzi courses (editable in Studio) and partner courses (`is_partner`)
- `lessons`: ordered lessons per course
- `enrollments`: user/course, enrolled and completed dates
- `lesson_progress`: which lessons each learner finished (by lesson id, so deleting a lesson doesn't shift progress)
- `modules`: groups of lessons in a course (every course starts with "Home")
- `lesson_blocks`: content inside a lesson: reading, embed (YouTube/Vimeo/Drive/Loom or any link), quiz, assignment
- `quiz_questions`: MCQ (one or more correct), Choose the correct (fill the blank), True/False, Match the pairs, Arrange in order, Short answer
- `quiz_attempts`: every attempt, auto-graded on the server (partial marks for blanks, match and order). Passing marks the lesson complete.
- `assignment_submissions`: one per learner per assignment (text and/or link), visible in Studio

Studio: `#/studio/<course>` (modules and content), `#/studio/<course>/quiz/<id>` (quiz builder), `#/studio/<course>/assignment/<id>` (submissions).
Learner: `#/course/<course>/lesson/<lessonId>`.

## API (`/api`)

`GET /state` · `POST /auth/join|signin|signout` · `PATCH /me` · `POST /enrollments` · `PUT /enrollments/:course/lessons/:pos` ·
`POST /courses` · `PATCH|DELETE /courses/:id` · `POST /courses/:id/lessons` · `DELETE /courses/:id/lessons/:pos` · `POST /reset`

Writes must be same-origin JSON. Theme and banner state stay in the browser (`localStorage`); everything else is in Postgres.

## Known gaps before real users

- No "forgot password" email yet (needs an email service). Admins reset passwords with `npm run db:set-password`.
- No email verification on sign-up.
- The login throttle is in memory, so it resets when the server restarts.
