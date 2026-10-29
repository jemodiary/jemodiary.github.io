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

  // "20260811T090000Z" → UTC; "20260811T090000" (TZID or floating) → device local time; "20260811" → all-day.
  // TZID is not resolved: an event exported from another time zone shifts. Good enough for one person's calendar.
  function icsDate(value, params) {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
    if (!m) return null;
    const [, y, mo, d, h, mi, s, z] = m;
    if (h === undefined || /VALUE=DATE(?!-)/.test(params)) {
      return { t: new Date(+y, +mo - 1, +d).getTime(), allDay: true };
    }
    const t = z
      ? Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0))
      : new Date(+y, +mo - 1, +d, +h, +mi, +(s || 0)).getTime();
    return { t, allDay: false };
  }

  function icsDuration(v) {
    const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
    if (!m) return null;
    const [, w, d, h, mi, s] = m.map((x) => +x || 0);
    return ((w * 7 + d) * 24 * 60 + h * 60 + mi) * MIN + s * 1000;
  }

  // Recurring events (RRULE) come in as their first occurrence only.
  function parseIcs(text) {
    const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
    const events = [];
    let cur = null;
    for (const line of lines) {
      if (line === "BEGIN:VEVENT") { cur = {}; continue; }
      if (line === "END:VEVENT") {
        if (cur && cur.start) {
          const s = cur.start;
          let end = cur.end ? cur.end.t : s.t + (cur.dur != null ? cur.dur : s.allDay ? DAY : 60 * MIN);
          if (end <= s.t) end = s.t + (s.allDay ? DAY : 60 * MIN);
          events.push({
            id: "ics:" + (cur.uid || s.t + ":" + (cur.title || "")),
            title: cur.title || "(no title)",
            location: cur.location || "",
            start: s.t,
            end,
            allDay: s.allDay,
            source: "ics",
          });
        }
        cur = null;
        continue;
      }
      if (!cur) continue;
      const i = line.indexOf(":");
      if (i < 0) continue;
      const head = line.slice(0, i);
      const value = line.slice(i + 1);
      const name = head.split(";")[0].toUpperCase();
      const params = head.slice(name.length).toUpperCase();
      if (name === "SUMMARY") cur.title = unescapeIcs(value);
      else if (name === "LOCATION") cur.location = unescapeIcs(value);
      else if (name === "UID") cur.uid = value;
      else if (name === "DTSTART") cur.start = icsDate(value, params);
      else if (name === "DTEND") cur.end = icsDate(value, params);
      else if (name === "DURATION") cur.dur = icsDuration(value);
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

  const api = { parseIcs, exifTime, matchPhotos, dayKey, MIN, DAY };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== "undefined" ? self : this);
