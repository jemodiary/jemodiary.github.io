// Pure logic shared by the app and the Node check: .ics parsing, EXIF date reading, photo → event matching.
(function (root) {
  const MIN = 60 * 1000;
  const DAY = 24 * 60 * MIN;
  // A photo taken a bit before an event starts or after it ends still belongs to it.
  const BEFORE = 15 * MIN;
  const AFTER = 30 * MIN;

  // ---------- .ics ----------
  function unescapeIcs(s) {
    return s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
  }

  // How far a time zone is ahead of UTC at instant t (ms), or null for a name Intl doesn't know
  // (Outlook writes Windows names like "GTB Standard Time"; those fall back to the phone's own zone).
  const fmts = {};
  function tzOffset(t, tz) {
    try {
      fmts[tz] = fmts[tz] || new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric",
        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const p = {};
      for (const x of fmts[tz].formatToParts(new Date(t))) p[x.type] = x.value;
      return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(t / 1000) * 1000;
    } catch (e) { return null; }
  }

  // Wall-clock parts → ms. kind: "utc" (…Z), "tz" (TZID), "local" (floating), "date" (all-day).
  function wall(y, mo, d, h, mi, s, kind, tz) {
    if (kind === "utc") return Date.UTC(y, mo - 1, d, h, mi, s);
    if (kind === "date") return new Date(y, mo - 1, d).getTime();
    if (kind === "tz") {
      const g = Date.UTC(y, mo - 1, d, h, mi, s);
      const o1 = tzOffset(g, tz);
      if (o1 != null) {
        let t = g - o1;
        const o2 = tzOffset(t, tz);
        if (o2 !== o1) t = g - o2;
        return t;
      }
    }
    return new Date(y, mo - 1, d, h, mi, s).getTime();
  }

  function icsDate(value, params) {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
    if (!m) return null;
    const [, y, mo, d, h, mi, s, z] = m;
    const tzm = /TZID=("?)([^;:"]+)\1/i.exec(params);
    const kind = h === undefined || /VALUE=DATE(?!-)/i.test(params) ? "date" : z ? "utc" : tzm ? "tz" : "local";
    const parts = { y: +y, mo: +mo, d: +d, h: +(h || 0), mi: +(mi || 0), s: +(s || 0) };
    const tz = tzm ? tzm[2] : null;
    return { t: wall(parts.y, parts.mo, parts.d, parts.h, parts.mi, parts.s, kind, tz), allDay: kind === "date", parts, kind, tz };
  }

  function icsDuration(v) {
    const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
    if (!m) return null;
    const [, w, d, h, mi, s] = m.map((x) => +x || 0);
    return ((w * 7 + d) * 24 * 60 + h * 60 + mi) * MIN + s * 1000;
  }

  // ---------- recurring events (RRULE) ----------
  // Calendar days as integers (days since 1970-01-01), so stepping by days/weeks/months ignores DST.
  const dnum = (y, mo, d) => Math.round(Date.UTC(y, mo - 1, d) / DAY);
  const dparts = (n) => { const x = new Date(n * DAY); return { y: x.getUTCFullYear(), mo: x.getUTCMonth() + 1, d: x.getUTCDate() }; };
  const dow = (n) => (new Date(n * DAY).getUTCDay() + 6) % 7; // Monday = 0
  const WD = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 };
  const daysIn = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();

  // Occurrence starts (ms) of a recurring event, from DTSTART up to UNTIL / COUNT / about a year from now.
  // Covers what calendars export in practice: DAILY, WEEKLY (BYDAY), MONTHLY (BYMONTHDAY or 2TU / -1FR), YEARLY.
  function expand(start, rule, now) {
    const r = {};
    for (const kv of rule.split(";")) { const [k, v] = kv.split("="); if (k) r[k.toUpperCase()] = v; }
    const freq = r.FREQ, every = Math.max(1, +r.INTERVAL || 1), count = r.COUNT ? +r.COUNT : Infinity;
    let until = Infinity;
    if (r.UNTIL) {
      const u = icsDate(r.UNTIL, "");
      if (u) until = u.allDay ? u.t + DAY - 1 : u.t;
    }
    const horizon = Math.min(until, now + 400 * DAY);
    const P = start.parts, first = dnum(P.y, P.mo, P.d);
    const at = (n) => { const q = dparts(n); return wall(q.y, q.mo, q.d, P.h, P.mi, P.s, start.kind, start.tz); };
    const byday = (r.BYDAY || "").split(",").filter(Boolean).map((x) => {
      const m = /^([+-]?\d+)?(MO|TU|WE|TH|FR|SA|SU)$/i.exec(x.trim());
      return m ? { n: +(m[1] || 0), wd: WD[m[2].toUpperCase()] } : null;
    }).filter(Boolean);
    const out = [];
    let n = 0, guard = 0, done = false;
    const emit = (day) => {
      if (day < first || done) return;
      const t = at(day);
      if (t < start.t) return;
      if (t > horizon || n >= count) { done = true; return; }
      n++;
      out.push(t);
    };
    if (freq === "DAILY") {
      for (let k = 0; !done && guard++ < 20000; k++) emit(first + k * every);
    } else if (freq === "WEEKLY") {
      const days = (byday.length ? byday.map((b) => b.wd) : [dow(first)]).sort((a, b) => a - b);
      const week0 = first - dow(first);
      for (let w = 0; !done && guard++ < 5000; w++) for (const wd of days) emit(week0 + w * 7 * every + wd);
    } else if (freq === "MONTHLY") {
      const bmd = (r.BYMONTHDAY || "").split(",").filter(Boolean).map(Number);
      for (let k = 0; !done && guard++ < 2000; k++) {
        const mIdx = P.mo - 1 + k * every, y = P.y + Math.floor(mIdx / 12), mo = (mIdx % 12) + 1, dim = daysIn(y, mo);
        let ds = [];
        if (bmd.length) ds = bmd.map((x) => (x < 0 ? dim + 1 + x : x));
        else if (byday.length) {
          for (const b of byday) {
            const all = [];
            for (let d = 1; d <= dim; d++) if (dow(dnum(y, mo, d)) === b.wd) all.push(d);
            if (!b.n) ds.push(...all);
            else ds.push(b.n > 0 ? all[b.n - 1] : all[all.length + b.n]);
          }
        } else ds = [P.d];
        ds.filter((d) => d >= 1 && d <= dim).sort((a, b) => a - b).forEach((d) => emit(dnum(y, mo, d)));
      }
    } else if (freq === "YEARLY") {
      for (let k = 0; !done && guard++ < 300; k++) {
        const y = P.y + k * every;
        if (P.d <= daysIn(y, P.mo)) emit(dnum(y, P.mo, P.d));
      }
    } else out.push(start.t);
    return out;
  }

  function parseIcs(text, now) {
    now = now || Date.now();
    const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
    const raw = [];
    let cur = null, depth = 0;
    for (const line of lines) {
      if (line === "BEGIN:VEVENT") { cur = { ex: [] }; depth = 0; continue; }
      if (cur && /^BEGIN:/.test(line)) { depth++; continue; } // VALARM inside an event
      if (cur && /^END:/.test(line) && line !== "END:VEVENT") { depth--; continue; }
      if (line === "END:VEVENT") { if (cur && cur.start) raw.push(cur); cur = null; continue; }
      if (!cur || depth > 0) continue;
      const i = line.indexOf(":");
      if (i < 0) continue;
      const head = line.slice(0, i);
      const value = line.slice(i + 1);
      const name = head.split(";")[0].toUpperCase();
      const params = head.slice(name.length);
      if (name === "SUMMARY") cur.title = unescapeIcs(value);
      else if (name === "LOCATION") cur.location = unescapeIcs(value);
      else if (name === "UID") cur.uid = value;
      else if (name === "DTSTART") cur.start = icsDate(value, params);
      else if (name === "DTEND") cur.end = icsDate(value, params);
      else if (name === "DURATION") cur.dur = icsDuration(value);
      else if (name === "RRULE") cur.rrule = value;
      else if (name === "EXDATE") for (const v of value.split(",")) { const x = icsDate(v, params); if (x) cur.ex.push(x.t); }
      else if (name === "RECURRENCE-ID") cur.recur = icsDate(value, params);
      else if (name === "STATUS") cur.cancelled = /CANCELLED/i.test(value);
    }
    // An edited single occurrence (RECURRENCE-ID) replaces the one the rule would have made.
    const moved = new Map();
    for (const e of raw) if (e.recur && e.uid) moved.set(e.uid + "|" + e.recur.t, e);
    const events = [];
    const make = (e, t, id) => {
      const s = e.start;
      let len = e.end ? e.end.t - s.t : e.dur != null ? e.dur : s.allDay ? DAY : 60 * MIN;
      if (len <= 0) len = s.allDay ? DAY : 60 * MIN;
      let end = t + len;
      if (s.allDay) { const days = Math.max(1, Math.round(len / DAY)); const d = new Date(t); end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime(); }
      events.push({ id, title: e.title || "(no title)", location: e.location || "", start: t, end, allDay: s.allDay, source: "ics" });
    };
    for (const e of raw) {
      const base = "ics:" + (e.uid || e.start.t + ":" + (e.title || ""));
      if (e.recur) {
        if (e.cancelled) continue;
        make(e, e.start.t, e.recur.t === (raw.find((m) => m.uid === e.uid && !m.recur) || {}).start?.t ? base : base + "@" + e.recur.t);
        continue;
      }
      if (e.cancelled) continue;
      if (!e.rrule) { make(e, e.start.t, base); continue; }
      const ex = new Set(e.ex);
      for (const t of expand(e.start, e.rrule, now)) {
        if (ex.has(t) || (e.uid && moved.has(e.uid + "|" + t))) continue;
        if (t < now - 5 * 366 * DAY) continue;
        make(e, t, t === e.start.t ? base : base + "@" + t);
      }
    }
    return events;
  }

  // ---------- EXIF (JPEG) ----------
  // Returns the time the photo was taken, in ms, or null. Uses OffsetTimeOriginal when the camera wrote it,
  // otherwise reads the time as device-local (what iPhones and most Androids mean anyway).
  function exifTime(buf) {
    const v = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
    let p = 2;
    while (p + 4 <= v.byteLength) {
      const marker = v.getUint16(p);
      const len = v.getUint16(p + 2);
      if (marker === 0xffe1 && v.getUint32(p + 4) === 0x45786966) return readTiff(v, p + 10);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
      p += 2 + len;
    }
    return null;
  }

  function readTiff(v, t) {
    const le = v.getUint16(t) === 0x4949;
    const u16 = (o) => v.getUint16(t + o, le);
    const u32 = (o) => v.getUint32(t + o, le);
    const str = (o, n) => {
      let s = "";
      for (let i = 0; i < n; i++) {
        const c = v.getUint8(t + o + i);
        if (!c) break;
        s += String.fromCharCode(c);
      }
      return s;
    };
    const ifd = (o) => {
      const out = {};
      if (t + o + 2 > v.byteLength) return out;
      const n = u16(o);
      for (let i = 0; i < n; i++) {
        const e = o + 2 + i * 12;
        if (t + e + 12 > v.byteLength) break;
        const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
        if (type === 2) out[tag] = str(count > 4 ? u32(e + 8) : e + 8, count);
        else if (type === 4) out[tag] = u32(e + 8);
      }
      return out;
    };
    const ifd0 = ifd(u32(4));
    const ex = ifd0[0x8769] ? ifd(ifd0[0x8769]) : {};
    const raw = ex[0x9003] || ex[0x9004] || ifd0[0x0132];
    if (!raw) return null;
    const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(raw);
    if (!m || m[1] === "0000") return null;
    const [, y, mo, d, h, mi, s] = m.map(Number);
    const off = /^([+-])(\d{2}):(\d{2})$/.exec(ex[0x9011] || "");
    if (off) {
      const sign = off[1] === "-" ? -1 : 1;
      return Date.UTC(y, mo - 1, d, h, mi, s) - sign * (+off[2] * 60 + +off[3]) * MIN;
    }
    return new Date(y, mo - 1, d, h, mi, s).getTime();
  }

  // ---------- video (MOV / MP4) ----------
  // Creation time from the "mvhd" box (seconds since 1904, UTC). It sits at the start or the end of the file,
  // so the caller passes both ends. Returns ms or null.
  function videoTime(...bufs) {
    for (const buf of bufs) {
      const b = new Uint8Array(buf);
      for (let i = 4; i + 16 < b.length; i++) {
        if (b[i] !== 0x6d || b[i + 1] !== 0x76 || b[i + 2] !== 0x68 || b[i + 3] !== 0x64) continue;
        const v = new DataView(b.buffer, b.byteOffset);
        const secs = b[i + 4] === 1 ? v.getUint32(i + 8) * 4294967296 + v.getUint32(i + 12) : v.getUint32(i + 8);
        const t = (secs - 2082844800) * 1000;
        if (t > Date.UTC(2000, 0, 1) && t < Date.now() + DAY) return t;
      }
    }
    return null;
  }

  // ---------- matching ----------
  function dayKey(t) {
    const d = new Date(t);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // photo.eventId set by hand wins ("none" = keep it out of any event).
  // Otherwise: a timed event the photo falls inside; else the closest timed event within the margins;
  // else an all-day event that covers that day; else no event.
  function matchPhotos(events, photos) {
    const byId = new Map(events.map((e) => [e.id, e]));
    const timed = events.filter((e) => !e.allDay).sort((a, b) => a.start - b.start);
    const allDay = events.filter((e) => e.allDay);
    const result = new Map();
    for (const ph of photos) {
      let ev = null;
      if (ph.eventId) ev = ph.eventId === "none" ? null : byId.get(ph.eventId) || null;
      else {
        let best = null, bestGap = Infinity;
        for (const e of timed) {
          if (ph.time < e.start - BEFORE) break;
          if (ph.time > e.end + AFTER) continue;
          const gap = ph.time < e.start ? e.start - ph.time : ph.time > e.end ? ph.time - e.end : 0;
          // Inside two overlapping events: the one that started last is the more specific one.
          if (gap < bestGap || (gap === 0 && bestGap === 0)) { best = e; bestGap = gap; }
        }
        ev = best || allDay.find((e) => ph.time >= e.start && ph.time < e.end) || null;
      }
      result.set(ph.id, ev ? ev.id : null);
    }
    return result;
  }

  const api = { parseIcs, exifTime, videoTime, matchPhotos, dayKey, MIN, DAY };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== "undefined" ? self : this);
