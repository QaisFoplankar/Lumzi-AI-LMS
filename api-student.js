/* Student site API: published catalog, course pages, the learning view and progress.
   Partner sample courses are not part of the student site. Drafts are visible to admins only. */

export function registerStudent(on, { fail, str, refreshCompletion, outlineFor }) {
  const visible = user => user && user.role === "admin" ? "true" : "c.status = 'published'";

  const courseRows = async (db, user, where = "true", params = []) => (await db.query(
    `select c.id, c.title, c.description, c.status, c.subject, c.level, c.color, c.abbr, c.is_new,
            (select count(*) from modules m where m.course_id = c.id)::int modules,
            (select count(*) from lessons l where l.course_id = c.id)::int lessons,
            (select count(*) from enrollments e where e.course_id = c.id)::int learners,
            (select count(*) filter (where b.kind = 'embed') from lesson_blocks b join lessons l on l.id = b.lesson_id where l.course_id = c.id)::int videos,
            (select count(*) filter (where b.kind = 'reading') from lesson_blocks b join lessons l on l.id = b.lesson_id where l.course_id = c.id)::int readings,
            (select count(*) filter (where b.kind = 'quiz') from lesson_blocks b join lessons l on l.id = b.lesson_id where l.course_id = c.id)::int quizzes,
            (select count(*) filter (where b.kind = 'assignment') from lesson_blocks b join lessons l on l.id = b.lesson_id where l.course_id = c.id)::int assignments
       from courses c where not c.is_partner and ${visible(user)} and ${where}
      order by c.sort_order, c.created_at`, params)).rows;

  const progressFor = async (db, userId, courseIds) => {
    if (!userId || !courseIds.length) return {};
    const rows = (await db.query(
      `select e.course_id, e.enrolled_at, e.completed_at::text completed_at,
              coalesce(array_agg(p.lesson_id) filter (where p.lesson_id is not null), '{}') done
         from enrollments e left join lesson_progress p on p.user_id = e.user_id and p.course_id = e.course_id
        where e.user_id = $1 and e.course_id = any($2::text[]) group by e.course_id, e.enrolled_at, e.completed_at`, [userId, courseIds])).rows;
    return Object.fromEntries(rows.map(r => [r.course_id, { enrolledAt: r.enrolled_at, completedAt: r.completed_at, done: r.done.map(Number) }]));
  };

  /* Catalog: every published course with counts, and the viewer's progress. */
  on("GET", "/catalog", false, async ({ db, user }) => {
    const courses = await courseRows(db, user);
    const prog = await progressFor(db, user && user.id, courses.map(c => c.id));
    return courses.map(c => ({ ...c, progress: prog[c.id] || null }));
  });

  /* Course page: outline with lesson titles and content types only (no lesson content). */
  on("GET", "/catalog/:id", false, async ({ db, user, p }) => {
    const c = (await courseRows(db, user, "c.id = $1", [p.id]))[0] || fail(404, "Course not found.");
    const o = (await outlineFor(db, [c.id]))[c.id] || { mods: [] };
    const outline = o.mods.map(m => ({ id: m.id, title: m.t, lessons: m.lessons.map(l => ({ id: l.id, title: l.t, kinds: l.blocks.map(b => b.kind) })) }));
    const prog = (await progressFor(db, user && user.id, [c.id]))[c.id] || null;
    return { ...c, outline, progress: prog };
  });

  /* Learning view: full lesson content for enrolled learners (and admins). */
  on("GET", "/learn/:id", true, async ({ db, user, p }) => {
    const c = (await courseRows(db, user, "c.id = $1", [p.id]))[0] || fail(404, "Course not found.");
    const prog = (await progressFor(db, user.id, [c.id]))[c.id];
    if (!prog && user.role !== "admin") fail(403, "Enroll in this course to start learning.");
    const o = (await outlineFor(db, [c.id]))[c.id] || { mods: [] };
    const outline = o.mods.map(m => ({ id: m.id, title: m.t, lessons: m.lessons.map(l => ({ id: l.id, title: l.t, i: l.i, blocks: l.blocks })) }));
    return { ...c, outline, progress: prog || { enrolledAt: null, completedAt: null, done: [], preview: true } };
  });

  /* Mark a lesson complete or not. */
  on("PUT", "/progress/:lessonId", true, async ({ db, user, p, body }) => db.tx(async t => {
    const l = (await t.query(
      `select l.id, l.course_id from lessons l join enrollments e on e.course_id = l.course_id and e.user_id = $1 where l.id = $2`,
      [user.id, Number(p.lessonId) || 0])).rows[0] || fail(404, "Lesson not found, or you're not enrolled.");
    if (body.done) await t.query(`insert into lesson_progress (user_id, course_id, lesson_id) values ($1,$2,$3) on conflict do nothing`, [user.id, l.course_id, l.id]);
    else await t.query(`delete from lesson_progress where user_id = $1 and lesson_id = $2`, [user.id, l.id]);
    await refreshCompletion(t.query, l.course_id, user.id);
    await t.query(`update users set last_course_id = $2 where id = $1`, [user.id, l.course_id]);
    const r = (await t.query(
      `select e.completed_at::text completed_at, coalesce(array_agg(p.lesson_id) filter (where p.lesson_id is not null), '{}') done
         from enrollments e left join lesson_progress p on p.user_id = e.user_id and p.course_id = e.course_id
        where e.user_id = $1 and e.course_id = $2 group by e.completed_at`, [user.id, l.course_id])).rows[0];
    return { completedAt: r.completed_at, done: r.done.map(Number) };
  }));

  /* My Learning: enrolled courses with progress and where to resume. */
  on("GET", "/my/courses", true, async ({ db, user }) => {
    const rows = (await db.query(
      `select c.id, c.title, c.description, c.subject, c.level, c.color, c.abbr, c.status,
              e.enrolled_at, e.completed_at::text completed_at,
              (select count(*) from lessons l where l.course_id = c.id)::int lessons,
              (select count(*) from lesson_progress p where p.user_id = e.user_id and p.course_id = c.id)::int done,
              (select cl.id from course_lessons cl where cl.course_id = c.id
                  and not exists (select 1 from lesson_progress p where p.user_id = e.user_id and p.lesson_id = cl.id)
                order by cl.idx limit 1) next_lesson,
              (select cl.title from course_lessons cl where cl.course_id = c.id
                  and not exists (select 1 from lesson_progress p where p.user_id = e.user_id and p.lesson_id = cl.id)
                order by cl.idx limit 1) next_title
         from enrollments e join courses c on c.id = e.course_id
        where e.user_id = $1 and not c.is_partner order by e.enrolled_at desc`, [user.id])).rows;
    return rows;
  });

  /* Admin: learners and their progress. */
  on("GET", "/admin/learners", "admin", async ({ db }) => (await db.query(
    `select u.id, u.name, u.email, u.role, u.created_at,
            coalesce(json_agg(json_build_object('course', c.title, 'courseId', c.id, 'done',
                (select count(*) from lesson_progress p where p.user_id = u.id and p.course_id = c.id),
                'lessons', (select count(*) from lessons l where l.course_id = c.id),
                'completedAt', e.completed_at, 'enrolledAt', e.enrolled_at) order by e.enrolled_at desc)
              filter (where c.id is not null), '[]') courses,
            (select count(*) from quiz_attempts q where q.user_id = u.id)::int attempts,
            (select count(*) from assignment_submissions s where s.user_id = u.id)::int submissions
       from users u left join enrollments e on e.user_id = u.id left join courses c on c.id = e.course_id and not c.is_partner
      group by u.id order by u.created_at desc`)).rows);

  on("PATCH", "/admin/users/:id", "admin", async ({ db, user, p, body }) => {
    if (!["student", "admin"].includes(body.role)) fail(400, "Role must be student or admin.");
    if (Number(p.id) === user.id && body.role !== "admin") fail(400, "You can't remove your own admin access.");
    const r = await db.query(`update users set role = $2, updated_at = now() where id = $1 returning id`, [Number(p.id) || 0, body.role]);
    r.rows[0] || fail(404, "User not found.");
    return { ok: true };
  });
}
