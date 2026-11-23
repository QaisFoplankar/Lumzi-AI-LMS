/* =====================================================================
   Lumzi LMS (index.html): accounts, dashboard, catalog, courses,
   certificates, Studio and settings. The website is lumzi.io.
   ===================================================================== */

/* ---------- Pieces ---------- */
const bar = (c, k) => `<div class="prow"><div class="pbar${status(c) === "done" ? " done" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(c)}" aria-label="${esc(c.t)} progress"><i data-k="${k}" data-p="${prog(c)}"></i></div><span class="pct">${pct(c)}%</span></div>`;
const badge = c => { const s = status(c); return s === "done" ? '<span class="badge b-done">Completed</span>' : s === "progress" ? '<span class="badge b-progress">In progress</span>' : "" };
const descP = c => c.d ? `<p class="desc">${esc(c.d)}</p>` : `<p class="desc none">No description yet.</p>`;
function cta(c, cls = "btn btn-primary btn-sm") {
  const s = status(c);
  if (!s) return `<button class="${cls}" data-act="enroll" data-id="${c.id}">Enroll</button>`;
  if (s === "done") return `<a class="${cls}" href="#/course/${c.id}">Review</a>`;
  return `<a class="${cls}" href="#/course/${c.id}">${en(c.id).done.length ? "Resume" : "Start course"}</a>`;
}
const catalogCta = c => status(c) ? `<a class="btn btn-primary btn-sm" href="#/course/${c.id}">Continue</a>` : `<button class="btn btn-primary btn-sm" data-act="enroll" data-id="${c.id}">Enroll</button>`;
function coverArt(c) {
  const html = courseIconHtml(c), label = esc(own(c) ? c.ab : abbr(orgOf(c)));
  return html ? `<span class="appicon">${html}</span><span class="ghost">${html}</span>` : `<span class="appicon txt">${label}</span><span class="big">${label}</span>`;
}
function courseCard(c, mode) {
  const img = courseImg(c), fit = img && courseFit(c);
  return `<article class="ccard" style="--cc:${c.c}">
    <a class="cover${img ? " photo" : ""}${fit ? " fit" : ""}"${fit ? ` style="--fitbg:${fit}"` : ""} href="#/course/${c.id}" tabindex="-1" aria-hidden="true">${img ? `<img class="cover-img" src="${img}" alt="" loading="lazy">` : ""}${coverArt(c)}${mode === "learning" ? "" : badge(c)}</a>
    <div class="cbody">
      <h3><a href="#/course/${c.id}">${esc(c.t)}</a></h3>
      ${own(c) ? "" : `<span class="org" style="margin-top:-4px">${esc(orgOf(c))}</span>`}
      ${descP(c)}
      ${mode === "learning" && c.lessons.length ? bar(c, "card-" + c.id) : ""}
      <div class="cfoot">${mode === "learning" ? badge(c) : `<span class="meta2">${c.lessons.length ? c.lessons.length + " lessons" : "Lessons coming soon"}</span>`}${mode === "learning" ? cta(c) : catalogCta(c)}</div>
    </div></article>`;
}
function notFound(h, p, href, label) { return `<div class="wrap"><div class="page-head"><div><h1>${esc(h)}</h1></div></div><div class="empty"><b>${esc(h)}</b>${esc(p)}<br><a class="btn btn-line btn-sm" href="${href}">${esc(label)}</a></div></div>` }

/* ---------- Views ---------- */
let dashTab = "progress", firstDash = true, freshId = null, freshLesson = -1, query = "", catFilter = "All", catShow = 9;
const V = {};

V.dashboard = () => {
  const n = counts(), last = byId(S.last) && en(S.last) ? byId(S.last) : mine().find(c => status(c) === "progress");
  const recs = pubAll().filter(c => !en(c.id)).sort((a, b) => own(b) - own(a)).slice(0, 3);
  const certs = mine().filter(c => status(c) === "done");
  const stat = (label, v, href, icon) => `<a class="dstat" href="${href}"><div><span>${label}</span><b data-count="${v}">${firstDash && !reduce.matches ? 0 : v}</b></div><span class="ic">${icon}</span></a>`;
  const ni = last ? nextIdx(last) : -1;
  const stack = [...mine(), ...ktPub().filter(c => !en(c.id))].slice(0, 3);
  return `
  <section class="dhero"><div class="wrap">
    <div>
      <span class="ws-chip"><img src="assets/lumzi-mark.svg" alt="" width="32" height="32">Lumzi test mode workspace</span>
      <h1>Welcome back, ${esc(S.user.name.split(" ")[0])}</h1>
      <p class="sub lead-in">Track your courses, pick up where you left off, and find something new to learn.</p>
    </div>
    <div class="scene" id="scene" aria-hidden="true"><div class="stage3d" id="stage3d">
      <div class="glow"></div><div class="ring"></div><div class="ring r2"></div>
      ${stack.map((c, i) => `<div class="slot s${i + 1}"><div class="tile3d">${thumb(c, "")}<b>${esc(c.t)}</b><small>${en(c.id) ? (status(c) === "done" ? "Completed" : pct(c) + "% complete") : "Not started"}</small><span class="mini"><i class="${status(c) === "done" ? "ok" : ""}" style="--p:${prog(c)}"></i></span></div></div>`).join("")}
      <span class="spark" style="left:78%;top:14%"></span><span class="spark" style="left:88%;top:70%;animation-delay:-2s;width:6px;height:6px"></span><span class="spark" style="left:6%;top:52%;animation-delay:-3.5s;width:5px;height:5px"></span>
    </div></div>
    <div class="dstats">${stat("Enrolled", n.enrolled, "#/learning", I.book)}${stat("In progress", n.progress, "#/learning", I.play)}${stat("Completed", n.done, "#/learning", I.done)}${stat("Certificates", n.certs, "#/certificates", I.award)}</div>
  </div></section>
  <div class="wrap">
    ${last ? `<section style="margin-top:40px"><h2 class="section-title">Pick up where you left off</h2>
      <div class="resume">${thumb(last, "lg")}<div style="min-width:0"><h3>${esc(last.t)}</h3><p class="next">${ni >= 0 ? `Next: lesson ${ni + 1}, ${esc(last.lessons[ni] || "")}` : "All lessons done"}</p>${bar(last, "resume")}</div>${cta(last, "btn btn-primary")}</div></section>` : ""}
    <div class="dash-grid">
      <section>
        <div class="dash-head"><h2>My courses</h2><a class="btn btn-quiet" href="#/catalog">Browse catalog ${I.chev}</a></div>
        <div class="utabs" role="tablist" id="dtabs">
          <button role="tab" data-tab="progress" aria-selected="${dashTab === "progress"}">In progress <span>(${n.progress})</span></button>
          <button role="tab" data-tab="done" aria-selected="${dashTab === "done"}">Completed <span>(${n.done})</span></button>
          <button role="tab" data-tab="all" aria-selected="${dashTab === "all"}">All courses <span>(${n.enrolled})</span></button>
          <i class="ind" aria-hidden="true"></i>
        </div>
        <div class="clist" id="dlist" role="tabpanel">${dashList()}</div>
      </section>
      <aside class="side">
        <div class="panel"><h3>Looking for a new challenge?</h3>
          ${recs.length ? recs.map(c => `<a class="rec" href="#/course/${c.id}">${thumb(c, "sm")}<span style="min-width:0"><b>${esc(c.t)}</b><small>${esc(c.d || "No description yet.")}</small></span>${I.chev}</a>`).join("") : `<p style="color:var(--muted)">You're enrolled in every published course.</p>`}
        </div>
        <a class="panel cert-mini" href="#/certificates"><span class="seal">${I.award}</span><span><b>${certs.length} certificate${certs.length === 1 ? "" : "s"} earned</b><small>${certs.length ? esc(certs.map(c => c.t).join(", ")) : "Finish a course to earn one"}</small></span></a>
      </aside>
    </div>
  </div>`;
};
function dashList() {
  const list = mine().filter(c => dashTab === "all" || status(c) === dashTab);
  if (!list.length) return `<div class="empty"><b>${dashTab === "done" ? "No completed courses yet" : "Nothing here yet"}</b>${dashTab === "done" ? "Finish every lesson in a course to see it here." : "Enroll in a course from the catalog to get started."}<br><a class="btn btn-line btn-sm" href="#/catalog">Open catalog</a></div>`;
  return list.map(c => `<div class="crow">${thumb(c, "md")}<div style="min-width:0"><div class="top"><h4>${esc(c.t)}</h4>${badge(c)}</div>${bar(c, "row-" + c.id)}</div>${cta(c)}</div>`).join("");
}

V.catalog = () => {
  const own = [...ktPub()].sort((a, b) => a.t.localeCompare(b.t));
  const subs = ["All","AI","Computer Science","Data Science","Business","Healthcare"];
  const partner = SAMPLE.filter(c => catFilter === "All" || c.s === catFilter);
  return `<div class="wrap">
    <div class="page-head"><div><h1>Published courses</h1><p>${own.length} Lumzi courses, plus ${SAMPLE.length} from partner institutes.</p></div></div>
    ${own.length ? `<div class="cgrid">${own.map(c => courseCard(c, "catalog")).join("")}</div>` : `<div class="empty"><b>No published courses yet</b>Publish a course from Studio to list it here.<br><a class="btn btn-line btn-sm" href="#/studio">Open Studio</a></div>`}
    <div class="subhead"><div><h2>Partner courses</h2><p>From universities and institutes that teach on Lumzi.</p></div></div>
    <div class="quick" style="margin:0 0 18px">${subs.map(s => `<button data-act="catf" data-v="${s}" aria-pressed="${s === catFilter}" style="${s === catFilter ? "background:var(--ink);color:var(--paper);border-color:var(--ink)" : ""}">${s === "AI" ? "Artificial Intelligence" : s}</button>`).join("")}</div>
    <div class="cgrid" id="pgrid">${partner.slice(0, catShow).map(c => courseCard(c, "catalog")).join("")}</div>
    ${partner.length > catShow ? `<div class="more"><button class="btn btn-line" data-act="catmore">Show ${Math.min(9, partner.length - catShow)} more</button></div>` : ""}
  </div>`;
};

V.learning = () => {
  const list = mine();
  return `<div class="wrap">
    <div class="page-head"><div><h1>My Learning</h1><p>Every course you're enrolled in, with your progress.</p></div><a class="btn btn-line" href="#/certificates">${I.award}Certificates</a></div>
    ${list.length ? `<div class="cgrid">${list.map(c => courseCard(c, "learning")).join("")}</div>` : `<div class="empty"><b>You haven't enrolled in a course yet</b>Pick one from the catalog to start learning.<br><a class="btn btn-primary btn-sm" href="#/catalog">Browse catalog</a></div>`}
  </div>`;
};

V.certificates = () => {
  const list = mine().filter(c => status(c) === "done");
  return `<div class="wrap">
    <div class="page-head"><div><a class="crumb" href="#/learning">${I.back}My Learning</a><h1>Certificates</h1><p>Certificates for courses you have completed. Download saves a PNG you can print or share.</p></div></div>
    ${list.length ? `<div class="cgrid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,460px),1fr))">${list.map(c => `
      <article class="cert">
        <div class="top">${LOGO_HTML}<span class="seal">${I.award}</span></div>
        <p class="k">Certificate of completion</p>
        <h3>${esc(c.t)}</h3>
        <p class="to">Awarded to <b>${esc(S.user.name)}</b> for completing all ${c.lessons.length} lessons.</p>
        <div class="bottom"><small>Lumzi LMS${en(c.id).doneAt ? `<br>Completed on ${fmtDate(en(c.id).doneAt)}` : ""}</small><button class="btn btn-line btn-sm" data-act="download" data-id="${c.id}">${I.dl}Download</button></div>
      </article>`).join("")}</div>` : `<div class="empty"><b>No certificates yet</b>Complete every lesson in a course and its certificate appears here.<br><a class="btn btn-line btn-sm" href="#/learning">Go to My Learning</a></div>`}
  </div>`;
};

V.search = () => `<div class="wrap">
  <div class="page-head"><div><h1>Search</h1><p>Find a course by name, topic or lesson.</p></div></div>
  <label class="bigsearch" for="sq">${I.search}<span class="sr">Search courses</span><input id="sq" type="search" placeholder="Try Tally, Excel, GST or prompts" value="${esc(query)}" autocomplete="off" enterkeyhint="search"></label>
  <div class="quick">${["Tally","GST","Excel","PowerPoint","Prompts","Python","Leadership"].map(q => `<button data-act="q" data-q="${q}">${q}</button>`).join("")}</div>
  <div class="results" id="results">${results()}</div>
</div>`;
function hl(text, q) { if (!q) return esc(text); const i = text.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return esc(text); return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length)) }
function results() {
  const q = query.trim();
  if (!q) return `<p class="count">Type to search ${pubAll().length} published courses.</p>`;
  const L = q.toLowerCase();
  const list = pubAll().filter(c => (c.t + " " + c.d + " " + orgOf(c) + " " + c.lessons.join(" ")).toLowerCase().includes(L)).sort((a, b) => own(b) - own(a));
  if (!list.length) return `<div class="empty"><b>No course matches "${esc(q)}"</b>Check the spelling, or browse everything in the catalog.<br><a class="btn btn-line btn-sm" href="#/catalog">Open catalog</a></div>`;
  return `<p class="count">${list.length} result${list.length === 1 ? "" : "s"} for "${esc(q)}"</p>` + list.slice(0, 20).map(c => {
    const les = c.lessons.find(l => l.toLowerCase().includes(L));
    return `<a class="crow" href="#/course/${c.id}">${thumb(c, "md")}<div style="min-width:0"><div class="top"><h4>${hl(c.t, q)}</h4>${badge(c)}</div><p style="color:var(--muted);font-size:14.5px;margin-top:4px">${les && !c.t.toLowerCase().includes(L) ? "Lesson: " + hl(les, q) : hl((c.d || "No description yet.").slice(0, 140), q)}</p></div>${I.chev}</a>`;
  }).join("");
}

V.studio = () => `<div class="wrap">
  <div class="page-head"><div><h1>Courses</h1><p>Your Lumzi courses. Drafts stay hidden from learners until you publish them.</p></div></div>
  <div class="studio">
    <div class="table">${S.courses.map(c => `<div class="trow${c.id === freshId ? " fresh" : ""}">${thumb(c, "sm")}<div style="min-width:0"><b><a href="#/studio/${c.id}">${esc(c.t)}</a></b><small>${c.lessons.length ? c.lessons.length + " lessons" : "No lessons yet"}</small></div><span class="badge b-${c.st}">${c.st}</span><div class="acts"><a class="btn btn-line btn-sm" href="#/studio/${c.id}">Edit</a><button class="btn btn-line btn-sm" data-act="publish" data-id="${c.id}">${c.st === "published" ? "Unpublish" : "Publish"}</button></div></div>`).join("")}</div>
    <section class="panel">
      <h3>New course</h3>
      <form class="form" id="newCourse" novalidate>
        <div class="field" id="f-ct"><label for="ct">Course title</label><input class="input" id="ct" placeholder="e.g. Advanced Tally with GST" autocomplete="off" maxlength="80"><p class="err">Add a course title to create the course.</p></div>
        <div class="field"><label for="cd">Short description <span class="hint">(optional)</span></label><textarea class="input" id="cd" placeholder="What will learners be able to do after this course?" maxlength="400"></textarea></div>
        <button class="btn btn-primary" type="submit">Create course</button>
      </form>
    </section>
  </div>
</div>`;

V.studioEdit = id => {
  const c = S.courses.find(x => x.id === id);
  if (!c) return notFound("This course isn't in Studio", "Only your own Lumzi courses can be edited.", "#/studio", "Back to Studio");
  return `<div class="wrap">
  <div class="page-head"><div><a class="crumb" href="#/studio">${I.back}Studio</a><h1>${esc(c.t)}</h1><p><span class="badge b-${c.st}">${c.st}</span></p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-line" href="/#/learn/${c.id}" target="_blank" rel="noopener">View on student site</a><button class="btn btn-primary" data-act="publish" data-id="${c.id}">${c.st === "published" ? "Unpublish" : "Publish"}</button></div></div>
  <div class="two-col">
    <div style="display:grid;gap:18px">
      <section class="panel"><h3>Details</h3>
        <form class="form" id="editCourse" novalidate>
          <div class="field" id="f-et"><label for="et">Course title</label><input class="input" id="et" value="${esc(c.t)}" maxlength="80"><p class="err">The course needs a title.</p></div>
          <div class="field"><label for="ed">Description</label><textarea class="input" id="ed" maxlength="400">${esc(c.d)}</textarea></div>
          <div class="row2">
            <div class="field"><label for="es">Subject</label><select class="input" id="es">${["AI","Computer Science","Data Science","Business","Healthcare"].map(s => `<option${s === c.s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
            <div class="field"><label for="el">Level</label><select class="input" id="el">${["Beginner","Intermediate","Advanced"].map(s => `<option${s === c.l ? " selected" : ""}>${s}</option>`).join("")}</select></div>
          </div>
          <div><button class="btn btn-primary" type="submit">Save changes</button></div>
        </form>
      </section>
      ${DB && c.mods ? studioOutline(c) : `<section class="panel"><h3>Lessons</h3>
        <div class="les-edit" id="lesList">${c.lessons.length ? c.lessons.map((l, i) => `<div class="li${i === freshLesson ? " fresh" : ""}"><span>${i + 1}</span><div>${esc(l)}</div><button class="icon-btn" data-act="dellesson" data-id="${c.id}" data-i="${i}" aria-label="Remove lesson ${i + 1}: ${esc(l)}">${I.x}</button></div>`).join("") : `<p style="color:var(--muted)">No lessons yet. Add the first one below.</p>`}</div>
        <form class="addrow" id="addLesson" style="margin-top:12px" novalidate><label class="sr" for="nl">New lesson title</label><input class="input" id="nl" placeholder="New lesson title" maxlength="80"><button class="btn btn-primary" type="submit">${I.plus}Add</button></form>
      </section>`}
    </div>
    <aside class="side">
      <section class="panel"><h3>Learners</h3><p style="color:var(--muted)">${en(c.id) ? "You are enrolled in this course." : "No one is enrolled yet."}</p></section>
      <section class="panel"><h3>Delete course</h3><p style="color:var(--muted);margin-bottom:14px">Removes the course, its lessons and any progress on it. This can't be undone.</p><button class="btn btn-danger btn-sm" data-act="delcourse" data-id="${c.id}">Delete course</button></section>
    </aside>
  </div></div>`;
};

V.settings = () => `<div class="wrap">
  <div class="page-head"><div><h1>Settings</h1><p>Your profile and how Lumzi LMS looks and notifies you.</p></div></div>
  <div class="settings">
    <section class="panel"><h3>Profile</h3>
      <form class="form" id="profile" novalidate>
        <div class="row2">
          <div class="field" id="f-pn"><label for="pn">Full name</label><input class="input" id="pn" value="${esc(S.user.name)}" autocomplete="name" maxlength="40"><p class="err">Enter your name.</p></div>
          <div class="field" id="f-pe"><label for="pe">Email</label><input class="input" id="pe" type="email" value="${esc(S.user.email)}" autocomplete="email"><p class="err">Enter a valid email, like name@example.com.</p></div>
        </div>
        <div><button class="btn btn-primary" type="submit">Save profile</button></div>
      </form>
    </section>
    ${DB ? `<section class="panel"><h3>Password</h3>
      <form class="form" data-cf="pwChange" novalidate>
        <div class="row2">
          <div class="field"><label for="pwc">Current password</label><input class="input" id="pwc" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="pwn">New password</label><input class="input" id="pwn" type="password" autocomplete="new-password" minlength="8"></div>
        </div>
        <p class="formerr" id="pwErr" role="alert"></p>
        <div><button class="btn btn-primary" type="submit">Change password</button></div>
      </form></section>` : ""}
    <section class="panel"><h3>Appearance</h3>
      <div class="setrow"><div><b>Theme</b><small>System follows your device setting.</small></div></div>
      <div class="seg" data-seg="theme"></div>
    </section>
    <section class="panel"><h3>Notifications</h3>
      <div class="setrow"><div><b>Email updates</b><small>New courses and certificate emails.</small></div><button class="switch" role="switch" aria-label="Email updates" aria-checked="${S.prefs.email}" data-act="pref" data-k="email"></button></div>
      <div class="setrow"><div><b>Study reminders</b><small>A nudge when a course sits untouched for a week.</small></div><button class="switch" role="switch" aria-label="Study reminders" aria-checked="${S.prefs.remind}" data-act="pref" data-k="remind"></button></div>
    </section>
    <section class="panel"><h3>Demo data</h3>
      <div class="setrow"><div><b>Reset this demo</b><small>${DB ? "Clears your enrollments, progress and preferences. Courses stay as they are. You stay signed in." : "Puts courses, enrollments and progress back to the starting state. You stay signed in."}</small></div><button class="btn btn-line btn-sm" data-act="reset">Reset demo</button></div>
    </section>
  </div>
</div>`;

V.course = id => {
  const c = byId(id);
  if (!c || (c.st === "draft" && !signedIn())) return notFound("Course not found", "It may have been removed or isn't published yet.", signedIn() ? "#/catalog" : SITE_URL, "Browse courses");
  const e = en(c.id), s = status(c), ni = nextIdx(c), back = signedIn() ? (e ? ["#/learning","My Learning"] : ["#/catalog","Catalog"]) : [SITE_URL,"Website"];
  return `<section class="course-hero"><div class="wrap">
    <div class="iconwrap">${thumb(c, "")}</div>
    <div style="min-width:0">
      <a class="crumb" href="${back[0]}">${I.back}${back[1]}</a>
      <h1>${esc(c.t)}</h1>
      ${c.d ? `<p class="desc">${esc(c.d)}</p>` : `<p class="desc" style="font-style:italic">No description yet.</p>`}
      <div class="facts"><span>${esc(orgOf(c))}</span><span>${esc(typeOf(c) === "Executive Ed" ? "Executive Education" : typeOf(c))}</span><span>${esc(c.l || "")}</span><span>${esc(durOf(c))}</span></div>
      <div class="acts">${badge(c)}${c.st === "draft" ? '<span class="badge b-draft">draft</span>' : ""}${e ? `<span style="color:var(--muted);font-size:14.5px">${e.done.length} of ${c.lessons.length} lessons done</span>` : `<button class="btn btn-primary" data-act="enroll" data-id="${c.id}">${signedIn() ? "Enroll" : "Enroll free"}</button>`}${s === "done" ? `<a class="btn btn-line btn-sm" href="#/certificates">${I.award}View certificate</a>` : ""}</div>
      ${e && c.lessons.length ? `<div style="max-width:520px">${bar(c, "course-" + c.id)}</div>` : ""}
    </div>
    ${courseImg(c) ? `<figure class="course-photo${courseFit(c) ? " fit" : ""}"${courseFit(c) ? ` style="--fitbg:${courseFit(c)}"` : ""}><img src="${courseImg(c)}" alt="${esc(c.t)} course on Lumzi"></figure>` : ""}
  </div></section>
  <div class="wrap" style="padding-bottom:56px">
    <div class="lesson-head"><h2>Lessons</h2>${!e ? `<span style="color:var(--muted);display:inline-flex;gap:6px;align-items:center">${I.lock}${signedIn() ? "Enroll to start" : "Join free to start"}</span>` : ""}</div>
    ${DB && c.mods && c.lessons.length ? courseOutline(c, e) : c.lessons.length ? `<ol class="lessons">${c.lessons.map((l, i) => { const d = e && e.done.includes(i), nx = e && i === ni; return `<li class="lesson${d ? " done" : ""}${nx ? " next" : ""}${!e ? " locked" : ""}"><span class="num">${d ? I.check : i + 1}</span><div><b>${esc(l)}</b><small>Lesson ${i + 1}${nx ? ", up next" : ""}</small></div>${e ? `<button class="btn ${d ? "btn-line" : "btn-primary"} btn-sm" data-act="lesson" data-id="${c.id}" data-i="${i}" aria-pressed="${!!d}">${d ? "Done" : "Mark complete"}</button>` : ""}</li>` }).join("")}</ol>` : `<div class="empty"><b>Lessons coming soon</b>This course doesn't have any lessons yet.</div>`}
  </div>`;
};

/* ---------- Auth ---------- */
function authArt() {
  const keys = ["excel","word","ppt","tally","ai","pc"];
  return `<div class="auth-art"><div><h2 class="split-me">Lumzi LMS Admin</h2><p class="lead-in">Courses, modules, quizzes aur learners, sab ek jagah se manage karo.</p></div>
    <div class="orbit" aria-hidden="true"><div class="tilt"><span class="core"><img src="assets/lumzi-mark.svg" alt=""></span><div class="spin">${keys.map((k, i) => `<span class="it" style="--i:${i}"><span class="cthumb app">${iconSvg(k)}</span></span>`).join("")}</div></div></div>
    <p style="font-size:14px;color:rgba(255,255,255,.7)">Students learn on the <a href="/" style="color:#fff">student site</a>.</p></div>`;
}
const nextQ = () => params.next ? "?next=" + encodeURIComponent(params.next) : "";
V.join = () => `<div class="auth">${authArt()}<div class="auth-form"><div class="box">
  <h1>Create your free account</h1><p class="sub">Takes a few seconds. No card needed.</p>
  <form class="form" id="joinForm" novalidate>
    <div class="formerr" id="joinErr"></div>
    <div class="field" id="f-jn"><label for="jn">Full name</label><input class="input" id="jn" autocomplete="name" maxlength="40"><p class="err">Enter your name.</p></div>
    <div class="field" id="f-je"><label for="je">Email</label><input class="input" id="je" type="email" autocomplete="email" inputmode="email"><p class="err">Enter a valid email, like name@example.com.</p></div>
    <button class="btn btn-primary btn-block" type="submit">Create account</button>
  </form>
  <p class="alt">Already have an account? <a href="#/signin${nextQ()}">Sign in</a></p>
  <p class="alt"><span class="note-demo">Demo: your account is saved only in this browser.</span></p>
</div></div></div>`;
V.signin = () => `<div class="auth">${authArt()}<div class="auth-form"><div class="box">
  <h1>Admin sign in</h1><p class="sub">Only admin accounts can open this panel.</p>
  <form class="form" id="signinForm" novalidate>
    <div class="formerr" id="signErr"></div>
    <div class="field" id="f-se"><label for="se">Email</label><input class="input" id="se" type="email" autocomplete="email" inputmode="email" value="${esc(S.user?.email || "")}"><p class="err">Enter a valid email, like name@example.com.</p></div>
    <div class="field" id="f-sp"><label for="sp">Password</label><input class="input" id="sp" type="password" autocomplete="current-password"><p class="err">Enter your password.</p></div>
    <button class="btn btn-primary btn-block" type="submit">Sign in</button>
  </form>
  <p class="alt">Student? <a href="/">Go to the student site</a></p>
</div></div></div>`;
V.notfound = () => notFound("Page not found", "The link may be old or mistyped.", "#/", "Go to the LMS");

/* ---------- Router ---------- */
const APP = ["dashboard","catalog","learning","certificates","search","studio","studioEdit","settings","quizEdit","subs","lesson","learners"];
const SUBROUTES = ["studioEdit","quizEdit","subs","lesson"];
const BOTTOM = ["dashboard","catalog","learning","search","studio"];
const TITLES = {dashboard:"Dashboard", studio:"Studio", studioEdit:"Edit course", learners:"Learners", quizEdit:"Quiz builder", subs:"Submissions", lesson:"Lesson", catalog:"Catalog", learning:"My Learning", search:"Search", settings:"Settings", certificates:"Certificates", join:"Join free", signin:"Sign in", notfound:"Not found"};
let route = "dashboard", arg = null, params = {};
function parse() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  params = Object.fromEntries(new URLSearchParams(qs || ""));
  const p = path.split("/").filter(Boolean);
  if (!p.length) { route = ""; arg = null; return }
  if (p[0] === "studio" && p[1] && p[2] === "quiz" && p[3]) { route = "quizEdit"; arg = {c:p[1], b:p[3]}; return }
  if (p[0] === "studio" && p[1] && p[2] === "assignment" && p[3]) { route = "subs"; arg = {c:p[1], b:p[3]}; return }
  if (p[0] === "studio" && p[1]) { route = "studioEdit"; arg = p[1]; return }
  if (p[0] === "course" && p[1] && p[2] === "lesson" && p[3]) { route = "lesson"; arg = {c:p[1], l:p[3]}; return }
  route = (V[p[0]] && !SUBROUTES.includes(p[0])) ? p[0] : "notfound"; arg = p[1] || null;
}
function render(soft) {
  parse();
  if (route === "") { location.replace(signedIn() ? "#/dashboard" : "#/signin"); return }
  if (APP.includes(route) && !signedIn()) { location.replace("#/signin?next=" + encodeURIComponent(location.hash.slice(2))); return }
  if (route === "join" && DB) { location.replace("#/signin"); return }
  if ((route === "join" || route === "signin") && signedIn()) { location.replace("#/" + (params.next || "dashboard")); return }

  const appChrome = signedIn() && route !== "join" && route !== "signin";
  document.body.classList.toggle("in-app", appChrome);
  $("#lmspub").hidden = appChrome;
  $("#apphead").hidden = !appChrome;
  renderPubNav();
  const main = $("#main");
  main.classList.toggle("app-pad", appChrome);
  main.innerHTML = V[route](arg);
  if (!soft) {
    window.scrollTo(0, 0);
    // page entrance: words of the title rise in, lists arrive one after another
    if (!viaVT) { main.classList.remove("enter"); void main.offsetWidth; main.classList.add("enter") }
    main.querySelectorAll("h1, .split-me").forEach(splitWords);
    main.querySelectorAll(".page-head p:not(.crumb)").forEach(p => p.classList.add("lead-in"));
    main.classList.remove("stagger"); void main.offsetWidth; main.classList.add("stagger");
    clearTimeout(staggerT); staggerT = setTimeout(() => main.classList.remove("stagger"), 1200);
  }
  const ct = route === "course" && byId(arg) ? byId(arg).t : TITLES[route];
  document.title = `${ct} | Lumzi Admin`;
  syncNav(); after(soft);
}
function after(soft) {
  animateBars();
  $$("[data-seg]").forEach(buildSeg);
  placeTabInd();
  if (route === "dashboard" && firstDash) { firstDash = false; countUp() }
  if (!soft && matchMedia("(pointer:fine)").matches) { const f = {search:"#sq", join:"#jn", signin:"#se"}[route]; f && $(f) && $(f).focus() }
  freshId = null; freshLesson = -1;
}
/* Page changes use the View Transitions API where supported: the header and
   background stay put, content cross-fades, and a course icon flies into the course page. */
let viaVT = false, staggerT;
addEventListener("hashchange", () => {
  closeMenus();
  // a hidden tab never paints, so a view transition there would never run its update: render straight away
  if (document.startViewTransition && !reduce.matches && !document.hidden) {
    const vt = document.startViewTransition(() => { viaVT = true; render(); viaVT = false });
    // a quick second click skips the running transition; that's expected, so swallow the rejections
    vt.ready.catch(() => {}); vt.updateCallbackDone.catch(() => {});
    vt.finished.catch(() => {}).then(() => $$("[data-vt]").forEach(x => { x.style.viewTransitionName = ""; delete x.dataset.vt }));
  } else render();
});
function splitWords(el) {
  if (el.dataset.split) return; el.dataset.split = "1";
  const text = el.textContent; el.setAttribute("aria-label", text);
  let i = 0;
  el.innerHTML = text.split(/(\s+)/).map(w => /^\s+$/.test(w) ? w : `<span class="sw" aria-hidden="true" style="--i:${i++}">${esc(w)}</span>`).join("");
  el.classList.add("split");
}
/* the clicked course's icon becomes the course page's hero icon */
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#/course/"]'); if (!a || !document.startViewTransition || $(".course-hero")) return;
  const box = a.closest(".ccard,.crow,.rec,.resume,.tile3d") || a;
  const ic = box.querySelector(".appicon,.cthumb"); if (!ic) return;
  ic.style.viewTransitionName = "hero-icon"; ic.dataset.vt = "1";
}, true);

/* 3D tilt on course cards (precise pointers only) */
const finePointer = matchMedia("(hover:hover) and (pointer:fine)");
let tiltCard = null;
function untilt(c) { c.classList.remove("tilting"); c.style.setProperty("--px", 0); c.style.setProperty("--py", 0) }
document.addEventListener("pointermove", e => {
  if (!finePointer.matches || reduce.matches) return;
  const card = e.target.closest && e.target.closest(".ccard");
  if (card !== tiltCard) { if (tiltCard) untilt(tiltCard); tiltCard = card }
  if (!card) return;
  const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
  card.classList.add("tilting");
  card.style.setProperty("--px", (px * 2 - 1).toFixed(3)); card.style.setProperty("--py", (py * 2 - 1).toFixed(3));
  card.style.setProperty("--mx", (px * 100).toFixed(1) + "%"); card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
}, {passive:true});
document.addEventListener("pointerleave", () => { if (tiltCard) { untilt(tiltCard); tiltCard = null } });

/* Dashboard 3D stack leans toward the pointer, eased each frame so it settles without a jump */
let sceneT = {x:0, y:0}, sceneC = {x:0, y:0}, sceneRaf = 0;
function sceneTick() {
  const st = $("#stage3d"); if (!st) { sceneRaf = 0; return }
  sceneC.x += (sceneT.x - sceneC.x) * .08; sceneC.y += (sceneT.y - sceneC.y) * .08;
  st.style.setProperty("--ry", sceneC.x.toFixed(2) + "deg"); st.style.setProperty("--rx", sceneC.y.toFixed(2) + "deg");
  if (Math.abs(sceneT.x - sceneC.x) > .02 || Math.abs(sceneT.y - sceneC.y) > .02) sceneRaf = requestAnimationFrame(sceneTick); else sceneRaf = 0;
}
document.addEventListener("pointermove", e => {
  if (reduce.matches || route !== "dashboard") return;
  const hero = e.target.closest && e.target.closest(".dhero");
  sceneT = hero ? {x:(e.clientX / innerWidth - .5) * 16, y:-(e.clientY / innerHeight - .5) * 10} : {x:0, y:0};
  if (!sceneRaf) sceneRaf = requestAnimationFrame(sceneTick);
}, {passive:true});

function renderPubNav() {
  $("#pnav").innerHTML = `<a class="link" href="/">Student site</a>` + (route === "signin" ? "" : `<a class="btn btn-line" href="#/signin${nextQ()}">Sign in</a>`);
}

/* progress bars grow from where they last were */
const PREV = {};
function animateBars() {
  $$("[data-p]").forEach(el => {
    const k = el.dataset.k, p = +el.dataset.p, from = PREV[k] ?? 0;
    if (reduce.matches || from === p) { el.style.transform = `scaleX(${p})`; PREV[k] = p; return }
    el.style.transition = "none"; el.style.transform = `scaleX(${from})`; void el.offsetWidth; el.style.transition = "";
    requestAnimationFrame(() => { el.style.transform = `scaleX(${p})` }); PREV[k] = p;
  });
}
function countUp() {
  const els = $$(".dstat [data-count]"); if (reduce.matches) return;
  const t0 = performance.now();
  (function tick(t) { const p = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - p, 3); els.forEach(el => el.textContent = Math.round(+el.dataset.count * e)); if (p < 1) requestAnimationFrame(tick) })(t0);
}
function syncNav() {
  const r = ["studioEdit","quizEdit","subs"].includes(route) ? "studio" : route === "lesson" ? "learning" : route;
  $$("#navlinks a").forEach(a => a.dataset.r === r ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  $$("#bottomnav a").forEach(a => a.dataset.r === r ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  placeNavInd();
  const pill = $("#bottomnav .pill"), bi = BOTTOM.indexOf(r);
  pill.style.opacity = bi < 0 ? 0 : 1; if (bi >= 0) pill.style.transform = `translateX(${bi * 100}%)`;
}
function placeNavInd() {
  const ind = $("#navlinks .ind"), a = $(`#navlinks a[aria-current="page"]`);
  if (!a || !a.offsetWidth) { ind.style.opacity = 0; return }
  ind.style.opacity = 1; ind.style.transform = `translateX(${a.offsetLeft + 12}px) scaleX(${a.offsetWidth - 24})`;
}
function placeTabInd() {
  const t = $("#dtabs"); if (!t) return;
  const b = t.querySelector('[aria-selected="true"]'), ind = t.querySelector(".ind");
  ind.style.transform = `translateX(${b.offsetLeft}px) scaleX(${b.offsetWidth})`;
}
addEventListener("resize", () => { placeNavInd(); placeTabInd(); $$("[data-seg]").forEach(buildSeg) });
document.fonts && document.fonts.ready.then(() => { placeNavInd(); placeTabInd() });

function buildSeg(el) {
  const opts = [["light","Light"],["dark","Dark"],["system","System"]];
  if (!el.children.length) el.innerHTML = `<i class="knob" aria-hidden="true"></i>` + opts.map(([v, l]) => `<button type="button" data-act="theme" data-v="${v}" aria-pressed="false">${l}</button>`).join("");
  const btns = [...el.querySelectorAll("button")], i = Math.max(0, opts.findIndex(o => o[0] === S.theme));
  btns.forEach((b, j) => b.setAttribute("aria-pressed", j === i));
  const k = el.querySelector(".knob"); k.style.width = `calc((100% - 8px)/${opts.length})`; k.style.transform = `translateX(${i * 100}%)`;
}
function closeMenus(except) { $$(".menu.open").forEach(m => { if (m.id !== except) { m.classList.remove("open"); const b = $(`[data-menu="${m.id}"]`); b && b.setAttribute("aria-expanded", "false") } }) }
function syncName() { if (!S.user) return; $("#avatarBtn").textContent = S.user.name[0].toUpperCase(); $("#menuName").textContent = S.user.name; $("#menuMail").textContent = S.user.email }

/* ---------- Actions ---------- */
function enroll(id) {
  const c = byId(id); if (!c || en(id)) return;
  const max = Math.max(0, ...Object.values(S.enroll).map(x => x.at));
  S.enroll[id] = {done:[], at:DB ? Date.now() : max + 1}; S.last = id; save(); toast(`Enrolled in ${c.t}`);
  DB && DB.write("POST", "/enrollments", {courseId:id}).catch(() => {});
}
function finishAuth() {
  syncName();
  const pend = ss.get("lz-pending-enroll"); ss.del("lz-pending-enroll");
  if (pend && byId(pend)) { enroll(pend); location.hash = "#/course/" + pend; return }
  location.hash = "#/" + (params.next || "dashboard");
}
let resetArmed = false, delArmed = null;
document.addEventListener("click", e => {
  const mb = e.target.closest("[data-menu]");
  if (mb) { const m = $("#" + mb.dataset.menu), open = !m.classList.contains("open"); closeMenus(mb.dataset.menu); m.classList.toggle("open", open); mb.setAttribute("aria-expanded", open); if (open) { const s = m.querySelector("[data-seg]"); s && buildSeg(s) } return }
  if (!e.target.closest(".menu")) closeMenus(); else if (e.target.closest("a")) closeMenus();

  const t = e.target.closest("[data-act]"); if (!t) return;
  const act = t.dataset.act, c = t.dataset.id && byId(t.dataset.id);
  switch (act) {
    case "enroll":
      if (!signedIn()) { ss.set("lz-pending-enroll", c.id); location.hash = "#/join?next=" + encodeURIComponent("course/" + c.id); toast("Create a free account to enroll"); return }
      enroll(c.id); render(true); break;
    case "lesson": {
      const e2 = en(c.id), i = +t.dataset.i, was = status(c);
      e2.done = e2.done.includes(i) ? e2.done.filter(x => x !== i) : [...e2.done, i].sort((a, b) => a - b);
      if (status(c) === "done") e2.doneAt = e2.doneAt || new Date().toISOString().slice(0, 10); else delete e2.doneAt;
      S.last = c.id; save(); render(true);
      DB && DB.write("PUT", `/enrollments/${encodeURIComponent(c.id)}/lessons/${i}`, {done:e2.done.includes(i)})
        .then(r => { if (r.doneAt) e2.doneAt = r.doneAt; else delete e2.doneAt }).catch(() => {});
      if (was !== "done" && status(c) === "done") { toast("Course completed. Your certificate is ready."); celebrate() }
      break; }
    case "publish":
      c.st = c.st === "published" ? "draft" : "published"; save(); render(true);
      DB && DB.write("PATCH", `/courses/${encodeURIComponent(c.id)}`, {status:c.st}).catch(() => {}); toast(c.st === "published" ? `${c.t} is now live in the catalog` : `${c.t} moved to drafts`); break;
    case "dellesson": {
      c.lessons.splice(+t.dataset.i, 1); const e3 = en(c.id); if (e3) e3.done = e3.done.filter(x => x < c.lessons.length); save(); render(true); toast("Lesson removed");
      DB && DB.write("DELETE", `/courses/${encodeURIComponent(c.id)}/lessons/${+t.dataset.i}`, null, {sync:true}).catch(() => {}); break; }
    case "delcourse":
      if (delArmed !== c.id) { delArmed = c.id; t.textContent = "Click again to delete"; setTimeout(() => { if (delArmed === c.id) { delArmed = null; if (t.isConnected) t.textContent = "Delete course" } }, 3000); return }
      delArmed = null; S.courses = S.courses.filter(x => x.id !== c.id); delete S.enroll[c.id]; if (S.last === c.id) S.last = null; save(); toast(`${c.t} deleted`);
      DB && DB.write("DELETE", `/courses/${encodeURIComponent(c.id)}`).catch(() => {}); location.hash = "#/studio"; break;
    case "theme":
      S.theme = t.dataset.v; save(); applyTheme(); $$("[data-seg]").forEach(buildSeg); break;
    case "pref":
      S.prefs[t.dataset.k] = !S.prefs[t.dataset.k]; save();
      DB && DB.write("PATCH", "/me", {prefs:{[t.dataset.k]:S.prefs[t.dataset.k]}}).catch(() => {}); t.setAttribute("aria-checked", S.prefs[t.dataset.k]); toast(`${t.getAttribute("aria-label")} turned ${S.prefs[t.dataset.k] ? "on" : "off"}`); break;
    case "reset": {
      if (!resetArmed) { resetArmed = true; t.textContent = "Click again to reset"; setTimeout(() => { resetArmed = false; if (t.isConnected) t.textContent = "Reset demo" }, 3000); return }
      resetArmed = false;
      if (DB) { DB.write("POST", "/reset").then(st => { DB.apply(st); for (const k in PREV) delete PREV[k]; render(true); toast("Your progress was reset") }).catch(() => {}); break }
      const keep = {user:S.user, signedIn:S.signedIn, theme:S.theme}; S = Object.assign(structuredClone(DEFAULT), keep); save(); for (const k in PREV) delete PREV[k]; render(true); toast("Demo reset"); break; }
    case "q":
      query = t.dataset.q; $("#sq").value = query; $("#results").innerHTML = results(); break;
    case "catf":
      catFilter = t.dataset.v; catShow = 9; render(true); break;
    case "catmore":
      catShow += 9; render(true); break;
    case "download":
      downloadCert(c, t); break;
    case "signout":
      closeMenus(); S.signedIn = false; save();
      if (DB) { DB.req("POST", "/auth/signout").catch(() => {}).finally(() => { location.hash = "#/signin"; location.reload() }); break }
      location.href = SITE_URL; break;
  }
});
/* dashboard tabs: swap only the list and slide the underline */
document.addEventListener("click", e => {
  const b = e.target.closest("#dtabs [data-tab]"); if (!b || b.dataset.tab === dashTab) return;
  dashTab = b.dataset.tab; $$("#dtabs [data-tab]").forEach(x => x.setAttribute("aria-selected", x === b)); placeTabInd();
  const l = $("#dlist"); l.innerHTML = dashList(); l.classList.remove("swap"); void l.offsetWidth; l.classList.add("swap"); animateBars();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { const m = $(".menu.open"); if (m) { closeMenus(); $(`[data-menu="${m.id}"]`).focus() } }
  if (e.key === "/" && route === "search" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); $("#sq").focus() }
  const b = e.target.closest && e.target.closest("#dtabs [data-tab]");
  if (b && ["ArrowLeft","ArrowRight"].includes(e.key)) { const all = $$("#dtabs [data-tab]"), n = all[(all.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length]; n.focus(); n.click() }
});
document.addEventListener("input", e => {
  if (e.target.id === "sq") { query = e.target.value; $("#results").innerHTML = results() }
  const f = e.target.closest(".field.bad"); if (f) f.classList.remove("bad");
  const fe = $(".formerr.show"); if (fe && e.target.closest("form")?.contains(fe)) fe.classList.remove("show");
});
document.addEventListener("submit", e => {
  const f = e.target; e.preventDefault();
  if (f.id === "joinForm") {
    const n = $("#jn").value.trim(), m = $("#je").value.trim().toLowerCase();
    const ok = [check("f-jn", n.length > 0), check("f-je", emailOk(m))].every(Boolean);
    if (!ok) { f.querySelector(".bad .input").focus(); return }
    if (DB) {
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      DB.req("POST", "/auth/join", {name:n, email:m}).then(st => { DB.apply(st); toast(`Welcome, ${n.split(" ")[0]}`); finishAuth() })
        .catch(err => { const er = $("#joinErr"); er.innerHTML = err.status === 409 ? `An account with this email already exists. <a href="#/signin${nextQ()}" style="color:inherit">Sign in instead</a>.` : esc(err.message); er.classList.add("show") })
        .finally(() => { btn.disabled = false });
      return;
    }
    if (S.user && S.user.email === m) { const er = $("#joinErr"); er.innerHTML = `An account with this email already exists. <a href="#/signin${nextQ()}" style="color:inherit">Sign in instead</a>.`; er.classList.add("show"); return }
    S.user = {name:n, email:m}; S.signedIn = true; save(); toast(`Welcome, ${n.split(" ")[0]}`); finishAuth();
  } else if (f.id === "signinForm") {
    const m = $("#se").value.trim().toLowerCase();
    if (!check("f-se", emailOk(m))) { $("#se").focus(); return }
    if (DB) {
      const pw = $("#sp").value; if (!check("f-sp", !!pw)) { $("#sp").focus(); return }
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      DB.req("POST", "/auth/signin", {email:m, password:pw, admin:true}).then(st => { DB.apply(st); toast(`Welcome back, ${S.user.name.split(" ")[0]}`); finishAuth() })
        .catch(err => { const er = $("#signErr"); er.textContent = err.message; er.classList.add("show"); $("#sp").value = "" })
        .finally(() => { btn.disabled = false });
      return;
    }
    if (!S.user || S.user.email !== m) { const er = $("#signErr"); er.innerHTML = `No account uses this email on this device. <a href="#/join${nextQ()}" style="color:inherit">Join free</a> to create one.`; er.classList.add("show"); return }
    S.signedIn = true; save(); toast(`Welcome back, ${S.user.name.split(" ")[0]}`); finishAuth();
  } else if (f.id === "newCourse") {
    const title = $("#ct").value.trim(), d = $("#cd").value.trim();
    if (!check("f-ct", !!title)) { $("#ct").focus(); return }
    const ab = title.split(/\s+/).filter(w => /^[a-z0-9]/i.test(w)).map(w => w[0].toUpperCase()).join("").slice(0, 2) || "NC";
    const id = "c-" + slug(title).slice(0, 24) + "-" + Date.now().toString(36).slice(-4);
    S.courses.push({id, t:title, d, st:"draft", ab, c:ORGC[S.courses.length % ORGC.length], s:"Computer Science", l:"Beginner", lessons:[]});
    DB && DB.write("POST", "/courses", {id, title, description:d, abbr:ab, color:S.courses[S.courses.length - 1].c}, {sync:true}).catch(() => {});
    save(); freshId = id; render(true); toast(`${title} created as a draft`);
  } else if (f.id === "editCourse") {
    const c = S.courses.find(x => x.id === arg), t = $("#et").value.trim();
    if (!check("f-et", !!t)) { $("#et").focus(); return }
    c.t = t; c.d = $("#ed").value.trim(); c.s = $("#es").value; c.l = $("#el").value; save();
    DB && DB.write("PATCH", `/courses/${encodeURIComponent(c.id)}`, {title:c.t, description:c.d, subject:c.s, level:c.l}).catch(() => {}); render(true); toast("Changes saved");
  } else if (f.id === "addLesson") {
    const c = S.courses.find(x => x.id === arg), v = $("#nl").value.trim();
    if (!v) { $("#nl").focus(); return }
    c.lessons.push(v); freshLesson = c.lessons.length - 1; save();
    DB && DB.write("POST", `/courses/${encodeURIComponent(c.id)}/lessons`, {title:v}).catch(() => {}); render(true); $("#nl").focus();
  } else if (f.id === "profile") {
    const n = $("#pn").value.trim(), m = $("#pe").value.trim().toLowerCase();
    const ok = [check("f-pn", !!n), check("f-pe", emailOk(m))].every(Boolean); if (!ok) return;
    S.user = {name:n, email:m}; save(); syncName();
    if (DB) { DB.write("PATCH", "/me", {name:n, email:m}).then(() => toast("Profile saved")).catch(() => {}); return }
    toast("Profile saved");
  }
});

/* ---------- Certificate download (PNG drawn on a canvas) ---------- */
function downloadCert(c, btn) {
  btn.disabled = true;
  const draw = withLogo => new Promise((resolve, reject) => {
    const W = 1600, H = 1130, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
    const paint = img => {
      x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, W, H);
      x.strokeStyle = "#2D5BD6"; x.lineWidth = 14; x.strokeRect(40, 40, W - 80, H - 80);
      x.strokeStyle = "#CBD5E1"; x.lineWidth = 2; x.strokeRect(70, 70, W - 140, H - 140);
      // Lumzi logo: square mark + "lumzi" wordmark + LMS label
      const lx = img ? 236 : 120;
      if (img) x.drawImage(img, 120, 124, 96, 96);
      x.fillStyle = "#0F172A"; x.font = "800 80px 'Inter',sans-serif"; x.fillText("lumzi", lx, 200);
      const lw = x.measureText("lumzi").width; x.fillStyle = "#2D5BD6"; x.font = "700 30px 'Inter',sans-serif"; x.fillText("LMS", lx + lw + 18, 198);
      x.fillStyle = "#FCD34D"; x.beginPath(); x.arc(W - 200, 175, 70, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#422006"; x.font = "800 28px 'Inter',sans-serif"; x.textAlign = "center"; x.fillText("LZ", W - 200, 185);
      x.textAlign = "left"; x.fillStyle = "#475569"; x.font = "500 36px 'Inter',sans-serif"; x.fillText("Certificate of completion", 120, 370);
      x.fillStyle = "#0F172A"; let size = 92; x.font = `900 ${size}px 'Inter',sans-serif`;
      while (x.measureText(c.t).width > W - 240 && size > 48) { size -= 4; x.font = `900 ${size}px 'Inter',sans-serif` }
      x.fillText(c.t, 120, 480);
      x.font = "500 40px 'Inter',sans-serif"; x.fillText("Awarded to", 120, 600);
      x.font = "800 64px 'Inter',sans-serif"; x.fillText(S.user.name, 120, 680);
      x.fillStyle = "#475569"; x.font = "500 34px 'Inter',sans-serif"; x.fillText(`for completing all ${c.lessons.length} lessons of this course.`, 120, 750);
      x.fillStyle = "#E2E8F0"; x.fillRect(120, 900, W - 240, 2);
      x.fillStyle = "#0F172A"; x.font = "700 32px 'Inter',sans-serif"; x.fillText("Lumzi LMS", 120, 960);
      x.fillStyle = "#475569"; x.font = "500 30px 'Inter',sans-serif";
      const d = en(c.id).doneAt; if (d) x.fillText("Completed on " + fmtDate(d), 120, 1010);
      x.textAlign = "right"; x.fillText("Certificate ID LZ-" + c.id.toUpperCase().slice(0, 10) + "-" + (d || "").replace(/-/g, ""), W - 120, 1010);
      try { cv.toBlob(b => b ? resolve(b) : reject(), "image/png") } catch (err) { reject(err) }
    };
    if (!withLogo) return paint(null);
    const img = new Image(); img.onload = () => paint(img); img.onerror = () => paint(null); img.src = LOGO_SRC;
  });
  // Opened straight from disk, browsers block reading the logo back from a canvas; fall back to a text logo.
  draw(true).catch(() => draw(false)).then(b => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `Lumzi-certificate-${slug(c.t)}.png`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Certificate downloaded");
  }).catch(() => toast("Couldn't create the certificate. Try again.")).finally(() => { btn.disabled = false });
}

/* another tab (or the website) changed data: re-read */
addEventListener("storage", e => { if (e.key === KEY) { loadState(); applyTheme(); syncName(); render(true) } });

/* ---------- Boot ---------- */
if (DB) {
  DB.hydrate().then(() => { syncName(); render() }).catch(() => {
    $("#main").innerHTML = `<div class="wrap"><div class="empty"><b>Can't reach the server</b>The LMS couldn't load your data. Check that the server is running, then reload.<br><button class="btn btn-line btn-sm" onclick="location.reload()">Reload</button></div></div>`;
  });
} else { syncName(); render() }
