import test from "node:test";
import assert from "node:assert/strict";

import {
  validateQuest,
  validateCategory,
  validateChain,
  validateEntry,
  validateNote,
  validateImport,
  validateTags,
  LIMITS,
} from "../js/core/validate.js";

test("a quest requires a title", () => {
  const result = validateQuest({ title: "   " });
  assert.equal(result.ok, false);
  assert.match(result.errors.title, /required/i);
});

test("a quest title is length-capped", () => {
  const result = validateQuest({ title: "x".repeat(LIMITS.title + 1) });
  assert.equal(result.ok, false);
  assert.ok(result.errors.title);
});

test("a minimal valid quest passes and is trimmed", () => {
  const result = validateQuest({ title: "  Forge the key  " });
  assert.equal(result.ok, true);
  assert.equal(result.value.title, "Forge the key");
});

test("a quest rejects an impossible due date", () => {
  assert.equal(validateQuest({ title: "ok", dueDate: "2026-02-30" }).ok, false);
  assert.equal(validateQuest({ title: "ok", dueDate: "2026-10-10" }).ok, true);
});

test("a quest rejects unknown priority and status", () => {
  assert.ok(validateQuest({ title: "ok", priority: "mythic" }).errors.priority);
  assert.ok(validateQuest({ title: "ok", status: "pending" }).errors.status);
});

test("a quest rejects references to realms and questlines that do not exist", () => {
  const context = { categoryIds: ["cat_1"], chainIds: ["chn_1"] };
  assert.ok(
    validateQuest({ title: "ok", categoryId: "cat_missing" }, context).errors
      .categoryId,
  );
  assert.ok(
    validateQuest({ title: "ok", chainId: "chn_missing" }, context).errors
      .chainId,
  );
  assert.equal(
    validateQuest(
      { title: "ok", categoryId: "cat_1", chainId: "chn_1" },
      context,
    ).ok,
    true,
  );
});

test("a recurring quest must have a first due date to count forward from", () => {
  const noDate = validateQuest({
    title: "ok",
    recurrence: { freq: "weekly", interval: 1 },
  });
  assert.equal(noDate.ok, false);
  assert.match(noDate.errors.dueDate, /first due date/i);

  const withDate = validateQuest({
    title: "ok",
    dueDate: "2026-10-12",
    recurrence: { freq: "weekly", interval: 1 },
  });
  assert.equal(withDate.ok, true);
});

test("a recurrence interval is bounded", () => {
  const base = { title: "ok", dueDate: "2026-10-12" };
  assert.ok(
    validateQuest({ ...base, recurrence: { freq: "daily", interval: 0 } })
      .errors.recurrence,
  );
  assert.ok(
    validateQuest({ ...base, recurrence: { freq: "daily", interval: 99 } })
      .errors.recurrence,
  );
  assert.ok(
    validateQuest({ ...base, recurrence: { freq: "hourly", interval: 1 } })
      .errors.recurrence,
  );
});

test("objectives are capped in count and length", () => {
  const many = Array.from({ length: LIMITS.objectives + 1 }, () => ({
    title: "step",
  }));
  assert.ok(validateQuest({ title: "ok", objectives: many }).errors.objectives);

  const long = [{ title: "x".repeat(LIMITS.objectiveTitle + 1) }];
  assert.ok(validateQuest({ title: "ok", objectives: long }).errors.objectives);
});

test("tags are capped in count and length", () => {
  assert.ok(
    validateTags(Array.from({ length: LIMITS.tags + 1 }, (_, i) => `t${i}`)),
  );
  assert.ok(validateTags(["x".repeat(LIMITS.tagLength + 1)]));
  assert.equal(validateTags(["one", "two"]), null);
  assert.equal(validateTags(""), null);
});

test("realm names must be unique, ignoring case", () => {
  const categories = [{ id: "cat_1", name: "Arcane Study" }];
  const clash = validateCategory({ name: "arcane study" }, { categories });
  assert.equal(clash.ok, false);
  assert.match(clash.errors.name, /already exists/i);

  const self = validateCategory(
    { id: "cat_1", name: "Arcane Study" },
    { categories },
  );
  assert.equal(self.ok, true);
});

test("realm colour must be hex", () => {
  assert.ok(validateCategory({ name: "Realm", color: "purple" }).errors.color);
  assert.equal(validateCategory({ name: "Realm", color: "#9b7bd4" }).ok, true);
});

test("a questline requires a name", () => {
  assert.equal(validateChain({ name: "" }).ok, false);
  assert.equal(validateChain({ name: "The Long Road" }).ok, true);
});

test("a journal entry requires a date, a title and a body", () => {
  assert.ok(validateEntry({ title: "Day one", body: "text" }).errors.date);
  assert.ok(
    validateEntry({ title: "", body: "text", date: "2026-10-10" }).errors.title,
  );
  assert.ok(
    validateEntry({ title: "Day one", body: "  ", date: "2026-10-10" }).errors
      .body,
  );
  assert.equal(
    validateEntry({ title: "Day one", body: "text", date: "2026-10-10" }).ok,
    true,
  );
});

test("a codex note requires a title and a body", () => {
  assert.ok(validateNote({ title: "", body: "text" }).errors.title);
  assert.ok(validateNote({ title: "Note", body: "" }).errors.body);
  assert.equal(validateNote({ title: "Note", body: "text" }).ok, true);
});

test("import validation rejects anything that is not an archive", () => {
  assert.equal(validateImport(null).ok, false);
  assert.equal(validateImport("a string").ok, false);
  assert.equal(validateImport([]).ok, false);
  assert.equal(
    validateImport({ unrelated: true }).ok,
    false,
    "no known collections",
  );
  assert.equal(validateImport({ quests: "not a list" }).ok, false);
  assert.equal(validateImport({ quests: [], notes: [] }).ok, true);
});
