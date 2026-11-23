/* Database adapter.
   DATABASE_URL set   -> node-postgres Pool (Neon or any hosted Postgres).
   DATABASE_URL empty -> PGlite: real Postgres in-process, stored in .data/<env>. Nothing to install. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function connect({ env = "staging", url = process.env.DATABASE_URL } = {}) {
  if (url) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX || 5), idleTimeoutMillis: 10_000 });
    return {
      kind: "postgres",
      describe: () => { const u = new URL(url); return `postgres://${u.hostname}${u.pathname}` },
      query: (text, params) => pool.query(text, params),
      exec: text => pool.query(text),
      async tx(fn) {
        const c = await pool.connect();
        try { await c.query("begin"); const r = await fn({ query: (t, p) => c.query(t, p) }); await c.query("commit"); return r }
        catch (e) { await c.query("rollback").catch(() => {}); throw e }
        finally { c.release() }
      },
      close: () => pool.end()
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(ROOT, ".data", `pglite-${env}`);
  fs.mkdirSync(dir, { recursive: true });
  const db = await PGlite.create(dir);
  return {
    kind: "pglite",
    describe: () => `pglite:${path.relative(ROOT, dir)}`,
    query: (text, params) => db.query(text, params),
    exec: text => db.exec(text),
    tx: fn => db.transaction(t => fn({ query: (q, p) => t.query(q, p) })),
    close: () => db.close()
  };
}

/* Apply db/migrations/*.sql in name order, each once, each in its own transaction. */
export async function migrate(db, log = console.log) {
  await db.exec(`create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())`);
  const done = new Set((await db.query("select version from schema_migrations")).rows.map(r => r.version));
  const dir = path.join(ROOT, "db", "migrations");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    await db.tx(async t => {
      for (const stmt of splitSql(sql)) await t.query(stmt);
      await t.query("insert into schema_migrations(version) values ($1)", [f]);
    });
    log(`  applied ${f}`);
  }
}
// Migrations are simple DDL; split on semicolons at line ends (no functions/DO blocks).
const splitSql = sql => sql.replace(/--.*$/gm, "").split(/;\s*$/m).map(s => s.trim()).filter(Boolean);

/* Insert the default catalog. Idempotent: existing courses are left untouched. */
export async function seed(db, log = console.log) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "db", "seed-data.json"), "utf8"));
  let added = 0;
  await db.tx(async t => {
    for (const c of [...data.courses, ...data.partnerCourses]) {
      const r = await t.query(
        `insert into courses (id, title, description, status, abbr, color, subject, level, is_new, is_partner, org, kind, duration, meta, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) on conflict (id) do nothing returning id`,
        [c.id, c.title, c.description, c.status, c.abbr, c.color, c.subject, c.level, c.is_new, !!c.org, c.org || null,
         c.kind || null, c.duration || null, JSON.stringify(c.meta || {}), c.sort_order]);
      if (!r.rows.length) continue;
      added++;
      const m = await t.query("insert into modules (course_id, position, title) values ($1, 0, 'Home') returning id", [c.id]);
      for (let i = 0; i < c.lessons.length; i++)
        await t.query("insert into lessons (course_id, module_id, position, title) values ($1,$2,$3,$4)", [c.id, m.rows[0].id, i, c.lessons[i]]);
    }
  });
  log(`  seed: ${added} course(s) added`);
}

/* Create or promote the admin named in .env (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME).
   An existing password is never overwritten, so a password changed in the app sticks. */
export async function ensureAdmin(db, { email, name, password }, hashPassword, log = console.log) {
  email = String(email || "").trim().toLowerCase();
  if (!email || !password) return;
  if (/^change-me/.test(password) || password.length < 12) return log("  ADMIN_PASSWORD in .env is the placeholder or shorter than 12 characters; no admin created.");
  const u = (await db.query("select id, role, password_hash from users where email = $1", [email])).rows[0];
  if (!u) {
    await db.query("insert into users (name, email, role, password_hash) values ($1, $2, 'admin', $3)", [name || "Admin", email, await hashPassword(password)]);
    return log(`  admin account created: ${email}`);
  }
  if (u.role !== "admin") await db.query("update users set role = 'admin' where id = $1", [u.id]);
  if (!u.password_hash) await db.query("update users set password_hash = $2 where id = $1", [u.id, await hashPassword(password)]);
}
