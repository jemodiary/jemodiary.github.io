// JeMo Diary — web MVP. Everything stays on the device (IndexedDB); nothing is uploaded.
const { parseIcs, exifTime, videoTime, matchPhotos, dayKey, MIN, DAY } = window.Core;

const S = { view: "day", cursor: startOfDay(Date.now()), events: [], photos: [], match: new Map() };
try { S.view = localStorage.getItem("pc:view") || "day"; } catch (e) {}

// ---------- language ----------
let LANG = (navigator.language || "en").toLowerCase().startsWith("ro") ? "ro" : "en";
try { LANG = localStorage.getItem("pc:lang") || LANG; } catch (e) {}
const loc = LANG === "ro" ? "ro-RO" : undefined; // dates in the app's language

const STR = {
  en: {
    today: "Today", day: "Day", week: "Week", month: "Month", search: "Search", prev: "Previous", next: "Next", add: "Add",
    tagline: "Your calendar, with the photos you took there",
    emptyText: "Pick the photos from a day and name the moments — or import your calendar. Each photo lands under its event.",
    fromPhotos: "Make events from photos", importCal: "Import calendar", tryDemo: "Try with demo data",
    nothing: "Nothing on this day.", allDay: "all day", other: "other",
    otherPhotos: "Other photos", outside: "Taken outside any event",
    report: "Report", addPh: "📷 Photos", noteBtn: "🎙 Note", edit: "Edit", noPhotos: "No photos yet · <b>📷 add them here</b>",
    m_fromPhotos: "Make events from photos", m_fromPhotosS: "Pick a day's photos, name each moment",
    m_photos: "Add photos or videos", m_photosS: "Each one is placed by the time it was taken",
    m_ics: "Import calendar (.ics)", m_icsS: "Export from Google, Apple or Outlook Calendar",
    m_event: "New event", m_report: "Report for a period", m_reportS: "Several events in one PDF",
    m_brand: "Your logo on reports", m_brandS: "Logo, company name, who prepared it",
    m_backup: "Save a backup", m_backupS: "Everything in one file, to keep or move to another phone",
    m_restore: "Restore a backup", m_restoreS: "Bring back a saved file",
    m_demo: "Demo data", m_demoS: "A sample week to try it out",
    m_feedback: "Send feedback", m_feedbackS: "Tell us what worked and what didn't",
    m_reload: "Reload app", m_version: "Version", m_lang: "Limba: română",
    m_clear: "Delete everything", m_clearS: "Removes all events and photos from this device",
    newEvent: "New event", editEvent: "Edit event", title: "Title", titlePh: "e.g. Smart City Conference", place: "Place",
    optional: "optional", date: "Date", starts: "Starts", ends: "Ends", allDayChk: "All day", cancel: "Cancel", save: "Save",
    delEvent: "Delete event", delEventQ: "Delete this event? Its photos stay.", needTitle: "Add a title and a date",
    note: "Note", notePh: "What happened, who was there, what was decided…", speak: "Speak", speakNote: "Speak the note",
    listening: "Listening… tap to stop",
    kbHint: "🎙 Tap the <b>microphone on your keyboard</b> (bottom right) and speak — the text appears as you talk. Tap it again to stop.",
    dictStop: "Dictation stopped",
    close: "Close", del: "Delete", automatic: "Automatic", noEvent: "no event", notInEvent: "Not part of any event",
    fileDate: "(file date — no camera date)", video: "Video",
    added: "{n} added", addedTo: "{n} added to {e}", already1: "{n} was already in the app", noDate: "{n} without a camera date (used the file date)",
    unreadable: "{n} could not be read", tooBig: "{n} too large (over 300 MB)", already: "{n} were already in the app",
    noEvents: "No events found in that file", imported: "{n} imported",
    clusters: "Name the moments", clustersS: "Photos close in time are grouped. Name the ones that are events; leave the rest empty.",
    clusterPh: "Name, e.g. Dinner with Diana", matches: "Already matches “{e}”", created: "{n} created",
    rep: "Activity report", repPeriod: "Activity report", when: "When", where: "Where", photos: "Photos", videos: "Videos",
    notePhR: "Add a note (what happened, who attended)…", back: "‹ Back", feedback: "Feedback", savePdf: "Save PDF", logoBtn: "Logo",
    include: "In report", captionPh: "Caption (optional)", up: "Move up", down: "Move down",
    preparedBy: "Prepared by", namePh: "Your name", signature: "Signature", clearSign: "Clear", signHere: "Sign here with your finger",
    madeWith: "Made with JeMo Diary", period: "Period", summary: "{a} · {p}",
    pickPeriod: "Report for a period", from: "From", to: "To", choose: "Events in this period", noneInPeriod: "No events in this period.",
    create: "Create report", pickOne: "Choose at least one event",
    brand: "Your logo on reports", company: "Company or project", companyPh: "e.g. Asociația Verde", byDefault: "Prepared by (default)",
    logo: "Logo", addLogo: "Add logo", changeLogo: "Change logo", removeLogo: "Remove",
    backupDone: "Backup saved", restoreDone: "Restored: {e}, {p}", notBackup: "That file isn't a JeMo Diary backup",
    searchPh: "Search events, places, notes…", noResults: "Nothing found.",
    yearsAgo: "{n} year ago", yearsAgoN: "{n} years ago",
    newVersion: "New version of JeMo Diary", newVersionS: "Your events, photos and notes stay", reload: "Reload",
    clearQ: "Delete all events and photos from this device?",
    storageErr: "This browser can't store data here ({e}). Try Safari or Chrome outside private mode.",
    fb: ["1. Did you make a report with your own photos? (yes / no)", "2. Did the photos land under the right events? If not, what went wrong?",
      "3. What would you use the report for (work, a project, school, memories…)?", "4. Would you pay €3.99/month for unlimited reports? (yes / maybe / no)",
      "5. Anything else:"],
    fbSubject: "JeMo Diary — feedback", fbStats: "In the app: {e}, {p} of your own, {r} reports opened",
    demo: ["Smart City Conference", "Dinner with Diana", "Site visit — Ploiești", "Team training", "Shopping"],
    demoPlaces: ["Main Conference Center", "La Pasteria", "Ploiești", "Office", ""],
  },
  ro: {
    today: "Azi", day: "Zi", week: "Săpt.", month: "Lună", search: "Caută", prev: "Înapoi", next: "Înainte", add: "Adaugă",
    tagline: "Calendarul tău, cu pozele făcute acolo",
    emptyText: "Alege pozele unei zile și dă nume momentelor — sau importă calendarul. Fiecare poză ajunge la evenimentul ei.",
    fromPhotos: "Fă evenimente din poze", importCal: "Importă calendarul", tryDemo: "Încearcă cu date demo",
    nothing: "Nimic în ziua asta.", allDay: "toată ziua", other: "altele",
    otherPhotos: "Alte poze", outside: "Făcute în afara evenimentelor",
    report: "Raport", addPh: "📷 Poze", noteBtn: "🎙 Notă", edit: "Modifică", noPhotos: "Încă nicio poză · <b>📷 adaugă aici</b>",
    m_fromPhotos: "Fă evenimente din poze", m_fromPhotosS: "Alegi pozele unei zile și dai nume momentelor",
    m_photos: "Adaugă poze sau video", m_photosS: "Fiecare ajunge după ora la care a fost făcută",
    m_ics: "Importă calendarul (.ics)", m_icsS: "Export din Google, Apple sau Outlook Calendar",
    m_event: "Eveniment nou", m_report: "Raport pe o perioadă", m_reportS: "Mai multe evenimente într-un PDF",
    m_brand: "Logo-ul tău pe rapoarte", m_brandS: "Logo, numele firmei, cine l-a întocmit",
    m_backup: "Salvează o copie", m_backupS: "Totul într-un fișier, de păstrat sau de mutat pe alt telefon",
    m_restore: "Readu o copie", m_restoreS: "Pui înapoi un fișier salvat",
    m_demo: "Date demo", m_demoS: "O săptămână de probă",
    m_feedback: "Trimite părerea ta", m_feedbackS: "Spune-ne ce a mers și ce nu",
    m_reload: "Reîncarcă aplicația", m_version: "Versiunea", m_lang: "Language: English",
    m_clear: "Șterge tot", m_clearS: "Șterge toate evenimentele și pozele de pe telefon",
    newEvent: "Eveniment nou", editEvent: "Modifică evenimentul", title: "Titlu", titlePh: "ex. Conferința Smart City", place: "Locul",
    optional: "opțional", date: "Data", starts: "Începe", ends: "Se termină", allDayChk: "Toată ziua", cancel: "Renunță", save: "Salvează",
    delEvent: "Șterge evenimentul", delEventQ: "Ștergi evenimentul? Pozele rămân.", needTitle: "Pune un titlu și o dată",
    note: "Notă", notePh: "Ce s-a întâmplat, cine a fost, ce s-a hotărât…", speak: "Vorbește", speakNote: "Spune nota",
    listening: "Ascult… apasă ca să opresc",
    kbHint: "🎙 Apasă <b>microfonul de pe tastatură</b> (jos, în dreapta) și vorbește — textul apare pe măsură ce vorbești. Apasă din nou ca să oprești.",
    dictStop: "Dictarea s-a oprit",
    close: "Închide", del: "Șterge", automatic: "Automat", noEvent: "niciun eveniment", notInEvent: "În afara evenimentelor",
    fileDate: "(data fișierului — fără data camerei)", video: "Video",
    added: "{n} adăugate", added1: "{n} adăugată", addedTo: "{n} adăugate la {e}", addedTo1: "{n} adăugată la {e}",
    noDate1: "{n} fără data camerei (am folosit data fișierului)", unreadable1: "{n} nu s-a putut citi", tooBig1: "{n} prea mare (peste 300 MB)",
    already1: "{n} era deja în aplicație", imported1: "{n} importat", created1: "{n} creat", noDate: "{n} fără data camerei (am folosit data fișierului)",
    unreadable: "{n} nu s-au putut citi", tooBig: "{n} prea mari (peste 300 MB)", already: "{n} erau deja în aplicație",
    noEvents: "N-am găsit evenimente în fișier", imported: "{n} importate",
    clusters: "Dă nume momentelor", clustersS: "Pozele apropiate ca oră sunt grupate. Dă nume celor care sunt evenimente; restul lasă-le goale.",
    clusterPh: "Nume, ex. Cină cu Diana", matches: "Se potrivește deja cu „{e}”", created: "{n} create",
    rep: "Raport de activitate", repPeriod: "Raport de activitate", when: "Când", where: "Unde", photos: "Poze", videos: "Video",
    notePhR: "Adaugă o notă (ce s-a întâmplat, cine a participat)…", back: "‹ Înapoi", feedback: "Părerea ta", savePdf: "Salvează PDF", logoBtn: "Logo",
    include: "În raport", captionPh: "Descriere (opțional)", up: "Mută mai sus", down: "Mută mai jos",
    preparedBy: "Întocmit de", namePh: "Numele tău", signature: "Semnătura", clearSign: "Șterge", signHere: "Semnează aici cu degetul",
    madeWith: "Făcut cu JeMo Diary", period: "Perioada", summary: "{a} · {p}",
    pickPeriod: "Raport pe o perioadă", from: "De la", to: "Până la", choose: "Evenimentele din perioadă", noneInPeriod: "Niciun eveniment în perioada asta.",
    create: "Fă raportul", pickOne: "Alege cel puțin un eveniment",
    brand: "Logo-ul tău pe rapoarte", company: "Firma sau proiectul", companyPh: "ex. Asociația Verde", byDefault: "Întocmit de (implicit)",
    logo: "Logo", addLogo: "Adaugă logo", changeLogo: "Schimbă logo-ul", removeLogo: "Scoate",
    backupDone: "Copia a fost salvată", restoreDone: "Am adus înapoi: {e}, {p}", notBackup: "Fișierul nu e o copie JeMo Diary",
    searchPh: "Caută evenimente, locuri, note…", noResults: "N-am găsit nimic.",
    yearsAgo: "Acum {n} an", yearsAgoN: "Acum {n} ani",
    newVersion: "Variantă nouă de JeMo Diary", newVersionS: "Evenimentele, pozele și notele rămân", reload: "Reîncarcă",
    clearQ: "Ștergi toate evenimentele și pozele de pe telefon?",
    storageErr: "Browserul nu poate salva date aici ({e}). Încearcă Safari sau Chrome, nu în modul privat.",
    fb: ["1. Ai făcut un raport cu pozele tale? (da / nu)", "2. Au ajuns pozele la evenimentele potrivite? Dacă nu, ce n-a mers?",
      "3. La ce ai folosi raportul (muncă, un proiect, școală, amintiri…)?", "4. Ai plăti 3,99 €/lună pentru rapoarte nelimitate? (da / poate / nu)",
      "5. Altceva:"],
    fbSubject: "JeMo Diary — părerea mea", fbStats: "În aplicație: {e}, {p} proprii, {r} rapoarte deschise",
    demo: ["Conferința Smart City", "Cină cu Diana", "Vizită pe șantier — Ploiești", "Training echipă", "Cumpărături"],
    demoPlaces: ["Centrul de conferințe", "La Pasteria", "Ploiești", "Birou", ""],
  },
};
function t(k, v) {
  // a count of exactly 1 uses the singular wording (key + "1") when the language has one
  if (v && v.n !== undefined && String(v.n).split(" ")[0] === "1" && STR[LANG][k + "1"]) k += "1";
  let s = STR[LANG][k] ?? STR.en[k] ?? k;
  if (v && typeof s === "string") for (const x in v) s = s.split("{" + x + "}").join(v[x]);
  return s;
}
// "1 poză", "5 poze", "20 de poze"; "1 photo", "5 photos".
const WORDS = {
  en: { photo: ["photo", "photos"], item: ["photo/video", "photos/videos"], video: ["video", "videos"], event: ["event", "events"], activity: ["activity", "activities"], report: ["report", "reports"] },
  ro: { photo: ["poză", "poze"], item: ["poză/video", "poze/video"], video: ["video", "video"], event: ["eveniment", "evenimente"], activity: ["activitate", "activități"], report: ["raport", "rapoarte"] },
};
function cnt(n, w) {
  const [one, many] = WORDS[LANG][w];
  if (n === 1) return "1 " + one;
  if (LANG === "ro" && n >= 20 && (n % 100 === 0 || n % 100 >= 20)) return n + " de " + many;
  return n + " " + many;
}

const COLORS = ["#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#f87171", "#2dd4bf", "#c084fc"];
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function startOfDay(x) { const d = new Date(x); d.setHours(0, 0, 0, 0); return d.getTime(); }
function addDays(x, n) { const d = new Date(x); d.setDate(d.getDate() + n); return d.getTime(); }
function startOfWeek(x) { const d = new Date(startOfDay(x)); return addDays(d.getTime(), -((d.getDay() + 6) % 7)); }
function color(ev) { let h = 0; for (const c of ev.title) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
function fmtTime(x) { return new Date(x).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }); }
function fmtDay(x, o) { return new Date(x).toLocaleDateString(loc, o); }
function fmtDur(s) { s = Math.round(s || 0); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
function ymd(x) { const d = new Date(x); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function fromYmd(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); }
function hm(x) { const d = new Date(x); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

// ---------- storage ----------
let dbp;
function db() {
  dbp = dbp || new Promise((ok, bad) => {
    const r = indexedDB.open("photocal", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("events", { keyPath: "id" });
      r.result.createObjectStore("photos", { keyPath: "id" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => bad(r.error);
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((ok, bad) => {
    const x = d.transaction(store, mode);
    const s = x.objectStore(store);
    const out = fn(s);
    x.oncomplete = () => ok(out && "result" in out ? out.result : undefined);
    x.onerror = () => bad(x.error);
  });
}
const getAll = (store) => tx(store, "readonly", (s) => s.getAll());
const putAll = (store, items) => tx(store, "readwrite", (s) => items.forEach((i) => s.put(i)));
const del = (store, id) => tx(store, "readwrite", (s) => s.delete(id));
const clear = (store) => tx(store, "readwrite", (s) => s.clear());

// Small settings (logo, company, signature) live in localStorage; it may be unavailable.
function getPref(k, def) { try { const v = localStorage.getItem("pc:" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
function setPref(k, v) { try { localStorage.setItem("pc:" + k, JSON.stringify(v)); } catch (e) {} }

// Ask the browser not to clear our data when space runs low (iPhone does that to websites otherwise).
async function persist() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) {}
}

// Object URLs for thumbnails, made once per photo.
const urls = new Map();
function thumb(ph) {
  if (!urls.has(ph.id)) urls.set(ph.id, URL.createObjectURL(ph.thumb));
  return urls.get(ph.id);
}
function th(p) {
  return `<span class="th"><img src="${thumb(p)}" alt="" loading="lazy">${p.type === "video" ? `<i>▶ ${fmtDur(p.dur)}</i>` : ""}</span>`;
}

async function load() {
  [S.events, S.photos] = await Promise.all([getAll("events"), getAll("photos")]);
  S.events.sort((a, b) => a.start - b.start);
  S.photos.sort((a, b) => a.time - b.time);
  S.match = matchPhotos(S.events, S.photos);
  render();
  if (S.events.length || S.photos.length) persist();
}

// ---------- queries ----------
function eventsOn(day) {
  const end = day + DAY;
  return S.events.filter((e) => e.start < end && e.end > day);
}
function photoDay(p) {
  const ev = p.eventId && p.eventId !== "none" && S.events.find((e) => e.id === p.eventId);
  if (ev && !(p.time >= ev.start && p.time < ev.end)) return dayKey(ev.start);
  return dayKey(p.time);
}
function photosOn(day) {
  const k = dayKey(day);
  return S.photos.filter((p) => photoDay(p) === k);
}
// In the order chosen for the report (ev.order), otherwise by time.
function photosOf(ev) {
  const ph = S.photos.filter((p) => S.match.get(p.id) === ev.id);
  if (!ev.order) return ph;
  const pos = new Map(ev.order.map((id, i) => [id, i]));
  return ph.sort((a, b) => (pos.has(a.id) ? pos.get(a.id) : 1e9 + a.time) - (pos.has(b.id) ? pos.get(b.id) : 1e9 + b.time));
}

// ---------- render ----------
function staticText() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-tl]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.tl)); });
}

function render() {
  document.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("on", b.dataset.view === S.view));
  const x = S.cursor;
  const title = S.view === "week" ? weekTitle(x) : fmtDay(x, { month: "long", year: "numeric" });
  $("#title").textContent = title.charAt(0).toUpperCase() + title.slice(1);
  const main = $("#main");
  if (!S.events.length && !S.photos.length) { main.innerHTML = emptyHtml(); return; }
  main.innerHTML = S.view === "month" ? monthHtml(x) : S.view === "week" ? weekHtml(x) : dayHtml(x);
}

function weekTitle(x) {
  const a = startOfWeek(x), b = addDays(a, 6);
  return fmtDay(a, { day: "numeric", month: "short" }) + " – " + fmtDay(b, { day: "numeric", month: "short" });
}

function emptyHtml() {
  return `<div class="empty">
    <img class="hero" src="logo.png" alt="">
    <div class="name">JeMo Diary</div>
    <div class="big">${t("tagline")}</div>
    ${t("emptyText")}<br><br>
    <button class="btn primary" data-act="fromPhotos">📷 ${t("fromPhotos")}</button><br>
    <button class="btn" data-act="ics" style="margin-top:10px">${t("importCal")}</button>
    <button class="btn" data-act="demo" style="margin-top:10px">${t("tryDemo")}</button>
  </div>`;
}

function monthHtml(x) {
  const d = new Date(x);
  const first = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const start = startOfWeek(first);
  const month = d.getMonth();
  const today = startOfDay(Date.now());
  const dows = Array.from({ length: 7 }, (_, i) => fmtDay(addDays(start, i), { weekday: "narrow" }));
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const day = addDays(start, i);
    if (i === 35 && new Date(day).getMonth() !== month) break;
    const evs = eventsOn(day);
    const phs = photosOn(day);
    cells += `<button class="cell${new Date(day).getMonth() !== month ? " out" : ""}${day === today ? " today" : ""}" data-day="${day}">
      <span class="n"><span>${new Date(day).getDate()}</span></span>
      ${evs.slice(0, 2).map((e) => `<span class="chip" style="background:${color(e)}55;border-left:3px solid ${color(e)}">${esc(e.title)}</span>`).join("")}
      ${evs.length > 2 ? `<div class="more">+${evs.length - 2}</div>` : ""}
      ${phs.length ? `<div class="thumbs">${phs.slice(0, 4).map(th).join("")}</div>` : ""}
      ${phs.length > 4 ? `<div class="more">+${phs.length - 4}</div>` : ""}
    </button>`;
  }
  return `<div class="dow">${dows.map((w) => `<span>${w}</span>`).join("")}</div><div class="month">${cells}</div>`;
}

function weekHtml(x) {
  const start = startOfWeek(x);
  const today = startOfDay(Date.now());
  let out = "";
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    const evs = eventsOn(day);
    const loose = photosOn(day).filter((p) => !S.match.get(p.id));
    out += `<button class="wday${day === today ? " today" : ""}" data-day="${day}">
      <div class="d"><small>${fmtDay(day, { weekday: "short" })}</small><b>${new Date(day).getDate()}</b></div>
      <div class="body">
        ${evs.map((e) => {
          const ph = photosOf(e);
          return `<div class="wev"><div class="t" style="color:${color(e)}"><i>${e.allDay ? t("allDay") : fmtTime(e.start)}</i>${esc(e.title)}</div>
            ${ph.length ? `<div class="strip">${ph.slice(0, 6).map(th).join("")}</div>` : ""}</div>`;
        }).join("")}
        ${loose.length ? `<div class="wev"><div class="t"><i>${t("other")}</i>${cnt(loose.length, "photo")}</div><div class="strip">${loose.slice(0, 6).map(th).join("")}</div></div>` : ""}
        ${!evs.length && !loose.length ? `<div class="none">—</div>` : ""}
      </div></button>`;
  }
  return out;
}

// Same day and month in earlier years.
function onThisDay(day) {
  const d = new Date(day);
  const out = [];
  for (let y = d.getFullYear() - 1; y >= d.getFullYear() - 10; y--) {
    const past = new Date(y, d.getMonth(), d.getDate()).getTime();
    if (new Date(past).getDate() !== d.getDate()) continue;
    const evs = eventsOn(past), phs = photosOn(past);
    if (evs.length || phs.length) out.push({ day: past, years: d.getFullYear() - y, evs, phs });
  }
  return out;
}

function dayHtml(x) {
  const start = startOfWeek(x);
  const today = startOfDay(Date.now());
  const bar = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    return `<button data-day="${day}" class="${day === x ? "sel" : ""}${day === today ? " today" : ""}">
      <small>${fmtDay(day, { weekday: "narrow" })}</small><span>${new Date(day).getDate()}</span></button>`;
  }).join("");
  const memories = onThisDay(x).map((m) => `<button class="otd" data-day="${m.day}">
      <span class="otd-h">📅 ${t(m.years === 1 ? "yearsAgo" : "yearsAgoN", { n: m.years })} · ${fmtDay(m.day, { day: "numeric", month: "short", year: "numeric" })}</span>
      <span class="otd-t">${esc(m.evs.map((e) => e.title).join(" · ") || cnt(m.phs.length, "photo"))}</span>
      ${m.phs.length ? `<span class="strip">${m.phs.slice(0, 5).map(th).join("")}</span>` : ""}
    </button>`).join("");
  const evs = eventsOn(x).sort((a, b) => (b.allDay - a.allDay) || a.start - b.start);
  const loose = photosOn(x).filter((p) => !S.match.get(p.id));
  let list = evs.map((e) => {
    const ph = photosOf(e);
    return `<div class="ev">
      <div class="time">${e.allDay ? t("allDay") : fmtTime(e.start)}</div>
      <div>
        <h3 style="color:${color(e)}">${esc(e.title)}</h3>
        ${e.location || !e.allDay ? `<div class="loc">${e.allDay ? "" : fmtTime(e.start) + " – " + fmtTime(e.end)}${e.location ? " · " + esc(e.location) : ""}</div>` : ""}
        <div class="acts">
          ${ph.length ? `<button class="rep" data-report="${esc(e.id)}">${t("report")} · ${ph.length}</button>` : ""}
          <button data-addto="${esc(e.id)}">${t("addPh")}</button>
          <button data-note="${esc(e.id)}">${t("noteBtn")}</button>
          <button data-edit="${esc(e.id)}" aria-label="${t("edit")}">✎</button>
        </div>
        ${e.note ? `<div class="note">${esc(e.note)}</div>` : ""}
        ${ph.length ? `<div class="grid3">${ph.map((p) => `<button data-photo="${p.id}">${th(p)}</button>`).join("")}</div>`
          : `<button class="nophotos" data-addto="${esc(e.id)}">${t("noPhotos")}</button>`}
      </div></div>`;
  }).join("");
  if (loose.length) {
    list += `<div class="ev"><div class="time"></div><div><h3>${t("otherPhotos")}</h3><div class="loc">${t("outside")}</div>
      <div class="grid3">${loose.map((p) => `<button data-photo="${p.id}">${th(p)}</button>`).join("")}</div></div></div>`;
  }
  if (!list) list = `<div class="empty"><img class="faint" src="logo.png" alt="">${t("nothing")}</div>`;
  return `<div class="daybar">${bar}</div>
    <div class="daytitle">${fmtDay(x, { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</div>${memories}${list}`;
}

// ---------- reading photos and videos ----------
const isVideo = (f) => /^video\//.test(f.type) || /\.(mov|mp4|m4v|3gp)$/i.test(f.name);

// Turns picked files into photo records (not saved yet). Files already in the app come back in `known`.
async function readMedia(files) {
  const have = new Map(S.photos.map((p) => [p.name + "|" + p.size, p]));
  const out = [], known = [];
  let skipped = 0, noDate = 0, tooBig = 0;
  for (const f of files) {
    const had = have.get(f.name + "|" + f.size);
    if (had) { known.push(had); continue; }
    const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    if (isVideo(f)) {
      if (f.size > 300 * 1024 * 1024) { tooBig++; continue; }
      let time = null;
      try { time = videoTime(await f.slice(0, 512 * 1024).arrayBuffer(), await f.slice(Math.max(0, f.size - 512 * 1024)).arrayBuffer()); } catch (e) {}
      const fromFile = time == null;
      if (fromFile) { time = f.lastModified; noDate++; }
      const v = await videoThumb(f);
      out.push({ id, type: "video", name: f.name, size: f.size, time, timeFrom: fromFile ? "file" : "exif", dur: v.dur, thumb: v.thumb, full: f });
      continue;
    }
    let time = null;
    try { time = exifTime(await f.slice(0, 256 * 1024).arrayBuffer()); } catch (e) {}
    const fromFile = time == null;
    if (fromFile) { time = f.lastModified; noDate++; }
    let bmp;
    try { bmp = await createImageBitmap(f); } catch (e) { skipped++; continue; }
    out.push({ id, name: f.name, size: f.size, time, timeFrom: fromFile ? "file" : "exif",
      thumb: await resize(bmp, 360), full: await resize(bmp, 1600) });
    bmp.close && bmp.close();
  }
  return { out, known, skipped, noDate, tooBig };
}

function resize(src, max, w0, h0) {
  const w = w0 || src.width, h = h0 || src.height;
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
}

// A frame from about a second in; a plain ▶ tile if the browser can't decode the video.
function videoThumb(file) {
  return new Promise((ok) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    let done = false;
    const fin = async (blob) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      ok({ thumb: blob || (await playTile()), dur: isFinite(v.duration) ? v.duration : 0 });
    };
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.onloadedmetadata = () => { try { v.currentTime = Math.min(1, (v.duration || 2) / 2); } catch (e) { fin(null); } };
    v.onseeked = async () => { try { fin(await resize(v, 360, v.videoWidth, v.videoHeight)); } catch (e) { fin(null); } };
    v.onerror = () => fin(null);
    setTimeout(() => fin(null), 8000);
    v.src = url;
    v.load();
  });
}
function playTile() {
  const c = document.createElement("canvas");
  c.width = 360; c.height = 360;
  const g = c.getContext("2d");
  g.fillStyle = "#2c2c2e"; g.fillRect(0, 0, 360, 360);
  g.fillStyle = "#fff"; g.beginPath(); g.moveTo(145, 120); g.lineTo(245, 180); g.lineTo(145, 240); g.fill();
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
}

function summary(r, n, evTitle) {
  const parts = [evTitle ? t("addedTo", { n: cnt(n, "item"), e: evTitle }) : t("added", { n: cnt(n, "item") })];
  if (r.noDate) parts.push(t("noDate", { n: r.noDate }));
  if (r.skipped) parts.push(t("unreadable", { n: r.skipped }));
  if (r.tooBig) parts.push(t("tooBig", { n: r.tooBig }));
  return parts.join(" · ");
}

// evId: picked from an event's own button → they go under that event, whatever time they were taken.
async function addPhotos(files, evId) {
  const r = await readMedia(files);
  const moved = evId ? r.known.filter((p) => p.eventId !== evId) : [];
  for (const p of r.out) if (evId) p.eventId = evId;
  for (const p of moved) p.eventId = evId;
  if (r.out.length || moved.length) await putAll("photos", [...r.out, ...moved]);
  await load();
  const ev = evId && S.events.find((e) => e.id === evId);
  if (ev) { S.cursor = startOfDay(ev.start); S.view = "day"; render(); }
  else if (r.out.length) { S.cursor = startOfDay(r.out[0].time); render(); }
  toast(summary(r, r.out.length + moved.length, ev && ev.title) + (!evId && r.known.length ? " · " + t("already", { n: r.known.length }) : ""));
}

// Photos close in time (< 90 min apart, same day) are one moment; each moment can become an event.
function cluster(items) {
  const sorted = [...items].sort((a, b) => a.time - b.time);
  const groups = [];
  for (const p of sorted) {
    const g = groups[groups.length - 1];
    if (g && p.time - g[g.length - 1].time < 90 * MIN && dayKey(p.time) === dayKey(g[0].time)) g.push(p);
    else groups.push([p]);
  }
  return groups;
}

async function photosToEvents(files) {
  const r = await readMedia(files);
  const items = [...r.out, ...r.known];
  if (!items.length) return toast(summary(r, 0));
  const groups = cluster(items);
  const auto = matchPhotos(S.events, items);
  const tmp = new Map();
  const tile = (p) => { const u = URL.createObjectURL(p.thumb); tmp.set(p.id, u); return `<span class="th"><img src="${u}" alt="">${p.type === "video" ? `<i>▶ ${fmtDur(p.dur)}</i>` : ""}</span>`; };
  const el = sheet(`<h2><img src="logo.png" alt="">${t("clusters")}</h2>
    <div class="sub">${t("clustersS")}</div>
    ${groups.map((g, i) => {
      const a = g[0].time, b = g[g.length - 1].time;
      const hit = S.events.find((e) => e.id === auto.get(g[0].id));
      return `<div class="cl">
        <div class="cl-h">${fmtDay(a, { weekday: "short", day: "numeric", month: "short" })} · ${fmtTime(a)}${b - a > MIN ? "–" + fmtTime(b) : ""} · ${cnt(g.length, "item")}</div>
        <div class="strip">${g.slice(0, 6).map(tile).join("")}</div>
        ${hit ? `<div class="cl-m">${t("matches", { e: esc(hit.title) })}</div>` : ""}
        <input type="text" name="n${i}" placeholder="${t("clusterPh")}">
        <input type="text" name="l${i}" placeholder="${t("place")} (${t("optional")})" class="cl-l">
      </div>`;
    }).join("")}
    <div class="end"><button class="btn" data-x="cancel">${t("cancel")}</button><button class="btn primary" data-x="save">${t("save")}</button></div>`,
  async (e, el) => {
    const x = e.target.closest("[data-x]");
    if (!x) return;
    if (x.dataset.x === "save") {
      const evs = [];
      groups.forEach((g, i) => {
        const name = el.querySelector(`[name=n${i}]`).value.trim();
        if (!name) return;
        const first = g[0].time, last = g[g.length - 1].time;
        const start = Math.floor(first / (5 * MIN)) * 5 * MIN;
        const ev = { id: "m" + Date.now().toString(36) + i, title: name, location: el.querySelector(`[name=l${i}]`).value.trim(),
          start, end: Math.max(last + 15 * MIN, start + 30 * MIN), allDay: false, source: "photos" };
        evs.push(ev);
        for (const p of g) p.eventId = ev.id;
      });
      if (evs.length) await putAll("events", evs);
      await putAll("photos", items);
      await load();
      S.cursor = startOfDay(groups[0][0].time); S.view = "day"; render();
      toast(t("created", { n: cnt(evs.length, "event") }) + " · " + summary(r, r.out.length));
    }
    tmp.forEach((u) => URL.revokeObjectURL(u));
    el.remove();
  });
}

async function importIcs(file) {
  const evs = parseIcs(await file.text());
  if (!evs.length) return toast(t("noEvents"));
  const prev = new Map(S.events.map((e) => [e.id, e]));
  for (const e of evs) { const o = prev.get(e.id); if (o) { if (o.note) e.note = o.note; if (o.order) e.order = o.order; } }
  await putAll("events", evs);
  await load();
  toast(t("imported", { n: cnt(evs.length, "event") }));
}

// ---------- sheets ----------
function sheet(html, onClick) {
  const el = document.createElement("div");
  el.className = "scrim";
  el.innerHTML = `<div class="sheet">${html}</div>`;
  el.addEventListener("click", (e) => {
    if (e.target === el) { stopDictation(); return el.remove(); }
    onClick && onClick(e, el);
  });
  document.body.appendChild(el);
  return el;
}

function menu() {
  const row = (m, ic, a, b, cls) => `<button class="row${cls ? " " + cls : ""}" data-m="${m}"><span class="ic">${ic}</span><span>${a}${b ? `<small>${b}</small>` : ""}</span></button>`;
  sheet(`<h2><img src="logo.png" alt="">${t("add")}</h2>
    ${row("fromPhotos", "📷", t("m_fromPhotos"), t("m_fromPhotosS"))}
    ${row("photos", "▦", t("m_photos"), t("m_photosS"))}
    ${row("ics", "⇩", t("m_ics"), t("m_icsS"))}
    ${row("event", "＋", t("m_event"))}
    ${row("period", "📄", t("m_report"), t("m_reportS"))}
    ${row("brand", "🏷", t("m_brand"), t("m_brandS"))}
    ${row("backup", "⬆", t("m_backup"), t("m_backupS"))}
    ${row("restore", "⬇", t("m_restore"), t("m_restoreS"))}
    ${row("demo", "★", t("m_demo"), t("m_demoS"))}
    ${row("feedback", "✉", t("m_feedback"), t("m_feedbackS"))}
    ${row("lang", "🌐", t("m_lang"))}
    ${row("reload", "↻", t("m_reload"), t("m_version") + " " + esc(loadedVersion || "—"))}
    ${row("clear", "✕", t("m_clear"), t("m_clearS"), "danger")}`,
  (e, el) => {
    const b = e.target.closest("[data-m]");
    if (!b) return;
    el.remove();
    act(b.dataset.m);
  });
}

// New event (ev undefined) or edit an existing one.
function eventForm(ev) {
  const base = ev ? ev.start : S.cursor + 9 * 60 * MIN;
  const el = sheet(`<h2><img src="logo.png" alt="">${ev ? t("editEvent") : t("newEvent")}</h2>
    <label>${t("title")}</label><input type="text" name="title" placeholder="${t("titlePh")}" value="${ev ? esc(ev.title) : ""}">
    <label>${t("place")}</label><input type="text" name="location" placeholder="${t("optional")}" value="${ev ? esc(ev.location || "") : ""}">
    <label>${t("date")}</label><input type="date" name="date" value="${ymd(base)}">
    <div class="two"><div><label>${t("starts")}</label><input type="time" name="from" value="${ev && !ev.allDay ? hm(ev.start) : "09:00"}"></div>
      <div><label>${t("ends")}</label><input type="time" name="to" value="${ev && !ev.allDay ? hm(ev.end) : "10:00"}"></div></div>
    <label class="chk"><input type="checkbox" name="allDay"${ev && ev.allDay ? " checked" : ""}> ${t("allDayChk")}</label>
    <div class="end">${ev ? `<button class="btn danger" data-x="delete">${t("delEvent")}</button>` : ""}<span style="flex:1"></span>
      <button class="btn" data-x="cancel">${t("cancel")}</button><button class="btn primary" data-x="save">${t("save")}</button></div>`,
  async (e, el) => {
    const x = e.target.closest("[data-x]");
    if (!x) return;
    if (x.dataset.x === "cancel") return el.remove();
    if (x.dataset.x === "delete") {
      if (!confirm(t("delEventQ"))) return;
      await del("events", ev.id);
      el.remove();
      return load();
    }
    const v = (n) => el.querySelector(`[name=${n}]`);
    const title = v("title").value.trim();
    if (!title || !v("date").value) return toast(t("needTitle"));
    const [y, m, dd] = v("date").value.split("-").map(Number);
    const allDay = v("allDay").checked;
    const at = (s) => { const [h, mi] = (s || "00:00").split(":").map(Number); return new Date(y, m - 1, dd, h, mi).getTime(); };
    const start = allDay ? new Date(y, m - 1, dd).getTime() : at(v("from").value);
    let end = allDay ? new Date(y, m - 1, dd + 1).getTime() : at(v("to").value);
    if (end <= start) end = start + 60 * MIN;
    const rec = Object.assign(ev || { id: "m" + Date.now().toString(36), source: "manual" }, { title, location: v("location").value.trim(), start, end, allDay });
    await putAll("events", [rec]);
    el.remove();
    S.cursor = startOfDay(start);
    await load();
  });
  if (!ev) setTimeout(() => el.querySelector("[name=title]").focus(), 50);
}

function lightbox(id) {
  const p = S.photos.find((x) => x.id === id);
  if (!p) return;
  const url = URL.createObjectURL(p.full);
  const day = startOfDay(p.time);
  const evs = S.events.filter((e) => e.start < day + DAY && e.end > day);
  const own = p.eventId && p.eventId !== "none" && S.events.find((e) => e.id === p.eventId);
  if (own && !evs.includes(own)) evs.unshift(own);
  const cur = p.eventId || "";
  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `<button class="pill close" data-x="close">${t("close")}</button>
    <div class="img">${p.type === "video" ? `<video src="${url}" controls playsinline autoplay></video>` : `<img src="${url}" alt="">`}</div>
    <div class="bar">
      <div class="meta">${p.type === "video" ? t("video") + " " + fmtDur(p.dur) + " · " : ""}${fmtDay(p.time, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}, ${fmtTime(p.time)}${p.timeFrom === "file" ? " " + t("fileDate") : ""}</div>
      <div class="line"><select>
        <option value="">${t("automatic")}${cur ? "" : " — " + esc((S.events.find((e) => e.id === S.match.get(p.id)) || { title: t("noEvent") }).title)}</option>
        ${evs.map((e) => `<option value="${esc(e.id)}"${cur === e.id ? " selected" : ""}>${esc(e.title)}</option>`).join("")}
        <option value="none"${cur === "none" ? " selected" : ""}>${t("notInEvent")}</option>
      </select><button class="pill" data-x="delete">${t("del")}</button></div>
    </div>`;
  const close = () => { URL.revokeObjectURL(url); el.remove(); };
  el.querySelector("select").addEventListener("change", async (e) => {
    p.eventId = e.target.value || undefined;
    if (!p.eventId) delete p.eventId;
    await putAll("photos", [p]);
    await load();
    close();
  });
  el.addEventListener("click", async (e) => {
    const x = e.target.closest("[data-x]");
    if (!x) return;
    if (x.dataset.x === "delete") {
      await del("photos", p.id);
      URL.revokeObjectURL(urls.get(p.id)); urls.delete(p.id);
      await load();
    }
    close();
  });
  document.body.appendChild(el);
}

// ---------- report ----------
// The product's paid feature: one or more events → a printable page (Save as PDF from the share / print dialog).
// On screen each photo has: in / out of the report, caption, move up / down. None of that prints.
function periodSheet() {
  const d = new Date(S.cursor);
  const a0 = new Date(d.getFullYear(), d.getMonth(), 1).getTime(), b0 = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime();
  const el = sheet(`<h2><img src="logo.png" alt="">${t("pickPeriod")}</h2>
    <div class="two"><div><label>${t("from")}</label><input type="date" name="a" value="${ymd(a0)}"></div>
      <div><label>${t("to")}</label><input type="date" name="b" value="${ymd(b0)}"></div></div>
    <label>${t("choose")}</label><div class="pick"></div>
    <div class="end"><button class="btn" data-x="cancel">${t("cancel")}</button><button class="btn primary" data-x="go">${t("create")}</button></div>`,
  (e, el) => {
    const x = e.target.closest("[data-x]");
    if (!x) return;
    if (x.dataset.x === "cancel") return el.remove();
    const ids = [...el.querySelectorAll(".pick input:checked")].map((i) => i.value);
    if (!ids.length) return toast(t("pickOne"));
    el.remove();
    openReport({ ids, from: fromYmd(el.querySelector("[name=a]").value), to: fromYmd(el.querySelector("[name=b]").value) });
  });
  const list = () => {
    const a = fromYmd(el.querySelector("[name=a]").value || ymd(a0)), b = fromYmd(el.querySelector("[name=b]").value || ymd(b0)) + DAY;
    const evs = S.events.filter((e) => e.start < b && e.end > a);
    el.querySelector(".pick").innerHTML = evs.length ? evs.map((e) => {
      const n = photosOf(e).length;
      return `<label class="pk"><input type="checkbox" value="${esc(e.id)}"${n || e.note ? " checked" : ""}>
        <span><b>${esc(e.title)}</b><small>${fmtDay(e.start, { day: "numeric", month: "short" })}${e.allDay ? "" : " " + fmtTime(e.start)} · ${cnt(n, "item")}</small></span></label>`;
    }).join("") : `<div class="sub">${t("noneInPeriod")}</div>`;
  };
  el.querySelectorAll("input[type=date]").forEach((i) => i.addEventListener("change", list));
  list();
}

function openReport(spec) {
  try { localStorage.setItem("pc:reports", +(localStorage.getItem("pc:reports") || 0) + 1); } catch (err) {}
  const el = document.createElement("div");
  el.className = "report";
  const big = new Map();
  const src = (p) => { if (!big.has(p.id)) big.set(p.id, URL.createObjectURL(p.type === "video" ? p.thumb : p.full)); return big.get(p.id); };
  const evs = () => spec.ids.map((id) => S.events.find((e) => e.id === id)).filter(Boolean).sort((a, b) => a.start - b.start);
  const longDay = (x) => fmtDay(x, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const when = (e) => e.allDay ? longDay(e.start) : longDay(e.start) + ", " + fmtTime(e.start) + " – " + fmtTime(e.end);
  const counts = (ph) => {
    const v = ph.filter((p) => p.type === "video").length;
    return `<b>${t("photos")}:</b> ${ph.length - v}${v ? ` · <b>${t("videos")}:</b> ${v}` : ""}`;
  };
  let capTimer;

  function section(e, single) {
    const ph = photosOf(e);
    const inc = ph.filter((p) => !p.skip);
    return `<section class="rev" data-ev="${esc(e.id)}">
      ${single ? `<h1>${esc(e.title)}</h1>` : `<h2>${esc(e.title)}</h2>`}
      <div class="facts"><b>${t("when")}:</b> ${when(e)}${e.location ? `<br><b>${t("where")}:</b> ${esc(e.location)}` : ""}<br>${counts(inc)}</div>
      <textarea class="notes" placeholder="${t("notePhR")}">${esc(e.note || "")}</textarea>
      <button class="mic" data-x="mic"><span class="dot"></span><span>${t("speakNote")}</span></button>
      <div class="pgrid">${ph.map((p, i) => `<figure class="${p.skip ? "off" : ""}" data-p="${p.id}">
        <div class="ph"><img src="${src(p)}" alt="">${p.type === "video" ? `<i>▶ ${t("video")} · ${fmtDur(p.dur)}</i>` : ""}</div>
        <figcaption>${fmtTime(p.time)}<span class="capt">${p.caption ? " · " + esc(p.caption) : ""}</span></figcaption>
        <div class="ctl">
          <label><input type="checkbox" data-x="inc"${p.skip ? "" : " checked"}> ${t("include")}</label>
          <button data-x="up" aria-label="${t("up")}"${i === 0 ? " disabled" : ""}>↑</button>
          <button data-x="down" aria-label="${t("down")}"${i === ph.length - 1 ? " disabled" : ""}>↓</button>
          <input class="cap" placeholder="${t("captionPh")}" value="${esc(p.caption || "")}">
        </div>
      </figure>`).join("")}</div>
    </section>`;
  }

  function draw() {
    const list = evs();
    const single = list.length === 1 && !spec.from;
    const b = getPref("brand", {});
    const by = getPref("by", b.by || "");
    const all = list.flatMap((e) => photosOf(e).filter((p) => !p.skip));
    const y = el.scrollTop;
    el.innerHTML = `<div class="tools"><button data-x="close">${t("back")}</button>
      <span><button data-x="brand" aria-label="${t("logoBtn")}">🏷</button><button data-x="feedback" aria-label="${t("feedback")}">✉</button><button class="print" data-x="print">${t("savePdf")}</button></span></div>
      <div class="page">
        <div class="brand">${b.logo ? `<img class="own" src="${b.logo}" alt="">` : `<img src="logo.png" alt="">`}
          <span>${esc(b.company || "JeMo Diary")}<small>${single ? t("rep") : t("repPeriod")}</small></span></div>
        ${single ? "" : `<h1>${t("repPeriod")}</h1>
          <div class="facts"><b>${t("period")}:</b> ${fmtDay(spec.from, { day: "numeric", month: "long", year: "numeric" })} – ${fmtDay(spec.to, { day: "numeric", month: "long", year: "numeric" })}<br>
          ${t("summary", { a: cnt(list.length, "activity"), p: cnt(all.length, "item") })}</div>`}
        ${list.map((e) => section(e, single)).join("")}
        <div class="signoff">
          <div><label>${t("preparedBy")}</label><input class="by" value="${esc(by)}" placeholder="${t("namePh")}"></div>
          <div><label>${t("signature")} <button data-x="clearsign" class="small">${t("clearSign")}</button></label>
            <canvas class="sign" width="600" height="200"></canvas><div class="signhint">${t("signHere")}</div></div>
        </div>
        <footer><img src="logo.png" alt="">${t("madeWith")} · ${fmtDay(Date.now(), { day: "numeric", month: "short", year: "numeric" })}</footer>
      </div>`;
    el.scrollTop = y;
    el.querySelectorAll(".rev").forEach((sec) => {
      const e = S.events.find((x) => x.id === sec.dataset.ev);
      const ta = sec.querySelector(".notes");
      ta.addEventListener("input", () => saveNote(e, ta.value));
    });
    el.querySelectorAll(".cap").forEach((inp) => inp.addEventListener("input", () => {
      const p = S.photos.find((x) => x.id === inp.closest("figure").dataset.p);
      p.caption = inp.value.trim();
      if (!p.caption) delete p.caption;
      const c = inp.closest("figure").querySelector(".capt");
      c.textContent = p.caption ? " · " + p.caption : "";
      clearTimeout(capTimer);
      capTimer = setTimeout(() => putAll("photos", [p]), 400);
    }));
    el.querySelector(".by").addEventListener("input", (e) => setPref("by", e.target.value));
    signPad(el.querySelector(".sign"));
  }

  el.addEventListener("change", async (ev) => {
    if (ev.target.dataset.x !== "inc") return;
    const p = S.photos.find((x) => x.id === ev.target.closest("figure").dataset.p);
    if (ev.target.checked) delete p.skip; else p.skip = true;
    await putAll("photos", [p]);
    draw();
  });
  el.addEventListener("click", async (ev) => {
    const x = ev.target.closest("[data-x]");
    if (!x || x.dataset.x === "inc") return;
    const k = x.dataset.x;
    if (k === "mic") return dictate(x.closest(".rev").querySelector(".notes"), x);
    if (k === "print") { stopDictation(); return window.print(); }
    if (k === "feedback") return feedback();
    if (k === "brand") return brandSheet(draw);
    if (k === "clearsign") { setPref("sign", null); return draw(); }
    if (k === "up" || k === "down") {
      const e = S.events.find((y) => y.id === x.closest(".rev").dataset.ev);
      const ids = photosOf(e).map((p) => p.id);
      const i = ids.indexOf(x.closest("figure").dataset.p), j = k === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      e.order = ids;
      await putAll("events", [e]);
      return draw();
    }
    if (k === "close") {
      stopDictation();
      big.forEach((u) => URL.revokeObjectURL(u));
      el.remove();
      render();
    }
  });
  document.body.appendChild(el);
  draw();
}

// Finger signature, kept for the next report.
function signPad(c) {
  const g = c.getContext("2d");
  g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#1a1a2e";
  const saved = getPref("sign", null);
  if (saved) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0); im.src = saved; c.classList.add("signed"); }
  let last = null;
  const pt = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
  c.addEventListener("pointerdown", (e) => { last = pt(e); c.setPointerCapture(e.pointerId); c.classList.add("signed"); e.preventDefault(); });
  c.addEventListener("pointermove", (e) => {
    if (!last) return;
    const p = pt(e);
    g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke();
    last = p;
  });
  const up = () => { if (last) { last = null; setPref("sign", c.toDataURL("image/png")); } };
  c.addEventListener("pointerup", up);
  c.addEventListener("pointercancel", up);
}

function brandSheet(after) {
  const b = getPref("brand", {});
  const el = sheet(`<h2><img src="logo.png" alt="">${t("brand")}</h2>
    <label>${t("company")}</label><input type="text" name="company" placeholder="${t("companyPh")}" value="${esc(b.company || "")}">
    <label>${t("byDefault")}</label><input type="text" name="by" placeholder="${t("namePh")}" value="${esc(getPref("by", ""))}">
    <label>${t("logo")}</label>
    <div class="logo-row">${b.logo ? `<img src="${b.logo}" alt="">` : ""}
      <button class="btn" data-x="pick">${b.logo ? t("changeLogo") : t("addLogo")}</button>
      ${b.logo ? `<button class="btn" data-x="rm">${t("removeLogo")}</button>` : ""}</div>
    <div class="end"><button class="btn" data-x="cancel">${t("cancel")}</button><button class="btn primary" data-x="save">${t("save")}</button></div>`,
  async (e, el) => {
    const x = e.target.closest("[data-x]");
    if (!x) return;
    if (x.dataset.x === "pick") { pickLogoFor = (url) => { b.logo = url; setPref("brand", b); el.remove(); brandSheet(after); }; return $("#pickLogo").click(); }
    if (x.dataset.x === "rm") { delete b.logo; setPref("brand", b); el.remove(); return brandSheet(after); }
    if (x.dataset.x === "save") {
      b.company = el.querySelector("[name=company]").value.trim();
      setPref("brand", b);
      setPref("by", el.querySelector("[name=by]").value.trim());
      after && after();
    }
    el.remove();
  });
}
let pickLogoFor = null;

// ---------- notes ----------
let noteTimer;
function saveNote(ev, text) {
  ev.note = text.trim();
  if (!ev.note) delete ev.note;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => putAll("events", [ev]), 400);
}

function noteSheet(evId) {
  const ev = S.events.find((x) => x.id === evId);
  if (!ev) return;
  sheet(`<h2><img src="logo.png" alt="">${t("note")}</h2>
    <div class="sub">${esc(ev.title)}</div>
    <textarea placeholder="${t("notePh")}">${esc(ev.note || "")}</textarea>
    <button class="mic" data-x="mic"><span class="dot"></span><span>${t("speak")}</span></button>
    <div class="end"><button class="btn" data-x="cancel">${t("cancel")}</button><button class="btn primary" data-x="save">${t("save")}</button></div>`,
  async (e, el) => {
    const x = e.target.closest("[data-x]");
    if (!x) return;
    const ta = el.querySelector("textarea");
    if (x.dataset.x === "mic") return dictate(ta, x);
    stopDictation();
    if (x.dataset.x === "save") {
      clearTimeout(noteTimer);
      ev.note = ta.value.trim();
      if (!ev.note) delete ev.note;
      await putAll("events", [ev]);
      render();
    }
    el.remove();
  });
}

// Dictation. On iPhone/iPad the web speech API stays silent in home-screen apps ("Listening…", no text), so there
// the button opens the keyboard and points to its microphone, which writes live and has its own stop.
// Elsewhere: the browser's speech recognition, one short session per phrase, restarted until you tap stop
// (continuous mode duplicates text on Android Chrome). If the microphone never starts, fall back to the keyboard.
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let dict = null;
function keyboardHint(ta) {
  ta.focus();
  let h = ta.previousElementSibling;
  if (!h || !h.classList.contains("hint")) {
    h = document.createElement("div");
    h.className = "hint";
    ta.before(h);
    ta.addEventListener("blur", () => h.remove(), { once: true });
  }
  h.innerHTML = t("kbHint");
}
function micOff(btn) { btn.classList.remove("on"); btn.lastElementChild.textContent = btn.dataset.label || t("speak"); }
function stopDictation() {
  const d = dict;
  dict = null;
  if (d && d.rec) {
    const r = d.rec;
    r.onresult = r.onend = r.onerror = r.onaudiostart = null; // nothing may write after stop
    try { r.abort(); } catch (e) {}
    d.ta.dispatchEvent(new Event("input"));
  }
  document.querySelectorAll(".mic.on").forEach(micOff);
}
function dictate(ta, btn) {
  if (dict) return stopDictation();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const keyboard = () => keyboardHint(ta);
  if (IOS || !SR) return keyboard();
  const old = ta.previousElementSibling;
  if (old && old.classList.contains("hint")) old.remove();
  btn.dataset.label = btn.lastElementChild.textContent;
  btn.classList.add("on");
  btn.lastElementChild.textContent = t("listening");
  dict = { ta, btn, base: ta.value, rec: null, audio: false };
  listen(SR, dict, keyboard);
  const d = dict;
  setTimeout(() => { if (dict === d && !d.audio) { stopDictation(); keyboard(); } }, 4000);
}
function listen(SR, d, keyboard) {
  const rec = new SR();
  d.rec = rec;
  rec.lang = LANG === "ro" ? "ro-RO" : navigator.language || "en-US";
  rec.continuous = false;
  rec.interimResults = true;
  rec.onaudiostart = () => { d.audio = true; };
  rec.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    text = text.trim();
    if (!text) return;
    d.ta.value = d.base + (d.base && !/\s$/.test(d.base) ? " " : "") + text;
    d.ta.scrollTop = d.ta.scrollHeight;
    d.ta.dispatchEvent(new Event("input"));
  };
  rec.onerror = (e) => {
    if (e.error === "no-speech" || e.error === "aborted") return; // onend restarts
    stopDictation();
    if (e.error === "not-allowed" || e.error === "service-not-allowed") keyboard();
    else toast(t("dictStop") + " (" + e.error + ")");
  };
  rec.onend = () => {
    if (dict !== d) return;
    d.base = d.ta.value;
    listen(SR, d, keyboard);
  };
  try { rec.start(); } catch (err) { stopDictation(); keyboard(); }
}

// ---------- search ----------
function searchSheet() {
  const el = sheet(`<h2><img src="logo.png" alt="">${t("search")}</h2>
    <input type="search" name="q" placeholder="${t("searchPh")}" autocomplete="off">
    <div class="results"></div>`,
  (e, el) => {
    const r = e.target.closest("[data-go]");
    if (!r) return;
    S.cursor = startOfDay(+r.dataset.go); S.view = "day";
    el.remove();
    render();
  });
  const q = el.querySelector("[name=q]"), out = el.querySelector(".results");
  const run = () => {
    const words = norm(q.value).split(/\s+/).filter(Boolean);
    if (!words.length) { out.innerHTML = ""; return; }
    const hits = S.events.filter((e) => {
      const hay = norm([e.title, e.location, e.note, ...photosOf(e).map((p) => p.caption)].join(" "));
      return words.every((w) => hay.includes(w));
    }).sort((a, b) => b.start - a.start).slice(0, 60);
    out.innerHTML = hits.length ? hits.map((e) => {
      const ph = photosOf(e);
      const n = norm(e.note), i = words.length ? n.indexOf(words[0]) : -1;
      const snip = i >= 0 ? (i > 20 ? "…" : "") + e.note.slice(Math.max(0, i - 20), i + 60) + "…" : e.location || "";
      return `<button class="res" data-go="${e.start}">${ph[0] ? th(ph[0]) : `<span class="th none"></span>`}
        <span><b>${esc(e.title)}</b><small>${fmtDay(e.start, { day: "numeric", month: "short", year: "numeric" })}${snip ? " · " + esc(snip) : ""}</small></span></button>`;
    }).join("") : `<div class="sub">${t("noResults")}</div>`;
  };
  q.addEventListener("input", run);
  setTimeout(() => q.focus(), 50);
}

// ---------- backup ----------
// One file: "JEMODIA1", 4 bytes JSON length, JSON (events + photo records), then the image/video bytes.
// Nothing is base64-encoded, so even videos don't blow up memory.
const MAGIC = "JEMODIA1";
async function backup() {
  const evs = await getAll("events"), phs = await getAll("photos");
  const parts = [], meta = { app: "jemo-diary", v: 1, events: evs, photos: [] };
  let off = 0;
  for (const p of phs) {
    const rec = Object.assign({}, p);
    for (const k of ["thumb", "full"]) {
      const b = p[k];
      rec[k] = { off, len: b.size, type: b.type || "" };
      parts.push(b);
      off += b.size;
    }
    meta.photos.push(rec);
  }
  const json = new TextEncoder().encode(JSON.stringify(meta));
  const head = new Uint8Array(12);
  head.set(new TextEncoder().encode(MAGIC));
  new DataView(head.buffer).setUint32(8, json.length);
  const name = "JeMo-Diary-" + ymd(Date.now()) + ".jemo";
  const file = new File([head, json, ...parts], name, { type: "application/octet-stream" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return toast(t("backupDone")); }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 20000);
  toast(t("backupDone"));
}

async function restore(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (new TextDecoder().decode(head.slice(0, 8)) !== MAGIC) return toast(t("notBackup"));
  const len = new DataView(head.buffer).getUint32(8);
  let meta;
  try { meta = JSON.parse(await file.slice(12, 12 + len).text()); } catch (e) { return toast(t("notBackup")); }
  const base = 12 + len;
  const photos = [];
  for (const rec of meta.photos) {
    for (const k of ["thumb", "full"]) {
      const r = rec[k];
      rec[k] = new Blob([await file.slice(base + r.off, base + r.off + r.len).arrayBuffer()], { type: r.type });
    }
    photos.push(rec);
    if (photos.length >= 20) await putAll("photos", photos.splice(0));
  }
  if (photos.length) await putAll("photos", photos);
  await putAll("events", meta.events);
  await load();
  toast(t("restoreDone", { e: cnt(meta.events.length, "event"), p: cnt(meta.photos.length, "item") }));
}

// Phase-1 testing: an email with the questions that decide whether to build the native app.
function feedback() {
  let reports = 0;
  try { reports = +(localStorage.getItem("pc:reports") || 0); } catch (e) {}
  const mine = (x) => !String(x.id).startsWith("demo:");
  const body = [...t("fb").flatMap((q) => [q, ""]), "", "---",
    t("fbStats", { e: cnt(S.events.filter(mine).length, "event"), p: cnt(S.photos.filter(mine).length, "item"), r: reports }),
    navigator.userAgent].join("\n");
  location.href = "mailto:anastasescujessica@gmail.com?subject=" + encodeURIComponent(t("fbSubject")) + "&body=" + encodeURIComponent(body);
}

// ---------- demo ----------
async function demo() {
  const week = startOfWeek(Date.now());
  const at = (d, h, m = 0) => addDays(week, d) + (h * 60 + m) * MIN;
  const slots = [[at(1, 9), at(1, 13)], [at(1, 18), at(1, 20)], [at(2, 11), at(2, 12, 30)], [at(3, 14), at(3, 16)], [at(5, 11), at(5, 13)]];
  const evs = slots.map(([s, e], i) => ({ id: "demo:e" + i, title: t("demo")[i], location: t("demoPlaces")[i], start: s, end: e, allDay: false, source: "demo" }));
  const shots = [[0, 9, 20], [0, 10, 5], [0, 10, 40], [0, 11, 15], [0, 12, 50], [0, 13, 10],
    [1, 18, 30], [1, 19, 5], [2, 11, 10], [2, 11, 35], [2, 12, 20], [3, 14, 30], [3, 15, 40],
    [4, 12, 0], [4, 12, 25], [4, 12, 40], [2, 16, 45]];
  const photos = [];
  for (const [k, [ei, h, m]] of shots.entries()) {
    const ev = evs[ei];
    const day = Math.floor((ev.start - week) / DAY);
    const time = at(day, h, m);
    const blob = await demoImage(ev.title, fmtTime(time), k);
    photos.push({ id: "demo:p" + k, name: "demo" + k + ".jpg", size: k, time, timeFrom: "exif", thumb: blob, full: blob });
  }
  await putAll("events", evs);
  await putAll("photos", photos);
  S.cursor = addDays(week, 1);
  S.view = "day";
  await load();
}

function demoImage(title, time, k) {
  const c = document.createElement("canvas");
  c.width = 800; c.height = 600;
  const g = c.getContext("2d");
  const hue = (k * 47) % 360;
  const gr = g.createLinearGradient(0, 0, 800, 600);
  gr.addColorStop(0, `hsl(${hue},55%,45%)`); gr.addColorStop(1, `hsl(${(hue + 60) % 360},60%,25%)`);
  g.fillStyle = gr; g.fillRect(0, 0, 800, 600);
  g.fillStyle = "rgba(255,255,255,.92)"; g.textAlign = "center";
  g.font = "bold 44px sans-serif"; g.fillText(title.slice(0, 26), 400, 290);
  g.font = "36px sans-serif"; g.fillText(time, 400, 350);
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.8));
}

// ---------- events ----------
let pickMode = null; // what the photo picker is for: null (add), an event id, or "events"

async function act(a) {
  if (a === "photos") { pickMode = null; $("#pickPhotos").click(); }
  else if (a === "fromPhotos") { pickMode = "events"; $("#pickPhotos").click(); }
  else if (a === "ics") $("#pickIcs").click();
  else if (a === "event") eventForm();
  else if (a === "period") periodSheet();
  else if (a === "brand") brandSheet();
  else if (a === "backup") backup();
  else if (a === "restore") $("#pickRestore").click();
  else if (a === "demo") await demo();
  else if (a === "menu") menu();
  else if (a === "search") searchSheet();
  else if (a === "feedback") feedback();
  else if (a === "reload") reloadApp();
  else if (a === "lang") { try { localStorage.setItem("pc:lang", LANG === "ro" ? "en" : "ro"); } catch (e) {} location.reload(); }
  else if (a === "clear") {
    if (!confirm(t("clearQ"))) return;
    await clear("events"); await clear("photos");
    urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear();
    await load();
  } else if (a === "today") { S.cursor = startOfDay(Date.now()); render(); }
  else if (a === "prev" || a === "next") {
    const s = a === "next" ? 1 : -1;
    if (S.view === "month") { const d = new Date(S.cursor); S.cursor = new Date(d.getFullYear(), d.getMonth() + s, 1).getTime(); }
    else S.cursor = addDays(S.cursor, S.view === "week" ? 7 * s : s);
    render();
  }
}

document.addEventListener("click", async (e) => {
  const x = e.target.closest("[data-act],[data-view],[data-day],[data-photo],[data-report],[data-edit],[data-note],[data-addto]");
  if (!x || x.closest(".sheet,.lightbox,.report")) return;
  if (x.dataset.act) return act(x.dataset.act);
  if (x.dataset.view) {
    S.view = x.dataset.view;
    try { localStorage.setItem("pc:view", S.view); } catch (err) {}
    return render();
  }
  if (x.dataset.photo) return lightbox(x.dataset.photo);
  if (x.dataset.report) return openReport({ ids: [x.dataset.report] });
  if (x.dataset.note) return noteSheet(x.dataset.note);
  if (x.dataset.edit) return eventForm(S.events.find((ev) => ev.id === x.dataset.edit));
  if (x.dataset.addto) { pickMode = x.dataset.addto; return $("#pickPhotos").click(); }
  if (x.dataset.day) { S.cursor = +x.dataset.day; S.view = "day"; render(); }
});

$("#pickPhotos").addEventListener("change", (e) => {
  const f = [...e.target.files];
  e.target.value = "";
  const mode = pickMode;
  pickMode = null;
  if (!f.length) return;
  if (mode === "events") photosToEvents(f);
  else addPhotos(f, mode);
});
$("#pickIcs").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importIcs(f); });
$("#pickRestore").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) restore(f); });
$("#pickLogo").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f || !pickLogoFor) return;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    pickLogoFor(c.toDataURL("image/png"));
  } catch (err) { toast(t("unreadable", { n: 1 })); }
  pickLogoFor = null;
});

let toastTimer;
function toast(msg) {
  let el = $(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 4000);
}

// ---------- updates ----------
// version.json changes with every publish (a git hook writes it). The version seen at start is the one running;
// a different one later means a new version is out, so we offer a reload. An iPhone home-screen app can stay open
// for days, hence the check on return and every 5 minutes.
let loadedVersion = null;
async function checkVersion() {
  try {
    const v = (await (await fetch("version.json", { cache: "no-store" })).json()).v;
    if (!loadedVersion) loadedVersion = v;
    else if (v !== loadedVersion) showUpdate();
  } catch (e) {}
}
function showUpdate() {
  if ($(".update")) return;
  const b = document.createElement("button");
  b.className = "update";
  b.innerHTML = `<img src="logo.png" alt=""><span>${t("newVersion")}<small>${t("newVersionS")}</small></span><b>${t("reload")}</b>`;
  b.addEventListener("click", reloadApp);
  document.body.appendChild(b);
}
async function reloadApp() {
  try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch (e) {}
  location.reload();
}
checkVersion();
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkVersion(); });
setInterval(checkVersion, 5 * 60 * 1000);

staticText();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
load().catch((e) => { $("#main").innerHTML = `<div class="empty">${t("storageErr", { e: esc(e.message || e) })}</div>`; });
