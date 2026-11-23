/* =====================================================================
   Course content: modules, lessons, content blocks (reading, embed, quiz,
   assignment), the quiz builder for Studio, and the lesson page with a
   quiz player for learners. Needs the server API (DB); loaded after lms.js.
   ===================================================================== */

const CI = {
  up:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
  down:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  reading:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 10h16M4 14h10M4 18h7"/></svg>',
  embed:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor"/></svg>',
  quiz:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.6M12 17h.01"/></svg>',
  assignment:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
  ext:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  ok:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  no:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
};
const KIND_LABEL = {reading:"Reading", embed:"Video / embed", quiz:"Quiz", assignment:"Assignment"};
const QT = {
  mcq:   {label:"MCQ", desc:"Multiple choice. Mark one or more correct options."},
  blanks:{label:"Choose the correct", desc:"Fill the blank by picking the right word."},
  tf:    {label:"True / False", desc:"A statement that is true or false."},
  match: {label:"Match the pairs", desc:"Join each item on the left with its partner."},
  order: {label:"Arrange in order", desc:"Put the steps or items in the right sequence."},
  short: {label:"Short answer", desc:"Learner types a word or short phrase."}
};
const QORDER = ["mcq","blanks","tf","match","order","short"];
const BLANK_RE = /_{3,}/g;
const blankCount = s => (String(s).match(BLANK_RE) || []).length;

/* Paragraphs from plain text, safely escaped. */
const paras = t => esc(t).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

/* Known video/doc links become embeddable iframes; anything else is shown as a link. */
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

/* Lookups in the in-memory course outline */
function findLesson(c, lid) {
  for (const m of c.mods || []) for (const l of m.lessons) if (String(l.id) === String(lid)) return {m, l};
  return null;
}
function findBlock(c, bid) {
  for (const m of c.mods || []) for (const l of m.lessons) for (const b of l.blocks) if (String(b.id) === String(bid)) return {m, l, b};
  return null;
}
const lessonKinds = l => [...new Set(l.blocks.map(b => b.kind))].map(k => KIND_LABEL[k]).join(" · ");

/* Run an API write, then reload state and redraw. */
function cdo(method, path, body, okMsg) {
  return DB.req(method, path, body).then(r => { if (okMsg) toast(okMsg); return DB.resync().then(() => r) })
    .catch(e => { toast(e.status === 401 ? "Your session ended. Sign in again." : e.message); throw e });
}

/* ===================================================================
   STUDIO: modules > lessons > content
   =================================================================== */
const OPEN = new Set();          // lesson ids whose content editor is expanded
let armed = null;                // two-click delete guard

function studioOutline(c) {
  const mods = c.mods || [];
  return `<section class="panel"><div class="cm-head"><h3>Modules</h3><span>${mods.length} module${mods.length === 1 ? "" : "s"} · ${c.lessons.length} lesson${c.lessons.length === 1 ? "" : "s"}</span></div>
    <div class="cm-mods">${mods.map((m, mi) => `
      <div class="cm-mod">
        <div class="cm-row">
          <form class="cm-title" data-cf="modRename" data-id="${m.id}"><label class="sr" for="mt${m.id}">Module title</label><input class="input" id="mt${m.id}" value="${esc(m.t)}" maxlength="160" data-orig="${esc(m.t)}"></form>
          <div class="cm-tools">
            <button class="icon-btn" data-ca="modMove" data-id="${m.id}" data-dir="-1" aria-label="Move module up"${mi === 0 ? " disabled" : ""}>${CI.up}</button>
            <button class="icon-btn" data-ca="modMove" data-id="${m.id}" data-dir="1" aria-label="Move module down"${mi === mods.length - 1 ? " disabled" : ""}>${CI.down}</button>
            <button class="btn btn-line btn-sm" data-ca="modDel" data-id="${m.id}">Delete module</button>
          </div>
        </div>
        <div class="cm-lessons">${m.lessons.length ? m.lessons.map((l, li) => studioLesson(c, m, l, li)).join("") : `<p class="cm-none">No lessons in this module yet.</p>`}</div>
        <form class="addrow cm-add" data-cf="lesAdd" data-id="${m.id}"><label class="sr" for="nl${m.id}">New lesson title</label><input class="input" id="nl${m.id}" placeholder="New lesson title" maxlength="200"><button class="btn btn-line" type="submit">${I.plus}Lesson</button></form>
      </div>`).join("")}</div>
    <form class="addrow cm-add" data-cf="modAdd" data-id="${c.id}" style="margin-top:14px"><label class="sr" for="nm">New module title</label><input class="input" id="nm" placeholder="New module title" maxlength="160"><button class="btn btn-primary" type="submit">${I.plus}Module</button></form>
  </section>`;
}

function studioLesson(c, m, l, li) {
  const open = OPEN.has(l.id);
  return `<details class="cm-les" data-lid="${l.id}"${open ? " open" : ""}>
    <summary><span class="num">${l.i + 1}</span><span class="cm-lt"><b>${esc(l.t)}</b><small>${l.blocks.length ? lessonKinds(l) : "No content yet"}</small></span><span class="cm-chev">${CI.down}</span></summary>
    <div class="cm-body">
      <div class="cm-row">
        <form class="cm-title" data-cf="lesRename" data-id="${l.id}"><label class="sr" for="lt${l.id}">Lesson title</label><input class="input" id="lt${l.id}" value="${esc(l.t)}" maxlength="200" data-orig="${esc(l.t)}"></form>
        <div class="cm-tools">
          <button class="icon-btn" data-ca="lesMove" data-id="${l.id}" data-dir="-1" aria-label="Move lesson up"${li === 0 ? " disabled" : ""}>${CI.up}</button>
          <button class="icon-btn" data-ca="lesMove" data-id="${l.id}" data-dir="1" aria-label="Move lesson down"${li === m.lessons.length - 1 ? " disabled" : ""}>${CI.down}</button>
          <button class="btn btn-line btn-sm" data-ca="lesDel" data-id="${l.id}">Delete lesson</button>
        </div>
      </div>
      <div class="cm-blocks">${l.blocks.map((b, bi) => studioBlock(c, l, b, bi)).join("")}</div>
      <div class="cm-addblk" data-lid="${l.id}">
        <div class="cm-addpair"><textarea class="input" data-new="reading" placeholder="Reading text…" rows="3"></textarea><button class="btn btn-line btn-sm" data-ca="blkAdd" data-kind="reading" data-lid="${l.id}">${I.plus}Reading</button></div>
        <div class="cm-addpair"><input class="input" data-new="embed" placeholder="https://… (YouTube, Vimeo, Drive or any link)"><button class="btn btn-line btn-sm" data-ca="blkAdd" data-kind="embed" data-lid="${l.id}">${I.plus}Embed</button></div>
        <div class="cm-addbtns"><button class="btn btn-line btn-sm" data-ca="blkAdd" data-kind="quiz" data-lid="${l.id}">${CI.quiz}Quiz</button><button class="btn btn-line btn-sm" data-ca="blkAdd" data-kind="assignment" data-lid="${l.id}">${CI.assignment}Assignment</button></div>
      </div>
    </div>
  </details>`;
}

function studioBlock(c, l, b, bi) {
  const tools = `<div class="cm-tools">
      <button class="icon-btn" data-ca="blkMove" data-id="${b.id}" data-dir="-1" aria-label="Move up"${bi === 0 ? " disabled" : ""}>${CI.up}</button>
      <button class="icon-btn" data-ca="blkMove" data-id="${b.id}" data-dir="1" aria-label="Move down"${bi === l.blocks.length - 1 ? " disabled" : ""}>${CI.down}</button>
      <button class="icon-btn" data-ca="blkDel" data-id="${b.id}" aria-label="Delete ${KIND_LABEL[b.kind]}">${I.x}</button></div>`;
  let body = "";
  if (b.kind === "reading") body = `<textarea class="input" data-f="text" rows="4">${esc(b.text)}</textarea><button class="btn btn-line btn-sm" data-ca="blkSave" data-id="${b.id}">Save</button>`;
  if (b.kind === "embed") body = `<input class="input" data-f="url" value="${esc(b.url)}" placeholder="https://…"><input class="input" data-f="caption" value="${esc(b.caption || "")}" placeholder="Caption (optional)" maxlength="200"><button class="btn btn-line btn-sm" data-ca="blkSave" data-id="${b.id}">Save</button>${embedSrc(b.url) ? "" : `<small class="cm-note">This link can't be shown inside the lesson, so learners get an "Open link" button.</small>`}`;
  if (b.kind === "quiz") body = `<div class="cm-quiz"><span><b>${esc(b.title)}</b><small>${b.qn} question${b.qn === 1 ? "" : "s"} · pass mark ${b.passPct}%</small></span><a class="btn btn-primary btn-sm" href="#/studio/${c.id}/quiz/${b.id}">${b.qn ? "Edit quiz" : "Add questions"}</a></div>`;
  if (b.kind === "assignment") body = `<input class="input" data-f="title" value="${esc(b.title)}" maxlength="160" placeholder="Assignment title"><textarea class="input" data-f="instructions" rows="3" placeholder="Instructions for learners">${esc(b.instructions)}</textarea><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-line btn-sm" data-ca="blkSave" data-id="${b.id}">Save</button><a class="btn btn-quiet btn-sm" href="#/studio/${c.id}/assignment/${b.id}">View submissions</a></div>`;
  return `<div class="cm-blk" data-bid="${b.id}"><div class="cm-blk-h"><span class="cm-kind k-${b.kind}">${CI[b.kind]}${KIND_LABEL[b.kind]}</span>${tools}</div><div class="cm-blk-b">${body}</div></div>`;
}

/* ===================================================================
   STUDIO: quiz builder
   =================================================================== */
const QB = {};                   // blockId -> full quiz from the server (with answers)
let QD = null;                   // question being written: {bid, id|null, type, prompt, points, data}
let qbErr = "";

const blankQ = type => ({
  mcq: {options:["", "", "", ""], answers:[]}, blanks: {blanks:[]}, tf: {answer:null},
  match: {pairs:[{left:"", right:""}, {left:"", right:""}, {left:"", right:""}]},
  order: {items:["", "", ""]}, short: {answers:[""], caseSensitive:false}
}[type]);

function loadQuizAdmin(bid) {
  if (QB[bid] && QB[bid].loading) return;
  QB[bid] = {loading:true};
  DB.req("GET", "/studio/quizzes/" + bid).then(q => { QB[bid] = q; render(true) })
    .catch(e => { QB[bid] = {error:e.message}; render(true) });
}

V.quizEdit = a => {
  const c = S.courses.find(x => x.id === a.c), f = c && findBlock(c, a.b);
  if (!f || f.b.kind !== "quiz") return notFound("Quiz not found", "It may have been deleted.", c ? "#/studio/" + c.id : "#/studio", "Back to Studio");
  const q = QB[a.b];
  if (!q || q.loading) { if (!q) loadQuizAdmin(a.b); return `<div class="wrap"><div class="page-head"><div><a class="crumb" href="#/studio/${c.id}">${I.back}${esc(c.t)}</a><h1>${esc(f.b.title)}</h1><p>Loading questions…</p></div></div></div>` }
  if (q.error) return notFound("Couldn't load the quiz", q.error, "#/studio/" + c.id, "Back to course");
  const total = q.questions.reduce((s, x) => s + x.points, 0);
  return `<div class="wrap qb">
    <div class="page-head"><div><a class="crumb" href="#/studio/${c.id}">${I.back}${esc(c.t)} · ${esc(f.l.t)}</a><h1>${esc(q.title)}</h1><p>${q.questions.length} question${q.questions.length === 1 ? "" : "s"} · ${total} point${total === 1 ? "" : "s"} · pass mark ${q.passPct}%</p></div>
      <a class="btn btn-line" href="#/course/${c.id}/lesson/${f.l.id}">Preview as learner</a></div>
    <div class="two-col">
      <div style="display:grid;gap:18px">
        <section class="panel"><h3>Questions</h3>
          ${q.questions.length ? `<ol class="qb-list">${q.questions.map((x, i) => QD && QD.id === x.id ? `<li class="qb-item editing">${qEditor()}</li>` : qbItem(x, i, q.questions.length)).join("")}</ol>` : `<p class="cm-none">No questions yet. Pick a type below to add the first one.</p>`}
        </section>
        ${QD && QD.id == null ? `<section class="panel qb-new">${qEditor()}</section>` : `<section class="panel"><h3>Add a question</h3><div class="qb-types">${QORDER.map(t => `<button class="qb-type" data-ca="qNew" data-type="${t}" data-bid="${q.id}"><b>${QT[t].label}</b><small>${QT[t].desc}</small></button>`).join("")}</div></section>`}
      </div>
      <aside class="side">
        <section class="panel"><h3>Quiz settings</h3>
          <form class="form" data-cf="quizSettings" data-id="${q.id}">
            <div class="field"><label for="qst">Quiz title</label><input class="input" id="qst" value="${esc(q.title)}" maxlength="160"></div>
            <div class="field"><label for="qsp">Pass mark (%)</label><input class="input" id="qsp" type="number" min="0" max="100" value="${q.passPct}"></div>
            <div><button class="btn btn-primary" type="submit">Save settings</button></div>
          </form>
          <p class="cm-note" style="margin-top:14px">Learners who reach the pass mark get the lesson marked complete automatically. They see the correct answers after each attempt.</p>
        </section>
      </aside>
    </div></div>`;
};

function qSummary(x) {
  const d = x.data;
  switch (x.type) {
    case "mcq": return `<ul class="qb-opts">${d.options.map((o, i) => `<li class="${d.answers.includes(i) ? "right" : ""}">${d.answers.includes(i) ? CI.ok : ""}${esc(o)}</li>`).join("")}</ul>`;
    case "blanks": { let k = 0; return `<p class="qb-ans">${esc(x.prompt).replace(BLANK_RE, () => { const b = d.blanks[k++]; return `<mark>${esc(b ? b.options[b.answer] : "?")}</mark>` })}</p><small class="cm-note">Choices: ${d.blanks.map((b, i) => `blank ${i + 1}: ${b.options.map(esc).join(" / ")}`).join("; ")}</small>` }
    case "tf": return `<p class="qb-ans">Answer: <b>${d.answer ? "True" : "False"}</b></p>`;
    case "match": return `<ul class="qb-opts">${d.pairs.map(p => `<li>${esc(p.left)} <span class="arrow">→</span> ${esc(p.right)}</li>`).join("")}</ul>`;
    case "order": return `<ol class="qb-opts num">${d.items.map(t => `<li>${esc(t)}</li>`).join("")}</ol>`;
    case "short": return `<p class="qb-ans">Accepted: ${d.answers.map(a => `<b>${esc(a)}</b>`).join(", ")}${d.caseSensitive ? " (case sensitive)" : ""}</p>`;
  }
}
function qbItem(x, i, n) {
  return `<li class="qb-item"><div class="qb-ih"><span class="qb-tag">Q${i + 1} · ${QT[x.type].label} · ${x.points} pt${x.points === 1 ? "" : "s"}</span>
      <div class="cm-tools"><button class="icon-btn" data-ca="qMove" data-id="${x.id}" data-dir="-1" aria-label="Move question up"${i === 0 ? " disabled" : ""}>${CI.up}</button><button class="icon-btn" data-ca="qMove" data-id="${x.id}" data-dir="1" aria-label="Move question down"${i === n - 1 ? " disabled" : ""}>${CI.down}</button>
      <button class="btn btn-line btn-sm" data-ca="qEdit" data-id="${x.id}">Edit</button><button class="btn btn-line btn-sm" data-ca="qDel" data-id="${x.id}">Delete</button></div></div>
    ${x.type === "blanks" ? "" : `<p class="qb-prompt">${esc(x.prompt)}</p>`}${qSummary(x)}</li>`;
}

function qEditor() {
  const t = QD.type;
  const promptHint = t === "blanks" ? "Type the sentence and put ___ (three underscores) where each blank goes." : t === "tf" ? "Write a statement learners mark as true or false." : "Write the question.";
  return `<div class="qe">
    <div class="qe-h"><b>${QD.id ? "Edit" : "New"} question: ${QT[t].label}</b><small>${QT[t].desc}</small></div>
    <div class="field"><label for="qe-prompt">${t === "blanks" ? "Sentence" : t === "tf" ? "Statement" : "Question"}</label><textarea class="input" id="qe-prompt" data-qd="prompt" rows="3" placeholder="${t === "blanks" ? "e.g. The capital of India is ___." : ""}">${esc(QD.prompt)}</textarea><small class="cm-note">${promptHint}</small></div>
    <div id="qe-body">${qeBody()}</div>
    <div class="qe-foot">
      <div class="field qe-pts"><label for="qe-points">Points</label><input class="input" id="qe-points" type="number" min="1" max="100" value="${QD.points}" data-qd="points"></div>
      <p class="formerr${qbErr ? " show" : ""}" id="qe-err" role="alert">${esc(qbErr)}</p>
      <div class="qe-btns"><button class="btn btn-line" data-ca="qCancel">Cancel</button><button class="btn btn-primary" data-ca="qSave">Save question</button></div>
    </div></div>`;
}

function rowsEditor(list, opts) {
  // opts: {key, placeholder, mark: "check"|"radio"|null, isRight(i), group, min, addLabel, order}
  return `<div class="qe-rows">${list.map((v, i) => `<div class="qe-r">
      ${opts.mark ? `<label class="qe-mark" title="Correct answer"><input type="${opts.mark}" name="${opts.group}" data-qd="${opts.key}-right" data-i="${i}"${opts.isRight(i) ? " checked" : ""}><span class="sr">Mark as correct</span></label>` : opts.order ? `<span class="qe-n">${i + 1}</span>` : ""}
      <input class="input" data-qd="${opts.key}" data-i="${i}" value="${esc(v)}" placeholder="${esc(opts.placeholder(i))}">
      ${opts.order ? `<button class="icon-btn" data-ca="qdMove" data-key="${opts.key}" data-i="${i}" data-dir="-1" aria-label="Move up"${i === 0 ? " disabled" : ""}>${CI.up}</button><button class="icon-btn" data-ca="qdMove" data-key="${opts.key}" data-i="${i}" data-dir="1" aria-label="Move down"${i === list.length - 1 ? " disabled" : ""}>${CI.down}</button>` : ""}
      <button class="icon-btn" data-ca="qdDel" data-key="${opts.key}" data-i="${i}" aria-label="Remove"${list.length <= opts.min ? " disabled" : ""}>${I.x}</button></div>`).join("")}
    <button class="btn btn-quiet btn-sm" data-ca="qdAdd" data-key="${opts.key}">${I.plus}${opts.addLabel}</button></div>`;
}

function qeBody() {
  const d = QD.data;
  switch (QD.type) {
    case "mcq": return `<p class="qe-lbl">Options <small>Tick every correct option. One tick = single answer; two or more = learners pick all that apply.</small></p>` +
      rowsEditor(d.options, {key:"opt", placeholder:i => "Option " + String.fromCharCode(65 + i), mark:"checkbox", group:"qe-mcq", isRight:i => d.answers.includes(i), min:2, addLabel:"Add option"});
    case "blanks": {
      const n = blankCount(QD.prompt);
      while (d.blanks.length < n) d.blanks.push({options:["", ""], answer:null});
      d.blanks.length = n;
      if (!n) return `<p class="qe-empty">Add ___ to the sentence above to create a blank. Each blank gets its own choices.</p>`;
      return d.blanks.map((b, k) => `<p class="qe-lbl">Choices for blank ${k + 1} <small>Select the correct one.</small></p>` +
        rowsEditor(b.options, {key:"bl" + k, placeholder:i => "Choice " + (i + 1), mark:"radio", group:"qe-bl" + k, isRight:i => b.answer === i, min:2, addLabel:"Add choice"})).join("");
    }
    case "tf": return `<p class="qe-lbl">Correct answer</p><div class="qe-tf">${[true, false].map(v => `<label class="pill-opt"><input type="radio" name="qe-tf" data-qd="tf" value="${v}"${d.answer === v ? " checked" : ""}><span>${v ? "True" : "False"}</span></label>`).join("")}</div>`;
    case "match": return `<p class="qe-lbl">Pairs <small>Write each correct pair on one row. Learners see the right side shuffled.</small></p><div class="qe-rows">${d.pairs.map((p, i) => `<div class="qe-r qe-pair">
        <input class="input" data-qd="pl" data-i="${i}" value="${esc(p.left)}" placeholder="Left ${i + 1}"><span class="arrow" aria-hidden="true">↔</span><input class="input" data-qd="pr" data-i="${i}" value="${esc(p.right)}" placeholder="Matches with…">
        <button class="icon-btn" data-ca="qdDel" data-key="pair" data-i="${i}" aria-label="Remove pair"${d.pairs.length <= 2 ? " disabled" : ""}>${I.x}</button></div>`).join("")}
        <button class="btn btn-quiet btn-sm" data-ca="qdAdd" data-key="pair">${I.plus}Add pair</button></div>`;
    case "order": return `<p class="qe-lbl">Items in the correct order <small>Learners get them shuffled and must put them back in this order.</small></p>` +
      rowsEditor(d.items, {key:"item", placeholder:i => "Step " + (i + 1), mark:null, order:true, min:2, addLabel:"Add item"});
    case "short": return `<p class="qe-lbl">Accepted answers <small>Any of these counts as correct. Extra spaces are ignored.</small></p>` +
      rowsEditor(d.answers, {key:"sa", placeholder:i => i ? "Another accepted answer" : "Correct answer", mark:null, min:1, addLabel:"Add accepted answer"}) +
      `<label class="qe-check"><input type="checkbox" data-qd="cs"${d.caseSensitive ? " checked" : ""}> Case sensitive (treat "Delhi" and "delhi" as different)</label>`;
  }
}
const redrawQE = () => { const b = $("#qe-body"); if (b) b.innerHTML = qeBody() };
const listOf = key => key === "opt" ? QD.data.options : key === "item" ? QD.data.items : key === "sa" ? QD.data.answers : key === "pair" ? QD.data.pairs : key.startsWith("bl") ? QD.data.blanks[+key.slice(2)].options : null;

/* Fix indexes that point at options after one is removed or moved. */
function afterRemove(key, i) {
  const d = QD.data;
  if (key === "opt") d.answers = d.answers.filter(a => a !== i).map(a => a > i ? a - 1 : a);
  if (key.startsWith("bl")) { const b = d.blanks[+key.slice(2)]; b.answer = b.answer === i ? null : b.answer > i ? b.answer - 1 : b.answer }
}

function saveQD() {
  const d = structuredClone(QD.data);
  if (QD.type === "mcq") d.options = d.options.map(s => s.trim());
  const body = {type:QD.type, prompt:QD.prompt, points:+QD.points || 1, data:d};
  if (QD.type === "tf" && d.answer == null) { qbErr = "Choose True or False as the correct answer."; return render(true) }
  if (QD.type === "blanks" && d.blanks.some(b => b.answer == null)) { qbErr = "Pick the correct choice for every blank."; return render(true) }
  const bid = QD.bid, req = QD.id ? DB.req("PATCH", "/studio/questions/" + QD.id, body) : DB.req("POST", `/studio/quizzes/${bid}/questions`, body);
  req.then(q => { QB[bid] = q; QD = null; qbErr = ""; toast("Question saved"); DB.resync() })
     .catch(e => { qbErr = e.message; render(true) });
}

/* ===================================================================
   STUDIO: assignment submissions
   =================================================================== */
const SUBS = {};
V.subs = a => {
  const c = S.courses.find(x => x.id === a.c), f = c && findBlock(c, a.b);
  if (!f || f.b.kind !== "assignment") return notFound("Assignment not found", "It may have been deleted.", c ? "#/studio/" + c.id : "#/studio", "Back to Studio");
  const list = SUBS[a.b];
  if (list === undefined) { SUBS[a.b] = null; DB.req("GET", `/studio/assignments/${a.b}/submissions`).then(r => { SUBS[a.b] = r; render(true) }).catch(e => { SUBS[a.b] = {error:e.message}; render(true) }) }
  const body = !list ? `<p class="cm-none">Loading…</p>` : list.error ? `<p class="cm-none">${esc(list.error)}</p>` : !list.length ? `<div class="empty"><b>No submissions yet</b>Learners' answers appear here once they submit.</div>` :
    `<div class="subs">${list.map(s => `<article class="panel sub"><div class="sub-h"><b>${esc(s.name)}</b><small>${esc(s.email)} · ${new Date(s.submitted_at).toLocaleString()}</small></div>${s.text ? `<div class="reading">${paras(s.text)}</div>` : ""}${s.url ? `<a class="btn btn-line btn-sm" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${CI.ext}Open submitted link</a>` : ""}</article>`).join("")}</div>`;
  return `<div class="wrap" style="padding-bottom:48px"><div class="page-head"><div><a class="crumb" href="#/studio/${c.id}">${I.back}${esc(c.t)} · ${esc(f.l.t)}</a><h1>${esc(f.b.title)}</h1><p>Submissions${Array.isArray(list) ? ` (${list.length})` : ""}</p></div>
    <button class="btn btn-line" data-ca="subsReload" data-id="${a.b}">Refresh</button></div>${body}</div>`;
};

/* ===================================================================
   LEARNER: course outline + lesson page
   =================================================================== */
function courseOutline(c, e) {
  const ni = nextIdx(c);
  return c.mods.filter(m => m.lessons.length).map(m => `<section class="lo-mod"><h3 class="lo-mt">${esc(m.t)}</h3>
    <ol class="lessons">${m.lessons.map(l => { const i = l.i, d = e && e.done.includes(i), nx = e && i === ni, has = l.blocks.length;
      return `<li class="lesson${d ? " done" : ""}${nx ? " next" : ""}${!e ? " locked" : ""}"><span class="num">${d ? I.check : i + 1}</span>
        <div>${e && has ? `<a class="lo-link" href="#/course/${c.id}/lesson/${l.id}"><b>${esc(l.t)}</b></a>` : `<b>${esc(l.t)}</b>`}<small>Lesson ${i + 1}${has ? " · " + lessonKinds(l) : ""}${nx ? ", up next" : ""}</small></div>
        ${!e ? "" : has ? `<a class="btn ${d ? "btn-line" : "btn-primary"} btn-sm" href="#/course/${c.id}/lesson/${l.id}">${d ? "Review" : "Open"}</a>` : `<button class="btn ${d ? "btn-line" : "btn-primary"} btn-sm" data-act="lesson" data-id="${c.id}" data-i="${i}" aria-pressed="${!!d}">${d ? "Done" : "Mark complete"}</button>`}</li>` }).join("")}</ol></section>`).join("");
}

const PLAY = {};                 // blockId -> {q, ans, res, on, armed, loading, error}
const ASUB = {};                 // blockId -> my submission (null = none) | {loading}

V.lesson = a => {
  const c = byId(a.c), f = c && findLesson(c, a.l);
  if (!f) return notFound("Lesson not found", "It may have been moved or removed.", c ? "#/course/" + c.id : "#/catalog", c ? "Back to course" : "Browse courses");
  const e = en(c.id), {m, l} = f, n = c.lessons.length, d = e && e.done.includes(l.i);
  const prev = l.i > 0 ? c.lessonIds[l.i - 1] : null, next = l.i < n - 1 ? c.lessonIds[l.i + 1] : null;
  const preview = !e && !c.partner && S.courses.some(x => x.id === c.id);
  if (!e && !preview) return `<div class="wrap"><div class="page-head"><div><a class="crumb" href="#/course/${c.id}">${I.back}${esc(c.t)}</a><h1>${esc(l.t)}</h1></div></div><div class="empty"><b>Enroll to open this lesson</b>Lessons, quizzes and assignments unlock when you enroll.<br><button class="btn btn-primary btn-sm" data-act="enroll" data-id="${c.id}">Enroll</button></div></div>`;
  return `<div class="wrap lp">
    <div class="page-head"><div><a class="crumb" href="#/course/${c.id}">${I.back}${esc(c.t)}</a><p class="lp-meta">${esc(m.t)} · Lesson ${l.i + 1} of ${n}${preview ? ' · <span class="badge b-draft">Studio preview</span>' : ""}</p><h1>${esc(l.t)}</h1></div>
      ${e ? `<button class="btn ${d ? "btn-line" : "btn-primary"}" data-act="lesson" data-id="${c.id}" data-i="${l.i}" aria-pressed="${!!d}">${d ? I.check + "Completed" : "Mark complete"}</button>` : ""}</div>
    <div class="lp-blocks">${l.blocks.length ? l.blocks.map(b => learnerBlock(c, b, !!e)).join("") : `<div class="empty"><b>Nothing here yet</b>This lesson doesn't have any content yet.</div>`}</div>
    <nav class="lp-nav" aria-label="Lessons">${prev != null ? `<a class="btn btn-line" href="#/course/${c.id}/lesson/${prev}">${I.back}Previous lesson</a>` : "<span></span>"}${next != null ? `<a class="btn btn-primary" href="#/course/${c.id}/lesson/${next}">Next lesson${I.chev}</a>` : `<a class="btn btn-line" href="#/course/${c.id}">Back to course</a>`}</nav>
  </div>`;
};

function learnerBlock(c, b, enrolled) {
  if (b.kind === "reading") return `<section class="lp-blk reading">${paras(b.text)}</section>`;
  if (b.kind === "embed") {
    const src = embedSrc(b.url);
    return `<section class="lp-blk">${src ? `<div class="embed"><iframe src="${esc(src)}" title="${esc(b.caption || "Embedded video")}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"></iframe></div>` :
      `<a class="embed-link" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${CI.ext}<span><b>${esc(b.caption || "Open link")}</b><small>${esc(b.url)}</small></span></a>`}${src && b.caption ? `<p class="embed-cap">${esc(b.caption)}</p>` : ""}</section>`;
  }
  if (b.kind === "quiz") return `<section class="lp-blk quiz" id="quiz-${b.id}">${quizPlayer(b, enrolled)}</section>`;
  if (b.kind === "assignment") return `<section class="lp-blk assign">${assignmentBox(b, enrolled)}</section>`;
  return "";
}

/* ----- quiz player ----- */
function loadPlay(bid, keep) {
  const p = PLAY[bid] = Object.assign(keep || {}, {loading:true});
  DB.req("GET", "/quizzes/" + bid).then(q => {
    p.loading = false; p.q = q; p.ans = {}; p.res = null;
    q.questions.forEach(x => { if (x.type === "order") p.ans[x.id] = x.items.map(it => it.i) });
    render(true);
  }).catch(e => { p.loading = false; p.error = e.message; render(true) });
}

function quizPlayer(b, enrolled) {
  const p = PLAY[b.id];
  if (!p) { loadPlay(b.id); return `<div class="qp-head">${CI.quiz}<div><h2>${esc(b.title)}</h2><p>Loading…</p></div></div>` }
  if (p.loading) return `<div class="qp-head">${CI.quiz}<div><h2>${esc(b.title)}</h2><p>Loading…</p></div></div>`;
  if (p.error) return `<div class="qp-head">${CI.quiz}<div><h2>${esc(b.title)}</h2><p>${esc(p.error)}</p></div></div>`;
  const q = p.q, total = q.questions.reduce((s, x) => s + x.points, 0), last = q.last;
  const head = `<div class="qp-head">${CI.quiz}<div><h2>${esc(q.title)}</h2><p>${q.questions.length} question${q.questions.length === 1 ? "" : "s"} · ${total} point${total === 1 ? "" : "s"} · pass mark ${q.passPct}%</p></div>
    ${last && !p.on ? `<span class="badge ${last.passed ? "b-done" : "b-draft"}">Last try ${last.pct}%${last.passed ? " · passed" : ""}</span>` : ""}</div>`;
  if (!q.questions.length) return head + `<p class="cm-none">This quiz has no questions yet.</p>`;
  if (!p.on) return head + `<div class="qp-start">${enrolled ? `<button class="btn btn-primary" data-ca="pStart" data-id="${b.id}">${last ? "Take the quiz again" : "Start quiz"}</button>` : `<p class="cm-note">Enroll to take this quiz. (Studio preview: questions shown below.)</p><button class="btn btn-line" data-ca="pStart" data-id="${b.id}">Preview questions</button>`}</div>`;
  const r = p.res;
  return head + (r ? `<div class="qp-score ${r.passed ? "pass" : "fail"}" role="status"><b>${r.score} / ${r.max}</b><span>${r.pct}% · ${r.passed ? "Passed. Lesson marked complete." : `Not passed yet (need ${r.passPct}%).`}</span></div>` : "") +
    `<ol class="qp-qs">${q.questions.map((x, i) => playQuestion(b.id, x, i, p)).join("")}</ol>
    <div class="qp-foot">${r ? `<button class="btn btn-primary" data-ca="pRetry" data-id="${b.id}">Try again</button>` : enrolled ? `<button class="btn btn-primary" data-ca="pSubmit" data-id="${b.id}">${p.armed ? `${p.armed} unanswered. Submit anyway` : "Submit answers"}</button>` : `<span class="cm-note">Preview only. Enroll to submit.</span>`}</div>`;
}

function answered(x, a) {
  if (a == null) return false;
  if (x.type === "mcq") return a.length > 0;
  if (x.type === "blanks") return x.blanks.every((b, k) => a[k] != null);
  if (x.type === "match") return x.lefts.every((l, k) => a[k] != null);
  if (x.type === "short") return String(a).trim() !== "";
  return true;
}

function playQuestion(bid, x, i, p) {
  const a = p.ans[x.id], r = p.res && p.res.results[x.id], dis = p.res ? " disabled" : "", nm = `pq-${bid}-${x.id}`;
  const mark = r ? (r.frac === 1 ? "right" : r.frac > 0 ? "part" : "wrong") : "";
  let body = "";
  switch (x.type) {
    case "mcq": body = `<div class="pq-opts">${x.options.map((o, k) => `<label class="pq-opt"><input type="${x.multi ? "checkbox" : "radio"}" name="${nm}" data-pa="mcq" data-b="${bid}" data-q="${x.id}" value="${k}"${(a || []).includes(k) ? " checked" : ""}${dis}><span>${esc(o)}</span></label>`).join("")}</div>${x.multi ? `<small class="cm-note">Select all that apply.</small>` : ""}`; break;
    case "blanks": { let k = 0; body = `<p class="pq-sent">${esc(x.prompt).replace(BLANK_RE, () => { const kk = k++, bl = x.blanks[kk]; return `<select class="input pq-sel" data-pa="blank" data-b="${bid}" data-q="${x.id}" data-k="${kk}" aria-label="Blank ${kk + 1}"${dis}><option value="">Choose…</option>${bl.options.map((o, j) => `<option value="${j}"${a && a[kk] === j ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>` })}</p>`; break }
    case "tf": body = `<div class="pq-tf">${[true, false].map(v => `<label class="pill-opt"><input type="radio" name="${nm}" data-pa="tf" data-b="${bid}" data-q="${x.id}" value="${v}"${a === v ? " checked" : ""}${dis}><span>${v ? "True" : "False"}</span></label>`).join("")}</div>`; break;
    case "match": body = `<div class="pq-match">${x.lefts.map((l, k) => `<div class="pq-mrow"><span class="pq-left">${esc(l)}</span><span class="arrow" aria-hidden="true">→</span><select class="input" data-pa="match" data-b="${bid}" data-q="${x.id}" data-k="${k}" aria-label="Match for ${esc(l)}"${dis}><option value="">Choose…</option>${x.rights.map(rt => `<option value="${rt.i}"${a && a[k] === rt.i ? " selected" : ""}>${esc(rt.text)}</option>`).join("")}</select></div>`).join("")}</div>`; break;
    case "order": { const byI = Object.fromEntries(x.items.map(it => [it.i, it.text])), cur = a || x.items.map(it => it.i);
      body = `<ol class="pq-order">${cur.map((oi, k) => `<li><span class="qe-n">${k + 1}</span><span class="pq-otext">${esc(byI[oi])}</span>${p.res ? "" : `<button class="icon-btn" data-ca="pOrd" data-b="${bid}" data-q="${x.id}" data-k="${k}" data-dir="-1" aria-label="Move up"${k === 0 ? " disabled" : ""}>${CI.up}</button><button class="icon-btn" data-ca="pOrd" data-b="${bid}" data-q="${x.id}" data-k="${k}" data-dir="1" aria-label="Move down"${k === cur.length - 1 ? " disabled" : ""}>${CI.down}</button>`}</li>`).join("")}</ol><small class="cm-note">Use the arrows to put the items in the right order.</small>`; break }
    case "short": body = `<input class="input pq-short" data-pa="short" data-b="${bid}" data-q="${x.id}" value="${esc(a || "")}" placeholder="Type your answer" maxlength="200" autocomplete="off"${dis}>`; break;
  }
  let fb = "";
  if (r && r.frac < 1) {
    const ex = r.expected;
    const shown = x.type === "mcq" ? ex.map(esc).join(", ") : x.type === "blanks" ? ex.map(esc).join(", ") : x.type === "tf" ? (ex ? "True" : "False") :
      x.type === "match" ? ex.map(pp => `${esc(pp.left)} → ${esc(pp.right)}`).join("; ") : x.type === "order" ? ex.map((t, k) => `${k + 1}. ${esc(t)}`).join("  ") : ex.map(esc).join(" or ");
    fb = `<p class="pq-fb">Correct answer: ${shown}</p>`;
  }
  return `<li class="pq ${mark}"><div class="pq-h"><span class="pq-n">${i + 1}</span><span class="pq-t">${QT[x.type].label} · ${x.points} pt${x.points === 1 ? "" : "s"}</span>${r ? `<span class="pq-res">${r.frac === 1 ? CI.ok + "Correct" : r.frac > 0 ? `${CI.ok}${r.earned} of ${r.points}` : CI.no + "Wrong"}</span>` : ""}</div>
    ${x.type === "blanks" ? "" : `<p class="pq-prompt">${esc(x.prompt)}</p>`}${body}${fb}</li>`;
}

/* ----- assignment ----- */
function assignmentBox(b, enrolled) {
  let s = ASUB[b.id];
  if (enrolled && s === undefined) { ASUB[b.id] = {loading:true}; DB.req("GET", `/assignments/${b.id}/mine`).then(r => { ASUB[b.id] = r; render(true) }).catch(() => { ASUB[b.id] = null; render(true) }) ; s = ASUB[b.id] }
  const head = `<div class="qp-head">${CI.assignment}<div><h2>${esc(b.title)}</h2>${s && s.submitted_at ? `<p>Submitted ${new Date(s.submitted_at).toLocaleString()}</p>` : ""}</div>${s && s.submitted_at ? `<span class="badge b-done">Submitted</span>` : ""}</div>`;
  const ins = b.instructions ? `<div class="reading">${paras(b.instructions)}</div>` : "";
  if (!enrolled) return head + ins + `<p class="cm-note">Enroll to submit this assignment.</p>`;
  if (s && s.loading) return head + ins + `<p class="cm-note">Loading…</p>`;
  return head + ins + `<form class="form as-form" data-cf="assignSubmit" data-id="${b.id}">
    <div class="field"><label for="as-t${b.id}">Your answer</label><textarea class="input" id="as-t${b.id}" rows="5" maxlength="10000">${esc(s ? s.text : "")}</textarea></div>
    <div class="field"><label for="as-u${b.id}">Link <span class="hint">(optional: Google Drive, GitHub, etc.)</span></label><input class="input" id="as-u${b.id}" type="url" value="${esc(s ? s.url : "")}" placeholder="https://…"></div>
    <p class="formerr" id="as-e${b.id}" role="alert"></p>
    <div><button class="btn btn-primary" type="submit">${s ? "Update submission" : "Submit assignment"}</button></div></form>`;
}

/* ===================================================================
   Events
   =================================================================== */
document.addEventListener("toggle", e => {
  const d = e.target; if (!d.matches || !d.matches("details.cm-les")) return;
  const id = +d.dataset.lid; d.open ? OPEN.add(id) : OPEN.delete(id);
}, true);

document.addEventListener("click", e => {
  const t = e.target.closest("[data-ca]"); if (!t || !DB) return;
  const ca = t.dataset.ca, id = t.dataset.id, dir = +t.dataset.dir;
  const guard = label => { if (armed === ca + id) { armed = null; return true } armed = ca + id; t.textContent = label; setTimeout(() => { if (armed === ca + id) { armed = null; render(true) } }, 3000); return false };
  switch (ca) {
    /* studio structure */
    case "modMove": cdo("POST", `/modules/${id}/move`, {dir}); break;
    case "lesMove": cdo("POST", `/lessons/${id}/move`, {dir}); break;
    case "blkMove": cdo("POST", `/blocks/${id}/move`, {dir}); break;
    case "modDel": if (guard("Click again to delete")) cdo("DELETE", `/modules/${id}`, null, "Module deleted"); break;
    case "lesDel": if (guard("Click again to delete")) cdo("DELETE", `/lessons/${id}`, null, "Lesson deleted"); break;
    case "blkDel": if (armed === ca + id) { armed = null; cdo("DELETE", `/blocks/${id}`, null, "Content removed") } else { armed = ca + id; t.classList.add("armed"); t.setAttribute("aria-label", "Click again to delete"); toast("Click ✕ again to delete"); setTimeout(() => { if (armed === ca + id) armed = null; t.classList.remove("armed") }, 3000) } break;
    case "blkAdd": {
      const kind = t.dataset.kind, lid = +t.dataset.lid, box = t.closest(".cm-addblk");
      let body = {};
      if (kind === "reading") { const v = box.querySelector('[data-new="reading"]').value.trim(); if (!v) { toast("Write the reading text first"); box.querySelector('[data-new="reading"]').focus(); return } body = {text:v} }
      if (kind === "embed") { const v = box.querySelector('[data-new="embed"]').value.trim(); if (!v) { toast("Paste a link first"); box.querySelector('[data-new="embed"]').focus(); return } body = {url:v} }
      if (kind === "quiz") body = {title:"Quiz", passPct:60};
      if (kind === "assignment") body = {title:"Assignment", instructions:""};
      OPEN.add(lid);
      cdo("POST", `/lessons/${lid}/blocks`, {kind, body}, `${KIND_LABEL[kind]} added`).then(r => {
        if (kind === "quiz") { const c = S.courses.find(x => findBlock(x, r.id)); if (c) location.hash = `#/studio/${c.id}/quiz/${r.id}` }
      }).catch(() => {});
      break;
    }
    case "blkSave": {
      const box = t.closest(".cm-blk"), body = {};
      box.querySelectorAll("[data-f]").forEach(f => body[f.dataset.f] = f.value);
      cdo("PATCH", `/blocks/${id}`, {body}, "Saved").catch(() => {});
      break;
    }
    /* quiz builder */
    case "qNew": QD = {bid:+t.dataset.bid, id:null, type:t.dataset.type, prompt:"", points:1, data:blankQ(t.dataset.type)}; qbErr = ""; render(true); setTimeout(() => $("#qe-prompt") && $("#qe-prompt").focus(), 30); break;
    case "qEdit": { const q = Object.values(QB).find(x => x.questions && x.questions.some(y => y.id === +id)), x = q.questions.find(y => y.id === +id);
      QD = {bid:q.id, id:x.id, type:x.type, prompt:x.prompt, points:x.points, data:structuredClone(x.data)};
      if (x.type === "blanks") QD.data.blanks = QD.data.blanks.map(b => ({options:b.options, answer:b.answer}));
      qbErr = ""; render(true); break }
    case "qCancel": QD = null; qbErr = ""; render(true); break;
    case "qSave": saveQD(); break;
    case "qDel": { const q = Object.values(QB).find(x => x.questions && x.questions.some(y => y.id === +id));
      if (armed !== ca + id) { armed = ca + id; t.textContent = "Click again"; setTimeout(() => { if (armed === ca + id) { armed = null; if (t.isConnected) t.textContent = "Delete" } }, 3000); return }
      armed = null; DB.req("DELETE", "/studio/questions/" + id).then(r => { QB[q.id] = r; toast("Question deleted"); DB.resync() }).catch(err => toast(err.message)); break }
    case "qMove": { const q = Object.values(QB).find(x => x.questions && x.questions.some(y => y.id === +id));
      DB.req("POST", `/studio/questions/${id}/move`, {dir}).then(r => { QB[q.id] = r; render(true) }).catch(err => toast(err.message)); break }
    case "qdAdd": { const key = t.dataset.key, d = QD.data;
      if (key === "pair") d.pairs.push({left:"", right:""}); else listOf(key).push("");
      redrawQE(); const ins = $$(`#qe-body [data-qd="${key === "pair" ? "pl" : key}"]`); ins.length && ins[ins.length - 1].focus(); break }
    case "qdDel": { const key = t.dataset.key, i = +t.dataset.i; listOf(key).splice(i, 1); afterRemove(key, i); redrawQE(); break }
    case "qdMove": { const list = listOf(t.dataset.key), i = +t.dataset.i, j = i + dir; [list[i], list[j]] = [list[j], list[i]]; redrawQE(); break }
    case "subsReload": delete SUBS[id]; render(true); break;
    /* quiz player */
    case "pStart": PLAY[id].on = true; render(true); break;
    case "pOrd": { const p = PLAY[t.dataset.b], q = +t.dataset.q, k = +t.dataset.k, arr = p.ans[q], j = k + dir; [arr[k], arr[j]] = [arr[j], arr[k]]; p.armed = 0; render(true); break }
    case "pSubmit": {
      const p = PLAY[id], miss = p.q.questions.filter(x => !answered(x, p.ans[x.id])).length;
      if (miss && !p.armed) { p.armed = miss; render(true); return }
      t.disabled = true;
      DB.req("POST", `/quizzes/${id}/attempts`, {answers:p.ans}).then(r => {
        p.res = r; p.armed = 0; p.q.last = {pct:r.pct, passed:r.passed};
        toast(r.passed ? `Passed with ${r.pct}%` : `You scored ${r.pct}%`);
        if (r.passed) { DB.resync(); if (typeof celebrate === "function") celebrate() } else render(true);
        setTimeout(() => { const el = $("#quiz-" + id); el && el.scrollIntoView({behavior:smooth(), block:"start"}) }, 60);
      }).catch(err => { t.disabled = false; toast(err.message) });
      break;
    }
    case "pRetry": loadPlay(id, {on:true}); render(true); break;
  }
});

function onPlayInput(el) {
  const p = PLAY[el.dataset.b]; if (!p || p.res) return;
  const q = +el.dataset.q, x = p.q.questions.find(y => y.id === q);
  p.armed = 0;
  switch (el.dataset.pa) {
    case "mcq": { const vals = [...document.querySelectorAll(`[data-pa="mcq"][data-q="${q}"]`)].filter(i => i.checked).map(i => +i.value); p.ans[q] = vals; break }
    case "tf": p.ans[q] = el.value === "true"; break;
    case "blank": case "match": { const arr = p.ans[q] || Array((x.blanks || x.lefts).length).fill(null); arr[+el.dataset.k] = el.value === "" ? null : +el.value; p.ans[q] = arr; break }
    case "short": p.ans[q] = el.value; break;
  }
}

function onDraftInput(el) {
  if (!QD) return;
  const k = el.dataset.qd, i = +el.dataset.i, d = QD.data;
  if (k === "prompt") { const before = QD.type === "blanks" ? blankCount(QD.prompt) : 0; QD.prompt = el.value; if (QD.type === "blanks" && blankCount(QD.prompt) !== before) redrawQE(); return }
  if (k === "points") { QD.points = el.value; return }
  if (k === "opt" || k === "item" || k === "sa") { listOf(k)[i] = el.value; return }
  if (/^bl\d+$/.test(k)) { listOf(k)[i] = el.value; return }
  if (k === "pl") { d.pairs[i].left = el.value; return }
  if (k === "pr") { d.pairs[i].right = el.value; return }
  if (k === "opt-right") { d.answers = el.checked ? [...new Set([...d.answers, i])].sort((a, b) => a - b) : d.answers.filter(a => a !== i); return }
  if (/^bl\d+-right$/.test(k)) { d.blanks[+k.slice(2, -6)].answer = i; return }
  if (k === "tf") { d.answer = el.value === "true"; return }
  if (k === "cs") { d.caseSensitive = el.checked; return }
}

document.addEventListener("input", e => {
  if (e.target.dataset.qd) onDraftInput(e.target);
  if (e.target.dataset.pa === "short") onPlayInput(e.target);
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.qd && (el.type === "checkbox" || el.type === "radio")) onDraftInput(el);
  if (el.dataset.pa && el.dataset.pa !== "short") { onPlayInput(el); const p = PLAY[el.dataset.b]; if (p && p.armed === 0) { const btn = $(`[data-ca="pSubmit"][data-id="${el.dataset.b}"]`); if (btn) btn.textContent = "Submit answers" } }
});

/* Rename on Enter or when leaving the field */
function renameFrom(input) {
  const f = input.closest("form[data-cf]"); if (!f) return;
  const v = input.value.trim(); if (!v || v === input.dataset.orig) { input.value = input.dataset.orig; return }
  input.dataset.orig = v;
  cdo("PATCH", f.dataset.cf === "modRename" ? `/modules/${f.dataset.id}` : `/lessons/${f.dataset.id}`, {title:v}, "Renamed").catch(() => {});
}
document.addEventListener("focusout", e => { if (e.target.closest && e.target.closest('form[data-cf="modRename"],form[data-cf="lesRename"]')) renameFrom(e.target) });

document.addEventListener("submit", e => {
  const f = e.target, cf = f.dataset && f.dataset.cf; if (!cf || !DB) return;
  e.preventDefault();
  const input = f.querySelector("input");
  switch (cf) {
    case "modRename": case "lesRename": input.blur(); break;
    case "modAdd": { const v = input.value.trim(); if (!v) { input.focus(); return } cdo("POST", `/courses/${f.dataset.id}/modules`, {title:v}, "Module added").catch(() => {}); break }
    case "lesAdd": { const v = input.value.trim(); if (!v) { input.focus(); return } cdo("POST", `/modules/${f.dataset.id}/lessons`, {title:v}, "Lesson added").then(r => { OPEN.add(r.id); render(true) }).catch(() => {}); break }
    case "quizSettings": cdo("PATCH", `/blocks/${f.dataset.id}`, {body:{title:$("#qst").value, passPct:+$("#qsp").value}}, "Quiz settings saved").then(() => { const q = QB[f.dataset.id]; if (q) { q.title = $("#qst").value.trim() || "Quiz"; q.passPct = Math.min(100, Math.max(0, +$("#qsp").value || 0)) } render(true) }).catch(() => {}); break;
    case "assignSubmit": {
      const id = f.dataset.id, text = $("#as-t" + id).value, url = $("#as-u" + id).value.trim(), err = $("#as-e" + id), btn = f.querySelector("[type=submit]");
      btn.disabled = true;
      DB.req("POST", `/assignments/${id}/submission`, {text, url}).then(r => { ASUB[id] = r; toast("Assignment submitted"); render(true) })
        .catch(x => { err.textContent = x.message; err.classList.add("show"); btn.disabled = false });
      break;
    }
  }
});

/* ===================================================================
   ADMIN: learners and their progress
   =================================================================== */
let LEARNERS;                    // undefined = not loaded, null = loading
function loadLearners() { LEARNERS = null; DB.req("GET", "/admin/learners").then(r => { LEARNERS = r; render(true) }).catch(e => { LEARNERS = {error:e.message}; render(true) }) }
V.learners = () => {
  if (LEARNERS === undefined) loadLearners();
  const list = LEARNERS;
  const body = !list ? `<p class="cm-none">Loading…</p>` : list.error ? `<p class="cm-none">${esc(list.error)}</p>` : !list.length ? `<div class="empty"><b>No learners yet</b>Students who sign up on the student site appear here.</div>` :
    `<div class="lr-list">${list.map(u => `<article class="panel lr">
      <div class="lr-h"><span class="lr-av" aria-hidden="true">${esc(u.name[0].toUpperCase())}</span><div class="lr-who"><b>${esc(u.name)}</b><small>${esc(u.email)} · joined ${new Date(u.created_at).toLocaleDateString()}</small></div>
        <span class="badge ${u.role === "admin" ? "b-done" : "b-progress"}">${u.role}</span>
        ${u.email === (S.user && S.user.email) ? "" : `<button class="btn btn-line btn-sm" data-ca="roleSet" data-id="${u.id}" data-role="${u.role === "admin" ? "student" : "admin"}">${u.role === "admin" ? "Make student" : "Make admin"}</button>`}</div>
      <div class="lr-stats"><span><b>${u.courses.length}</b> course${u.courses.length === 1 ? "" : "s"}</span><span><b>${u.courses.filter(c => c.completedAt).length}</b> completed</span><span><b>${u.attempts}</b> quiz attempt${u.attempts === 1 ? "" : "s"}</span><span><b>${u.submissions}</b> assignment${u.submissions === 1 ? "" : "s"}</span></div>
      ${u.courses.length ? `<ul class="lr-courses">${u.courses.map(c => { const pc = c.lessons ? Math.round(c.done / c.lessons * 100) : 0; return `<li><span class="lr-ct">${esc(c.course)}</span><span class="lr-bar" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(c.course)} progress"><i style="width:${pc}%"></i></span><span class="lr-pc">${c.completedAt ? "Completed" : `${c.done}/${c.lessons} lessons`}</span></li>` }).join("")}</ul>` : ""}
    </article>`).join("")}</div>`;
  return `<div class="wrap" style="padding-bottom:48px"><div class="page-head"><div><h1>Learners</h1><p>Everyone with an account${Array.isArray(list) ? ` (${list.length})` : ""}, their courses and progress.</p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-line" href="/" target="_blank" rel="noopener">Open student site</a><button class="btn btn-line" data-ca="lrReload">Refresh</button></div></div>${body}</div>`;
};

document.addEventListener("click", e => {
  const t = e.target.closest("[data-ca]"); if (!t || !DB) return;
  if (t.dataset.ca === "lrReload") loadLearners();
  if (t.dataset.ca === "roleSet") {
    t.disabled = true;
    DB.req("PATCH", "/admin/users/" + t.dataset.id, {role:t.dataset.role}).then(() => { toast(t.dataset.role === "admin" ? "Now an admin" : "Now a student"); loadLearners() })
      .catch(err => { t.disabled = false; toast(err.message) });
  }
});

document.addEventListener("submit", e => {
  const f = e.target; if (!f.dataset || f.dataset.cf !== "pwChange" || !DB) return;
  e.preventDefault();
  const cur = $("#pwc").value, next = $("#pwn").value, err = $("#pwErr"), btn = f.querySelector("[type=submit]");
  err.classList.remove("show");
  if (next.length < 8) { err.textContent = "Use at least 8 characters for the new password."; err.classList.add("show"); return }
  btn.disabled = true;
  DB.req("POST", "/me/password", {current:cur, next}).then(() => { $("#pwc").value = ""; $("#pwn").value = ""; toast("Password changed. Other sessions were signed out.") })
    .catch(x => { err.textContent = x.message; err.classList.add("show") }).finally(() => { btn.disabled = false });
});
