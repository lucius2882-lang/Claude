// Small, strict CSV reader plus the date/number parsing business exports need.

/** Parse CSV text (RFC 4180: quotes, escaped quotes, newlines in quotes). Returns { header, rows }. */
export function parseCsv(text) {
  const src = String(text).replace(/^﻿/, "");
  const delim = sniffDelimiter(src);
  const out = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"' && field === "") inQ = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) out.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((v) => v.trim() !== "")) out.push(row); }
  if (!out.length) return { header: [], rows: [] };
  const header = out[0].map((h, i) => h.trim() || `column_${i + 1}`);
  const rows = out.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { header, rows };
}

function sniffDelimiter(src) {
  const first = src.split(/\r?\n/, 1)[0] || "";
  const counts = [",", ";", "\t", "|"].map((d) => [d, first.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

/** "$1,234.50" → 1234.5 ; "(12.00)" → -12 ; "45%" → 45 ; "" → null */
export function parseNumber(v) {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s || /^(n\/?a|null|none|-|—)$/i.test(s)) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[$€£¥\s%]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  if (/^-/.test(s)) { neg = !neg; s = s.slice(1); }
  if (!/^\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

/**
 * Dates as exported by POS, scheduling and accounting tools → "YYYY-MM-DD", or null.
 * Accepts 2026-11-12, 2026/11/12, 11/12/2026, 11/12/26, 12-Nov-2026, Nov 12 2026, and any of those with a time.
 */
export function parseDate(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const pad = (n) => String(n).padStart(2, "0");
  const ok = (y, m, d) => {
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    if (y < 2000 || y > 2100) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  };
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return ok(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/))) return ok(+m[3], +m[1], +m[2]); // US month/day/year
  const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
  if ((m = s.match(/^(\d{1,2})[-\s]([a-z]{3})[a-z]*[-\s,]+(\d{2,4})/i))) {
    const mi = MONTHS.indexOf(m[2].toLowerCase());
    if (mi >= 0) return ok(+m[3], mi + 1, +m[1]);
  }
  if ((m = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i))) {
    const mi = MONTHS.indexOf(m[1].toLowerCase());
    if (mi >= 0) return ok(+m[3], mi + 1, +m[2]);
  }
  return null;
}
