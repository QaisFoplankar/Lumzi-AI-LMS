/* npm run db:migrate | db:seed | db:reset   (add --env <name>; uses DATABASE_URL when set)
   npm run db:set-password -- <email> <new password> [--admin]   sets a password (and optionally makes the user an admin) */
import fs from "node:fs";
import { connect, migrate, seed } from "./index.js";
import { hashPassword, passwordProblem } from "../auth.js";

if (fs.existsSync(".env")) process.loadEnvFile(".env");
const cmd = process.argv[2];
const i = process.argv.indexOf("--env");
const env = i > -1 ? process.argv[i + 1] : process.env.APP_ENV || "staging";

const db = await connect({ env });
console.log(`[${env}] ${db.describe()}`);
try {
  if (cmd === "reset") {
    if (db.kind !== "pglite" && !process.argv.includes("--yes-really")) {
      console.error("Refusing to drop a hosted database. Re-run with --yes-really if you mean it."); process.exit(1);
    }
    await db.exec(`drop schema public cascade; create schema public;`);
    console.log("  dropped all tables");
  }
  if (["migrate", "seed", "reset"].includes(cmd)) await migrate(db);
  if (["seed", "reset"].includes(cmd)) await seed(db);
  if (cmd === "set-password") {
    const [email, pw] = process.argv.slice(3).filter(a => !a.startsWith("--") && a !== env);
    const bad = !email ? "Give an email." : passwordProblem(pw);
    if (bad) { console.error(bad); process.exitCode = 1 }
    else {
      await migrate(db);
      const r = await db.query(`update users set password_hash = $2${process.argv.includes("--admin") ? ", role = 'admin'" : ""}, updated_at = now() where email = $1 returning role`, [email.toLowerCase(), await hashPassword(pw)]);
      console.log(r.rows[0] ? `  password set for ${email} (role: ${r.rows[0].role})` : `  no user with email ${email}`);
      await db.query(`delete from sessions where user_id = (select id from users where email = $1)`, [email.toLowerCase()]);
    }
  }
  if (!["migrate", "seed", "reset", "set-password"].includes(cmd)) { console.error("Usage: node db/cli.js migrate|seed|reset|set-password [--env name]"); process.exitCode = 1 }
} finally { await db.close() }
