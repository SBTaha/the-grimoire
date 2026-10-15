import test from "node:test";
import assert from "node:assert/strict";

import {
  isDateKey,
  parseDateKey,
  toDateKey,
  addDays,
  addMonths,
  diffDays,
  startOfWeek,
  weekdayOf,
  describeDue,
  formatDate,
  rangeKeys,
  isoToDateKey,
} from "../js/core/dates.js";

test("isDateKey rejects malformed and impossible dates", () => {
  assert.equal(isDateKey("2026-10-10"), true);
  assert.equal(isDateKey("2026-02-29"), false, "not a leap year");
  assert.equal(isDateKey("2024-02-29"), true, "leap year");
  assert.equal(isDateKey("2026-13-01"), false);
  assert.equal(isDateKey("2026-04-31"), false);
  assert.equal(isDateKey("10/10/2026"), false);
  assert.equal(isDateKey(""), false);
  assert.equal(isDateKey(null), false);
});

test("date keys parse to LOCAL midnight, not UTC", () => {
  const date = parseDateKey("2026-10-10");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 10);
  assert.equal(date.getHours(), 0);
  assert.equal(toDateKey(date), "2026-10-10");
});

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-10-10", 1), "2026-10-11");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
});

test("addMonths clamps to the length of the target month", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2024-01-31", 1), "2024-02-29", "leap year");
  assert.equal(addMonths("2026-03-31", 1), "2026-04-30");
  assert.equal(addMonths("2026-10-15", 3), "2027-01-15");
  assert.equal(addMonths("2026-10-15", -1), "2026-09-15");
});

test("diffDays is signed and symmetric", () => {
  assert.equal(diffDays("2026-10-10", "2026-10-17"), 7);
  assert.equal(diffDays("2026-10-17", "2026-10-10"), -7);
  assert.equal(diffDays("2026-10-10", "2026-10-10"), 0);
});

test("diffDays is unaffected by daylight-saving transitions", () => {
  assert.equal(diffDays("2026-03-01", "2026-04-01"), 31);
  assert.equal(diffDays("2026-10-01", "2026-11-01"), 31);
});

test("startOfWeek is Monday-based", () => {
  assert.equal(
    startOfWeek("2026-10-10"),
    "2026-10-05",
    "Saturday -> previous Monday",
  );
  assert.equal(startOfWeek("2026-10-05"), "2026-10-05", "Monday -> itself");
  assert.equal(startOfWeek("2026-10-11"), "2026-10-05", "Sunday -> same week");
});

test("weekdayOf uses Sunday = 0", () => {
  assert.equal(weekdayOf("2026-10-10"), 6, "Saturday");
  assert.equal(weekdayOf("2026-10-11"), 0, "Sunday");
  assert.equal(weekdayOf("2026-10-12"), 1, "Monday");
});

test("describeDue phrases relative deadlines", () => {
  const today = "2026-10-10";
  assert.equal(describeDue("2026-10-10", today).tone, "today");
  assert.equal(describeDue("2026-10-11", today).label, "Due tomorrow");
  assert.equal(describeDue("2026-10-09", today).label, "1 day overdue");
  assert.equal(describeDue("2026-10-07", today).label, "3 days overdue");
  assert.equal(describeDue("2026-10-07", today).tone, "overdue");
  assert.equal(describeDue("2026-10-14", today).label, "Due in 4 days");
  assert.equal(describeDue(null, today).tone, "none");
  assert.equal(describeDue("2026-12-25", today).tone, "future");
});

test("formatDate omits the year only within the current year", () => {
  assert.equal(formatDate("2026-10-10", { today: "2026-10-01" }), "10 Oct");
  assert.equal(formatDate("2027-01-02", { today: "2026-10-01" }), "2 Jan 2027");
});

test("rangeKeys is inclusive and bounded", () => {
  assert.deepEqual(rangeKeys("2026-10-10", "2026-10-12"), [
    "2026-10-10",
    "2026-10-11",
    "2026-10-12",
  ]);
  assert.equal(rangeKeys("2026-10-10", "2026-10-10").length, 1);
  assert.ok(
    rangeKeys("2026-01-01", "2030-01-01").length <= 400,
    "guard prevents runaway loops",
  );
});

test("isoToDateKey converts an instant to its local calendar day", () => {
  const iso = new Date(2026, 9, 10, 13, 30).toISOString();
  assert.equal(isoToDateKey(iso), "2026-10-10");
  assert.equal(isoToDateKey(null), null);
  assert.equal(isoToDateKey("nonsense"), null);
});
