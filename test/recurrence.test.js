import test from "node:test";
import assert from "node:assert/strict";

import {
  nextOccurrence,
  nextOccurrenceOnOrAfter,
  projectOccurrences,
  describeRecurrence,
} from "../js/core/recurrence.js";

test("daily recurrence respects the interval", () => {
  assert.equal(
    nextOccurrence({ freq: "daily", interval: 1 }, "2026-10-10"),
    "2026-10-11",
  );
  assert.equal(
    nextOccurrence({ freq: "daily", interval: 3 }, "2026-10-10"),
    "2026-10-13",
  );
  assert.equal(
    nextOccurrence({ freq: "daily", interval: 30 }, "2026-10-10"),
    "2026-11-09",
  );
});

test("weekly recurrence without selected weekdays keeps the same weekday", () => {
  assert.equal(
    nextOccurrence({ freq: "weekly", interval: 1 }, "2026-10-10"),
    "2026-10-17",
  );
  assert.equal(
    nextOccurrence({ freq: "weekly", interval: 2 }, "2026-10-10"),
    "2026-10-24",
  );
});

test("weekly recurrence picks the next selected weekday within the week", () => {
  const rule = { freq: "weekly", interval: 1, weekdays: [1, 4] };
  assert.equal(
    nextOccurrence(rule, "2026-10-12"),
    "2026-10-15",
    "Mon -> Thu, same week",
  );
  assert.equal(
    nextOccurrence(rule, "2026-10-13"),
    "2026-10-15",
    "Tue -> Thu, same week",
  );
});

test("weekly recurrence rolls to the next week when no selected day remains", () => {
  const rule = { freq: "weekly", interval: 1, weekdays: [1, 4] };
  assert.equal(
    nextOccurrence(rule, "2026-10-15"),
    "2026-10-19",
    "Thu -> following Mon",
  );
  assert.equal(
    nextOccurrence(rule, "2026-10-10"),
    "2026-10-12",
    "Sat -> following Mon",
  );
});

test("weekly recurrence with interval > 1 skips whole weeks", () => {
  const rule = { freq: "weekly", interval: 2, weekdays: [1] };
  assert.equal(nextOccurrence(rule, "2026-10-12"), "2026-10-26");
});

test("monthly recurrence clamps short months", () => {
  assert.equal(
    nextOccurrence({ freq: "monthly", interval: 1 }, "2026-01-31"),
    "2026-02-28",
  );
  assert.equal(
    nextOccurrence({ freq: "monthly", interval: 1 }, "2026-10-15"),
    "2026-11-15",
  );
  assert.equal(
    nextOccurrence({ freq: "monthly", interval: 6 }, "2026-10-15"),
    "2027-04-15",
  );
});

test("series advances from the scheduled date, so late completion does not drift it", () => {
  const rule = { freq: "weekly", interval: 1, weekdays: [1] };
  assert.equal(nextOccurrence(rule, "2026-10-12"), "2026-10-19");
});

test("nextOccurrenceOnOrAfter skips past occurrences instead of backfilling", () => {
  const rule = { freq: "daily", interval: 1 };

  const next = nextOccurrenceOnOrAfter(rule, "2026-09-10", "2026-10-10");
  assert.equal(next, "2026-10-10");
});

test("nextOccurrenceOnOrAfter returns the immediate next date when already current", () => {
  const rule = { freq: "weekly", interval: 1 };
  assert.equal(
    nextOccurrenceOnOrAfter(rule, "2026-10-10", "2026-10-10"),
    "2026-10-17",
  );
});

test("nextOccurrenceOnOrAfter is bounded against pathological input", () => {
  const result = nextOccurrenceOnOrAfter(
    { freq: "daily", interval: 1 },
    "1900-01-01",
    "2026-10-10",
    10,
  );
  assert.ok(result, "returns something rather than hanging");
});

test("invalid rules normalise instead of throwing", () => {
  assert.equal(
    nextOccurrence({ freq: "fortnightly", interval: 1 }, "2026-10-10"),
    "2026-10-17",
    "falls back to weekly",
  );
  assert.equal(
    nextOccurrence({ freq: "daily", interval: 0 }, "2026-10-10"),
    "2026-10-11",
    "interval floors at 1",
  );
  assert.equal(nextOccurrence(null, "2026-10-10"), null);
  assert.equal(nextOccurrence({ freq: "daily", interval: 1 }, null), null);
});

test("projectOccurrences previews a run of dates", () => {
  const dates = projectOccurrences(
    { freq: "weekly", interval: 1, weekdays: [1] },
    "2026-10-10",
    3,
  );
  assert.deepEqual(dates, ["2026-10-12", "2026-10-19", "2026-10-26"]);
});

test("describeRecurrence reads as plain language", () => {
  assert.equal(describeRecurrence(null), "Does not repeat");
  assert.equal(describeRecurrence({ freq: "daily", interval: 1 }), "Every day");
  assert.equal(
    describeRecurrence({ freq: "daily", interval: 3 }),
    "Every 3 days",
  );
  assert.equal(
    describeRecurrence({ freq: "weekly", interval: 2, weekdays: [1, 4] }),
    "Every 2 weeks on Mon, Thu",
  );
  assert.equal(
    describeRecurrence({ freq: "monthly", interval: 1 }),
    "Every month",
  );
});
