/* =====================================================================
   Lumzi LMS shared code: data, helpers and icons.
   Data comes from the server API (or localStorage without one). Website: lumzi.io.
   ===================================================================== */
const SITE_URL = "https://www.lumzi.io/";
const LMS_URL = "index.html";
const LOGO_SRC = "assets/lumzi-mark.svg";
const LOGO_HTML = `<span class="lz-logo"><img class="lz-mark" src="assets/lumzi-mark.svg" alt="" width="32" height="32"><span class="lz-word">lumz<span class="lz-i">ı</span></span><span class="lz-prod">LMS</span></span>`;
/* Course photos */
const COURSE_IMG = {
  tally:"assets/courses/tally-prime-logo.png?v=4", msoffice:"assets/courses/ms-office-365.jpg?v=4", msbasic:"assets/courses/ms-basic-365.png?v=4",
  excel:"assets/courses/advanced-excel.jpg?v=3", ai:"assets/courses/ai-foundation.jpg?v=3", aif:"assets/courses/ai-foundation.jpg?v=3"
};
/* Poster-style images (logos and text) are shown whole, not cropped, on this background colour */
const COURSE_IMG_FIT = {tally:"#ffffff", msoffice:"#eaf4fa", msbasic:"#efefef"};
const courseFit = c => COURSE_IMG_FIT[c.id] && courseImg(c) === COURSE_IMG[c.id] ? COURSE_IMG_FIT[c.id] : null;
function courseImg(c) {
  if (c.partner) return null;
  if (COURSE_IMG[c.id]) return COURSE_IMG[c.id];
  const t = c.t.toLowerCase();
  if (/excel/.test(t)) return COURSE_IMG.excel;
  if (/tally|gst/.test(t)) return COURSE_IMG.tally;
  if (/office|word|powerpoint/.test(t)) return COURSE_IMG.msoffice;
  if (/\bai\b|artificial|intelligence/.test(t)) return COURSE_IMG.ai;
  return null;
}

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const smooth = () => reduce.matches ? "auto" : "smooth";
const slug = s => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const abbr = o => o.split(/\s+/).filter(w => !/^(of|and|the|&)$/i.test(w)).map(w => w[0]).join("").slice(0, 4);
const ss = {
  get: k => { try { return sessionStorage.getItem(k) } catch (e) { return null } },
  set: (k, v) => { try { sessionStorage.setItem(k, v) } catch (e) {} },
  del: k => { try { sessionStorage.removeItem(k) } catch (e) {} }
};
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function check(fieldId, ok) { const f = $("#" + fieldId); f.classList.toggle("bad", !ok); return ok }
const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-IN", {day:"numeric", month:"long", year:"numeric"});

const I = {
  chev:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  back:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  check:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  award:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="m8.5 13.9-1.5 7.1 5-3 5 3-1.5-7.1"/></svg>',
  book:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h14"/></svg>',
  play:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z" fill="currentColor"/></svg>',
  done:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  lock:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  search:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  dl:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>',
  plus:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  x:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  clock:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  arrow:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};

/* ---------- Data ----------
   Lumzi's own courses are editable in Studio and saved per browser.
   Partner courses are a fixed sample catalog for the website. */
const KEY = (window.APP_ENV && window.APP_ENV.storageKey) || "lz-lms-v1";
const GENERIC = ["Course introduction","Key concepts","Guided practice","Applied project","Final assessment"];
const DEFAULT_COURSES = [
  {id:"msbasic",t:"MICROSOFT BASIC",d:"Learn the fundamentals of Microsoft Office, including MS Word, Excel, PowerPoint, and Windows basics. This course helps beginners develop essential computer skills for education, office work, and daily productivity",st:"published",ab:"MB",c:"#0D6B57",s:"Computer Science",l:"Beginner",
    lessons:["Windows basics","MS Word essentials","Excel fundamentals","PowerPoint presentations","Everyday productivity"]},
  /* Tally, MS Office, Advanced Excel and AI Foundation syllabus */
  {id:"tally",t:"TALLY PRIME",d:"Learn Tally course basics and master accounting, GST, inventory, and financial management skills with practical training.",st:"published",ab:"TP",c:"#2D5BD6",s:"Business",l:"Beginner",
    lessons:["Introduction to Tally Prime 3.0","Creating and managing company data","Basic accounting concepts: ledger, groups, vouchers and entries","Creating and managing ledgers and groups","Sales and purchase entries","Cash and bank voucher entries","Receipt and payment vouchers","Journal and contra vouchers","GST basics and invoice entry in Tally","Sales and purchase invoices with GST","Stock and inventory management","Day-to-day accounting practices","Trial balance, balance sheet and profit & loss account","Key reports: day book, cash/bank book and ledger statement","Basic financial statements and final accounts"]},
  {id:"msoffice",t:"MS OFFICE",d:"Learn Microsoft Word, Excel and PowerPoint step by step: create documents, simple spreadsheets and presentations for school, office and everyday use. Made for beginners, no previous experience needed.",st:"published",ab:"MO",c:"#7B2D8B",s:"Computer Science",l:"Beginner",
    lessons:["Microsoft Word: open and save a document","Typing, deleting and editing text","Changing font, size, colour and alignment","Bullets, numbering and simple tables","Page setup, headers/footers and printing","Letters, applications, assignments and notes","Microsoft Excel: entering and editing data in cells","Simple formulas: SUM, AVERAGE and COUNT","Formatting numbers, dates and text","Sorting and filtering simple lists","Microsoft PowerPoint: creating a presentation and adding slides","Simple animations and slide transitions","Presenting and saving your slide show"]},
  {id:"ai",t:"ARTIFICIAL INTELLIGENCE",d:"Learn the basics of Artificial Intelligence in simple steps: how AI and LLMs work, which AI tools to use, and how to write good prompts. Test yourself with a level-wise quiz and get instant results.",st:"published",ab:"AI",c:"#0E5A93",s:"AI",l:"Beginner",isNew:1,
    lessons:["How AI works","How LLMs work","Choosing the right AI tools","Writing good prompts","Level-wise quiz"]},
  {id:"excel",t:"Advanced Excel",d:"Go beyond basic formulas: lookups, logical and statistical functions, data cleaning, PivotTables, dashboards and macros, practised on real-world data.",st:"draft",ab:"AE",c:"#9A5B00",s:"Data Science",l:"Intermediate",
    lessons:["Quick review of basic Excel skills","Lookup functions: VLOOKUP, HLOOKUP and XLOOKUP","Logical functions: IF, IFS, AND, OR, NOT","Statistical functions: SUMIFS, COUNTIFS, AVERAGEIFS","Text functions: CONCAT, TEXT, LEFT, RIGHT, MID","Data cleaning: filtering, sorting and conditional formatting","Removing duplicates, error checking and data validation","PivotTables and PivotCharts","Dynamic reports and dashboards","Advanced charts and visualizations","What-if analysis: Goal Seek and Data Tables","Macros and automation basics"]},
  {id:"aif",t:"AI Foundation course",d:"The first level of the Lumzi AI Academy, for beginners with no coding background: how AI works, how to prompt it well, and how to use free AI tools for office work, content, marketing and simple automation.",st:"draft",ab:"AF",c:"#A0153E",s:"AI",l:"Beginner",
    lessons:["AI Foundations","Prompting & Office Tools","Content & Marketing","Creative AI Studio","No-Code App Building","Agents & Automation"]}
];
/* Lessons before the syllabus update, so saved browsers can be upgraded without touching courses edited in Studio */
const OLD_LESSONS = {
  tally:["Introduction to Tally Prime","Company creation and setup","Ledgers and groups","Voucher entry","GST setup and billing","Inventory management","Financial reports"],
  msoffice:["Word documents","Excel worksheets","PowerPoint slides","Final review"], excel:[], aif:[]
};
const DATA_V = 2;
const ORGC = ["#2D5BD6","#0D6B57","#7B2D8B","#0E5A93","#A0153E","#46561A","#9A5B00","#1F2B5E","#5B3FD1","#00756F","#8A3A12"];
const SAMPLE_RAW = [
 ["Introduction to Computer Science","Northfield University","Course","Computer Science","12 hafte","Introductory",0,1,0],
 ["Data Analyst Professional Certificate","Datawise Academy","Certificate","Data Science","4 mahine","Intermediate",3,1,0],
 ["Generative AI for Everyone","Cortex Labs","Certificate","AI","6 hafte","Introductory",4,1,1],
 ["Algorithms: Graphs & Dynamic Programming","Lakeside Institute of Technology","Course","Computer Science","5 hafte","Advanced",0,1,0],
 ["Leadership Fundamentals","Westbridge School of Management","Course","Business","4 hafte","Introductory",0,1,0],
 ["AI Engineer Program","Cortex Labs","Certificate","AI","6 hafte","Intermediate",3,0,1],
 ["Machine Learning with Python","Datawise Academy","Course","AI","6 hafte","Intermediate",0,1,0],
 ["Start Programming with Python","CodeCraft","Course","Computer Science","1 hafta","Introductory",0,0,1],
 ["C++ Programming for Beginners","CodeCraft","Course","Computer Science","3 hafte","Introductory",0,0,1],
 ["AI Product Manager","Cortex Labs","Certificate","AI","10 mahine","Intermediate",10,0,1],
 ["Behavioral Economics & Game Theory","Northfield University","Course","Business","1 hafta","Introductory",0,0,1],
 ["Cloud Data Engineering","Skyline Cloud","Certificate","Data Science","3 hafte","Advanced",3,0,1],
 ["Healthcare Leadership","Riverside Medical College","Executive Ed","Healthcare","6 hafte","Executive",0,1,0],
 ["AI Strategy for Business Leaders","Westbridge School of Management","Executive Ed","AI","6 hafte","Executive",0,1,0],
 ["Mergers & Acquisitions: Law and Economics","Capital School of Economics","Executive Ed","Business","6 hafte","Executive",0,1,0],
 ["Sustainable Finance","Greenleaf Institute","Executive Ed","Business","8 hafte","Executive",0,1,0],
 ["MBA Essentials","Capital School of Economics","Executive Ed","Business","3 mahine","Executive",0,0,0],
 ["Master of Science in Data Science","Maplewood University","Degree","Data Science","2 saal","Master's",0,1,0],
 ["Master of Business Administration","Maplewood University","Degree","Business","2 saal","Master's",0,1,0],
 ["BSc in Computer Science","Lakeside Institute of Technology","Degree","Computer Science","3 saal","Bachelor's",0,1,0],
 ["Master of Science in Cybersecurity","Maplewood University","Degree","Computer Science","2 saal","Master's",0,1,0],
 ["Introduction to Neuroscience","Riverside Medical College","Certificate","Healthcare","5 mahine","Introductory",4,0,0],
 ["Biology: The Secret of Life","Northfield University","Course","Healthcare","4 mahine","Introductory",0,0,0],
 ["Python for Data Science","Datawise Academy","Course","Data Science","3 mahine","Advanced",0,0,0],
 ["R Programming Basics","Northfield University","Course","Data Science","8 hafte","Introductory",0,0,0],
 ["Data Analytics for Business","Lakeside Institute of Technology","Course","Business","4 mahine","Advanced",0,0,0],
 ["Public Health Foundations","Riverside Medical College","Course","Healthcare","6 hafte","Introductory",0,0,0],
 ["Prompt Engineering in Practice","Cortex Labs","Course","AI","2 hafte","Intermediate",0,0,1]
];
const PORGS = [...new Set(SAMPLE_RAW.map(r => r[1]))];
const tyWord = {Course:"course", Certificate:"certificate program", "Executive Ed":"executive education program", Degree:"online degree"};
const SAMPLE = SAMPLE_RAW.map(([t,o,ty,s,du,l,n,tr,isNew]) => ({
  id:slug(t), t, o, ty, s, du, l, n, tr, isNew, st:"published", partner:1, ab:abbr(o), c:ORGC[PORGS.indexOf(o) % ORGC.length],
  d:`A ${l.toLowerCase()} ${tyWord[ty]} in ${s} from ${o}. Self-paced, with a verified certificate when you finish.`,
  lessons: ty === "Degree" ? ["Orientation","Core modules","Electives","Capstone project","Final review"] : GENERIC
}));

const DEFAULT = {
  user:null, signedIn:false, theme:"system", prefs:{email:true, remind:true}, last:"tally", promoClosed:false,
  courses:DEFAULT_COURSES,
  enroll:{tally:{done:[],at:3}, msbasic:{done:[0,1],at:2}, msoffice:{done:[...Array(13).keys()],at:1,doneAt:"2026-11-02"}},
  inbox:[], dataV:DATA_V
};
let S;
const API_MODE = !!(window.APP_ENV && window.APP_ENV.api);
function loadState() {
  if (API_MODE) {
    /* Data comes from the server (db-client.js). Only device settings stay in this browser. */
    let dev = null; try { dev = JSON.parse(localStorage.getItem(KEY)) } catch (e) {}
    S = Object.assign(structuredClone(DEFAULT), {courses:[], enroll:{}, last:null}, dev ? {theme:dev.theme || "system", promoClosed:!!dev.promoClosed} : {});
    return;
  }
  try { S = JSON.parse(localStorage.getItem(KEY)) || null } catch (e) { S = null }
  if (!S || !Array.isArray(S.courses)) S = structuredClone(DEFAULT);
  if ((S.dataV || 1) < DATA_V) migrateSyllabus();
}
/* Bring saved data up to the new syllabus: swap untouched lessons, fill empty descriptions,
   keep finished courses finished and drop progress on lessons that no longer exist. */
function migrateSyllabus() {
  DEFAULT_COURSES.forEach(def => {
    const c = S.courses.find(x => x.id === def.id); if (!c) return;
    if (!c.d) c.d = def.d;
    const old = OLD_LESSONS[c.id];
    if (!old || JSON.stringify(c.lessons) !== JSON.stringify(old)) return;
    const e = S.enroll[c.id], wasDone = e && old.length && e.done.length >= old.length;
    c.lessons = def.lessons.slice();
    if (e) e.done = wasDone ? [...Array(c.lessons.length).keys()] : e.done.filter(i => i < c.lessons.length);
  });
  S.dataV = DATA_V;
  try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) {}
}
loadState();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(API_MODE ? {theme:S.theme, promoClosed:S.promoClosed} : S)) } catch (e) {} };

const own = c => !c.partner;
const ALL = () => [...S.courses, ...SAMPLE];
const byId = id => ALL().find(c => c.id === id);
const pubAll = () => ALL().filter(c => c.st === "published");
const ktPub = () => S.courses.filter(c => c.st === "published");
const en = id => S.enroll[id];
const prog = c => { const e = en(c.id); return e && c.lessons.length ? e.done.length / c.lessons.length : 0 };
const status = c => { const e = en(c.id); if (!e) return null; return c.lessons.length && e.done.length >= c.lessons.length ? "done" : "progress" };
const mine = () => ALL().filter(c => en(c.id)).sort((a, b) => en(b.id).at - en(a.id).at);
const counts = () => { const m = mine(); const d = m.filter(c => status(c) === "done").length; return {enrolled:m.length, progress:m.length - d, done:d, certs:d} };
const nextIdx = c => { const e = en(c.id); if (!e) return 0; for (let i = 0; i < c.lessons.length; i++) if (!e.done.includes(i)) return i; return -1 };
const pct = c => Math.round(prog(c) * 100);
const orgOf = c => c.o || "Lumzi";
const durOf = c => c.du || (c.lessons.length ? `${c.lessons.length} lessons` : "Jald aa raha hai");
const typeOf = c => c.ty || "Course";
const signedIn = () => !!(S.user && S.signedIn);
/* ---------- Course icons ----------
   Original app-style icons drawn for each subject (styled after the tools
   they teach, not the official trademarked logos). 48×48 viewBox. */
const ICONS = {
  excel:`<rect x="15" y="7" width="28" height="34" rx="4" fill="#21A366"/><rect x="15" y="7" width="28" height="11" rx="4" fill="#33C481"/><rect x="15" y="14" width="28" height="4" fill="#33C481"/><path d="M15 29.5h28M29 7v34" stroke="#107C41" stroke-width="1.6"/><rect x="5" y="14" width="21" height="21" rx="4" fill="#107C41"/><path d="M10.5 19.5l10 10M20.5 19.5l-10 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  word:`<rect x="15" y="7" width="28" height="34" rx="4" fill="#2B7CD3"/><rect x="15" y="7" width="28" height="11" rx="4" fill="#41A5EE"/><rect x="15" y="14" width="28" height="4" fill="#41A5EE"/><path d="M30 24h9M30 29.5h9M30 35h9" stroke="#fff" stroke-opacity=".6" stroke-width="1.8" stroke-linecap="round"/><rect x="5" y="14" width="21" height="21" rx="4" fill="#185ABD"/><path d="M9.2 19.5l2.3 10 3.5-7.2 3.5 7.2 2.3-10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  ppt:`<circle cx="29" cy="24" r="16" fill="#ED6C47"/><path d="M29 8a16 16 0 0 1 16 16H29z" fill="#FF8F6B"/><rect x="5" y="14" width="21" height="21" rx="4" fill="#C43E1C"/><path d="M12 30V19.5h4.6a3.4 3.4 0 0 1 0 6.8H12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  office:`<g transform="rotate(-14 24 30)"><rect x="5" y="12" width="18" height="24" rx="4" fill="#185ABD"/><path d="M8.5 19l1.8 9 3-6 3 6 1.8-9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g><g transform="rotate(14 24 30)"><rect x="25" y="12" width="18" height="24" rx="4" fill="#C43E1C"/><path d="M31 31V19h4a3 3 0 0 1 0 6h-4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g><rect x="14" y="9" width="20" height="26" rx="4.5" fill="#107C41"/><path d="M19 16.5l10 11M29 16.5l-10 11" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>`,
  pc:`<rect x="4" y="8" width="40" height="27" rx="4" fill="#1B2A55"/><rect x="7" y="11" width="34" height="21" rx="2" fill="#4CC2FF"/><rect x="11" y="14" width="17" height="12" rx="1.8" fill="#fff"/><rect x="11" y="14" width="17" height="3.2" rx="1.6" fill="#0F6CBD"/><path d="M14 21h10M14 23.5h7" stroke="#9FB4D6" stroke-width="1.4" stroke-linecap="round"/><path d="M29 19l7.5 7.5-3.4.4 2 4-1.8.9-2-4-2.3 2.3z" fill="#fff" stroke="#1B2A55" stroke-width="1" stroke-linejoin="round"/><path d="M20 35h8l1.5 5h-11z" fill="#1B2A55"/><rect x="14" y="39.5" width="20" height="3" rx="1.5" fill="#1B2A55"/>`,
  tally:`<rect x="8" y="5" width="30" height="38" rx="4" fill="#0F6E64"/><rect x="8" y="5" width="7" height="38" rx="3" fill="#0A4F48"/><path d="M19 13h14M19 18h14M19 23h9" stroke="#BFEDE5" stroke-width="2" stroke-linecap="round"/><circle cx="33" cy="33" r="10" fill="#FCD34D" stroke="#fff" stroke-width="2"/><path d="M29.5 28.5h7M29.5 31.5h7M30 28.5h2.5a2.6 2.6 0 0 1 0 5.2H30l5 4.8" fill="none" stroke="#422006" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
  ai:`<rect x="4" y="4" width="40" height="40" rx="11" fill="#3730A3"/><circle cx="31" cy="17" r="10" fill="#6D5BF2" opacity=".55"/><path d="M14 15l10 9M34 15l-10 9M14 33l10-9M34 33l-10-9" stroke="#C7C8FF" stroke-width="1.8"/><circle cx="14" cy="15" r="3.2" fill="#fff"/><circle cx="34" cy="15" r="3.2" fill="#fff"/><circle cx="14" cy="33" r="3.2" fill="#fff"/><circle cx="34" cy="33" r="3.2" fill="#fff"/><circle cx="24" cy="24" r="5.5" fill="#FCD34D"/><path d="M38 6l1.1 2.8 2.8 1.1-2.8 1.1L38 13.8l-1.1-2.8-2.8-1.1 2.8-1.1z" fill="#FFE08A"/>`,
  code:`<rect x="4" y="6" width="40" height="36" rx="8" fill="#1F2B5E"/><rect x="4" y="6" width="40" height="9" rx="8" fill="#2E3D7A"/><circle cx="10.5" cy="10.5" r="1.5" fill="#FF7A8C"/><circle cx="15.5" cy="10.5" r="1.5" fill="#FCD34D"/><circle cx="20.5" cy="10.5" r="1.5" fill="#6EDCA8"/><path d="M17 22l-6 6 6 6M31 22l6 6-6 6M27 20l-6 16" fill="none" stroke="#6EDCA8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  data:`<rect x="4" y="4" width="40" height="40" rx="10" fill="#0E5A93"/><rect x="11" y="27" width="6" height="10" rx="1.5" fill="#9AD0FF"/><rect x="21" y="20" width="6" height="17" rx="1.5" fill="#CDE8FF"/><rect x="31" y="14" width="6" height="23" rx="1.5" fill="#fff"/><path d="M10 22l9-7 7 4 12-9" fill="none" stroke="#FCD34D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  security:`<rect x="4" y="4" width="40" height="40" rx="10" fill="#3B1F6E"/><path d="M24 9l12 5v9c0 8-5.4 13.2-12 16-6.6-2.8-12-8-12-16v-9z" fill="#8F7BFF"/><path d="M18.5 24l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  health:`<rect x="4" y="4" width="40" height="40" rx="10" fill="#A0153E"/><path d="M24 37s-12-7.2-12-15.5A6.5 6.5 0 0 1 24 18a6.5 6.5 0 0 1 12 3.5C36 29.8 24 37 24 37z" fill="#FF8FAB"/><path d="M11 25h7l2.5-5 4 10 2.5-5H37" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  business:`<rect x="4" y="4" width="40" height="40" rx="10" fill="#46561A"/><rect x="10" y="17" width="28" height="19" rx="3.5" fill="#D8E8A8"/><path d="M19 17v-3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" fill="none" stroke="#D8E8A8" stroke-width="2.4"/><path d="M10 25h28" stroke="#46561A" stroke-width="2"/><rect x="21.5" y="23" width="5" height="4.5" rx="1" fill="#FCD34D"/>`,
  degree:`<rect x="4" y="4" width="40" height="40" rx="10" fill="#1F2B5E"/><path d="M24 12l18 8-18 8-18-8z" fill="#fff"/><path d="M14 24.5V31c0 2.5 4.5 5 10 5s10-2.5 10-5v-6.5L24 29z" fill="#C7C8FF"/><path d="M40 20v9" stroke="#FCD34D" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="30.5" r="2" fill="#FCD34D"/>`
};
const ICON_BY_ID = {msbasic:"pc", msoffice:"office", tally:"tally", ai:"ai", excel:"excel", aif:"ai"};
function iconKey(c) {
  if (ICON_BY_ID[c.id]) return ICON_BY_ID[c.id];
  const t = (c.t + " " + (c.s || "")).toLowerCase();
  const rules = [
    [/excel|spreadsheet/, "excel"], [/\bword\b/, "word"], [/powerpoint|\bppt\b|presentation/, "ppt"],
    [/office|microsoft/, "office"], [/tally|gst|account/, "tally"],
    [/\bai\b|artificial|intelligence|prompt|llm|machine learning|generative/, "ai"],
    [/cyber|security/, "security"], [/data|analytic|statistic|\br programming/, "data"],
    [/python|programming|c\+\+|algorithm|code|computer|software|windows/, "code"],
    [/health|bio|neuro|medical/, "health"]
  ];
  for (const [re, k] of rules) if (re.test(t)) return k;
  if (typeOf(c) === "Degree") return "degree";
  if (/business|leader|mba|finance|econom|management|merger/.test(t)) return "business";
  return null;
}
/* Official product logos, used instead of the drawn icon (TallyPrime from tallysolutions.com) */
const BRAND_LOGO = {tally:"assets/tally-prime-logo.svg"};
const brandKey = c => (c.id === "tally" || /tally/i.test(c.t)) ? "tally" : null;
const iconSvg = k => BRAND_LOGO[k] ? `<img src="${BRAND_LOGO[k]}" alt="" class="brand-logo">` : `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ICONS[k]}</svg>`;
/* the drawn tally icon stays for GST-style courses; the real logo only for Tally courses */
const courseIconHtml = c => { const b = brandKey(c); if (b) return iconSvg(b); const k = iconKey(c); return k ? `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ICONS[k]}</svg>` : null };
/* App-style tile: the course icon if we have one, otherwise initials on the course colour */
function thumb(c, size) {
  const html = courseIconHtml(c);
  if (html) return `<span class="cthumb app ${size}" aria-hidden="true">${html}</span>`;
  return `<span class="cthumb ${size}" style="background:${c.c}" aria-hidden="true">${esc(own(c) ? c.ab : abbr(orgOf(c)))}</span>`;
}

/* ---------- Theme ---------- */
function applyTheme() { S.theme === "system" ? document.documentElement.removeAttribute("data-theme") : document.documentElement.setAttribute("data-theme", S.theme) }
applyTheme();

/* ---------- Toast + celebration ---------- */
let tt;
function toast(msg) {
  const t = $("#toast"); t.innerHTML = I.check + "<span>" + esc(msg) + "</span>"; t.classList.add("show");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2800);
}
function celebrate() {
  if (reduce.matches) return;
  const box = document.createElement("div"); box.className = "celebrate"; box.setAttribute("aria-hidden", "true");
  const cols = ["#2D5BD6","#FCD34D","#0D6B57","#5E89EC","#A0153E"];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "vw"; p.style.background = cols[i % cols.length];
    p.style.setProperty("--x", (Math.random() * 160 - 80) + "px"); p.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
    p.style.animationDelay = (Math.random() * .25) + "s"; p.style.animationDuration = (1.2 + Math.random() * .8) + "s";
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2400);
}
