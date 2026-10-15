import test from "node:test";
import assert from "node:assert/strict";

import {
  createMemoryAdapter,
  createLocalStorageAdapter,
  createBestAdapter,
  migrate,
  hydrate,
  loadState,
  saveState,
  clearState,
  isQuotaError,
  estimateSize,
  STORAGE_KEY,
} from "../js/core/storage.js";
import { SCHEMA_VERSION } from "../js/core/model.js";

test("the memory adapter behaves like Web Storage", () => {
  const adapter = createMemoryAdapter();
  assert.equal(adapter.getItem("missing"), null);
  adapter.setItem("a", "value");
  assert.equal(adapter.getItem("a"), "value");
  adapter.setItem("n", 42);
  assert.equal(adapter.getItem("n"), "42", "values are stringified");
  adapter.removeItem("a");
  assert.equal(adapter.getItem("a"), null);
});

test("createLocalStorageAdapter returns null when storage is absent", () => {
  assert.equal(createLocalStorageAdapter({}), null);
});

test("createLocalStorageAdapter returns null when writes throw", () => {
  const hostile = {
    localStorage: {
      setItem() {
        throw new Error("QuotaExceededError");
      },
      getItem() {
        return null;
      },
      removeItem() {},
    },
  };
  assert.equal(createLocalStorageAdapter(hostile), null);
});

test("createLocalStorageAdapter wraps a working implementation", () => {
  const map = new Map();
  const fake = {
    localStorage: {
      setItem: (k, v) => map.set(k, String(v)),
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      removeItem: (k) => map.delete(k),
    },
  };
  const adapter = createLocalStorageAdapter(fake);
  assert.equal(adapter.kind, "localStorage");
  adapter.setItem("x", "1");
  assert.equal(adapter.getItem("x"), "1");
});

test("createBestAdapter falls back to memory rather than failing", () => {
  const adapter = createBestAdapter({});
  assert.equal(adapter.kind, "memory");
});

test("isQuotaError recognises the browser variants", () => {
  assert.equal(isQuotaError({ name: "QuotaExceededError" }), true);
  assert.equal(isQuotaError({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), true);
  assert.equal(isQuotaError({ code: 22 }), true);
  assert.equal(isQuotaError(new Error("something else")), false);
  assert.equal(isQuotaError(null), false);
});

test("migrate renames v1 collections instead of dropping them", () => {
  const v1 = {
    version: 1,
    journal: [
      { id: "ent_1", title: "Old entry", body: "text", date: "2026-01-01" },
    ],
    quests: [
      {
        id: "qst_1",
        title: "Old quest",
        subtasks: [{ id: "o1", title: "step", done: true }],
      },
    ],
  };
  const migrated = migrate(v1);
  assert.equal(migrated.version, SCHEMA_VERSION);
  assert.equal(migrated.entries.length, 1, "journal became entries");
  assert.equal(migrated.journal, undefined, "old key removed");
  assert.equal(
    migrated.quests[0].objectives.length,
    1,
    "subtasks became objectives",
  );
});

test("migrate is idempotent", () => {
  const once = migrate({ version: 1, journal: [{ id: "e" }], quests: [] });
  const twice = migrate(once);
  assert.deepEqual(twice, once);
});

test("hydrate fills every default so views never guard", () => {
  const state = hydrate({ quests: [{ title: "Bare" }] });
  const quest = state.quests[0];
  assert.ok(quest.id);
  assert.equal(quest.status, "active");
  assert.equal(quest.priority, "standard");
  assert.deepEqual(quest.objectives, []);
  assert.deepEqual(quest.tags, []);
  assert.equal(quest.dueDate, null);
  assert.equal(state.version, SCHEMA_VERSION);
  assert.deepEqual(state.notes, []);
});

test("hydrate drops references to realms and questlines that are gone", () => {
  const state = hydrate({
    categories: [{ id: "cat_1", name: "Kept" }],
    quests: [
      { id: "q1", title: "Valid", categoryId: "cat_1" },
      {
        id: "q2",
        title: "Dangling",
        categoryId: "cat_gone",
        chainId: "chn_gone",
      },
    ],
    notes: [{ id: "n1", title: "Note", body: "x", categoryId: "cat_gone" }],
  });
  assert.equal(state.quests[0].categoryId, "cat_1");
  assert.equal(state.quests[1].categoryId, null);
  assert.equal(state.quests[1].chainId, null);
  assert.equal(state.notes[0].categoryId, null);
});

test("hydrate discards log records with no timestamp", () => {
  const state = hydrate({
    log: [{ id: "l1", at: new Date().toISOString() }, { id: "l2" }],
  });
  assert.equal(state.log.length, 1);
});

test("loadState returns a fresh grimoire when nothing is stored", () => {
  const result = loadState(createMemoryAdapter());
  assert.equal(result.ok, true);
  assert.equal(result.fresh, true);
  assert.deepEqual(result.state.quests, []);
});

test("corrupt stored JSON degrades gracefully instead of throwing", () => {
  const adapter = createMemoryAdapter({ [STORAGE_KEY]: "{ this is not json" });
  const result = loadState(adapter);
  assert.equal(result.ok, false);
  assert.ok(result.message, "a human-readable explanation is supplied");
  assert.deepEqual(result.state.quests, [], "app still starts");
  assert.ok(
    adapter.getItem(STORAGE_KEY),
    "the unreadable data is NOT destroyed",
  );
});

test("saveState reports quota failures rather than throwing", () => {
  const full = {
    setItem() {
      const error = new Error("full");
      error.name = "QuotaExceededError";
      throw error;
    },
    getItem: () => null,
    removeItem: () => {},
  };
  const result = saveState(full, { quests: [] });
  assert.equal(result.ok, false);
  assert.match(result.message, /storage is full/i);
});

test("saveState and loadState round-trip", () => {
  const adapter = createMemoryAdapter();
  const state = hydrate({
    quests: [{ title: "Round trip", priority: "major" }],
  });
  assert.equal(saveState(adapter, state).ok, true);
  const loaded = loadState(adapter);
  assert.equal(loaded.state.quests[0].title, "Round trip");
  assert.equal(loaded.state.quests[0].priority, "major");
});

test("clearState removes the key", () => {
  const adapter = createMemoryAdapter({ [STORAGE_KEY]: "{}" });
  assert.equal(clearState(adapter).ok, true);
  assert.equal(adapter.getItem(STORAGE_KEY), null);
});

test("estimateSize returns a positive byte count", () => {
  assert.ok(estimateSize({ quests: [{ title: "x" }] }) > 0);
});
