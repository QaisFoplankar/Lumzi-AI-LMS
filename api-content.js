/* Course content API: modules, lessons, content blocks, quiz builder + grading, assignments.
   Registered into the main router by api.js. */

const QTYPES = ["mcq", "blanks", "tf", "match", "order", "short"];
const KINDS = ["reading", "embed", "quiz", "assignment"];

export function registerContent(on, { fail, str, refreshCompletion }) {
  const int = v => Number.isInteger(Number(v)) ? Number(v) : fail(400, "Bad id.");
  const dirOf = v => v === -1 || v === 1 ? v : fail(400, "dir must be -1 or 1.");
  const httpUrl = v => { try { const u = new URL(v); return ["http:", "https:"].includes(u.protocol) ? u.href : "" } catch { return "" } };

  /* ----- ownership lookups (partner catalog courses are read-only) ----- */
  const ownModule = async (q, id) => (await q(`select m.id, m.course_id, m.position from modules m join courses c on c.id = m.course_id where m.id = $1 and not c.is_partner`, [int(id)])).rows[0] || fail(404, "Module not found.");
  const ownLesson = async (q, id) => (await q(`select l.id, l.course_id, l.module_id, l.position from lessons l join courses c on c.id = l.course_id where l.id = $1 and not c.is_partner`, [int(id)])).rows[0] || fail(404, "Lesson not found.");
  const ownBlock = async (q, id) => (await q(`select b.id, b.kind, b.body, b.lesson_id, b.position, l.course_id from lesson_blocks b join lessons l on l.id = b.lesson_id join courses c on c.id = l.course_id where b.id = $1 and not c.is_partner`, [int(id)])).rows[0] || fail(404, "Content not found.");
  const ownQuestion = async (q, id) => (await q(`select qq.id, qq.block_id, qq.position from quiz_questions qq join lesson_blocks b on b.id = qq.block_id join lessons l on l.id = b.lesson_id join courses c on c.id = l.course_id where qq.id = $1 and not c.is_partner`, [int(id)])).rows[0] || fail(404, "Question not found.");

  /* ----- generic reorder / delete-and-close-gap ----- */
  async function move(q, table, parentCol, id, dir) {
    const r = (await q(`select ${parentCol} parent, position from ${table} where id = $1`, [id])).rows[0];
    const nb = (await q(`select id from ${table} where ${parentCol} = $1 and position = $2`, [r.parent, r.position + dir])).rows[0];
    if (!nb) return;
    await q(`update ${table} set position = $2 where id = $1`, [nb.id, r.position]);
    await q(`update ${table} set position = $2 where id = $1`, [id, r.position + dir]);
  }
  async function removeAt(q, table, parentCol, id) {
    const r = (await q(`delete from ${table} where id = $1 returning ${parentCol} parent, position`, [id])).rows[0];
    if (r) await q(`update ${table} set position = position - 1 where ${parentCol} = $1 and position > $2`, [r.parent, r.position]);
  }
  const nextPos = async (q, table, parentCol, parent) => (await q(`select coalesce(max(position), -1) + 1 n from ${table} where ${parentCol} = $1`, [parent])).rows[0].n;

  /* ================= Modules ================= */
  on("POST", "/courses/:id/modules", "admin", async ({ db, p, body }) => {
    const title = str(body.title, 160) || fail(400, "Name the module.");
    return db.tx(async t => {
      (await t.query(`select id from courses where id = $1 and not is_partner for update`, [p.id])).rows[0] || fail(404, "Course not found.");
      const r = await t.query(`insert into modules (course_id, position, title) values ($1, $2, $3) returning id`, [p.id, await nextPos(t.query, "modules", "course_id", p.id), title]);
      return { id: r.rows[0].id };
    });
  });
  on("PATCH", "/modules/:id", "admin", async ({ db, p, body }) => {
    const m = await ownModule(db.query, p.id);
    const title = str(body.title, 160) || fail(400, "Name the module.");
    await db.query(`update modules set title = $2 where id = $1`, [m.id, title]);
    return { ok: true };
  });
  on("DELETE", "/modules/:id", "admin", async ({ db, p }) => db.tx(async t => {
    const m = await ownModule(t.query, p.id);
    await removeAt(t.query, "modules", "course_id", m.id);
    await refreshCompletion(t.query, m.course_id);
    return { ok: true };
  }));
  on("POST", "/modules/:id/move", "admin", async ({ db, p, body }) => db.tx(async t => {
    const m = await ownModule(t.query, p.id); await move(t.query, "modules", "course_id", m.id, dirOf(body.dir)); return { ok: true };
  }));

  /* ================= Lessons ================= */
  on("POST", "/modules/:id/lessons", "admin", async ({ db, p, body }) => {
    const title = str(body.title, 200) || fail(400, "Name the lesson.");
    return db.tx(async t => {
      const m = await ownModule(t.query, p.id);
      const r = await t.query(`insert into lessons (course_id, module_id, position, title) values ($1, $2, $3, $4) returning id`,
        [m.course_id, m.id, await nextPos(t.query, "lessons", "module_id", m.id), title]);
      await refreshCompletion(t.query, m.course_id);
      return { id: r.rows[0].id };
    });
  });
  on("PATCH", "/lessons/:id", "admin", async ({ db, p, body }) => {
    const l = await ownLesson(db.query, p.id);
    const title = str(body.title, 200) || fail(400, "Name the lesson.");
    await db.query(`update lessons set title = $2 where id = $1`, [l.id, title]);
    return { ok: true };
  });
  on("DELETE", "/lessons/:id", "admin", async ({ db, p }) => db.tx(async t => {
    const l = await ownLesson(t.query, p.id);
    await removeAt(t.query, "lessons", "module_id", l.id);
    await refreshCompletion(t.query, l.course_id);
    return { ok: true };
  }));
  on("POST", "/lessons/:id/move", "admin", async ({ db, p, body }) => db.tx(async t => {
    const l = await ownLesson(t.query, p.id); await move(t.query, "lessons", "module_id", l.id, dirOf(body.dir)); return { ok: true };
  }));

  /* ================= Content blocks ================= */
  function cleanBody(kind, b = {}, prev = {}) {
    const v = { ...prev, ...b };
    switch (kind) {
      case "reading": { const text = str(v.text, 20000); if (!text) fail(400, "Write some reading text."); return { text } }
      case "embed": { const url = httpUrl(str(v.url, 2000)); if (!url) fail(400, "Enter a full link starting with https://"); return { url, caption: str(v.caption, 200) } }
      case "quiz": { const pass = Number(v.passPct ?? 60); return { title: str(v.title, 160) || "Quiz", passPct: Number.isFinite(pass) ? Math.min(100, Math.max(0, Math.round(pass))) : 60 } }
      case "assignment": return { title: str(v.title, 160) || "Assignment", instructions: str(v.instructions, 10000) };
    }
  }
  on("POST", "/lessons/:id/blocks", "admin", async ({ db, p, body }) => {
    if (!KINDS.includes(body.kind)) fail(400, "Unknown content type.");
    const data = cleanBody(body.kind, body.body);
    return db.tx(async t => {
      const l = await ownLesson(t.query, p.id);
      const r = await t.query(`insert into lesson_blocks (lesson_id, position, kind, body) values ($1, $2, $3, $4) returning id`,
        [l.id, await nextPos(t.query, "lesson_blocks", "lesson_id", l.id), body.kind, JSON.stringify(data)]);
      return { id: r.rows[0].id };
    });
  });
  on("PATCH", "/blocks/:id", "admin", async ({ db, p, body }) => {
    const b = await ownBlock(db.query, p.id);
    await db.query(`update lesson_blocks set body = $2, updated_at = now() where id = $1`, [b.id, JSON.stringify(cleanBody(b.kind, body.body, b.body))]);
    return { ok: true };
  });
  on("DELETE", "/blocks/:id", "admin", async ({ db, p }) => db.tx(async t => {
    const b = await ownBlock(t.query, p.id); await removeAt(t.query, "lesson_blocks", "lesson_id", b.id); return { ok: true };
  }));
  on("POST", "/blocks/:id/move", "admin", async ({ db, p, body }) => db.tx(async t => {
    const b = await ownBlock(t.query, p.id); await move(t.query, "lesson_blocks", "lesson_id", b.id, dirOf(body.dir)); return { ok: true };
  }));

  /* ================= Quiz builder (Studio) ================= */
  const texts = (arr, min, max, what, len = 300) => {
    if (!Array.isArray(arr)) fail(400, `Add ${what}.`);
    const out = arr.map(x => str(x, len));
    if (out.some(x => !x)) fail(400, `Fill in every ${what.replace(/s$/, "")} or remove the empty one.`);
    if (out.length < min) fail(400, `Add at least ${min} ${what}.`);
    if (out.length > max) fail(400, `Use at most ${max} ${what}.`);
    return out;
  };
  const idx = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
  function cleanQuestion(b) {
    const type = QTYPES.includes(b.type) ? b.type : fail(400, "Pick a question type.");
    const prompt = str(b.prompt, 2000) || fail(400, "Write the question.");
    const points = Math.min(100, Math.max(1, Math.round(Number(b.points) || 1)));
    const d = b.data || {};
    let data;
    switch (type) {
      case "mcq": {
        const options = texts(d.options, 2, 10, "options");
        const answers = [...new Set((d.answers || []).filter(i => idx(i, options.length)))].sort((a, b) => a - b);
        if (!answers.length) fail(400, "Mark at least one option as correct.");
        data = { options, answers }; break;
      }
      case "blanks": {
        const n = (prompt.match(/_{3,}/g) || []).length;
        if (!n) fail(400, "Put ___ (three underscores) in the sentence where each blank goes.");
        if (!Array.isArray(d.blanks) || d.blanks.length !== n) fail(400, `The sentence has ${n} blank${n > 1 ? "s" : ""}; give choices for each one.`);
        data = { blanks: d.blanks.map((bl, k) => {
          const options = texts(bl.options, 2, 8, `choices for blank ${k + 1}`, 120);
          if (!idx(bl.answer, options.length)) fail(400, `Pick the correct choice for blank ${k + 1}.`);
          return { options, answer: bl.answer };
        }) };
        break;
      }
      case "tf": if (typeof d.answer !== "boolean") fail(400, "Choose True or False as the correct answer."); data = { answer: d.answer }; break;
      case "match": {
        if (!Array.isArray(d.pairs) || d.pairs.length < 2) fail(400, "Add at least 2 pairs.");
        if (d.pairs.length > 12) fail(400, "Use at most 12 pairs.");
        const pairs = d.pairs.map(x => ({ left: str(x && x.left, 200), right: str(x && x.right, 200) }));
        if (pairs.some(x => !x.left || !x.right)) fail(400, "Fill in both sides of every pair.");
        if (new Set(pairs.map(x => x.right.toLowerCase())).size !== pairs.length) fail(400, "Each right-side answer must be different.");
        data = { pairs }; break;
      }
      case "order": data = { items: texts(d.items, 2, 12, "items", 200) }; break;
      case "short": data = { answers: texts(d.answers, 1, 10, "accepted answers", 200), caseSensitive: !!d.caseSensitive }; break;
    }
    return { type, prompt, points, data };
  }
  const fullQuiz = async (q, blockId) => {
    const b = (await q(`select id, body from lesson_blocks where id = $1`, [blockId])).rows[0];
    const questions = (await q(`select id, type, prompt, points, data from quiz_questions where block_id = $1 order by position`, [blockId])).rows;
    return { id: b.id, title: b.body.title, passPct: b.body.passPct, questions };
  };
  const ownQuiz = async (q, id) => { const b = await ownBlock(q, id); if (b.kind !== "quiz") fail(404, "Quiz not found."); return b };

  on("GET", "/studio/quizzes/:id", "admin", async ({ db, p }) => { const b = await ownQuiz(db.query, p.id); return fullQuiz(db.query, b.id) });
  on("POST", "/studio/quizzes/:id/questions", "admin", async ({ db, p, body }) => {
    const qn = cleanQuestion(body);
    return db.tx(async t => {
      const b = await ownQuiz(t.query, p.id);
      await t.query(`insert into quiz_questions (block_id, position, type, prompt, points, data) values ($1,$2,$3,$4,$5,$6)`,
        [b.id, await nextPos(t.query, "quiz_questions", "block_id", b.id), qn.type, qn.prompt, qn.points, JSON.stringify(qn.data)]);
      return fullQuiz(t.query, b.id);
    });
  });
  on("PATCH", "/studio/questions/:id", "admin", async ({ db, p, body }) => {
    const qq = await ownQuestion(db.query, p.id); const qn = cleanQuestion(body);
    await db.query(`update quiz_questions set type = $2, prompt = $3, points = $4, data = $5, updated_at = now() where id = $1`, [qq.id, qn.type, qn.prompt, qn.points, JSON.stringify(qn.data)]);
    return fullQuiz(db.query, qq.block_id);
  });
  on("DELETE", "/studio/questions/:id", "admin", async ({ db, p }) => db.tx(async t => {
    const qq = await ownQuestion(t.query, p.id); await removeAt(t.query, "quiz_questions", "block_id", qq.id); return fullQuiz(t.query, qq.block_id);
  }));
  on("POST", "/studio/questions/:id/move", "admin", async ({ db, p, body }) => db.tx(async t => {
    const qq = await ownQuestion(t.query, p.id); await move(t.query, "quiz_questions", "block_id", qq.id, dirOf(body.dir)); return fullQuiz(t.query, qq.block_id);
  }));

  /* ================= Taking a quiz (learner) ================= */
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
  // What a learner may see: no answer keys. Match/order items are shuffled and keep their original index.
  function publicQuestion(q) {
    const base = { id: q.id, type: q.type, prompt: q.prompt, points: q.points };
    const d = q.data;
    switch (q.type) {
      case "mcq": return { ...base, options: d.options, multi: d.answers.length > 1 };
      case "blanks": return { ...base, blanks: d.blanks.map(b => ({ options: b.options })) };
      case "tf": case "short": return base;
      case "match": return { ...base, lefts: d.pairs.map(x => x.left), rights: shuffle(d.pairs.map((x, i) => ({ i, text: x.right }))) };
      case "order": { let items = d.items.map((text, i) => ({ i, text })), s = shuffle(items); if (s.every((x, k) => x.i === k)) s = [...s.slice(1), s[0]]; return { ...base, items: s } }
    }
  }
  const norm = (s, cs) => { s = String(s ?? "").trim().replace(/\s+/g, " "); return cs ? s : s.toLowerCase() };
  // Returns the fraction earned (0..1) and the correct answer to show after submitting.
  function grade(q, a) {
    const d = q.data;
    switch (q.type) {
      case "mcq": { const got = Array.isArray(a) ? [...new Set(a)].sort((x, y) => x - y) : []; return { frac: JSON.stringify(got) === JSON.stringify(d.answers) ? 1 : 0, expected: d.answers.map(i => d.options[i]) } }
      case "blanks": { const got = Array.isArray(a) ? a : []; return { frac: d.blanks.filter((b, k) => got[k] === b.answer).length / d.blanks.length, expected: d.blanks.map(b => b.options[b.answer]) } }
      case "tf": return { frac: a === d.answer ? 1 : 0, expected: d.answer };
      case "match": { const got = Array.isArray(a) ? a : []; return { frac: d.pairs.filter((x, k) => got[k] === k).length / d.pairs.length, expected: d.pairs } }
      case "order": { const got = Array.isArray(a) ? a : []; return { frac: d.items.filter((x, k) => got[k] === k).length / d.items.length, expected: d.items } }
      case "short": { const ok = d.answers.some(x => norm(x, d.caseSensitive) === norm(a, d.caseSensitive)); return { frac: ok ? 1 : 0, expected: d.answers } }
    }
  }
  const quizBlock = async (q, id) => (await q(`select b.id, b.body, b.lesson_id, l.course_id from lesson_blocks b join lessons l on l.id = b.lesson_id where b.id = $1 and b.kind = 'quiz'`, [int(id)])).rows[0] || fail(404, "Quiz not found.");
  const lastAttempt = async (q, userId, blockId) => {
    const r = (await q(`select score::float score, max_score::float max, passed, created_at, count(*) over ()::int attempts from quiz_attempts where user_id = $1 and block_id = $2 order by created_at desc limit 1`, [userId, blockId])).rows[0];
    return r ? { score: r.score, max: r.max, pct: r.max ? Math.round(r.score / r.max * 100) : 0, passed: r.passed, at: r.created_at, attempts: r.attempts } : null;
  };

  on("GET", "/quizzes/:id", true, async ({ db, user, p }) => {
    const b = await quizBlock(db.query, p.id);
    if (user.role !== "admin") (await db.query(`select 1 from enrollments e join courses c on c.id = e.course_id where e.user_id = $1 and e.course_id = $2 and c.status = 'published'`, [user.id, b.course_id])).rows[0] || fail(403, "Enroll in the course to open this quiz.");
    const qs = (await db.query(`select id, type, prompt, points, data from quiz_questions where block_id = $1 order by position`, [b.id])).rows;
    return { id: b.id, title: b.body.title, passPct: b.body.passPct, questions: qs.map(publicQuestion), last: await lastAttempt(db.query, user.id, b.id) };
  });

  on("POST", "/quizzes/:id/attempts", true, async ({ db, user, p, body }) => db.tx(async t => {
    const b = await quizBlock(t.query, p.id);
    (await t.query(`select 1 from enrollments where user_id = $1 and course_id = $2`, [user.id, b.course_id])).rows[0] || fail(403, "Enroll in the course to take this quiz.");
    const qs = (await t.query(`select id, type, prompt, points, data from quiz_questions where block_id = $1 order by position`, [b.id])).rows;
    if (!qs.length) fail(400, "This quiz has no questions yet.");
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
    let score = 0, max = 0; const results = {};
    for (const q of qs) {
      const g = grade(q, answers[q.id]); const earned = Math.round(g.frac * q.points * 100) / 100;
      score += earned; max += q.points; results[q.id] = { frac: g.frac, earned, points: q.points, expected: g.expected };
    }
    const pct = max ? Math.round(score / max * 100) : 0, passed = pct >= b.body.passPct;
    await t.query(`insert into quiz_attempts (user_id, block_id, answers, score, max_score, passed) values ($1,$2,$3,$4,$5,$6)`,
      [user.id, b.id, JSON.stringify(answers), score, max, passed]);
    if (passed) {
      await t.query(`insert into lesson_progress (user_id, course_id, lesson_id) values ($1,$2,$3) on conflict do nothing`, [user.id, b.course_id, b.lesson_id]);
      await refreshCompletion(t.query, b.course_id, user.id);
    }
    return { score: Math.round(score * 100) / 100, max, pct, passed, passPct: b.body.passPct, results, lessonDone: passed };
  }));

  /* ================= Assignments ================= */
  const assignBlock = async (q, id) => (await q(`select b.id, b.lesson_id, l.course_id from lesson_blocks b join lessons l on l.id = b.lesson_id where b.id = $1 and b.kind = 'assignment'`, [int(id)])).rows[0] || fail(404, "Assignment not found.");
  on("GET", "/assignments/:id/mine", true, async ({ db, user, p }) => {
    const b = await assignBlock(db.query, p.id);
    return (await db.query(`select text, url, submitted_at from assignment_submissions where user_id = $1 and block_id = $2`, [user.id, b.id])).rows[0] || null;
  });
  on("POST", "/assignments/:id/submission", true, async ({ db, user, p, body }) => {
    const b = await assignBlock(db.query, p.id);
    (await db.query(`select 1 from enrollments where user_id = $1 and course_id = $2`, [user.id, b.course_id])).rows[0] || fail(403, "Enroll in the course to submit.");
    const text = str(body.text, 10000), rawUrl = str(body.url, 2000), url = rawUrl ? httpUrl(rawUrl) : "";
    if (rawUrl && !url) fail(400, "The link must start with https://");
    if (!text && !url) fail(400, "Write your answer or add a link.");
    await db.query(`insert into assignment_submissions (user_id, block_id, text, url) values ($1,$2,$3,$4)
                    on conflict (user_id, block_id) do update set text = excluded.text, url = excluded.url, submitted_at = now()`, [user.id, b.id, text, url]);
    return { text, url, submitted_at: new Date().toISOString() };
  });
  on("GET", "/studio/assignments/:id/submissions", "admin", async ({ db, p }) => {
    const b = await ownBlock(db.query, p.id); if (b.kind !== "assignment") fail(404, "Assignment not found.");
    return (await db.query(`select u.name, u.email, s.text, s.url, s.submitted_at from assignment_submissions s join users u on u.id = s.user_id where s.block_id = $1 order by s.submitted_at desc`, [b.id])).rows;
  });
}

/* Course outline for /state: modules > lessons > blocks (no quiz answers). */
export async function outlineFor(db, courseIds) {
  if (!courseIds.length) return {};
  const mods = (await db.query(`select id, course_id, title from modules where course_id = any($1::text[]) order by course_id, position`, [courseIds])).rows;
  const lessons = (await db.query(`select id, course_id, module_id, title, idx from course_lessons where course_id = any($1::text[]) order by course_id, idx`, [courseIds])).rows;
  const blocks = (await db.query(
    `select b.id, b.lesson_id, b.kind, b.body, (select count(*) from quiz_questions q where q.block_id = b.id)::int qn
       from lesson_blocks b join lessons l on l.id = b.lesson_id where l.course_id = any($1::text[]) order by b.lesson_id, b.position`, [courseIds])).rows;
  const byLesson = {};
  for (const b of blocks) (byLesson[b.lesson_id] ||= []).push({ id: b.id, kind: b.kind, ...b.body, ...(b.kind === "quiz" ? { qn: b.qn } : {}) });
  const out = {};
  for (const m of mods) (out[m.course_id] ||= { mods: [], lessons: [], lessonIds: [] }).mods.push({ id: m.id, t: m.title, lessons: [] });
  for (const l of lessons) {
    const o = out[l.course_id], m = o.mods.find(x => x.id === l.module_id);
    m.lessons.push({ id: l.id, t: l.title, i: l.idx, blocks: byLesson[l.id] || [] });
    o.lessons[l.idx] = l.title; o.lessonIds[l.idx] = l.id;
  }
  return out;
}
