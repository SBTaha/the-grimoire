import {
  todayKey,
  addDays,
  diffDays,
  isoToDateKey,
  rangeKeys,
} from "./dates.js";
import { levelFromXp, priorityOf, PRIORITIES } from "./model.js";
import { sumBy } from "./util.js";

export function totalXp(log) {
  return sumBy(log, (record) => record.xp);
}

export function levelInfo(log) {
  return levelFromXp(totalXp(log));
}

export function completionsByDay(log, fromKey, toKey) {
  const counts = new Map(rangeKeys(fromKey, toKey).map((key) => [key, 0]));
  for (const record of log) {
    const key = isoToDateKey(record.at);
    if (key && counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  return counts;
}

export function activitySeries(log, days = 90, today = todayKey()) {
  const from = addDays(today, -(days - 1));
  const counts = completionsByDay(log, from, today);
  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

export function streaks(log, today = todayKey()) {
  const days = new Set();
  for (const record of log) {
    const key = isoToDateKey(record.at);
    if (key) days.add(key);
  }
  if (!days.size) return { current: 0, longest: 0, activeDays: 0 };

  let cursor = days.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (diffDays(sorted[i - 1], sorted[i]) === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
  }

  return { current, longest, activeDays: days.size };
}

export function byCategory(log, categories) {
  const index = new Map(categories.map((c) => [c.id, c]));
  const tally = new Map();
  for (const record of log) {
    const key = record.categoryId ?? "__none";
    const row = tally.get(key) ?? {
      id: key,
      name: null,
      color: null,
      count: 0,
      xp: 0,
    };
    row.count += 1;
    row.xp += record.xp ?? 0;
    tally.set(key, row);
  }
  return [...tally.values()]
    .map((row) => {
      const category = index.get(row.id);
      return {
        ...row,
        name: category?.name ?? "Unassigned",
        color: category?.color ?? "#6b6478",
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function byPriority(log) {
  const tally = new Map(
    PRIORITIES.map((p) => [p.id, { ...p, count: 0, xp: 0 }]),
  );
  for (const record of log) {
    const row = tally.get(record.priority);
    if (row) {
      row.count += 1;
      row.xp += record.xp ?? 0;
    }
  }
  return [...tally.values()];
}

export function averageDaysToComplete(quests) {
  const spans = quests
    .filter((q) => q.status === "completed" && q.completedAt && q.createdAt)
    .map((q) =>
      diffDays(isoToDateKey(q.createdAt), isoToDateKey(q.completedAt)),
    )
    .filter((n) => n !== null && n >= 0);
  if (!spans.length) return null;
  return spans.reduce((a, b) => a + b, 0) / spans.length;
}

export function completionRate(quests) {
  const relevant = quests.filter((q) => q.status !== "archived");
  if (!relevant.length) return null;
  const done = relevant.filter((q) => q.status === "completed").length;
  return done / relevant.length;
}

export function completionsSince(log, days, today = todayKey()) {
  const floor = addDays(today, -(days - 1));
  return log.filter((record) => {
    const key = isoToDateKey(record.at);
    return key && diffDays(floor, key) >= 0;
  }).length;
}

export function dashboardSummary(state, today = todayKey()) {
  const active = state.quests.filter((q) => q.status === "active");
  const overdue = active.filter(
    (q) => q.dueDate && diffDays(today, q.dueDate) < 0,
  );
  const dueToday = active.filter((q) => q.dueDate === today);
  const dueThisWeek = active.filter((q) => {
    if (!q.dueDate) return false;
    const delta = diffDays(today, q.dueDate);
    return delta !== null && delta >= 0 && delta <= 7;
  });

  return {
    active: active.length,
    overdue: overdue.length,
    dueToday: dueToday.length,
    dueThisWeek: dueThisWeek.length,
    completedThisWeek: completionsSince(state.log, 7, today),
    level: levelInfo(state.log),
    streak: streaks(state.log, today),
    xpThisWeek: sumBy(
      state.log.filter((r) => {
        const key = isoToDateKey(r.at);
        return key && diffDays(addDays(today, -6), key) >= 0;
      }),
      (r) => r.xp,
    ),
  };
}

export function xpOf(quest) {
  return priorityOf(quest.priority).xp;
}
