export const MS_PER_DAY = 86400000;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function isDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m - 1);
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function parseDateKey(key) {
  if (!isDateKey(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(now = new Date()) {
  return toDateKey(now);
}

export function addDays(key, days) {
  const date = parseDateKey(key);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function addMonths(key, months) {
  const date = parseDateKey(key);
  if (!date) return null;
  const day = date.getDate();
  const targetMonth = date.getMonth() + months;
  const probe = new Date(date.getFullYear(), targetMonth, 1);
  const limit = daysInMonth(probe.getFullYear(), probe.getMonth());
  probe.setDate(Math.min(day, limit));
  return toDateKey(probe);
}

export function diffDays(a, b) {
  const start = parseDateKey(a);
  const end = parseDateKey(b);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function weekdayOf(key) {
  const date = parseDateKey(key);
  return date ? date.getDay() : null;
}

export function startOfWeek(key) {
  const date = parseDateKey(key);
  if (!date) return null;
  const shift = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - shift);
  return toDateKey(date);
}

export function rangeKeys(from, to, max = 400) {
  const out = [];
  let cursor = from;
  let guard = 0;
  while (cursor && guard < max) {
    out.push(cursor);
    if (cursor === to) break;
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

export function nowISO(now = new Date()) {
  return now.toISOString();
}

export function isoToDateKey(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : toDateKey(date);
}

export function formatDate(
  key,
  { today = todayKey(), withYear = "auto" } = {},
) {
  const date = parseDateKey(key);
  if (!date) return "—";
  const sameYear = today && today.slice(0, 4) === key.slice(0, 4);
  const showYear = withYear === true || (withYear === "auto" && !sameYear);
  const month = MONTH_LABELS[date.getMonth()].slice(0, 3);
  return `${date.getDate()} ${month}${showYear ? ` ${date.getFullYear()}` : ""}`;
}

export function formatLongDate(key) {
  const date = parseDateKey(key);
  if (!date) return "—";
  return `${WEEKDAY_LABELS[date.getDay()]}, ${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function describeDue(key, today = todayKey()) {
  if (!key) return { label: "No deadline", tone: "none", days: null };
  const days = diffDays(today, key);
  if (days === null) return { label: "No deadline", tone: "none", days: null };
  if (days < 0) {
    const n = Math.abs(days);
    return {
      label: n === 1 ? "1 day overdue" : `${n} days overdue`,
      tone: "overdue",
      days,
    };
  }
  if (days === 0) return { label: "Due today", tone: "today", days };
  if (days === 1) return { label: "Due tomorrow", tone: "soon", days };
  if (days <= 7) return { label: `Due in ${days} days`, tone: "soon", days };
  return { label: `Due ${formatDate(key, { today })}`, tone: "future", days };
}
