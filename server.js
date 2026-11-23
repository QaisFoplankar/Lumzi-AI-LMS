/* Lumzi LMS server.
     /          student site   (public/app)
     /admin/    admin panel    (public/admin)
     /api/      JSON API
   Shared files (assets, env.css) live in public/ and are found from either app.
   Usage: node server.js [--env staging]   (default env: staging)
   Reads config/<env>.json and .env (DATABASE_URL for Neon; empty = local PGlite). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect, migrate, seed, ensureAdmin } from "./db/index.js";
import { hashPassword } from "./auth.js";
import { handleApi } from "./api.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(DIR, ".env"))) process.loadEnvFile(path.join(DIR, ".env"));

const argEnv = (() => { const i = process.argv.indexOf("--env"); return i > -1 ? process.argv[i + 1] : null })();
const ENV = argEnv || process.env.APP_ENV || "staging";
const cfgFile = path.join(DIR, "config", `${ENV}.json`);
if (!fs.existsSync(cfgFile)) { console.error(`No config for env "${ENV}" (${cfgFile})`); process.exit(1) }
const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
const HOST = process.env.HOST || cfg.host || "127.0.0.1";
const PORT = Number(process.env.PORT || cfg.port || 5520);
const ROOT = path.join(DIR, "public");

const db = await connect({ env: ENV });
console.log(`Database: ${db.describe()}`);
if (process.env.AUTO_MIGRATE !== "false") {
  await migrate(db);
  const n = (await db.query("select count(*)::int n from courses")).rows[0].n;
  if (!n) await seed(db);
}
await ensureAdmin(db, { email: process.env.ADMIN_EMAIL, name: process.env.ADMIN_NAME, password: process.env.ADMIN_PASSWORD }, hashPassword);

const TYPES = {".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".svg":"image/svg+xml",
  ".ico":"image/x-icon", ".webp":"image/webp", ".woff2":"font/woff2"};

const publicEnv = {name: cfg.name, label: cfg.label, storageKey: cfg.storageKey, banner: cfg.banner, version: cfg.version, api: true};

const envJs = () => `window.APP_ENV = ${JSON.stringify(publicEnv)};
(function () {
  var E = window.APP_ENV; if (!E || !E.banner) return;
  var tag = "[" + E.label + "] ";
  function fixTitle() { if (document.title.indexOf(tag) !== 0) document.title = tag + document.title }
  function add() {
    fixTitle();
    new MutationObserver(fixTitle).observe(document.querySelector("title"), {childList: true, characterData: true, subtree: true});
    var b = document.createElement("div");
    b.className = "env-badge"; b.setAttribute("role", "note");
    b.innerHTML = "<b>" + E.label + "</b><span>v" + E.version + " · Postgres</span>";
    document.body.appendChild(b);
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", add) : add();
})();
`;

const baseHeaders = {"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin", "X-App-Env": cfg.name};
function send(res, code, body, type) { res.writeHead(code, {...baseHeaders, "Content-Type": type}); res.end(body) }

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  if (p === "/api" || p.startsWith("/api/")) return handleApi(db, req, res, p, baseHeaders);
  if (p === "/env.js" || p === "/admin/env.js") return send(res, 200, envJs(), TYPES[".js"]);
  if (p === "/admin") { res.writeHead(302, {...baseHeaders, Location: "/admin/"}); return res.end() }
  if (p === "/healthz") {
    let dbOk = false; try { await db.query("select 1"); dbOk = true } catch {}
    return send(res, dbOk ? 200 : 503, JSON.stringify({ok: dbOk, env: cfg.name, version: cfg.version, db: db.kind}), TYPES[".json"]);
  }
  if (p === "/robots.txt") return send(res, 200, "User-agent: *\nDisallow: /\n", "text/plain");
  // Each app looks in its own folder first, then in the shared public/ folder.
  const admin = p.startsWith("/admin/"), rel = (admin ? p.slice(6) : p).replace(/\/$/, "/index.html");
  const tries = [path.join(ROOT, admin ? "admin" : "app", rel), path.join(ROOT, rel)].map(f => path.normalize(f));
  if (tries.some(f => !f.startsWith(ROOT + path.sep))) return send(res, 403, "Forbidden", "text/plain");
  const file = tries.find(f => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) return send(res, 404, "Not found", "text/plain");
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain");
    send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
  });
}).listen(PORT, HOST, () => console.log(`Lumzi LMS [${cfg.label}] student site http://${HOST}:${PORT}/  ·  admin panel http://${HOST}:${PORT}/admin/`));

const stop = async () => { await db.close().catch(() => {}); process.exit(0) };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
