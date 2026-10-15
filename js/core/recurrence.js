import {
  addDays,
  addMonths,
  weekdayOf,
  startOfWeek,
  diffDays,
  WEEKDAY_LABELS,
} from "./dates.js";
import { makeRecurrence } from "./model.js";

function mondayOffset(weekday) {
  return (weekday + 6) % 7;
}

export function nextOccurrence(rule, fromKey) {
  const normalized = makeRecurrence(rule);
  if (!normalized || !fromKey) return null;
  const { freq, interval, weekdays } = normalized;

  if (freq === "daily") return addDays(fromKey, interval);
  if (freq === "monthly") return addMonths(fromKey, interval);

  if (!weekdays.length) return addDays(fromKey, 7 * interval);

  const currentOffset = mondayOffset(weekdayOf(fromKey));
  const offsets = weekdays.map(mondayOffset).sort((a, b) => a - b);
  const laterThisWeek = offsets.find((offset) => offset > currentOffset);
  const weekStart = startOfWeek(fromKey);

  if (laterThisWeek !== undefined) {
    return addDays(weekStart, laterThisWeek);
  }
  const nextWeekStart = addDays(weekStart, 7 * interval);
  return addDays(nextWeekStart, offsets[0]);
}

export function nextOccurrenceOnOrAfter(
  rule,
  fromKey,
  floorKey,
  maxSteps = 500,
) {
  let cursor = nextOccurrence(rule, fromKey);
  let steps = 0;
  while (
    cursor &&
    floorKey &&
    diffDays(floorKey, cursor) < 0 &&
    steps < maxSteps
  ) {
    const advanced = nextOccurrence(rule, cursor);
    if (!advanced || advanced === cursor) break;
    cursor = advanced;
    steps += 1;
  }
  return cursor;
}

export function projectOccurrences(rule, fromKey, count = 3) {
  const out = [];
  let cursor = fromKey;
  for (let i = 0; i < count; i += 1) {
    cursor = nextOccurrence(rule, cursor);
    if (!cursor) break;
    out.push(cursor);
  }
  return out;
}

export function describeRecurrence(rule) {
  const normalized = makeRecurrence(rule);
  if (!normalized) return "Does not repeat";
  const { freq, interval, weekdays } = normalized;
  const unit = { daily: "day", weekly: "week", monthly: "month" }[freq];
  const every = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
  if (freq === "weekly" && weekdays.length) {
    const days = weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ");
    return `${every} on ${days}`;
  }
  return every;
}
