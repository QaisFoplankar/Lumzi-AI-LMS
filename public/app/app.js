/* =====================================================================
   Lumzi LMS: student site. Talks to the same API as the admin panel.
   Pages: home, browse, course page, course home + lesson player,
   My Learning, accomplishments, account, log in / sign up.
   ===================================================================== */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const fmtDate = d => new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-IN", {day:"numeric", month:"long", year:"numeric"});

class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status } }
async function api(method, path, body) {
  const r = await fetch("/api" + path, {method, credentials:"same-origin", headers: body ? {"Content-Type":"application/json"} : {}, body: body ? JSON.stringify(body) : undefined});
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, (data && data.error) || "Something went wrong. Try again.");
  return data;
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ---------- Icons ---------- */
const svg = (d, w = 20, sw = 2) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  video: svg('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor"/>', 18),
  reading: svg('<path d="M4 6h16M4 10h16M4 14h10M4 18h7"/>', 18),
  quiz: svg('<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.6M12 17h.01"/>', 18),
  assignment: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>', 18),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 16, 3),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 16, 3),
  chev: svg('<path d="m6 9 6 6 6-6"/>', 18, 2.4),
  right: svg('<path d="m9 6 6 6-6 6"/>', 18, 2.4),
  left: svg('<path d="m15 6-6 6 6 6"/>', 18, 2.4),
  up: svg('<path d="m18 15-6-6-6 6"/>', 16, 2.4),
  down: svg('<path d="m6 9 6 6 6-6"/>', 16, 2.4),
  ext: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', 16),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 20),
  layers: svg('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', 20),
  award: svg('<circle cx="12" cy="9" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/>', 20),
  bar: svg('<path d="M5 20V10M12 20V4M19 20v-7"/>', 20),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>', 22),
  dl: svg('<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>', 18),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 18)
};
const KIND = {reading:{label:"Reading", icon:IC.reading}, embed:{label:"Video", icon:IC.video}, quiz:{label:"Quiz", icon:IC.quiz}, assignment:{label:"Assignment", icon:IC.assignment}};

/* ---------- Course images ---------- */
const IMG = {tally:"/assets/courses/tally-prime-logo.png", msoffice:"/assets/courses/ms-office-365.jpg", msbasic:"/assets/courses/ms-basic-365.png", excel:"/assets/courses/advanced-excel.jpg", ai:"/assets/courses/ai-foundation.jpg", aif:"/assets/courses/ai-foundation.jpg"};
const FIT = {tally:"#ffffff", msoffice:"#eaf4fa", msbasic:"#efefef"};
function courseImg(c) {
  if (IMG[c.id]) return IMG[c.id];
  const t = (c.title || "").toLowerCase();
  if (/excel/.test(t)) return IMG.excel;
  if (/tally|gst/.test(t)) return IMG.tally;
  if (/office|word|powerpoint/.test(t)) return IMG.msoffice;
  if (/\bai\b|artificial|intelligence/.test(t)) return IMG.ai;
  return null;
}
function cover(c, cls = "") {
  const src = courseImg(c), fit = FIT[c.id] && src === IMG[c.id];
  return src ? `<div class="cv ${cls}${fit ? " fit" : ""}"${fit ? ` style="--fit:${FIT[c.id]}"` : ""}><img src="${src}" alt="" loading="lazy"></div>`
    : `<div class="cv ${cls} plain" style="--cc:${esc(c.color || "#2D5BD6")}"><span>${esc(c.abbr || c.title.slice(0, 2))}</span></div>`;
}
const titleCase = s => /^[A-Z0-9 &+-]+$/.test(s) ? s.toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase()).replace(/\bAi\b/g, "AI").replace(/\bMs\b/g, "MS") : s;

/* ---------- State ---------- */
const ST = {me:null, catalog:null, mine:null, page:{}, learn:{}};
const signedIn = () => !!ST.me;
async function getCatalog(force) { if (!ST.catalog || force) ST.catalog = await api("GET", "/catalog"); return ST.catalog }
async function getMine(force) { if (!signedIn()) return []; if (!ST.mine || force) ST.mine = await api("GET", "/my/courses"); return ST.mine }
async function getLearn(id, force) { if (!ST.learn[id] || force) ST.learn[id] = await api("GET", "/learn/" + encodeURIComponent(id)); return ST.learn[id] }
function invalidate() { ST.catalog = null; ST.mine = null; ST.page = {} }

/* ---------- Router ---------- */
let route = "", args = [], params = {};
function parse() {
  const raw = (location.hash || "#/").replace(/^#\/?/, ""), [path, qs] = raw.split("?");
  params = Object.fromEntries(new URLSearchParams(qs || ""));
  const p = path.split("/").filter(Boolean).map(decodeURIComponent);
  if (!p.length) { route = "home"; args = []; return }
  if (p[0] === "course" && p[2] === "lesson") { route = "lesson"; args = [p[1], p[3]]; return }
  route = p[0]; args = p.slice(1);
}
const NEEDS_LOGIN = ["my-learning", "accomplishments", "account", "course", "lesson"];
const nextParam = () => "?next=" + encodeURIComponent(location.hash.slice(2) || "");

let renderSeq = 0;
async function render() {
  parse();
  const seq = ++renderSeq, main = $("#main");
  closeMenus();
  if (NEEDS_LOGIN.includes(route) && !signedIn()) { location.replace("#/login" + nextParam()); return }
  if ((route === "login" || route === "signup") && signedIn()) { location.replace("#/" + (params.next || "")); return }
  renderHeader();
  document.body.dataset.route = route;
  const view = V[route] || V.notfound;
  const slow = setTimeout(() => { if (seq === renderSeq) main.innerHTML = `<div class="wrap pad"><div class="loading" role="status"><span></span>Loading…</div></div>` }, 160);
  let html;
  try { html = await view(...args) }
  catch (e) {
    if (e.status === 401) { ST.me = null; location.replace("#/login" + nextParam()); return }
    html = errorPage(e.status === 404 ? "We couldn't find that page" : e.status === 403 ? "You don't have access to this yet" : "Something went wrong", e.message);
  }
  clearTimeout(slow);
  if (seq !== renderSeq) return;
  main.innerHTML = html;
  const keepScroll = render.keep; render.keep = false;
  if (!keepScroll) window.scrollTo(0, 0);
  if (AFTER[route]) AFTER[route](...args);
  motion(main);
}
const rerender = () => { render.keep = true; return render() };
addEventListener("hashchange", () => { const sb = $("#sb"); if (sb) sb.classList.remove("open"); render() });

const errorPage = (h, p) => `<div class="wrap pad"><div class="empty"><h1>${esc(h)}</h1><p>${esc(p)}</p><a class="btn btn-primary" href="#/browse">Browse courses</a></div></div>`;

/* ---------- Header ---------- */
function renderHeader() {
  const r = $("#hdRight");
  if (!signedIn()) {
    r.innerHTML = `<a class="hd-link hide-sm" href="#/login${route === "login" || route === "signup" ? "" : nextParam()}">Log In</a><a class="btn btn-primary btn-sm" href="#/signup${route === "login" || route === "signup" ? "" : nextParam()}">Join for Free</a>`;
  } else {
    const n = ST.me.name;
    r.innerHTML = `<a class="hd-link hide-sm${route === "my-learning" ? " on" : ""}" href="#/my-learning">My Learning</a>
      <div class="acct"><button class="avatar" id="avatarBtn" aria-expanded="false" aria-controls="acctMenu" aria-label="Account menu for ${esc(n)}">${esc(n[0].toUpperCase())}</button>
        <div class="menu right" id="acctMenu" role="menu" hidden>
          <div class="menu-h"><b>${esc(n)}</b><small>${esc(ST.me.email)}</small></div>
          <a role="menuitem" href="#/my-learning">My Learning</a>
          <a role="menuitem" href="#/accomplishments">Accomplishments</a>
          <a role="menuitem" href="#/account">Account settings</a>
          ${ST.me.role === "admin" ? `<a role="menuitem" href="/admin/">Admin panel</a>` : ""}
          <button role="menuitem" data-a="logout">Log out</button>
        </div></div>`;
  }
  $("#q").value = route === "browse" ? (params.q || "") : "";
}
function closeMenus() { $$(".menu").forEach(m => { m.hidden = true }); $$("[aria-expanded]").forEach(b => b.getAttribute("aria-controls") && b.setAttribute("aria-expanded", "false")) }
async function fillExplore() {
  const cat = await getCatalog().catch(() => []);
  const subs = [...new Set(cat.map(c => c.subject))].sort();
  $("#exploreMenu").innerHTML = `<div class="menu-h"><b>Explore by subject</b></div>${subs.map(s => `<a role="menuitem" href="#/browse?subject=${encodeURIComponent(s)}">${esc(s)}<small>${plural(cat.filter(c => c.subject === s).length, "course")}</small></a>`).join("")}<a role="menuitem" class="all" href="#/browse">Browse all courses ${IC.right}</a>`;
}

/* ---------- Shared pieces ---------- */
function pct(p, lessons) { return p && lessons ? Math.round(p.done.length / lessons * 100) : 0 }
function courseCard(c) {
  const p = c.progress, pc = pct(p, c.lessons);
  return `<article class="card">
    <a class="card-link" href="#/learn/${encodeURIComponent(c.id)}" aria-label="${esc(titleCase(c.title))}"></a>
    ${cover(c)}
    <div class="card-b">
      <div class="org"><img src="/assets/lumzi-mark.svg" alt="" width="20" height="20">Lumzi${c.is_new ? `<span class="tag new">New</span>` : ""}${c.status === "draft" ? `<span class="tag draft">Draft</span>` : ""}</div>
      <h3>${esc(titleCase(c.title))}</h3>
      <p class="skills"><b>Subject:</b> ${esc(c.subject)}</p>
      ${p ? `<div class="mini"><span class="pbar"><i style="width:${p.completedAt ? 100 : pc}%"></i></span><small>${p.completedAt ? "Completed" : pc + "% complete"}</small></div>` : ""}
      <p class="meta">${esc(c.level)} · Course · ${plural(c.lessons, "lesson")}</p>
    </div></article>`;
}
const grid = list => list.length ? `<div class="grid">${list.map(courseCard).join("")}</div>` : `<div class="empty"><h2>No courses found</h2><p>Try a different search or subject.</p><a class="btn btn-line" href="#/browse">See all courses</a></div>`;

/* ---------- Pages ---------- */
const V = {}, AFTER = {};

V.home = async () => {
  const cat = await getCatalog();
  const subs = [...new Set(cat.map(c => c.subject))].sort();
  if (signedIn()) {
    const mine = await getMine();
    const going = mine.filter(c => !c.completed_at), ids = new Set(mine.map(c => c.id));
    const rec = cat.filter(c => !ids.has(c.id));
    return `<section class="welcome"><div class="wrap">
        <h1 data-words>Welcome back, ${esc(ST.me.name.split(" ")[0])}</h1>
        <p>${going.length ? `You have ${plural(going.length, "course")} in progress. Keep going!` : mine.length ? "You've finished everything you started. Pick something new below." : "Start your first course today."}</p>
      </div></section>
      <div class="wrap">
        ${going.length ? `<section class="sec"><div class="sec-h"><h2>Continue learning</h2><a href="#/my-learning">View all ${IC.right}</a></div><div class="resume-row">${going.slice(0, 3).map(resumeCard).join("")}</div></section>` : ""}
        <section class="sec"><div class="sec-h"><h2>${rec.length ? "Recommended for you" : "All courses"}</h2><a href="#/browse">Browse all ${IC.right}</a></div>${grid(rec.length ? rec : cat)}</section>
        ${subChips(subs)}
      </div>`;
  }
  const pics = [IMG.excel, IMG.ai, IMG.tally];
  return `<section class="hero"><div class="wrap hero-in">
      <div class="hero-t">
        <h1 data-words>Learn skills that move your career forward</h1>
        <p class="hero-sub">Practical courses in Microsoft Office, Excel, Tally and AI. Watch, read, practise with quizzes, and earn a certificate when you finish.</p>
        <div class="hero-cta"><a class="btn btn-primary btn-lg" href="#/signup">Join for Free</a><a class="btn btn-line btn-lg" href="#/browse">Browse courses</a></div>
        <ul class="hero-pts"><li>${IC.check}Learn at your own pace</li><li>${IC.check}Quizzes with instant results</li><li>${IC.check}Certificate on completion</li></ul>
      </div>
      <div class="hero-art" aria-hidden="true">${pics.map((src, i) => `<div class="ha ha${i + 1}"><img src="${src}" alt=""></div>`).join("")}<span class="ha-dot"></span></div>
    </div></section>
    <div class="wrap">
      ${subChips(subs)}
      <section class="sec"><div class="sec-h"><h2 data-words="scroll">Popular courses</h2><a href="#/browse">Browse all ${IC.right}</a></div>${grid(cat)}</section>
      ${featureProof(cat)}
      ${featurePath(cat)}
      <section class="why rv"><h2 data-words="scroll">Why learn on Lumzi</h2><div class="why-g">
        <div>${IC.video}<b>Videos and readings</b><p>Short lessons you can watch or read in any order, on any device.</p></div>
        <div>${IC.quiz}<b>Practice that checks itself</b><p>MCQs, match the pairs, arrange in order and more, with instant feedback.</p></div>
        <div>${IC.award}<b>Certificates</b><p>Finish every lesson and download a certificate with your name on it.</p></div>
      </div></section>
      <section class="cta-band rv"><div><h2>Start learning today</h2><p>Create a free account and open your first lesson in under a minute.</p></div><a class="btn btn-primary btn-lg" href="#/signup">Join for Free</a></section>
    </div>`;
};

/* ----- "Show what you've learned": certificate fan deck (after 21st.dev Fan Deck Card) ----- */
function featureProof(cat) {
  const certs = cat.filter(c => c.lessons > 0).slice(0, 4);
  if (!certs.length) return "";
  return `<section class="feat rv">
    <div class="feat-t">
      <h2 data-words="scroll">Show what you've learned</h2>
      <p>Finish every lesson in a course and you get a certificate with your name on it. Download it as an image and add it to your CV or LinkedIn profile.</p>
      <ul class="feat-l"><li>${IC.check}Your name, the course and the date you finished</li><li>${IC.check}A certificate ID you can share</li><li>${IC.check}Every certificate kept in Accomplishments</li></ul>
    </div>
    <div class="feat-v">
      <div class="fd" id="fd" tabindex="0" role="group" aria-roledescription="card deck" aria-label="Example certificates. Use the arrow keys to look through them.">
        <div class="fd-hand">${certs.map((c, i) => `<button type="button" class="fd-card" data-fd="${i}" style="--tint:${esc(c.color || "#2D5BD6")}" tabindex="-1">
          <span class="fd-top"><img src="/assets/lumzi-mark.svg" alt="" width="22" height="22"><b>lumzi</b><span class="fd-seal">${IC.award}</span></span>
          <small>Certificate of completion</small>
          <strong>${esc(titleCase(c.title))}</strong>
          <span class="fd-meta">${esc(c.subject)} · ${plural(c.lessons, "lesson")}</span>
          <span class="fd-line"></span>
        </button>`).join("")}</div>
        <div class="fd-ctl"><button type="button" class="ib" data-a="fd" data-dir="-1" aria-label="Previous certificate">${IC.left}</button><span id="fdNow" aria-live="polite"></span><button type="button" class="ib" data-a="fd" data-dir="1" aria-label="Next certificate">${IC.right}</button></div>
      </div>
    </div>
  </section>`;
}

/* ----- "Always know what's next": learning path preview built from real catalog numbers ----- */
function featurePath(cat) {
  if (!cat.length) return "";
  const subs = [...new Set(cat.map(c => c.subject))].slice(0, 6), sum = k => cat.reduce((n, c) => n + (c[k] || 0), 0);
  const first = cat.find(c => c.lessons > 0) || cat[0];
  const tiles = [[sum("lessons"), "lessons", IC.layers], [sum("videos"), "videos", IC.video], [sum("readings"), "readings", IC.reading], [sum("quizzes"), "quizzes", IC.quiz]].filter(t => t[0]);
  return `<section class="feat flip rv">
    <div class="feat-v">
      <div class="lp" aria-hidden="true">
        <div class="lp-side"><b>My learning path</b><ul>${subs.map((s, i) => `<li class="${i === 0 ? "on" : ""}">${esc(s)}</li>`).join("")}</ul></div>
        <div class="lp-main">
          <span class="lp-crumb">${esc(titleCase(first.title))}</span>
          <span class="lp-next">Next lesson</span>
          <span class="lp-bar"><i></i></span>
          <div class="lp-tiles">${tiles.map(([n, w, ic]) => `<span class="lp-tile">${ic}<b>${n}</b><small>${w}</small></span>`).join("")}</div>
        </div>
        <div class="lp-chip">${IC.check}<span><b>Lesson complete</b><small>On to the next one</small></span></div>
      </div>
    </div>
    <div class="feat-t">
      <h2 data-words="scroll">Always know what's next</h2>
      <p>Every course is split into modules and short lessons. Lumzi remembers where you stopped and takes you straight to the next lesson, so even ten minutes a day adds up.</p>
      <p class="feat-n">Right now the catalog has ${plural(sum("lessons"), "lesson")} across ${plural(cat.length, "course")}.</p>
      <a class="btn btn-line" href="#/browse">Find your first course</a>
    </div>
  </section>`;
}

const subChips = subs => subs.length ? `<section class="sec"><div class="sec-h"><h2>Explore by subject</h2></div><div class="chips">${subs.map(s => `<a class="chip" href="#/browse?subject=${encodeURIComponent(s)}">${esc(s)}</a>`).join("")}</div></section>` : "";

function resumeCard(c) {
  const pc = c.lessons ? Math.round(c.done / c.lessons * 100) : 0;
  return `<article class="rc">${cover(c, "sm")}<div class="rc-b"><small>Lumzi · Course</small><h3><a href="#/course/${encodeURIComponent(c.id)}">${esc(titleCase(c.title))}</a></h3>
    <div class="mini"><span class="pbar"><i style="width:${pc}%"></i></span><small>${pc}% complete</small></div>
    ${c.next_title ? `<p class="next">Next: ${esc(c.next_title)}</p>` : ""}
    <a class="btn btn-primary btn-sm" href="${c.next_lesson ? `#/course/${encodeURIComponent(c.id)}/lesson/${c.next_lesson}` : `#/course/${encodeURIComponent(c.id)}`}">Resume</a></div></article>`;
}

V.browse = async () => {
  const cat = await getCatalog(), q = (params.q || "").trim().toLowerCase();
  const subs = [...new Set(cat.map(c => c.subject))].sort(), levels = [...new Set(cat.map(c => c.level))];
  const pickS = params.subject ? params.subject.split(",") : [], pickL = params.level ? params.level.split(",") : [];
  const list = cat.filter(c => (!q || (c.title + " " + c.description + " " + c.subject).toLowerCase().includes(q)) && (!pickS.length || pickS.includes(c.subject)) && (!pickL.length || pickL.includes(c.level)));
  const box = (name, val, on) => `<label class="fl"><input type="checkbox" data-f="${name}" value="${esc(val)}"${on ? " checked" : ""}><span>${esc(val)}</span><small>${cat.filter(c => c[name === "subject" ? "subject" : "level"] === val).length}</small></label>`;
  return `<div class="wrap pad browse">
    <div class="br-h"><h1>${q ? `Results for “${esc(params.q)}”` : pickS.length === 1 ? esc(pickS[0]) : "All courses"}</h1><p>${plural(list.length, "result")}</p></div>
    <div class="br">
      <aside class="filters" aria-label="Filters">
        <fieldset><legend>Subject</legend>${subs.map(s => box("subject", s, pickS.includes(s))).join("")}</fieldset>
        <fieldset><legend>Level</legend>${levels.map(l => box("level", l, pickL.includes(l))).join("")}</fieldset>
        ${pickS.length || pickL.length || q ? `<a class="clear" href="#/browse">Clear all</a>` : ""}
      </aside>
      <section>${grid(list)}</section>
    </div></div>`;
};

/* Course page (like a course landing page) */
V.learn = async id => {
  const c = ST.page[id] || (ST.page[id] = await api("GET", "/catalog/" + encodeURIComponent(id)));
  const p = c.progress, enrolled = !!p, pc = pct(p, c.lessons), title = titleCase(c.title);
  const btn = enrolled ? `<a class="btn btn-primary btn-xl" href="#/course/${encodeURIComponent(c.id)}">${p.completedAt ? "Review course" : p.done.length ? "Resume learning" : "Go to course"}</a>`
    : `<button class="btn btn-primary btn-xl" data-a="enroll" data-id="${esc(c.id)}">Enroll for free<small>Start today</small></button>`;
  const inc = [[c.videos, "video"], [c.readings, "reading"], [c.quizzes, "quiz"], [c.assignments, "assignment"]].filter(x => x[0]);
  return `<section class="ch"><div class="wrap ch-in">
      <div class="ch-t">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a>${IC.right}<a href="#/browse?subject=${encodeURIComponent(c.subject)}">${esc(c.subject)}</a></nav>
        <div class="ch-org"><img src="/assets/lumzi-mark.svg" alt="" width="34" height="34"><span>Lumzi</span></div>
        <h1>${esc(title)}</h1>
        <p class="ch-d">${esc(c.description || "")}</p>
        <p class="ch-by">Offered by <b>Lumzi</b></p>
        <div class="ch-cta">${btn}${enrolled ? `<div class="ch-prog"><span class="pbar"><i style="width:${p.completedAt ? 100 : pc}%"></i></span><small>${p.completedAt ? "Completed" : pc + "% complete"}</small></div>` : ""}</div>
        <p class="ch-n"><b>${c.learners.toLocaleString("en-IN")}</b> ${c.learners === 1 ? "learner has" : "learners have"} enrolled</p>
      </div>
      <div class="ch-img">${cover(c, "lg")}</div>
    </div></section>
    <div class="wrap">
      <div class="facts">
        <div>${IC.layers}<span><b>${plural(c.modules, "module")}</b><small>${plural(c.lessons, "lesson")} in total</small></span></div>
        <div>${IC.bar}<span><b>${esc(c.level)} level</b><small>${esc(c.subject)}</small></span></div>
        <div>${IC.clock}<span><b>Flexible schedule</b><small>Learn at your own pace</small></span></div>
        <div>${IC.award}<span><b>Certificate</b><small>When you finish every lesson</small></span></div>
      </div>
      <nav class="tabs" aria-label="Course sections"><a href="#about" data-a="jump">About</a><a href="#modules" data-a="jump">Modules</a></nav>
      <section class="sec" id="about"><h2>What you'll find in this course</h2>
        <div class="about"><p>${esc(c.description || "No description yet.")}</p>
        ${inc.length ? `<ul class="inc">${inc.map(([n, w]) => `<li>${KIND[w === "video" ? "embed" : w].icon}<b>${n}</b> ${w}${n === 1 ? "" : "s"}</li>`).join("")}</ul>` : ""}</div>
      </section>
      <section class="sec" id="modules"><h2>There ${c.modules === 1 ? "is 1 module" : `are ${c.modules} modules`} in this course</h2>
        <div class="mods">${c.outline.map((m, i) => `<details class="mod"${i === 0 ? " open" : ""}>
          <summary><span><b>${esc(m.title)}</b><small>Module ${i + 1} · ${plural(m.lessons.length, "lesson")}</small></span>${IC.chev}</summary>
          <ol class="mod-l">${m.lessons.map(l => { const done = p && p.done.includes(l.id); return `<li class="${done ? "done" : ""}"><span class="ml-ic">${done ? IC.check : l.kinds.length ? KIND[l.kinds[0]].icon : IC.reading}</span><span>${esc(l.title)}</span><small>${[...new Set(l.kinds)].map(k => KIND[k].label).join(" · ")}</small></li>` }).join("")}</ol>
        </details>`).join("") || `<p class="muted">Modules are coming soon.</p>`}</div>
      </section>
      <section class="cta-band"><div><h2>${enrolled ? "Pick up where you left off" : "Ready to start?"}</h2><p>${enrolled ? "Your progress is saved on every device." : "Enroll for free and start the first lesson right away."}</p></div>${btn}</section>
    </div>`;
};

/* Course home + lesson player share this layout */
function sidebar(c, activeLid) {
  const done = new Set(c.progress.done), total = c.outline.reduce((s, m) => s + m.lessons.length, 0), pc = total ? Math.round(done.size / total * 100) : 0;
  return `<aside class="sb" id="sb" aria-label="Course material">
    <button class="sb-close" data-a="sb">${IC.x}Close</button>
    <div class="sb-h"><a class="sb-title" href="#/learn/${encodeURIComponent(c.id)}">${esc(titleCase(c.title))}</a>
      <div class="mini"><span class="pbar"><i style="width:${c.progress.completedAt ? 100 : pc}%"></i></span><small>${c.progress.completedAt ? "Completed" : pc + "% complete"}</small></div></div>
    <a class="sb-home${activeLid == null ? " on" : ""}" href="#/course/${encodeURIComponent(c.id)}">Course home</a>
    <p class="sb-lbl">Course material</p>
    ${c.outline.map((m, mi) => `<details class="sb-m"${!activeLid || m.lessons.some(l => l.id === activeLid) || mi === 0 ? " open" : ""}><summary><span>${esc(m.title)}</span>${IC.chev}</summary>
      <ol>${m.lessons.map(l => `<li><a class="sb-l${l.id === activeLid ? " on" : ""}${done.has(l.id) ? " done" : ""}" href="#/course/${encodeURIComponent(c.id)}/lesson/${l.id}"${l.id === activeLid ? ' aria-current="page"' : ""}><span class="sb-ic">${done.has(l.id) ? IC.check : l.blocks.length ? KIND[l.blocks[0].kind].icon : IC.reading}</span><span>${esc(l.title)}<small>${[...new Set(l.blocks.map(b => KIND[b.kind].label))].join(" · ") || "Lesson"}</small></span></a></li>`).join("")}</ol></details>`).join("")}
  </aside>`;
}
const flat = c => c.outline.flatMap(m => m.lessons.map(l => ({...l, module:m.title})));

V.course = async id => {
  const c = await getLearn(id), lessons = flat(c), done = new Set(c.progress.done);
  const next = lessons.find(l => !done.has(l.id)) || lessons[0];
  const quizzes = lessons.flatMap(l => l.blocks.filter(b => b.kind === "quiz").map(b => ({...b, lesson:l})));
  return `<div class="learn">${sidebar(c, null)}
    <div class="lv">
      <button class="sb-toggle" data-a="sb">${IC.menu}Course material</button>
      ${c.progress.preview ? `<p class="note">You're previewing this course as an admin. Progress isn't saved.</p>` : ""}
      <h1>${esc(titleCase(c.title))}</h1>
      ${c.progress.completedAt ? `<div class="done-band">${IC.award}<div><b>You completed this course on ${fmtDate(c.progress.completedAt)}</b><p>Your certificate is ready.</p></div><a class="btn btn-primary btn-sm" href="#/accomplishments">View certificate</a></div>` : ""}
      ${next ? `<section class="next-card"><small>${done.size ? "Up next" : "Start here"}</small><h2>${esc(next.title)}</h2><p>${esc(next.module)} · ${[...new Set(next.blocks.map(b => KIND[b.kind].label))].join(", ") || "Lesson"}</p><a class="btn btn-primary" href="#/course/${encodeURIComponent(c.id)}/lesson/${next.id}">${done.size ? "Resume" : "Start"}</a></section>` : `<div class="empty"><h2>No lessons yet</h2><p>Check back soon.</p></div>`}
      <section class="sec"><h2>Course outline</h2>
        ${c.outline.map((m, i) => `<div class="co-m"><h3>Module ${i + 1}: ${esc(m.title)}</h3><ol>${m.lessons.map(l => `<li class="${done.has(l.id) ? "done" : ""}"><a href="#/course/${encodeURIComponent(c.id)}/lesson/${l.id}"><span class="co-ic">${done.has(l.id) ? IC.check : ""}</span><span>${esc(l.title)}</span><small>${done.has(l.id) ? "Completed" : [...new Set(l.blocks.map(b => KIND[b.kind].label))].join(" · ")}</small></a></li>`).join("")}</ol></div>`).join("")}
      </section>
      ${quizzes.length ? `<section class="sec"><h2>Grades</h2><p class="muted">Quizzes in this course. Pass each one to complete its lesson.</p><ul class="grades">${quizzes.map(q => `<li>${IC.quiz}<a href="#/course/${encodeURIComponent(c.id)}/lesson/${q.lesson.id}">${esc(q.title)}</a><small>${esc(q.lesson.title)} · pass mark ${q.passPct}%</small><span class="${done.has(q.lesson.id) ? "ok" : "muted"}">${done.has(q.lesson.id) ? "Passed" : "Not passed yet"}</span></li>`).join("")}</ul></section>` : ""}
    </div></div>`;
};

V.lesson = async (id, lid) => {
  const c = await getLearn(id), lessons = flat(c), i = lessons.findIndex(l => String(l.id) === String(lid));
  if (i < 0) return errorPage("Lesson not found", "It may have been moved or removed.");
  const l = lessons[i], done = c.progress.done.includes(l.id), prev = lessons[i - 1], next = lessons[i + 1];
  const href = x => `#/course/${encodeURIComponent(c.id)}/lesson/${x.id}`;
  return `<div class="learn">${sidebar(c, l.id)}
    <div class="lv lesson">
      <button class="sb-toggle" data-a="sb">${IC.menu}Course material</button>
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/course/${encodeURIComponent(c.id)}">${esc(titleCase(c.title))}</a>${IC.right}<span>${esc(l.module)}</span></nav>
      <h1>${esc(l.title)}</h1>
      <p class="muted">Lesson ${i + 1} of ${lessons.length}${done ? ` · <span class="ok">${IC.check} Completed</span>` : ""}</p>
      <div class="blocks">${l.blocks.length ? l.blocks.map(b => block(c, l, b)).join("") : `<div class="empty"><h2>Nothing here yet</h2><p>This lesson has no content yet. You can still mark it complete.</p></div>`}</div>
      <div class="lbar">
        ${prev ? `<a class="btn btn-line" href="${href(prev)}">${IC.left}Previous</a>` : "<span></span>"}
        <div class="lbar-r">
          ${c.progress.preview ? "" : done ? `<button class="btn btn-line" data-a="undone" data-id="${l.id}">${IC.check}Completed</button>` : `<button class="btn btn-primary" data-a="done" data-id="${l.id}">Mark as completed</button>`}
          ${next ? `<a class="btn ${done ? "btn-primary" : "btn-line"}" href="${href(next)}">Next item${IC.right}</a>` : `<a class="btn btn-line" href="#/course/${encodeURIComponent(c.id)}">Course home</a>`}
        </div>
      </div>
    </div></div>`;
};

function embedSrc(url) {
  try {
    const u = new URL(url), h = u.hostname.replace(/^www\.|^m\./, "");
    if (h === "youtube.com" && u.searchParams.get("v")) return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(u.searchParams.get("v"));
    if (h === "youtube.com" && /^\/(embed|shorts)\//.test(u.pathname)) return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(u.pathname.split("/")[2]);
    if (h === "youtu.be") return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(u.pathname.slice(1));
    if (h === "vimeo.com" && /^\/\d+/.test(u.pathname)) return "https://player.vimeo.com/video/" + u.pathname.split("/")[1];
    if (h === "player.vimeo.com") return u.href;
    if (h === "loom.com" && u.pathname.startsWith("/share/")) return "https://www.loom.com/embed/" + u.pathname.split("/")[2];
    if (h === "drive.google.com" && /\/file\/d\//.test(u.pathname)) return u.href.replace(/\/(view|edit)(\?.*)?$/, "/preview");
    if (h === "docs.google.com") return u.href.replace(/\/(edit|view)(\?.*|#.*)?$/, "/preview");
  } catch (e) {}
  return null;
}
const paras = t => esc(t).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

function block(c, l, b) {
  if (b.kind === "reading") return `<section class="blk reading"><div class="blk-t">${IC.reading}Reading</div>${paras(b.text)}</section>`;
  if (b.kind === "embed") { const src = embedSrc(b.url);
    return `<section class="blk">${src ? `<div class="video"><iframe src="${esc(src)}" title="${esc(b.caption || l.title)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"></iframe></div>${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ""}`
      : `<a class="ext" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${IC.ext}<span><b>${esc(b.caption || "Open resource")}</b><small>${esc(b.url)}</small></span></a>`}</section>` }
  if (b.kind === "quiz") return `<section class="blk quiz" id="quiz-${b.id}">${quizHTML(c, l, b)}</section>`;
  if (b.kind === "assignment") return `<section class="blk assign" id="asg-${b.id}">${assignHTML(c, b)}</section>`;
  return "";
}
AFTER.lesson = () => {
  $$(".blk.quiz").forEach(el => { const id = +el.id.slice(5); if (!PLAY[id]) loadQuiz(id) });
  $$(".blk.assign").forEach(el => { const id = +el.id.slice(4); if (ASG[id] === undefined) loadAsg(id) });
};


/* ===================================================================
   Motion: hero sequence, word-by-word headlines, scroll reveals.
   Set up in JS, so without JS (or with reduced motion) the page just
   shows its final state.
   =================================================================== */
const MOTION_OK = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
/* Words Stagger (after 21st.dev): wrap each word; CSS staggers them in with blur + rise. */
function splitWords(el) {
  if (el.dataset.split) return;
  el.dataset.split = "1";
  const text = el.textContent.trim().replace(/\s+/g, " ");
  el.setAttribute("aria-label", text);
  el.innerHTML = text.split(" ").map((w, i) => `<span class="w" aria-hidden="true" style="--i:${i}">${esc(w)}</span>`).join(" ");
}
let revealIO;
function motion(root) {
  if (!MOTION_OK() || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("mo");
  root.querySelectorAll("[data-words]").forEach(splitWords);
  requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll(".hero, .welcome").forEach(el => el.classList.add("is-in"))));
  revealIO && revealIO.disconnect();
  revealIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in"); revealIO.unobserve(e.target);
  }), { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
  root.querySelectorAll('.rv, [data-words="scroll"], .grid').forEach(el => revealIO.observe(el));
}

/* Fan deck (after 21st.dev Fan Deck Card): a pile at rest, fans out on hover/focus,
   click a card (or use arrows / swipe) to bring it to the top. */
const FD = {order: [], lifting: false};
function fdLayout() {
  const deck = $("#fd"); if (!deck) return;
  const cards = $$(".fd-card"), n = cards.length;
  cards.forEach(c => {
    const i = FD.order.indexOf(+c.dataset.fd), f = n > 1 ? 0.5 - i / (n - 1) : 0;
    c.style.setProperty("--rx", `${i * -12}px`); c.style.setProperty("--ry", `${i * 10}px`); c.style.setProperty("--rr", `${(i % 2 ? -1 : 1) * i * 2}deg`);
    c.style.setProperty("--fx", `${f * 230}px`); c.style.setProperty("--fy", `${Math.abs(f) * 30}px`); c.style.setProperty("--fr", `${f * 12}deg`);
    c.style.zIndex = c.classList.contains("lift") ? 50 : n - i;
    c.toggleAttribute("data-top", i === 0);
    const name = c.querySelector("strong").textContent;
    c.setAttribute("aria-label", i === 0 ? `${name} certificate, on top` : `Bring ${name} to the top`);
  });
  const top = cards.find(c => +c.dataset.fd === FD.order[0]);
  $("#fdNow").textContent = `${top.querySelector("strong").textContent} · ${FD.order[0] + 1} of ${n}`;
}
function fdToTop(id) {
  if (id == null || FD.order[0] === id || FD.lifting) return;
  const card = $(`.fd-card[data-fd="${id}"]`);
  const swap = () => { FD.order = [id, ...FD.order.filter(x => x !== id)]; fdLayout() };
  if (!MOTION_OK()) return swap();
  FD.lifting = true; card.classList.add("lift"); fdLayout();
  setTimeout(swap, 220);
  setTimeout(() => { card.classList.remove("lift"); FD.lifting = false; fdLayout() }, 520);
}
const fdDeal = dir => fdToTop(dir === 1 ? FD.order[1] : FD.order[FD.order.length - 1]);
AFTER.home = () => {
  const deck = $("#fd"); if (!deck) return;
  FD.order = $$(".fd-card").map(c => +c.dataset.fd); FD.lifting = false; fdLayout();
  deck.addEventListener("pointerenter", e => { if (e.pointerType !== "touch") deck.classList.add("open") });
  deck.addEventListener("pointerleave", () => deck.classList.remove("open"));
  deck.addEventListener("focusin", () => deck.classList.add("open"));
  deck.addEventListener("focusout", e => { if (!deck.contains(e.relatedTarget)) deck.classList.remove("open") });
  deck.addEventListener("keydown", e => {
    if (["ArrowRight", "ArrowDown"].includes(e.key)) { e.preventDefault(); fdDeal(1) }
    if (["ArrowLeft", "ArrowUp"].includes(e.key)) { e.preventDefault(); fdDeal(-1) }
  });
  let sw = null;
  deck.addEventListener("pointerdown", e => { sw = {x: e.clientX, t: e.timeStamp} });
  deck.addEventListener("pointerup", e => { if (!sw) return; const dx = e.clientX - sw.x; if (Math.abs(dx) > 40 && e.timeStamp - sw.t < 600) { fdDeal(dx < 0 ? 1 : -1); sw = "swiped" } else sw = null });
  deck.addEventListener("click", e => { if (sw === "swiped") { e.stopPropagation(); sw = null } }, true);
};

/* ---------- Quiz player ---------- */
const QT = {mcq:"Multiple choice", blanks:"Choose the correct", tf:"True or false", match:"Match the pairs", order:"Arrange in order", short:"Short answer"};
const BLANK = /_{3,}/g, PLAY = {};
function ctxOf(bid) { const [, id, lid] = (location.hash.match(/course\/([^/]+)\/lesson\/(\d+)/) || []); const c = ST.learn[decodeURIComponent(id || "")]; const l = c && flat(c).find(x => String(x.id) === lid); return {c, l, b: l && l.blocks.find(x => x.id === bid)} }
const redrawQuiz = bid => { const el = $("#quiz-" + bid), x = ctxOf(bid); if (el && x.b) el.innerHTML = quizHTML(x.c, x.l, x.b) };
function loadQuiz(bid, keep) {
  const p = PLAY[bid] = Object.assign(keep || {}, {loading:true});
  api("GET", "/quizzes/" + bid).then(q => { p.loading = false; p.q = q; p.ans = {}; p.res = null; q.questions.forEach(x => { if (x.type === "order") p.ans[x.id] = x.items.map(it => it.i) }); redrawQuiz(bid) })
    .catch(e => { p.loading = false; p.error = e.message; redrawQuiz(bid) });
}
function quizHTML(c, l, b) {
  const p = PLAY[b.id], head = (sub, badge = "") => `<div class="q-h">${IC.quiz}<div><h2>${esc(b.title)}</h2><p>${sub}</p></div>${badge}</div>`;
  if (!p || p.loading) return head("Loading…");
  if (p.error) return head(esc(p.error));
  const q = p.q, pts = q.questions.reduce((s, x) => s + x.points, 0), last = q.last;
  const h = head(`${plural(q.questions.length, "question")} · ${plural(pts, "point")} · pass mark ${q.passPct}%`, last && !p.on ? `<span class="pill ${last.passed ? "ok" : "warn"}">Last attempt ${last.pct}%${last.passed ? " · Passed" : ""}</span>` : "");
  if (!q.questions.length) return h + `<p class="muted">This quiz has no questions yet.</p>`;
  if (!p.on) return h + `<div class="q-start"><p>Answer every question, then submit to see your score and the right answers.</p><button class="btn btn-primary" data-a="qstart" data-id="${b.id}">${last ? "Retake quiz" : "Start quiz"}</button></div>`;
  const r = p.res, preview = c.progress.preview;
  return h + (r ? `<div class="q-score ${r.passed ? "pass" : "fail"}" role="status"><b>${r.score}/${r.max}</b><span>${r.pct}% · ${r.passed ? "You passed! This lesson is now complete." : `You need ${r.passPct}% to pass. Review the answers and try again.`}</span></div>` : "") +
    `<ol class="q-list">${q.questions.map((x, i) => question(b.id, x, i, p)).join("")}</ol>
    <div class="q-foot">${r ? `<button class="btn btn-primary" data-a="qretry" data-id="${b.id}">Try again</button>` : preview ? `<span class="muted">Admin preview: submitting is turned off.</span>` : `<button class="btn btn-primary" data-a="qsubmit" data-id="${b.id}">${p.warn ? `${p.warn} unanswered. Submit anyway?` : "Submit"}</button>`}</div>`;
}
function answered(x, a) {
  if (a == null) return false;
  if (x.type === "mcq") return a.length > 0;
  if (x.type === "blanks") return x.blanks.every((_, k) => a[k] != null);
  if (x.type === "match") return x.lefts.every((_, k) => a[k] != null);
  if (x.type === "short") return String(a).trim() !== "";
  return true;
}
function question(bid, x, i, p) {
  const a = p.ans[x.id], r = p.res && p.res.results[x.id], dis = p.res ? " disabled" : "", nm = `q${bid}-${x.id}`;
  const st = r ? (r.frac === 1 ? "right" : r.frac > 0 ? "part" : "wrong") : "";
  let body = "";
  switch (x.type) {
    case "mcq": body = `<div class="opts">${x.options.map((o, k) => `<label class="opt"><input type="${x.multi ? "checkbox" : "radio"}" name="${nm}" data-qa="mcq" data-b="${bid}" data-q="${x.id}" value="${k}"${(a || []).includes(k) ? " checked" : ""}${dis}><span>${esc(o)}</span></label>`).join("")}</div>${x.multi ? `<p class="hint">Select all that apply.</p>` : ""}`; break;
    case "blanks": { let k = 0; body = `<p class="sent">${esc(x.prompt).replace(BLANK, () => { const kk = k++; return `<select data-qa="blank" data-b="${bid}" data-q="${x.id}" data-k="${kk}" aria-label="Blank ${kk + 1}"${dis}><option value="">Choose…</option>${x.blanks[kk].options.map((o, j) => `<option value="${j}"${a && a[kk] === j ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>` })}</p>`; break }
    case "tf": body = `<div class="tf">${[true, false].map(v => `<label class="tfo"><input type="radio" name="${nm}" data-qa="tf" data-b="${bid}" data-q="${x.id}" value="${v}"${a === v ? " checked" : ""}${dis}><span>${v ? "True" : "False"}</span></label>`).join("")}</div>`; break;
    case "match": body = `<div class="match">${x.lefts.map((lt, k) => `<div class="mrow"><span class="mlft">${esc(lt)}</span><select data-qa="match" data-b="${bid}" data-q="${x.id}" data-k="${k}" aria-label="Match for ${esc(lt)}"${dis}><option value="">Choose a match…</option>${x.rights.map(rt => `<option value="${rt.i}"${a && a[k] === rt.i ? " selected" : ""}>${esc(rt.text)}</option>`).join("")}</select></div>`).join("")}</div>`; break;
    case "order": { const text = Object.fromEntries(x.items.map(it => [it.i, it.text])), cur = a || x.items.map(it => it.i);
      body = `<ol class="ord">${cur.map((oi, k) => `<li><span class="onum">${k + 1}</span><span class="ot">${esc(text[oi])}</span>${p.res ? "" : `<button class="ib" data-a="qord" data-b="${bid}" data-q="${x.id}" data-k="${k}" data-dir="-1" aria-label="Move up"${k === 0 ? " disabled" : ""}>${IC.up}</button><button class="ib" data-a="qord" data-b="${bid}" data-q="${x.id}" data-k="${k}" data-dir="1" aria-label="Move down"${k === cur.length - 1 ? " disabled" : ""}>${IC.down}</button>`}</li>`).join("")}</ol>${p.res ? "" : `<p class="hint">Use the arrows to put these in the right order.</p>`}`; break }
    case "short": body = `<input class="in short" data-qa="short" data-b="${bid}" data-q="${x.id}" value="${esc(a || "")}" placeholder="Type your answer" maxlength="200" autocomplete="off" aria-label="Your answer"${dis}>`; break;
  }
  let fb = "";
  if (r && r.frac < 1) {
    const ex = r.expected;
    fb = `<p class="fb"><b>Correct answer:</b> ${x.type === "mcq" || x.type === "blanks" ? ex.map(esc).join(", ") : x.type === "tf" ? (ex ? "True" : "False") : x.type === "match" ? ex.map(pp => `${esc(pp.left)} → ${esc(pp.right)}`).join("; ") : x.type === "order" ? ex.map((t, k) => `${k + 1}. ${esc(t)}`).join("&nbsp;&nbsp;") : ex.map(esc).join(" or ")}</p>`;
  }
  return `<li class="qq ${st}"><div class="qq-h"><span class="qn">${i + 1}.</span><span class="qt">${QT[x.type]} · ${plural(x.points, "point")}</span>${r ? `<span class="qr">${r.frac === 1 ? IC.check + "Correct" : r.frac > 0 ? `${r.earned}/${r.points} points` : IC.x + "Incorrect"}</span>` : ""}</div>
    ${x.type === "blanks" ? "" : `<p class="qp">${esc(x.prompt)}</p>`}${body}${fb}</li>`;
}
function onAnswer(el) {
  const p = PLAY[el.dataset.b]; if (!p || p.res) return;
  const q = +el.dataset.q, x = p.q.questions.find(y => y.id === q);
  if (p.warn) { p.warn = 0; const b = $(`[data-a="qsubmit"][data-id="${el.dataset.b}"]`); if (b) b.textContent = "Submit" }
  switch (el.dataset.qa) {
    case "mcq": p.ans[q] = $$(`[data-qa="mcq"][data-b="${el.dataset.b}"][data-q="${q}"]`).filter(i => i.checked).map(i => +i.value); break;
    case "tf": p.ans[q] = el.value === "true"; break;
    case "blank": case "match": { const arr = p.ans[q] || Array((x.blanks || x.lefts).length).fill(null); arr[+el.dataset.k] = el.value === "" ? null : +el.value; p.ans[q] = arr; break }
    case "short": p.ans[q] = el.value; break;
  }
}

/* ---------- Assignment ---------- */
const ASG = {};
const redrawAsg = bid => { const el = $("#asg-" + bid), x = ctxOf(bid); if (el && x.b) el.innerHTML = assignHTML(x.c, x.b) };
function loadAsg(bid) { ASG[bid] = {loading:true}; api("GET", `/assignments/${bid}/mine`).then(r => { ASG[bid] = r; redrawAsg(bid) }).catch(() => { ASG[bid] = null; redrawAsg(bid) }) }
function assignHTML(c, b) {
  const s = ASG[b.id];
  const head = `<div class="q-h">${IC.assignment}<div><h2>${esc(b.title)}</h2><p>${s && s.submitted_at ? "Submitted " + new Date(s.submitted_at).toLocaleString("en-IN") : "Assignment"}</p></div>${s && s.submitted_at ? `<span class="pill ok">Submitted</span>` : ""}</div>`;
  const ins = b.instructions ? `<div class="reading ins">${paras(b.instructions)}</div>` : "";
  if (c.progress.preview) return head + ins + `<p class="muted">Admin preview: submitting is turned off.</p>`;
  if (s && s.loading) return head + ins + `<p class="muted">Loading…</p>`;
  return head + ins + `<form class="asg-f" data-form="asg" data-id="${b.id}" novalidate>
    <label for="at${b.id}">Your answer</label><textarea class="in" id="at${b.id}" rows="6" maxlength="10000" placeholder="Write your answer here">${esc(s ? s.text : "")}</textarea>
    <label for="au${b.id}">Link <span class="muted">(optional, e.g. Google Drive or GitHub)</span></label><input class="in" id="au${b.id}" value="${esc(s ? s.url : "")}" placeholder="https://…" inputmode="url">
    <p class="err" id="ae${b.id}" role="alert"></p>
    <button class="btn btn-primary" type="submit">${s ? "Update submission" : "Submit assignment"}</button></form>`;
}

/* ---------- My Learning ---------- */
V["my-learning"] = async () => {
  const mine = await getMine(true), tab = params.tab === "completed" ? "completed" : "progress";
  const list = mine.filter(c => tab === "completed" ? c.completed_at : !c.completed_at);
  return `<div class="wrap pad">
    <h1 class="pg-h">My Learning</h1>
    <div class="seg" role="tablist"><a role="tab" href="#/my-learning" aria-selected="${tab === "progress"}">In Progress <span>${mine.filter(c => !c.completed_at).length}</span></a><a role="tab" href="#/my-learning?tab=completed" aria-selected="${tab === "completed"}">Completed <span>${mine.filter(c => c.completed_at).length}</span></a></div>
    ${list.length ? `<div class="ml">${list.map(c => { const pc = c.lessons ? Math.round(c.done / c.lessons * 100) : 0; return `<article class="ml-c">${cover(c, "sm")}
      <div class="ml-b"><small>Lumzi · Course</small><h2><a href="#/course/${encodeURIComponent(c.id)}">${esc(titleCase(c.title))}</a></h2>
        <div class="mini"><span class="pbar"><i style="width:${c.completed_at ? 100 : pc}%"></i></span><small>${c.completed_at ? "Completed " + fmtDate(c.completed_at) : `${pc}% complete · ${c.done}/${plural(c.lessons, "lesson")}`}</small></div>
        ${!c.completed_at && c.next_title ? `<p class="next">Next: ${esc(c.next_title)}</p>` : ""}</div>
      <div class="ml-a">${c.completed_at ? `<a class="btn btn-primary btn-sm" href="#/accomplishments">View certificate</a><a class="btn btn-line btn-sm" href="#/course/${encodeURIComponent(c.id)}">Review</a>` : `<a class="btn btn-primary btn-sm" href="${c.next_lesson ? `#/course/${encodeURIComponent(c.id)}/lesson/${c.next_lesson}` : `#/course/${encodeURIComponent(c.id)}`}">${c.done ? "Resume" : "Start"}</a>`}</div></article>` }).join("")}</div>`
      : `<div class="empty"><h2>${tab === "completed" ? "No completed courses yet" : "Nothing in progress"}</h2><p>${tab === "completed" ? "Finish every lesson in a course to see it here." : "Enroll in a course to start learning."}</p><a class="btn btn-primary" href="#/browse">Browse courses</a></div>`}
  </div>`;
};

/* ---------- Accomplishments + certificate ---------- */
V.accomplishments = async () => {
  const done = (await getMine(true)).filter(c => c.completed_at);
  return `<div class="wrap pad"><h1 class="pg-h">Accomplishments</h1><p class="muted" style="margin-bottom:24px">Certificates for the courses you've completed.</p>
    ${done.length ? `<div class="certs">${done.map(c => `<article class="cert"><div class="cert-top"><span class="lz"><img src="/assets/lumzi-mark.svg" alt="" width="28" height="28">lumzi</span><span class="seal">${IC.award}</span></div>
      <small>Certificate of completion</small><h2>${esc(titleCase(c.title))}</h2><p>Awarded to <b>${esc(ST.me.name)}</b></p><p class="muted">Completed ${fmtDate(c.completed_at)}</p>
      <button class="btn btn-line btn-sm" data-a="cert" data-id="${esc(c.id)}">${IC.dl}Download</button></article>`).join("")}</div>`
      : `<div class="empty"><h2>No certificates yet</h2><p>Complete every lesson in a course and your certificate shows up here.</p><a class="btn btn-primary" href="#/my-learning">Go to My Learning</a></div>`}</div>`;
};
function downloadCert(c, btn) {
  btn.disabled = true;
  const W = 1600, H = 1130, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
  const paint = img => {
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    x.strokeStyle = "#2D5BD6"; x.lineWidth = 14; x.strokeRect(40, 40, W - 80, H - 80);
    x.strokeStyle = "#CBD5E1"; x.lineWidth = 2; x.strokeRect(70, 70, W - 140, H - 140);
    if (img) x.drawImage(img, 120, 124, 96, 96);
    x.fillStyle = "#0F172A"; x.font = "800 80px Inter,sans-serif"; x.fillText("lumzi", img ? 236 : 120, 200);
    x.fillStyle = "#FCD34D"; x.beginPath(); x.arc(W - 200, 175, 70, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#422006"; x.font = "800 28px Inter,sans-serif"; x.textAlign = "center"; x.fillText("LZ", W - 200, 185); x.textAlign = "left";
    x.fillStyle = "#475569"; x.font = "500 36px Inter,sans-serif"; x.fillText("Certificate of completion", 120, 370);
    const t = titleCase(c.title); let size = 92; x.fillStyle = "#0F172A"; x.font = `800 ${size}px Inter,sans-serif`;
    while (x.measureText(t).width > W - 240 && size > 48) { size -= 4; x.font = `800 ${size}px Inter,sans-serif` }
    x.fillText(t, 120, 480);
    x.font = "500 40px Inter,sans-serif"; x.fillText("Awarded to", 120, 600);
    x.font = "800 64px Inter,sans-serif"; x.fillText(ST.me.name, 120, 680);
    x.fillStyle = "#475569"; x.font = "500 34px Inter,sans-serif"; x.fillText(`for completing all ${c.lessons} lessons of this course.`, 120, 750);
    x.fillStyle = "#E2E8F0"; x.fillRect(120, 900, W - 240, 2);
    x.fillStyle = "#0F172A"; x.font = "700 32px Inter,sans-serif"; x.fillText("Lumzi LMS", 120, 960);
    x.fillStyle = "#475569"; x.font = "500 30px Inter,sans-serif"; x.fillText("Completed on " + fmtDate(c.completed_at), 120, 1010);
    x.textAlign = "right"; x.fillText("Certificate ID LZ-" + c.id.toUpperCase().slice(0, 10) + "-" + c.completed_at.replace(/-/g, ""), W - 120, 1010);
    cv.toBlob(b => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `Lumzi-certificate-${c.id}.png`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      btn.disabled = false; toast("Certificate downloaded");
    }, "image/png");
  };
  const img = new Image(); img.onload = () => paint(img); img.onerror = () => paint(null); img.src = "/assets/lumzi-mark.svg";
}

/* ---------- Account ---------- */
V.account = async () => `<div class="wrap pad narrow"><h1 class="pg-h">Account settings</h1>
  <section class="panel"><h2>Profile</h2><form data-form="profile" novalidate>
    <label for="pn">Full name</label><input class="in" id="pn" value="${esc(ST.me.name)}" autocomplete="name" maxlength="80">
    <label for="pe">Email</label><input class="in" id="pe" type="email" value="${esc(ST.me.email)}" autocomplete="email">
    <p class="err" id="perr" role="alert"></p><button class="btn btn-primary" type="submit">Save</button></form></section>
  <section class="panel"><h2>Password</h2><form data-form="password" novalidate>
    <label for="pc">Current password</label><input class="in" id="pc" type="password" autocomplete="current-password">
    <label for="pw">New password</label><input class="in" id="pw" type="password" autocomplete="new-password" minlength="8" aria-describedby="pwh"><p class="hint" id="pwh">At least 8 characters.</p>
    <p class="err" id="pwerr" role="alert"></p><button class="btn btn-primary" type="submit">Change password</button></form></section>
  <section class="panel"><h2>Sign out</h2><p class="muted">Sign out of Lumzi on this device.</p><button class="btn btn-line" data-a="logout">Log out</button></section>
</div>`;

/* ---------- Log in / sign up ---------- */
const authShell = inner => `<div class="auth"><div class="auth-card">
  <a class="auth-brand" href="#/"><img src="/assets/lumzi-mark.svg" alt="" width="36" height="36"><span class="word">lumz<span class="i">ı</span></span></a>${inner}</div></div>`;
const pwField = (id, label, ac) => `<label for="${id}">${label}</label><div class="pw"><input class="in" id="${id}" type="password" autocomplete="${ac}"${ac === "new-password" ? ' minlength="8" aria-describedby="' + id + 'h"' : ""}><button type="button" class="ib" data-a="pwshow" data-for="${id}" aria-label="Show password" aria-pressed="false">${IC.eye}</button></div>`;
V.login = async () => authShell(`<h1>Welcome back</h1><p class="muted">Log in to continue learning.</p>
  <form data-form="login" novalidate>
    <label for="le">Email</label><input class="in" id="le" type="email" autocomplete="email" inputmode="email" placeholder="name@email.com">
    ${pwField("lp", "Password", "current-password")}
    <p class="err" id="lerr" role="alert"></p>
    <button class="btn btn-primary btn-block" type="submit">Log in</button></form>
  <p class="auth-alt">New to Lumzi? <a href="#/signup${params.next ? "?next=" + encodeURIComponent(params.next) : ""}">Sign up</a></p>`);
V.signup = async () => authShell(`<h1>Join for free</h1><p class="muted">Create your account and start learning today.</p>
  <form data-form="signup" novalidate>
    <label for="sn">Full name</label><input class="in" id="sn" autocomplete="name" maxlength="80" placeholder="Your name">
    <label for="se">Email</label><input class="in" id="se" type="email" autocomplete="email" inputmode="email" placeholder="name@email.com">
    ${pwField("sp", "Password", "new-password")}<p class="hint" id="sph">At least 8 characters.</p>
    <p class="err" id="serr" role="alert"></p>
    <button class="btn btn-primary btn-block" type="submit">Join for Free</button></form>
  <p class="auth-alt">Already on Lumzi? <a href="#/login${params.next ? "?next=" + encodeURIComponent(params.next) : ""}">Log in</a></p>`);
V.notfound = async () => errorPage("We couldn't find that page", "The link may be old or mistyped.");

/* ---------- Actions ---------- */
function afterAuth(me) {
  ST.me = me; invalidate();
  const pend = sessionStorage.getItem("lz-enroll"); sessionStorage.removeItem("lz-enroll");
  if (pend) return enroll(pend);
  location.hash = "#/" + (params.next || "");
}
async function enroll(id) {
  if (!signedIn()) { try { sessionStorage.setItem("lz-enroll", id) } catch (e) {} location.hash = "#/signup?next=" + encodeURIComponent("learn/" + id); toast("Create a free account to enroll"); return }
  try { await api("POST", "/enrollments", {courseId:id}); invalidate(); delete ST.learn[id]; toast("You're enrolled. Let's start!"); location.hash = "#/course/" + encodeURIComponent(id) }
  catch (e) { toast(e.message) }
}
async function setDone(lid, done) {
  const id = args[0];
  try {
    const r = await api("PUT", "/progress/" + lid, {done});
    const c = ST.learn[id]; if (c) { c.progress.done = r.done; c.progress.completedAt = r.completedAt }
    ST.mine = null; ST.catalog = null; delete ST.page[id];
    toast(r.completedAt && done ? "Course complete! Your certificate is ready." : done ? "Marked as completed" : "Marked as not completed");
    rerender();
  } catch (e) { toast(e.message) }
}

document.addEventListener("click", e => {
  const exp = e.target.closest("#exploreBtn"), av = e.target.closest("#avatarBtn");
  if (exp || av) {
    const btn = exp || av, m = $("#" + btn.getAttribute("aria-controls")), open = m.hidden;
    closeMenus(); m.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open && exp) fillExplore();
    return;
  }
  if (!e.target.closest(".menu")) closeMenus();
  const card = e.target.closest(".fd-card"); if (card) { fdToTop(+card.dataset.fd); return }
  const t = e.target.closest("[data-a]"); if (!t) return;
  const a = t.dataset.a, id = t.dataset.id;
  switch (a) {
    case "enroll": t.disabled = true; enroll(id).finally(() => { t.disabled = false }); break;
    case "done": t.disabled = true; setDone(+id, true); break;
    case "undone": t.disabled = true; setDone(+id, false); break;
    case "logout": api("POST", "/auth/signout").catch(() => {}).finally(() => { ST.me = null; invalidate(); ST.learn = {}; location.hash = "#/"; render(); toast("You're logged out") }); break;
    case "sb": $("#sb").classList.toggle("open"); break;
    case "fd": fdDeal(+t.dataset.dir); break;
    case "jump": e.preventDefault(); { const el = document.getElementById(t.getAttribute("href").slice(1)); el && el.scrollIntoView({behavior: reduceMotion ? "auto" : "smooth"}) } break;
    case "pwshow": { const i = $("#" + t.dataset.for), show = i.type === "password"; i.type = show ? "text" : "password"; t.setAttribute("aria-pressed", String(show)); t.setAttribute("aria-label", show ? "Hide password" : "Show password") } break;
    case "cert": { const c = (ST.mine || []).find(x => x.id === id); if (c) downloadCert(c, t) } break;
    case "qstart": PLAY[id].on = true; redrawQuiz(+id); break;
    case "qretry": loadQuiz(+id, {on:true}); redrawQuiz(+id); break;
    case "qord": { const p = PLAY[t.dataset.b], arr = p.ans[+t.dataset.q], k = +t.dataset.k, j = k + +t.dataset.dir; [arr[k], arr[j]] = [arr[j], arr[k]]; p.warn = 0; redrawQuiz(+t.dataset.b); const nb = $(`[data-a="qord"][data-b="${t.dataset.b}"][data-q="${t.dataset.q}"][data-k="${j}"][data-dir="${t.dataset.dir}"]`) || $(`[data-a="qord"][data-b="${t.dataset.b}"][data-q="${t.dataset.q}"][data-k="${j}"]`); nb && nb.focus(); break }
    case "qsubmit": {
      const p = PLAY[id], miss = p.q.questions.filter(x => !answered(x, p.ans[x.id])).length;
      if (miss && !p.warn) { p.warn = miss; redrawQuiz(+id); return }
      t.disabled = true;
      api("POST", `/quizzes/${id}/attempts`, {answers:p.ans}).then(async r => {
        p.res = r; p.warn = 0; p.q.last = {pct:r.pct, passed:r.passed};
        toast(r.passed ? `Passed with ${r.pct}%` : `You scored ${r.pct}%`);
        if (r.passed) { const cid = args[0]; await getLearn(cid, true); ST.mine = null; ST.catalog = null; await rerender() } else redrawQuiz(+id);
        const el = $("#quiz-" + id); el && el.scrollIntoView({behavior: reduceMotion ? "auto" : "smooth", block:"start"});
      }).catch(err => { t.disabled = false; toast(err.message) });
      break;
    }
  }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.qa && el.dataset.qa !== "short") onAnswer(el);
  if (el.dataset.f) {
    const pick = f => $$(`[data-f="${f}"]`).filter(i => i.checked).map(i => i.value).join(",");
    const qs = new URLSearchParams(); if (params.q) qs.set("q", params.q);
    const s = pick("subject"), l = pick("level"); if (s) qs.set("subject", s); if (l) qs.set("level", l);
    location.hash = "#/browse" + (qs.toString() ? "?" + qs : "");
  }
});
document.addEventListener("input", e => { if (e.target.dataset.qa === "short") onAnswer(e.target) });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenus() });

const showErr = (id, msg) => { const el = $("#" + id); el.textContent = msg; el.classList.toggle("show", !!msg) };
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
document.addEventListener("submit", async e => {
  const f = e.target; e.preventDefault();
  if (f.id === "searchForm") { const q = $("#q").value.trim(); location.hash = "#/browse" + (q ? "?q=" + encodeURIComponent(q) : ""); return }
  const form = f.dataset.form; if (!form) return;
  const btn = f.querySelector("[type=submit]");
  const run = async (errId, fn) => { showErr(errId, ""); btn.disabled = true; try { await fn() } catch (x) { showErr(errId, x.message) } finally { btn.disabled = false } };
  switch (form) {
    case "login": {
      const email = $("#le").value.trim().toLowerCase(), password = $("#lp").value;
      if (!emailOk(email) || !password) return showErr("lerr", "Enter your email and password.");
      return run("lerr", async () => { const r = await api("POST", "/auth/signin", {email, password}); toast(`Welcome back, ${r.user.name.split(" ")[0]}`); afterAuth(r.user) });
    }
    case "signup": {
      const name = $("#sn").value.trim(), email = $("#se").value.trim().toLowerCase(), password = $("#sp").value;
      if (!name) return showErr("serr", "Enter your name.");
      if (!emailOk(email)) return showErr("serr", "Enter a valid email, like name@email.com.");
      if (password.length < 8) return showErr("serr", "Use at least 8 characters for the password.");
      return run("serr", async () => { const r = await api("POST", "/auth/join", {name, email, password}); toast(`Welcome to Lumzi, ${name.split(" ")[0]}!`); afterAuth(r.user) });
    }
    case "profile": {
      const name = $("#pn").value.trim(), email = $("#pe").value.trim().toLowerCase();
      if (!name || !emailOk(email)) return showErr("perr", "Enter your name and a valid email.");
      return run("perr", async () => { await api("PATCH", "/me", {name, email}); ST.me = {...ST.me, name, email}; renderHeader(); toast("Profile saved") });
    }
    case "password": {
      const current = $("#pc").value, next = $("#pw").value;
      if (next.length < 8) return showErr("pwerr", "Use at least 8 characters for the new password.");
      return run("pwerr", async () => { await api("POST", "/me/password", {current, next}); $("#pc").value = ""; $("#pw").value = ""; toast("Password changed. You've been signed out on other devices.") });
    }
    case "asg": {
      const id = f.dataset.id, text = $("#at" + id).value, url = $("#au" + id).value.trim();
      if (!text.trim() && !url) return showErr("ae" + id, "Write your answer or add a link.");
      return run("ae" + id, async () => { ASG[id] = await api("POST", `/assignments/${id}/submission`, {text, url}); redrawAsg(+id); toast("Assignment submitted") });
    }
  }
});

/* ---------- Boot ---------- */
$("#yr").textContent = new Date().getFullYear();
api("GET", "/me").then(r => { ST.me = r.user }).catch(() => {}).finally(render);
