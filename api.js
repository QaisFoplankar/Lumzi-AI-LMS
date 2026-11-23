/* JSON API backed by Postgres. Mounted by server.js under /api. */
import crypto from "node:crypto";
import { registerContent, outlineFor } from "./api-content.js";
import { registerStudent } from "./api-student.js";
import { hashPassword, verifyPassword, passwordProblem, throttle } from "./auth.js";

const SESSION_COOKIE = "lz_session";
const SESSION_DAYS = 30;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
const emailOk = v => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
const sha = t => crypto.createHash("sha256").update(t).digest("hex");

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status } }
const fail = (s, m) => { throw new HttpError(s, m) };

/* ---------- State the front end needs (same shape as the old localStorage S) ---------- */
const publicUser = u => u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null;
async function stateFor(db, user) {
  // The admin panel's state. Only admins get the course list (it includes drafts).
  if (!user || user.role !== "admin") return { user: publicUser(user), courses: [], enroll: {}, last: null, prefs: { email: true, remind: true } };
  const rows0 = (await db.query(
    `select c.id, c.title t, c.description d, c.status st, c.abbr ab, c.color c, c.subject s, c.level l, c.is_new "isNew"
       from courses c where not c.is_partner order by c.sort_order, c.created_at`)).rows;
  const outline = await outlineFor(db, rows0.map(c => c.id));
  const courses = rows0.map(c => ({ ...c, isNew: c.isNew ? 1 : undefined, lessons: [], lessonIds: [], mods: [], ...outline[c.id] }));
  const rows = (await db.query(
    `select e.course_id, (extract(epoch from e.enrolled_at) * 1000)::bigint::text at, e.completed_at::text done_at,
            coalesce(array_agg(le.idx order by le.idx) filter (where le.id is not null), '{}') done
       from enrollments e
       left join lesson_progress p on p.user_id = e.user_id and p.course_id = e.course_id
       left join course_lessons le on le.id = p.lesson_id
      where e.user_id = $1 group by e.course_id, e.enrolled_at, e.completed_at`, [user.id])).rows;
  const enroll = {};
  for (const r of rows) enroll[r.course_id] = { done: r.done.map(Number), at: Number(r.at), ...(r.done_at ? { doneAt: r.done_at } : {}) };
  return { user: publicUser(user), courses, enroll, last: user.last_course_id,
           prefs: { email: user.pref_email, remind: user.pref_remind } };
}

/* Mark an enrollment complete when every lesson is done, or clear it. */
const refreshCompletion = (q, courseId, userId = null) => q(
  `update enrollments e set completed_at = case
      when n.total > 0 and n.done >= n.total then coalesce(e.completed_at, current_date) else null end
     from (select e2.user_id, e2.course_id,
                  (select count(*) from lessons where course_id = e2.course_id) total,
                  (select count(*) from lesson_progress p where p.user_id = e2.user_id and p.course_id = e2.course_id) done
             from enrollments e2 where e2.course_id = $1 and ($2::int is null or e2.user_id = $2)) n
    where e.user_id = n.user_id and e.course_id = n.course_id`, [courseId, userId]);

/* ---------- Sessions ---------- */
function parseCookies(h = "") { return Object.fromEntries(h.split(/;\s*/).filter(Boolean).map(p => { const i = p.indexOf("="); return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))] })) }
async function currentUser(db, req) {
  const tok = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!tok) return null;
  const r = await db.query(`select u.* from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()`, [sha(tok)]);
  return r.rows[0] || null;
}
async function startSession(db, userId, req) {
  const tok = crypto.randomBytes(32).toString("base64url");
  await db.query(`delete from sessions where expires_at < now()`);
  await db.query(`insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`, [sha(tok), userId]);
  const secure = req.headers["x-forwarded-proto"] === "https" || req.socket.encrypted ? "; Secure" : "";
  return `${SESSION_COOKIE}=${tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}
const clearCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/* ---------- Routes ---------- */
const routes = [];
const on = (method, pattern, auth, fn) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), auth, fn });

on("GET", "/state", false, async ({ db, user }) => stateFor(db, user));

const clientIp = req => req.socket.remoteAddress || "?";

on("GET", "/me", false, async ({ user }) => ({ user: publicUser(user) }));

/* Students sign up themselves. Admins are created from the command line or .env. */
on("POST", "/auth/join", false, async ({ db, body, req }) => {
  const name = str(body.name, 80), email = str(body.email, 254).toLowerCase();
  if (!name || !emailOk(email)) fail(400, "Enter your name and a valid email.");
  const bad = passwordProblem(body.password); if (bad) fail(400, bad);
  const r = await db.query(`insert into users (name, email, password_hash, role) values ($1, $2, $3, 'student') on conflict (email) do nothing returning *`, [name, email, await hashPassword(body.password)]);
  if (!r.rows[0]) fail(409, "An account with this email already exists.");
  return { cookie: await startSession(db, r.rows[0].id, req), body: await stateFor(db, r.rows[0]) };
});

on("POST", "/auth/signin", false, async ({ db, body, req }) => {
  const email = str(body.email, 254).toLowerCase(), key = clientIp(req) + "|" + email;
  if (!emailOk(email) || typeof body.password !== "string" || !body.password) fail(400, "Enter your email and password.");
  if (throttle.blocked(key)) fail(429, "Too many attempts. Wait 15 minutes and try again.");
  const u = (await db.query(`select * from users where email = $1`, [email])).rows[0];
  const ok = await verifyPassword(body.password, u && u.password_hash);
  if (!u || !ok) { throttle.fail(key); fail(401, "That email and password don't match.") }
  if (body.admin && u.role !== "admin") fail(403, "This account doesn't have admin access.");
  throttle.clear(key);
  return { cookie: await startSession(db, u.id, req), body: await stateFor(db, u) };
});

on("POST", "/auth/signout", false, async ({ db, req }) => {
  const tok = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (tok) await db.query(`delete from sessions where token_hash = $1`, [sha(tok)]);
  return { cookie: clearCookie, body: { ok: true } };
});

on("PATCH", "/me", true, async ({ db, user, body }) => {
  const sets = [], vals = [];
  const set = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`) };
  if ("name" in body) { const n = str(body.name, 80); if (!n) fail(400, "Enter your name."); set("name", n) }
  if ("email" in body) { const m = str(body.email, 254).toLowerCase(); if (!emailOk(m)) fail(400, "Enter a valid email."); set("email", m) }
  if (body.prefs && typeof body.prefs.email === "boolean") set("pref_email", body.prefs.email);
  if (body.prefs && typeof body.prefs.remind === "boolean") set("pref_remind", body.prefs.remind);
  if ("last" in body) set("last_course_id", body.last && ID_RE.test(body.last) ? body.last : null);
  if (!sets.length) return { ok: true };
  vals.push(user.id);
  try { await db.query(`update users set ${sets.join(", ")}, updated_at = now() where id = $${vals.length}`, vals) }
  catch (e) { if (e.code === "23505") fail(409, "Another account already uses this email."); if (e.code === "23503") fail(404, "Course not found."); throw e }
  return { ok: true };
});

on("POST", "/me/password", true, async ({ db, user, body, req }) => {
  if (!(await verifyPassword(body.current, user.password_hash))) fail(400, "Your current password isn't right.");
  const bad = passwordProblem(body.next); if (bad) fail(400, bad);
  await db.query(`update users set password_hash = $2, updated_at = now() where id = $1`, [user.id, await hashPassword(body.next)]);
  // Sign out every other session; keep this one.
  const tok = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  await db.query(`delete from sessions where user_id = $1 and token_hash <> $2`, [user.id, sha(tok || "")]);
  return { ok: true };
});

on("POST", "/enrollments", true, async ({ db, user, body }) => {
  const id = str(body.courseId, 80);
  const c = (await db.query(`select id from courses where id = $1 and status = 'published'`, [id])).rows[0];
  if (!c) fail(404, "Course not found.");
  await db.query(`insert into enrollments (user_id, course_id) values ($1, $2) on conflict do nothing`, [user.id, id]);
  await db.query(`update users set last_course_id = $2 where id = $1`, [user.id, id]);
  return { ok: true };
});

on("PUT", "/enrollments/:course/lessons/:pos", true, async ({ db, user, p, body }) => {
  return db.tx(async t => {
    const le = (await t.query(
      `select le.id from course_lessons le join enrollments e on e.course_id = le.course_id and e.user_id = $1
        where le.course_id = $2 and le.idx = $3`, [user.id, p.course, Number(p.pos)])).rows[0];
    if (!le) fail(404, "Lesson or enrollment not found.");
    if (body.done) await t.query(`insert into lesson_progress (user_id, course_id, lesson_id) values ($1,$2,$3) on conflict do nothing`, [user.id, p.course, le.id]);
    else await t.query(`delete from lesson_progress where user_id = $1 and lesson_id = $2`, [user.id, le.id]);
    await refreshCompletion(t.query, p.course, user.id);
    await t.query(`update users set last_course_id = $2 where id = $1`, [user.id, p.course]);
    const e = (await t.query(`select completed_at::text d from enrollments where user_id = $1 and course_id = $2`, [user.id, p.course])).rows[0];
    return { doneAt: e.d || null };
  });
});

/* Studio */
on("POST", "/courses", "admin", async ({ db, body }) => {
  const id = str(body.id, 80), title = str(body.title, 160);
  if (!ID_RE.test(id) || !title) fail(400, "Give the course a title.");
  const r = await db.query(
    `insert into courses (id, title, description, abbr, color, sort_order)
     values ($1, $2, $3, $4, $5, (select coalesce(max(sort_order), -1) + 1 from courses where not is_partner))
     on conflict (id) do nothing returning id`,
    [id, title, str(body.description, 2000), str(body.abbr, 4), /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : "#2D5BD6"]);
  if (!r.rows[0]) fail(409, "A course with this id already exists.");
  await db.query(`insert into modules (course_id, position, title) values ($1, 0, 'Home')`, [id]);
  return { ok: true };
});

on("PATCH", "/courses/:id", "admin", async ({ db, p, body }) => {
  const sets = [], vals = [];
  const set = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`) };
  if ("title" in body) { const t = str(body.title, 160); if (!t) fail(400, "Give the course a title."); set("title", t) }
  if ("description" in body) set("description", str(body.description, 2000));
  if ("subject" in body) set("subject", str(body.subject, 60));
  if ("level" in body) set("level", str(body.level, 60));
  if ("status" in body) { if (!["draft", "published"].includes(body.status)) fail(400, "Bad status."); set("status", body.status) }
  if (!sets.length) return { ok: true };
  vals.push(p.id);
  const r = await db.query(`update courses set ${sets.join(", ")}, updated_at = now() where id = $${vals.length} and not is_partner returning id`, vals);
  if (!r.rows[0]) fail(404, "Course not found.");
  return { ok: true };
});

on("DELETE", "/courses/:id", "admin", async ({ db, p }) => {
  const r = await db.query(`delete from courses where id = $1 and not is_partner returning id`, [p.id]);
  if (!r.rows[0]) fail(404, "Course not found.");
  return { ok: true };
});

on("POST", "/courses/:id/lessons", "admin", async ({ db, p, body }) => {
  const title = str(body.title, 200);
  if (!title) fail(400, "Name the lesson.");
  return db.tx(async t => {
    const c = (await t.query(`select id from courses where id = $1 and not is_partner for update`, [p.id])).rows[0];
    if (!c) fail(404, "Course not found.");
    let m = (await t.query(`select id from modules where course_id = $1 order by position desc limit 1`, [p.id])).rows[0];
    if (!m) m = (await t.query(`insert into modules (course_id, position, title) values ($1, 0, 'Home') returning id`, [p.id])).rows[0];
    await t.query(`insert into lessons (course_id, module_id, position, title) values ($1, $2, (select coalesce(max(position), -1) + 1 from lessons where module_id = $2), $3)`, [p.id, m.id, title]);
    await refreshCompletion(t.query, p.id);
    return { ok: true };
  });
});

on("DELETE", "/courses/:id/lessons/:pos", "admin", async ({ db, p }) => {
  return db.tx(async t => {
    const r = await t.query(`delete from lessons where id = (select id from course_lessons where course_id = $1 and idx = $2) returning module_id, position`, [p.id, Number(p.pos)]);
    if (!r.rows[0]) fail(404, "Lesson not found.");
    await t.query(`update lessons set position = position - 1 where module_id = $1 and position > $2`, [r.rows[0].module_id, r.rows[0].position]);
    await refreshCompletion(t.query, p.id);
    return { ok: true };
  });
});

/* "Reset demo": clears this user's learning data and preferences. Courses are shared, so they stay. */
on("POST", "/reset", true, async ({ db, user }) => {
  await db.query(`delete from enrollments where user_id = $1`, [user.id]);
  await db.query(`delete from quiz_attempts where user_id = $1`, [user.id]);
  await db.query(`delete from assignment_submissions where user_id = $1`, [user.id]);
  await db.query(`update users set pref_email = true, pref_remind = true, last_course_id = null, updated_at = now() where id = $1`, [user.id]);
  return stateFor(db, user);
});

registerContent(on, { fail, str, refreshCompletion });
registerStudent(on, { fail, str, refreshCompletion, outlineFor });

/* ---------- Dispatcher ---------- */
async function readBody(req) {
  let size = 0; const chunks = [];
  for await (const ch of req) { size += ch.length; if (size > 100_000) fail(413, "Request too large."); chunks.push(ch) }
  if (!size) return {};
  try { const v = JSON.parse(Buffer.concat(chunks).toString("utf8")); return v && typeof v === "object" ? v : {} } catch { fail(400, "Invalid JSON.") }
}

export async function handleApi(db, req, res, pathname, baseHeaders) {
  const send = (status, obj, cookie) => {
    res.writeHead(status, { ...baseHeaders, "Content-Type": "application/json", ...(cookie ? { "Set-Cookie": cookie } : {}) });
    res.end(JSON.stringify(obj));
  };
  try {
    // Same-origin check for writes (blocks cross-site form/fetch posts riding the session cookie).
    if (req.method !== "GET") {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) fail(403, "Cross-origin request blocked.");
      if (!/application\/json/.test(req.headers["content-type"] || "") && req.headers["content-length"] !== "0" && req.method !== "DELETE") fail(415, "Send JSON.");
    }
    const sub = pathname.slice(4) || "/";
    const route = routes.find(r => r.method === req.method && r.re.test(sub));
    if (!route) fail(404, "Not found.");
    const p = Object.fromEntries(Object.entries(sub.match(route.re).groups || {}).map(([k, v]) => [k, decodeURIComponent(v)]));
    const user = await currentUser(db, req);
    if (route.auth && !user) fail(401, "Sign in first.");
    if (route.auth === "admin" && user.role !== "admin") fail(403, "Admins only.");
    const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};
    const out = await route.fn({ db, req, user, body, p });
    if (out && out.cookie !== undefined) return send(200, out.body, out.cookie);
    send(200, out);
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { error: e.message });
    console.error(`[api] ${req.method} ${pathname}`, e);
    send(500, { error: "Something went wrong on the server." });
  }
}
