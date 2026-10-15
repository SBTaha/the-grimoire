import test from "node:test";
import assert from "node:assert/strict";

import {
  totalXp,
  levelInfo,
  completionsByDay,
  activitySeries,
  streaks,
  byCategory,
  byPriority,
  averageDaysToComplete,
  completionRate,
  completionsSince,
  dashboardSummary,
} from "../js/core/stats.js";
import { levelFromXp, xpForLevel } from "../js/core/model.js";
import { addDays, parseDateKey } from "../js/core/dates.js";

const TODAY = "2026-10-10";

function record(dateKey, overrides = {}) {
  const at = parseDateKey(dateKey);
  at.setHours(12, 0, 0, 0);
  return {
    id: `log_${dateKey}_${Math.random()}`,
    questId: "qst_1",
    title: "A quest",
    categoryId: null,
    priority: "standard",
    xp: 25,
    at: at.toISOString(),
    ...overrides,
  };
}

test("totalXp sums the log", () => {
  assert.equal(totalXp([]), 0);
  assert.equal(
    totalXp([record(TODAY, { xp: 10 }), record(TODAY, { xp: 60 })]),
    70,
  );
});

test("level thresholds are monotonic and start at level 1", () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 100);
  assert.equal(xpForLevel(3), 300);
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(99).level, 1);
  assert.equal(levelFromXp(100).level, 2);
  assert.equal(levelFromXp(299).level, 2);
  assert.equal(levelFromXp(300).level, 3);
});

test("level progress is a fraction of the current band", () => {
  const info = levelFromXp(200);
  assert.equal(info.level, 2);
  assert.equal(info.into, 100, "200 - 100");
  assert.equal(info.span, 200, "300 - 100");
  assert.equal(info.progress, 0.5);
  assert.ok(info.title, "a rank title is assigned");
});

test("levelFromXp tolerates rubbish input", () => {
  assert.equal(levelFromXp(-50).level, 1);
  assert.equal(levelFromXp(undefined).level, 1);
  assert.equal(levelFromXp("nonsense").level, 1);
});

test("completionsByDay fills gaps with zeros", () => {
  const log = [
    record("2026-10-08"),
    record("2026-10-10"),
    record("2026-10-10"),
  ];
  const counts = completionsByDay(log, "2026-10-08", "2026-10-10");
  assert.equal(counts.get("2026-10-08"), 1);
  assert.equal(counts.get("2026-10-09"), 0, "empty day present");
  assert.equal(counts.get("2026-10-10"), 2);
});

test("completionsByDay ignores records outside the window", () => {
  const counts = completionsByDay(
    [record("2026-01-01")],
    "2026-10-08",
    "2026-10-10",
  );
  assert.equal(
    [...counts.values()].reduce((a, b) => a + b, 0),
    0,
  );
});

test("activitySeries returns one ordered point per day", () => {
  const series = activitySeries([record(TODAY)], 7, TODAY);
  assert.equal(series.length, 7);
  assert.equal(series.at(-1).date, TODAY);
  assert.equal(series.at(-1).count, 1);
  assert.equal(series[0].date, addDays(TODAY, -6));
});

test("streaks count consecutive active days", () => {
  const log = [
    record(TODAY),
    record(addDays(TODAY, -1)),
    record(addDays(TODAY, -2)),
  ];
  const result = streaks(log, TODAY);
  assert.equal(result.current, 3);
  assert.equal(result.longest, 3);
  assert.equal(result.activeDays, 3);
});

test("a quiet today does not break a run that ended yesterday", () => {
  const log = [record(addDays(TODAY, -1)), record(addDays(TODAY, -2))];
  assert.equal(streaks(log, TODAY).current, 2);
});

test("a two-day gap ends the current streak", () => {
  const log = [record(addDays(TODAY, -2)), record(addDays(TODAY, -3))];
  assert.equal(streaks(log, TODAY).current, 0);
  assert.equal(streaks(log, TODAY).longest, 2, "history still recorded");
});

test("longest streak is found even when it is not the current one", () => {
  const log = [
    record(addDays(TODAY, -10)),
    record(addDays(TODAY, -9)),
    record(addDays(TODAY, -8)),
    record(addDays(TODAY, -7)),
    record(TODAY),
  ];
  const result = streaks(log, TODAY);
  assert.equal(result.current, 1);
  assert.equal(result.longest, 4);
});

test("several completions on one day count as one streak day", () => {
  const log = [record(TODAY), record(TODAY), record(TODAY)];
  assert.equal(streaks(log, TODAY).current, 1);
});

test("an empty log yields zero streaks rather than NaN", () => {
  assert.deepEqual(streaks([], TODAY), {
    current: 0,
    longest: 0,
    activeDays: 0,
  });
});

test("byCategory labels unknown realms rather than dropping the records", () => {
  const categories = [{ id: "cat_1", name: "Forge", color: "#fff" }];
  const log = [
    record(TODAY, { categoryId: "cat_1" }),
    record(TODAY, { categoryId: "cat_1" }),
    record(TODAY, { categoryId: null }),
    record(TODAY, { categoryId: "cat_deleted" }),
  ];
  const rows = byCategory(log, categories);
  assert.equal(rows[0].name, "Forge");
  assert.equal(rows[0].count, 2);
  assert.equal(
    rows.reduce((sum, r) => sum + r.count, 0),
    4,
    "nothing lost",
  );
  assert.ok(rows.some((r) => r.name === "Unassigned"));
});

test("byPriority reports every band, including empty ones", () => {
  const rows = byPriority([record(TODAY, { priority: "legendary", xp: 150 })]);
  assert.equal(rows.length, 4);
  const legendary = rows.find((r) => r.id === "legendary");
  assert.equal(legendary.count, 1);
  assert.equal(legendary.xp, 150);
  assert.equal(rows.find((r) => r.id === "minor").count, 0);
});

test("averageDaysToComplete uses created-to-completed spans", () => {
  const quests = [
    {
      status: "completed",
      createdAt: parseDateKey("2026-10-01").toISOString(),
      completedAt: parseDateKey("2026-10-05").toISOString(),
    },
    {
      status: "completed",
      createdAt: parseDateKey("2026-10-01").toISOString(),
      completedAt: parseDateKey("2026-10-03").toISOString(),
    },
    {
      status: "active",
      createdAt: parseDateKey("2026-10-01").toISOString(),
      completedAt: null,
    },
  ];
  assert.equal(averageDaysToComplete(quests), 3);
  assert.equal(averageDaysToComplete([]), null, "no data reads as null, not 0");
});

test("completionRate excludes archived quests", () => {
  const quests = [
    { status: "completed" },
    { status: "completed" },
    { status: "active" },
    { status: "archived" },
  ];
  assert.equal(completionRate(quests), 2 / 3);
  assert.equal(completionRate([]), null);
  assert.equal(completionRate([{ status: "archived" }]), null);
});

test("completionsSince counts an inclusive trailing window", () => {
  const log = [
    record(TODAY),
    record(addDays(TODAY, -6)),
    record(addDays(TODAY, -10)),
  ];
  assert.equal(completionsSince(log, 7, TODAY), 2);
  assert.equal(completionsSince(log, 1, TODAY), 1);
});

test("dashboardSummary assembles the header figures in one pass", () => {
  const state = {
    quests: [
      { status: "active", dueDate: addDays(TODAY, -1), priority: "major" },
      { status: "active", dueDate: TODAY, priority: "minor" },
      { status: "active", dueDate: addDays(TODAY, 3), priority: "minor" },
      { status: "active", dueDate: addDays(TODAY, 60), priority: "minor" },
      { status: "completed", dueDate: TODAY, priority: "minor" },
    ],
    log: [record(TODAY, { xp: 25 })],
    categories: [],
  };
  const summary = dashboardSummary(state, TODAY);
  assert.equal(summary.active, 4);
  assert.equal(summary.overdue, 1);
  assert.equal(summary.dueToday, 1);
  assert.equal(summary.dueThisWeek, 2, "today and the one three days out");
  assert.equal(summary.completedThisWeek, 1);
  assert.equal(summary.xpThisWeek, 25);
  assert.equal(summary.level.level, 1);
  assert.equal(summary.streak.current, 1);
});

test("dashboardSummary on an empty grimoire reports zeros", () => {
  const summary = dashboardSummary(
    { quests: [], log: [], categories: [] },
    TODAY,
  );
  assert.equal(summary.active, 0);
  assert.equal(summary.overdue, 0);
  assert.equal(summary.level.level, 1);
  assert.equal(summary.streak.current, 0);
});

test("levelInfo reads the log directly", () => {
  assert.equal(levelInfo([record(TODAY, { xp: 150 })]).level, 2);
});
