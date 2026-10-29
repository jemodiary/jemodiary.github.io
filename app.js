// JeMo Diary — web MVP. Everything stays on the device (IndexedDB); nothing is uploaded.
const { parseIcs, exifTime, matchPhotos, dayKey, MIN, DAY } = window.Core;

const S = { view: "day", cursor: startOfDay(Date.now()), events: [], photos: [], match: new Map() };
try { S.view = localStorage.getItem("pc:view") || "day"; } catch (e) {}

const COLORS = ["#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#f87171", "#2dd4bf", "#c084fc"];
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const loc = undefined; // device language for dates

function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function addDays(t, n) { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }
function startOfWeek(t) { const d = new Date(startOfDay(t)); return addDays(d.getTime(), -((d.getDay() + 6) % 7)); }
function color(ev) { let h = 0; for (const c of ev.title) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
function fmtTime(t) { return new Date(t).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }); }
function fmtDay(t, o) { return new Date(t).toLocaleDateString(loc, o); }

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
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => ok(out && "result" in out ? out.result : undefined);
    t.onerror = () => bad(t.error);
  });
}
const getAll = (store) => tx(store, "readonly", (s) => s.getAll());
const putAll = (store, items) => tx(store, "readwrite", (s) => items.forEach((i) => s.put(i)));
const del = (store, id) => tx(store, "readwrite", (s) => s.delete(id));
const clear = (store) => tx(store, "readwrite", (s) => s.clear());

// Object URLs for thumbnails, made once per photo.
const urls = new Map();
function thumb(ph) {
  if (!urls.has(ph.id)) urls.set(ph.id, URL.createObjectURL(ph.thumb));
  return urls.get(ph.id);
}

async function load() {
  [S.events, S.photos] = await Promise.all([getAll("events"), getAll("photos")]);
  S.events.sort((a, b) => a.start - b.start);
  S.photos.sort((a, b) => a.time - b.time);
  S.match = matchPhotos(S.events, S.photos);
  render();
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
function photosOf(ev) { return S.photos.filter((p) => S.match.get(p.id) === ev.id); }

// ---------- render ----------
function render() {
  document.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("on", b.dataset.view === S.view));
  const t = S.cursor;
  $("#title").textContent =
    S.view === "month" ? fmtDay(t, { month: "long", year: "numeric" })
    : S.view === "week" ? weekTitle(t)
    : fmtDay(t, { month: "long", year: "numeric" });
  const main = $("#main");
  if (!S.events.length && !S.photos.length) { main.innerHTML = emptyHtml(); return; }
  main.innerHTML = S.view === "month" ? monthHtml(t) : S.view === "week" ? weekHtml(t) : dayHtml(t);
}

function weekTitle(t) {
  const a = startOfWeek(t), b = addDays(a, 6);
  return fmtDay(a, { day: "numeric", month: "short" }) + " – " + fmtDay(b, { day: "numeric", month: "short" });
}

function emptyHtml() {
  return `<div class="empty">
    <img class="hero" src="logo.png" alt="">
    <div class="name">JeMo Diary</div>
    <div class="big">Your calendar, with the photos you took there</div>
    Import your calendar (.ics) and add photos — each photo lands under the event it was taken at.<br><br>
    <button class="btn primary" data-act="ics">Import calendar</button>
    <button class="btn" data-act="photos">Add photos</button><br>
    <button class="btn" data-act="demo" style="margin-top:14px">Try with demo data</button>
  </div>`;
}

function monthHtml(t) {
  const d = new Date(t);
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
      ${phs.length ? `<div class="thumbs">${phs.slice(0, 4).map((p) => `<img src="${thumb(p)}" alt="">`).join("")}</div>` : ""}
      ${phs.length > 4 ? `<div class="more">+${phs.length - 4}</div>` : ""}
    </button>`;
  }
  return `<div class="dow">${dows.map((x) => `<span>${x}</span>`).join("")}</div><div class="month">${cells}</div>`;
}

function weekHtml(t) {
  const start = startOfWeek(t);
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
          return `<div class="wev"><div class="t" style="color:${color(e)}"><i>${e.allDay ? "all day" : fmtTime(e.start)}</i>${esc(e.title)}</div>
            ${ph.length ? `<div class="strip">${ph.slice(0, 6).map((p) => `<img src="${thumb(p)}" alt="">`).join("")}</div>` : ""}</div>`;
        }).join("")}
        ${loose.length ? `<div class="wev"><div class="t"><i>other</i>${loose.length} photo${loose.length > 1 ? "s" : ""}</div><div class="strip">${loose.slice(0, 6).map((p) => `<img src="${thumb(p)}" alt="">`).join("")}</div></div>` : ""}
        ${!evs.length && !loose.length ? `<div class="none">—</div>` : ""}
      </div></button>`;
  }
  return out;
}

function dayHtml(t) {
  const start = startOfWeek(t);
  const today = startOfDay(Date.now());
  const bar = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    return `<button data-day="${day}" class="${day === t ? "sel" : ""}${day === today ? " today" : ""}">
      <small>${fmtDay(day, { weekday: "narrow" })}</small><span>${new Date(day).getDate()}</span></button>`;
  }).join("");
  const evs = eventsOn(t).sort((a, b) => (b.allDay - a.allDay) || a.start - b.start);
  const loose = photosOn(t).filter((p) => !S.match.get(p.id));
  let list = evs.map((e) => {
    const ph = photosOf(e);
    return `<div class="ev">
      <div class="time">${e.allDay ? "all day" : fmtTime(e.start)}</div>
      <div>
        <h3 style="color:${color(e)}">${esc(e.title)}</h3>
        ${e.location || !e.allDay ? `<div class="loc">${e.allDay ? "" : fmtTime(e.start) + " – " + fmtTime(e.end)}${e.location ? " · " + esc(e.location) : ""}</div>` : ""}
        <div class="acts">
          ${ph.length ? `<button class="rep" data-report="${esc(e.id)}">Report · ${ph.length} photo${ph.length > 1 ? "s" : ""}</button>` : ""}
          <button data-addto="${esc(e.id)}">📷 Add photos</button>
          <button data-note="${esc(e.id)}">${e.note ? "Edit note" : "🎙 Add note"}</button>
          <button data-delev="${esc(e.id)}">Remove</button>
        </div>
        ${e.note ? `<div class="note">${esc(e.note)}</div>` : ""}
        ${ph.length ? `<div class="grid3">${ph.map((p) => `<button data-photo="${p.id}"><img src="${thumb(p)}" alt="" loading="lazy"></button>`).join("")}</div>`
          : `<button class="nophotos" data-addto="${esc(e.id)}">No photos yet · <b>📷 add them here</b></button>`}
      </div></div>`;
  }).join("");
  if (loose.length) {
    list += `<div class="ev"><div class="time"></div><div><h3>Other photos</h3><div class="loc">Taken outside any event</div>
      <div class="grid3">${loose.map((p) => `<button data-photo="${p.id}"><img src="${thumb(p)}" alt="" loading="lazy"></button>`).join("")}</div></div></div>`;
  }
  if (!list) list = `<div class="empty"><img class="faint" src="logo.png" alt="">Nothing on this day.</div>`;
  return `<div class="daybar">${bar}</div>
    <div class="daytitle">${fmtDay(t, { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</div>${list}`;
}

// ---------- adding things ----------
// evId: photos chosen from an event's own button go under that event, whatever time they were taken.
async function addPhotos(files, evId) {
  const known = new Map(S.photos.map((p) => [p.name + "|" + p.size, p]));
  const out = [], moved = [];
  let skipped = 0, noDate = 0;
  for (const f of files) {
    const had = known.get(f.name + "|" + f.size);
    if (had) { if (evId && had.eventId !== evId) { had.eventId = evId; moved.push(had); } continue; }
    let time = null;
    try { time = exifTime(await f.slice(0, 256 * 1024).arrayBuffer()); } catch (e) {}
    const fromFile = time == null;
    if (fromFile) { time = f.lastModified; noDate++; }
    let bmp;
    try { bmp = await createImageBitmap(f); } catch (e) { skipped++; continue; }
    out.push({
      id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: f.name, size: f.size, time, timeFrom: fromFile ? "file" : "exif",
      thumb: await resize(bmp, 360), full: await resize(bmp, 1600),
      ...(evId ? { eventId: evId } : {}),
    });
    bmp.close && bmp.close();
  }
  if (out.length || moved.length) await putAll("photos", [...out, ...moved]);
  await load();
  const ev = evId && S.events.find((e) => e.id === evId);
  if (ev) { S.cursor = startOfDay(ev.start); S.view = "day"; render(); }
  else if (out.length) S.cursor = startOfDay(out[0].time), render();
  const n = out.length + moved.length;
  if (ev) return toast(`${n} photo${n === 1 ? "" : "s"} added to ${ev.title}` + (skipped ? ` · ${skipped} could not be read` : ""));
  toast(`${out.length} photo${out.length === 1 ? "" : "s"} added` +
    (noDate ? ` · ${noDate} without a camera date (used the file date)` : "") +
    (skipped ? ` · ${skipped} could not be read` : ""));
}

function resize(bmp, max) {
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
}

async function importIcs(file) {
  const evs = parseIcs(await file.text());
  if (!evs.length) return toast("No events found in that file");
  const notes = new Map(S.events.filter((e) => e.note).map((e) => [e.id, e.note]));
  for (const e of evs) if (notes.has(e.id)) e.note = notes.get(e.id);
  await putAll("events", evs);
  await load();
  toast(`${evs.length} event${evs.length === 1 ? "" : "s"} imported`);
}

// ---------- sheets ----------
function sheet(html, onClick) {
  const el = document.createElement("div");
  el.className = "scrim";
  el.innerHTML = `<div class="sheet">${html}</div>`;
  el.addEventListener("click", (e) => {
    if (e.target === el) return el.remove();
    onClick && onClick(e, el);
  });
  document.body.appendChild(el);
  return el;
}

function menu() {
  sheet(`<h2><img src="logo.png" alt="">Add</h2>
    <button class="row" data-m="photos"><span class="ic">▦</span><span>Add photos<small>Each one is placed by the time it was taken</small></span></button>
    <button class="row" data-m="ics"><span class="ic">⇩</span><span>Import calendar (.ics)<small>Export from Google, Apple or Outlook Calendar</small></span></button>
    <button class="row" data-m="event"><span class="ic">＋</span><span>New event</span></button>
    <button class="row" data-m="demo"><span class="ic">★</span><span>Demo data<small>A sample week to try it out</small></span></button>
    <button class="row" data-m="feedback"><span class="ic">✉</span><span>Send feedback<small>Tell us what worked and what didn't</small></span></button>
    <button class="row danger" data-m="clear"><span class="ic">✕</span><span>Delete everything<small>Removes all events and photos from this device</small></span></button>`,
  (e, el) => {
    const b = e.target.closest("[data-m]");
    if (!b) return;
    el.remove();
    act(b.dataset.m);
  });
}

function newEvent() {
  const d = new Date(S.cursor);
  const ds = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const el = sheet(`<h2><img src="logo.png" alt="">New event</h2>
    <label>Title</label><input type="text" name="title" placeholder="e.g. Smart City Conference">
    <label>Place</label><input type="text" name="location" placeholder="optional">
    <label>Date</label><input type="date" name="date" value="${ds}">
    <div class="two"><div><label>Starts</label><input type="time" name="from" value="09:00"></div>
      <div><label>Ends</label><input type="time" name="to" value="10:00"></div></div>
    <label class="chk"><input type="checkbox" name="allDay"> All day</label>
    <div class="end"><button class="btn" data-x="cancel">Cancel</button><button class="btn primary" data-x="save">Save</button></div>`,
  async (e, el) => {
    const x = e.target.closest("[data-x]");
    if (!x) return;
    if (x.dataset.x === "cancel") return el.remove();
    const v = (n) => el.querySelector(`[name=${n}]`);
    const title = v("title").value.trim();
    if (!title || !v("date").value) return toast("Add a title and a date");
    const [y, m, dd] = v("date").value.split("-").map(Number);
    const allDay = v("allDay").checked;
    const at = (hm) => { const [h, mi] = (hm || "00:00").split(":").map(Number); return new Date(y, m - 1, dd, h, mi).getTime(); };
    let start = allDay ? new Date(y, m - 1, dd).getTime() : at(v("from").value);
    let end = allDay ? start + DAY : at(v("to").value);
    if (end <= start) end = start + 60 * MIN;
    await putAll("events", [{ id: "m" + Date.now().toString(36), title, location: v("location").value.trim(), start, end, allDay, source: "manual" }]);
    el.remove();
    S.cursor = startOfDay(start);
    await load();
  });
  setTimeout(() => el.querySelector("[name=title]").focus(), 50);
}

function lightbox(id) {
  const p = S.photos.find((x) => x.id === id);
  if (!p) return;
  const url = URL.createObjectURL(p.full);
  const day = startOfDay(p.time);
  const evs = S.events.filter((e) => e.start < day + DAY && e.end > day);
  const cur = p.eventId || "";
  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `<button class="pill close" data-x="close">Close</button>
    <div class="img"><img src="${url}" alt=""></div>
    <div class="bar">
      <div class="meta">${fmtDay(p.time, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}, ${fmtTime(p.time)}${p.timeFrom === "file" ? " (file date — no camera date)" : ""}</div>
      <div class="line"><select>
        <option value="">Automatic${cur ? "" : " — " + esc((S.events.find((e) => e.id === S.match.get(p.id)) || { title: "no event" }).title)}</option>
        ${evs.map((e) => `<option value="${esc(e.id)}"${cur === e.id ? " selected" : ""}>${esc(e.title)}</option>`).join("")}
        <option value="none"${cur === "none" ? " selected" : ""}>Not part of any event</option>
      </select><button class="pill" data-x="delete">Delete</button></div>
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

// The report is the product's paid feature: one event → a printable page (Save as PDF from the share / print dialog).
function report(evId) {
  try { localStorage.setItem("pc:reports", +(localStorage.getItem("pc:reports") || 0) + 1); } catch (err) {}
  const e = S.events.find((x) => x.id === evId);
  const ph = photosOf(e);
  const full = ph.map((p) => URL.createObjectURL(p.full));
  const when = e.allDay
    ? fmtDay(e.start, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : fmtDay(e.start, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ", " + fmtTime(e.start) + " – " + fmtTime(e.end);
  const el = document.createElement("div");
  el.className = "report";
  el.innerHTML = `<div class="tools"><button data-x="close">‹ Back</button><span><button data-x="feedback">Feedback</button> <button class="print" data-x="print">Save PDF</button></span></div>
    <div class="page">
      <div class="brand"><img src="logo.png" alt=""><span>JeMo Diary<small>Activity report</small></span></div>
      <h1>${esc(e.title)}</h1>
      <div class="facts"><b>When:</b> ${when}${e.location ? `<br><b>Where:</b> ${esc(e.location)}` : ""}<br><b>Photos:</b> ${ph.length}</div>
      <textarea class="notes" placeholder="Add a note (what happened, who attended)…">${esc(e.note || "")}</textarea>
      <button class="mic" data-x="mic"><span class="dot"></span><span>Speak the note</span></button>
      <div class="pgrid">${ph.map((p, i) => `<figure><img src="${full[i]}" alt=""><figcaption>${fmtTime(p.time)}</figcaption></figure>`).join("")}</div>
      <footer><img src="logo.png" alt="">Made with JeMo Diary · ${fmtDay(Date.now(), { day: "numeric", month: "short", year: "numeric" })}</footer>
    </div>`;
  const ta = el.querySelector(".notes");
  ta.addEventListener("input", () => saveNote(e, ta.value));
  el.addEventListener("click", (ev) => {
    const x = ev.target.closest("[data-x]");
    if (!x) return;
    if (x.dataset.x === "mic") return dictate(ta, x);
    if (x.dataset.x === "print") return window.print();
    if (x.dataset.x === "feedback") return feedback();
    stopDictation();
    full.forEach((u) => URL.revokeObjectURL(u));
    el.remove();
    render();
  });
  document.body.appendChild(el);
}

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
  const el = sheet(`<h2><img src="logo.png" alt="">Note</h2>
    <div style="color:var(--muted);margin:-6px 0 10px">${esc(ev.title)}</div>
    <textarea placeholder="What happened, who was there, what was decided…">${esc(ev.note || "")}</textarea>
    <button class="mic" data-x="mic"><span class="dot"></span><span>Speak</span></button>
    <div class="end"><button class="btn" data-x="cancel">Cancel</button><button class="btn primary" data-x="save">Save</button></div>`,
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
  h.innerHTML = "🎙 Tap the <b>microphone on your keyboard</b> (bottom right) and speak — the text appears as you talk. Tap it again to stop.";
}
function micOff(btn) { btn.classList.remove("on"); btn.lastElementChild.textContent = btn.dataset.label || "Speak"; }
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
  btn.lastElementChild.textContent = "Listening… tap to stop";
  dict = { ta, btn, base: ta.value, rec: null, audio: false };
  listen(SR, dict, keyboard);
  const d = dict;
  setTimeout(() => { if (dict === d && !d.audio) { stopDictation(); keyboard(); } }, 4000);
}
function listen(SR, d, keyboard) {
  const rec = new SR();
  d.rec = rec;
  rec.lang = navigator.language || "ro-RO";
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
    else toast("Dictation stopped (" + e.error + ")");
  };
  rec.onend = () => {
    if (dict !== d) return;
    d.base = d.ta.value;
    listen(SR, d, keyboard);
  };
  try { rec.start(); } catch (err) { stopDictation(); keyboard(); }
}
// Phase-1 testing: an email with the questions that decide whether to build the native app.
function feedback() {
  let reports = 0;
  try { reports = +(localStorage.getItem("pc:reports") || 0); } catch (e) {}
  const mine = (x) => !String(x.id).startsWith("demo:");
  const body = [
    "1. Did you make a report with your own photos? (yes / no)",
    "",
    "2. Did the photos land under the right events? If not, what went wrong?",
    "",
    "3. What would you use the report for (work, a project, school, memories…)?",
    "",
    "4. Would you pay €3.99/month for unlimited reports? (yes / maybe / no)",
    "",
    "5. Anything else:",
    "",
    "",
    "---",
    `In the app: ${S.events.filter(mine).length} events, ${S.photos.filter(mine).length} photos of your own, ${reports} reports opened`,
    navigator.userAgent,
  ].join("\n");
  location.href = "mailto:anastasescujessica@gmail.com?subject=" + encodeURIComponent("JeMo Diary — feedback") + "&body=" + encodeURIComponent(body);
}

// ---------- demo ----------
async function demo() {
  const week = startOfWeek(Date.now());
  const at = (d, h, m = 0) => addDays(week, d) + (h * 60 + m) * MIN;
  const evs = [
    { title: "Smart City Conference", location: "Main Conference Center", s: at(1, 9), e: at(1, 13) },
    { title: "Dinner with Diana", location: "La Pasteria", s: at(1, 18), e: at(1, 20) },
    { title: "Site visit — Ploiești", location: "Ploiești", s: at(2, 11), e: at(2, 12, 30) },
    { title: "Team training", location: "Office", s: at(3, 14), e: at(3, 16) },
    { title: "Shopping", location: "", s: at(5, 11), e: at(5, 13) },
  ].map((x, i) => ({ id: "demo:e" + i, title: x.title, location: x.location, start: x.s, end: x.e, allDay: false, source: "demo" }));
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
  g.font = "bold 44px sans-serif"; g.fillText(title.slice(0, 24), 400, 290);
  g.font = "36px sans-serif"; g.fillText(time, 400, 350);
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.8));
}

// ---------- events ----------
async function act(a) {
  if (a === "photos") { addTo = null; $("#pickPhotos").click(); }
  else if (a === "ics") $("#pickIcs").click();
  else if (a === "event") newEvent();
  else if (a === "demo") await demo();
  else if (a === "menu") menu();
  else if (a === "feedback") feedback();
  else if (a === "clear") {
    if (!confirm("Delete all events and photos from this device?")) return;
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
  const t = e.target.closest("[data-act],[data-view],[data-day],[data-photo],[data-report],[data-delev],[data-note],[data-addto]");
  if (!t || t.closest(".sheet,.lightbox,.report")) return;
  if (t.dataset.act) return act(t.dataset.act);
  if (t.dataset.view) {
    S.view = t.dataset.view;
    try { localStorage.setItem("pc:view", S.view); } catch (err) {}
    return render();
  }
  if (t.dataset.photo) return lightbox(t.dataset.photo);
  if (t.dataset.report) return report(t.dataset.report);
  if (t.dataset.note) return noteSheet(t.dataset.note);
  if (t.dataset.addto) { addTo = t.dataset.addto; return $("#pickPhotos").click(); }
  if (t.dataset.delev) {
    if (!confirm("Remove this event? Its photos stay.")) return;
    await del("events", t.dataset.delev);
    return load();
  }
  if (t.dataset.day) { S.cursor = +t.dataset.day; S.view = "day"; render(); }
});

let addTo = null; // event chosen with its own "Add photos" button
$("#pickPhotos").addEventListener("change", (e) => { const f = [...e.target.files]; e.target.value = ""; if (f.length) addPhotos(f, addTo); addTo = null; });
$("#pickIcs").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importIcs(f); });

let toastTimer;
function toast(msg) {
  let el = $(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3500);
}

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
load().catch((e) => { $("#main").innerHTML = `<div class="empty">This browser can't store data here (${esc(e.message || e)}). Try Safari or Chrome outside private mode.</div>`; });
