/* Build one self-contained HTML file per app: every stylesheet, script and image
   is inlined (images as data: URIs). Output: dist/lumzi-admin.html, dist/lumzi-student.html.
   Usage: npm run build:standalone [-- --env staging]
   The pages still talk to the API at /api, so serve them from the Lumzi server (same origin)
   to sign in and load courses. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUB = path.join(ROOT, "public"), OUT = path.join(ROOT, "dist");
const i = process.argv.indexOf("--env"), ENV = i > -1 ? process.argv[i + 1] : "staging";
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config", `${ENV}.json`), "utf8"));

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon" };
const dataUri = file => {
  const ext = path.extname(file).toLowerCase(), buf = fs.readFileSync(file);
  return ext === ".svg" ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buf.toString("utf8"))}` : `data:${MIME[ext]};base64,${buf.toString("base64")}`;
};

/* Same env script the server sends at /env.js (STAGING badge + page title prefix). */
const publicEnv = { name: cfg.name, label: cfg.label, storageKey: cfg.storageKey, banner: cfg.banner, version: cfg.version, api: true };
const envJs = `window.APP_ENV = ${JSON.stringify(publicEnv)};
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

function build(app, outName) {
  const dir = path.join(PUB, app);
  // the server looks in the app folder first, then in public/
  const resolve = ref => {
    const clean = ref.split(/[?#]/)[0].replace(/^\//, "");
    for (const f of [path.join(dir, clean), path.join(PUB, clean)]) if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
    throw new Error(`${app}: can't find ${ref}`);
  };
  const used = new Set();
  // every "assets/..." or "/assets/..." reference (HTML, CSS or JS strings) becomes a data: URI
  const inlineAssets = text => text.replace(/\/?assets\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|svg|webp|ico)(?:\?v=\d+)?/g, ref => { used.add(ref.split("?")[0].replace(/^\//, "")); return dataUri(resolve(ref)) });
  const safeScript = js => js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
  const safeStyle = css => css.replace(/<\/style/gi, "<\\/style");

  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  html = html.replace(/<link rel="stylesheet" href="(?!https?:)([^"]+)">/g, (_, href) =>
    `<style data-src="${href.split("?")[0]}">\n${safeStyle(inlineAssets(fs.readFileSync(resolve(href), "utf8")))}\n</style>`);
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
    const name = src.split("?")[0].replace(/^\//, "");
    const code = name === "env.js" ? envJs : inlineAssets(fs.readFileSync(resolve(src), "utf8"));
    return `<script data-src="${name}">\n${safeScript(code)}\n</script>`;
  });
  html = inlineAssets(html);
  html = html.replace("<head>", `<head>\n<!-- Lumzi LMS ${app === "admin" ? "admin panel" : "student site"}: single-file build (${ENV}, ${new Date().toISOString().slice(0, 10)}). CSS, JS and images are inlined. -->`);

  // anything still pointing at a local file (template placeholders and in-app links are fine)
  const leftovers = [...html.matchAll(/\s(?:href|src)="(?!data:|https?:|#|\/#|\/admin\/|\/"|mailto:|\$\{)([^"]+)"/g)].map(m => m[1]);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, outName), html);
  const kb = Math.round(fs.statSync(path.join(OUT, outName)).size / 1024);
  console.log(`  ${outName}: ${kb} KB, ${used.size} images inlined${leftovers.length ? `, unresolved: ${leftovers.join(", ")}` : ""}`);
}

console.log(`[${ENV}] building single-file HTML into dist/`);
build("admin", "lumzi-admin.html");
build("app", "lumzi-student.html");
