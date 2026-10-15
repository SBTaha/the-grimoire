import test from "node:test";
import assert from "node:assert/strict";

import { Store } from "../js/core/store.js";
import { createMemoryAdapter } from "../js/core/storage.js";
import { todayKey, addDays } from "../js/core/dates.js";

function makeStore() {
  const adapter = createMemoryAdapter();
  const store = new Store({ adapter, saveDelay: 0 });
  store.load();
  return { store, adapter };
}

function quest(store, overrides = {}) {
  const result = store.createQuest({ title: "A quest", ...overrides });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result.data;
}

test("creating a quest stores a fully-shaped record", () => {
  const { store } = makeStore();
  const created = quest(store, { title: "Forge the key", priority: "major" });

  assert.equal(store.state.quests.length, 1);
  assert.equal(created.status, "active");
  assert.equal(created.priority, "major");
  assert.deepEqual(created.objectives, []);
  assert.deepEqual(created.tags, []);
  assert.ok(created.id && created.createdAt);
});

test("creating an invalid quest changes nothing and reports the field", () => {
  const { store } = makeStore();
  const result = store.createQuest({ title: "" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.title);
  assert.equal(store.state.quests.length, 0);
});

test("updating a quest validates the merged record, not just the patch", () => {
  const { store } = makeStore();
  const created = quest(store);
  const bad = store.updateQuest(created.id, { title: "" });
  assert.equal(bad.ok, false);
  assert.equal(
    store.questById(created.id).title,
    "A quest",
    "original survives",
  );

  const good = store.updateQuest(created.id, {
    title: "Renamed",
    priority: "legendary",
  });
  assert.equal(good.ok, true);
  assert.equal(store.questById(created.id).title, "Renamed");
  assert.equal(store.questById(created.id).priority, "legendary");
});

test("deleting a quest also unlinks it from journal entries", () => {
  const { store } = makeStore();
  const created = quest(store);
  const entry = store.createEntry({
    title: "Day one",
    body: "Linked.",
    date: todayKey(),
    linkedQuestIds: [created.id],
  });
  assert.equal(entry.ok, true);

  store.deleteQuest(created.id);
  assert.equal(store.state.quests.length, 0);
  assert.deepEqual(
    store.state.entries[0].linkedQuestIds,
    [],
    "dangling link removed",
  );
});

test("tags are normalised on the way in", () => {
  const { store } = makeStore();
  const created = quest(store, { tags: " #Smithing , smithing,  IRON ,, " });
  assert.deepEqual(
    created.tags,
    ["smithing", "iron"],
    "trimmed, lowercased, de-duplicated",
  );
});

test("completing a quest writes an immutable log record", () => {
  const { store } = makeStore();
  const created = quest(store, { priority: "major" });
  const result = store.completeQuest(created.id);

  assert.equal(result.ok, true);
  assert.equal(result.xp, 60);
  assert.equal(store.questById(created.id).status, "completed");
  assert.ok(store.questById(created.id).completedAt);
  assert.equal(store.state.log.length, 1);
  assert.equal(store.state.log[0].xp, 60);
});

test("history survives deletion of the quest that produced it", () => {
  const { store } = makeStore();
  const created = quest(store, { priority: "legendary" });
  store.completeQuest(created.id);
  store.deleteQuest(created.id);

  assert.equal(store.state.quests.length, 0);
  assert.equal(store.state.log.length, 1, "log is append-only");
  assert.equal(store.state.log[0].xp, 150);
});

test("completing a quest twice is refused", () => {
  const { store } = makeStore();
  const created = quest(store);
  store.completeQuest(created.id);
  const second = store.completeQuest(created.id);
  assert.equal(second.ok, false);
  assert.equal(store.state.log.length, 1, "no duplicate XP");
});

test("reopening a quest withdraws its most recent log record", () => {
  const { store } = makeStore();
  const created = quest(store);
  store.completeQuest(created.id);
  store.reopenQuest(created.id);

  assert.equal(store.questById(created.id).status, "active");
  assert.equal(store.questById(created.id).completedAt, null);
  assert.equal(store.state.log.length, 0);
});

test("completing a quest ticks all of its objectives", () => {
  const { store } = makeStore();
  const created = quest(store, {
    objectives: [{ title: "one" }, { title: "two" }],
  });
  store.completeQuest(created.id);
  assert.ok(store.questById(created.id).objectives.every((o) => o.done));
});

test("toggling an objective flips only that objective", () => {
  const { store } = makeStore();
  const created = quest(store, {
    objectives: [{ title: "one" }, { title: "two" }],
  });
  const [first] = store.questById(created.id).objectives;
  store.toggleObjective(created.id, first.id);

  const after = store.questById(created.id).objectives;
  assert.equal(after[0].done, true);
  assert.equal(after[1].done, false);
});

test("a questline step is sealed until earlier steps are complete", () => {
  const { store } = makeStore();
  const chain = store.createChain({ name: "The Long Road" }).data;
  const first = quest(store, { title: "Step one", chainId: chain.id });
  const second = quest(store, { title: "Step two", chainId: chain.id });

  assert.equal(store.isSealed(first), false);
  assert.equal(store.isSealed(second), true);

  const blocked = store.completeQuest(second.id);
  assert.equal(blocked.ok, false);
  assert.match(blocked.message, /earlier steps/i);
  assert.equal(store.state.log.length, 0, "no XP awarded for a blocked step");

  store.completeQuest(first.id);
  assert.equal(store.isSealed(store.questById(second.id)), false);
  assert.equal(store.completeQuest(second.id).ok, true);
});

test("chain steps are numbered in creation order", () => {
  const { store } = makeStore();
  const chain = store.createChain({ name: "Line" }).data;
  const a = quest(store, { title: "A", chainId: chain.id });
  const b = quest(store, { title: "B", chainId: chain.id });
  assert.equal(a.chainOrder, 0);
  assert.equal(b.chainOrder, 1);
});

test("reordering a questline renumbers the whole run", () => {
  const { store } = makeStore();
  const chain = store.createChain({ name: "Line" }).data;
  quest(store, { title: "A", chainId: chain.id });
  const b = quest(store, { title: "B", chainId: chain.id });
  quest(store, { title: "C", chainId: chain.id });

  store.moveQuestInChain(b.id, "up");
  assert.deepEqual(
    store.questsInChain(chain.id).map((s) => s.title),
    ["B", "A", "C"],
  );
  assert.deepEqual(
    store.questsInChain(chain.id).map((s) => s.chainOrder),
    [0, 1, 2],
  );
});

test("moving beyond the ends of a questline is refused", () => {
  const { store } = makeStore();
  const chain = store.createChain({ name: "Line" }).data;
  const a = quest(store, { title: "A", chainId: chain.id });
  assert.equal(store.moveQuestInChain(a.id, "up").ok, false);
  assert.equal(store.moveQuestInChain(a.id, "down").ok, false);
});

test("chainProgress reports the next actionable step", () => {
  const { store } = makeStore();
  const chain = store.createChain({ name: "Line" }).data;
  const a = quest(store, { title: "A", chainId: chain.id });
  quest(store, { title: "B", chainId: chain.id });

  assert.equal(store.chainProgress(chain.id).next.title, "A");
  store.completeQuest(a.id);
  const progress = store.chainProgress(chain.id);
  assert.equal(progress.done, 1);
  assert.equal(progress.total, 2);
  assert.equal(progress.ratio, 0.5);
  assert.equal(progress.next.title, "B");
});

test("deleting a questline detaches its steps instead of destroying them", () => {
  const { store } = makeStore();
  const chain = store.createChain({ name: "Line" }).data;
  const a = quest(store, { title: "A", chainId: chain.id });

  store.deleteChain(chain.id);
  assert.equal(store.state.chains.length, 0);
  assert.equal(store.state.quests.length, 1, "quest survives");
  assert.equal(store.questById(a.id).chainId, null);
});

test("completing a recurring quest spawns the next instance", () => {
  const { store } = makeStore();
  const today = todayKey();
  const created = quest(store, {
    title: "Tend the forge",
    dueDate: today,
    recurrence: { freq: "daily", interval: 1 },
    objectives: [{ title: "bank the coals" }],
  });

  const result = store.completeQuest(created.id);
  assert.equal(result.ok, true);
  assert.ok(result.spawned, "a successor was created");
  assert.equal(result.spawned.dueDate, addDays(today, 1));
  assert.equal(result.spawned.status, "active");
  assert.notEqual(result.spawned.id, created.id, "a distinct record");
  assert.equal(result.spawned.objectives[0].done, false, "objectives reset");
  assert.notEqual(
    result.spawned.objectives[0].id,
    created.objectives[0].id,
    "fresh objective ids",
  );
  assert.equal(result.spawned.originId, created.id, "series stays traceable");
  assert.equal(store.state.quests.length, 2);
});

test("a long-neglected recurring quest does not backfill the missed run", () => {
  const { store } = makeStore();
  const today = todayKey();
  const created = quest(store, {
    title: "Daily drill",
    dueDate: addDays(today, -30),
    recurrence: { freq: "daily", interval: 1 },
  });

  const result = store.completeQuest(created.id);
  assert.equal(
    store.state.quests.length,
    2,
    "exactly one successor, not thirty",
  );
  assert.equal(result.spawned.dueDate, today, "rescheduled to the present");
});

test("a non-recurring quest spawns nothing", () => {
  const { store } = makeStore();
  const created = quest(store, { dueDate: todayKey() });
  const result = store.completeQuest(created.id);
  assert.equal(result.spawned, null);
  assert.equal(store.state.quests.length, 1);
});

test("deleting a realm unassigns its quests and notes rather than deleting them", () => {
  const { store } = makeStore();
  const realm = store.createCategory({ name: "Arcane Study" }).data;
  const q = quest(store, { categoryId: realm.id });
  const note = store.createNote({
    title: "Note",
    body: "text",
    categoryId: realm.id,
  }).data;

  store.deleteCategory(realm.id);
  assert.equal(store.state.categories.length, 0);
  assert.equal(store.questById(q.id).categoryId, null);
  assert.equal(store.noteById(note.id).categoryId, null);
  assert.equal(store.state.quests.length, 1);
  assert.equal(store.state.notes.length, 1);
});

test("filters narrow by status, priority, realm and tag", () => {
  const { store } = makeStore();
  const realm = store.createCategory({ name: "Forge" }).data;
  quest(store, {
    title: "Alpha",
    priority: "legendary",
    categoryId: realm.id,
    tags: "iron",
  });
  const done = quest(store, { title: "Beta", priority: "minor" });
  store.completeQuest(done.id);

  assert.deepEqual(
    store.filterQuests({ status: "active" }).map((q) => q.title),
    ["Alpha"],
  );
  assert.deepEqual(
    store.filterQuests({ status: "completed" }).map((q) => q.title),
    ["Beta"],
  );
  assert.equal(store.filterQuests({ status: "all" }).length, 2);
  assert.deepEqual(
    store.filterQuests({ priority: "legendary" }).map((q) => q.title),
    ["Alpha"],
  );
  assert.deepEqual(
    store.filterQuests({ categoryId: realm.id }).map((q) => q.title),
    ["Alpha"],
  );
  assert.deepEqual(
    store.filterQuests({ tag: "iron" }).map((q) => q.title),
    ["Alpha"],
  );
  assert.equal(
    store.filterQuests({ categoryId: "none", status: "all" }).length,
    1,
    "unassigned filter",
  );
});

test("due-window filters use today as the pivot", () => {
  const { store } = makeStore();
  const today = todayKey();
  quest(store, { title: "Overdue", dueDate: addDays(today, -2) });
  quest(store, { title: "Today", dueDate: today });
  quest(store, { title: "Soon", dueDate: addDays(today, 3) });
  quest(store, { title: "Far", dueDate: addDays(today, 90) });
  quest(store, { title: "Undated" });

  assert.deepEqual(
    store.filterQuests({ due: "overdue" }).map((q) => q.title),
    ["Overdue"],
  );
  assert.deepEqual(
    store.filterQuests({ due: "today" }).map((q) => q.title),
    ["Today"],
  );
  assert.deepEqual(
    store.filterQuests({ due: "week" }).map((q) => q.title),
    ["Today", "Soon"],
  );
  assert.deepEqual(
    store.filterQuests({ due: "undated" }).map((q) => q.title),
    ["Undated"],
  );
});

test("deadline sort places undated quests last", () => {
  const { store } = makeStore();
  const today = todayKey();
  quest(store, { title: "Undated" });
  quest(store, { title: "Later", dueDate: addDays(today, 5) });
  quest(store, { title: "Sooner", dueDate: addDays(today, 1) });

  assert.deepEqual(
    store.filterQuests({ sort: "due-asc" }).map((q) => q.title),
    ["Sooner", "Later", "Undated"],
  );
  assert.deepEqual(
    store.filterQuests({ sort: "due-desc" }).map((q) => q.title),
    ["Later", "Sooner", "Undated"],
  );
});

test("priority sort runs legendary to minor", () => {
  const { store } = makeStore();
  quest(store, { title: "Minor", priority: "minor" });
  quest(store, { title: "Legendary", priority: "legendary" });
  quest(store, { title: "Standard", priority: "standard" });

  assert.deepEqual(
    store.filterQuests({ sort: "priority-desc" }).map((q) => q.title),
    ["Legendary", "Standard", "Minor"],
  );
});

test("a search query ranks by relevance and excludes non-matches", () => {
  const { store } = makeStore();
  quest(store, { title: "The iron key", description: "nothing" });
  quest(store, {
    title: "A wooden door",
    description: "mentions the key in passing",
  });
  quest(store, { title: "Unrelated errand" });

  const found = store.filterQuests({ query: "key" });
  assert.equal(found.length, 2);
  assert.equal(found[0].title, "The iron key", "title match ranks first");
});

test("an explicit sort overrides relevance ordering", () => {
  const { store } = makeStore();
  quest(store, { title: "Key beta", priority: "minor" });
  quest(store, { title: "Key alpha", priority: "legendary" });
  const sorted = store.filterQuests({ query: "key", sort: "priority-desc" });
  assert.equal(sorted[0].title, "Key alpha");
});

test("upcoming includes overdue quests and respects the horizon", () => {
  const { store } = makeStore();
  const today = todayKey();
  quest(store, { title: "Overdue", dueDate: addDays(today, -1) });
  quest(store, { title: "Soon", dueDate: addDays(today, 2) });
  quest(store, { title: "Far", dueDate: addDays(today, 30) });

  assert.deepEqual(
    store.upcoming(7).map((q) => q.title),
    ["Overdue", "Soon"],
  );
});

test("state survives a reload through the same adapter", () => {
  const adapter = createMemoryAdapter();
  const first = new Store({ adapter, saveDelay: 0 });
  first.load();
  first.createQuest({ title: "Persisted", priority: "major" });
  first.flush();

  const second = new Store({ adapter, saveDelay: 0 });
  second.load();
  assert.equal(second.state.quests.length, 1);
  assert.equal(second.state.quests[0].title, "Persisted");
  assert.equal(second.state.quests[0].priority, "major");
});

test("export and import round-trip without loss", () => {
  const { store } = makeStore();
  store.createCategory({ name: "Forge" });
  const q = quest(store, { title: "Round trip", tags: "iron" });
  store.completeQuest(q.id);
  store.createNote({ title: "Note", body: "body" });
  const archive = JSON.parse(JSON.stringify(store.exportArchive()));

  const { store: fresh } = makeStore();
  const result = fresh.importArchive(archive);
  assert.equal(result.ok, true);
  assert.equal(fresh.state.quests.length, 1);
  assert.equal(fresh.state.quests[0].title, "Round trip");
  assert.deepEqual(fresh.state.quests[0].tags, ["iron"]);
  assert.equal(fresh.state.notes.length, 1);
  assert.equal(fresh.state.log.length, 1);
  assert.equal(fresh.state.categories.length, 1);
});

test("merge import keeps existing records and skips duplicate ids", () => {
  const { store } = makeStore();
  quest(store, { title: "Mine" });
  const archive = store.exportArchive();
  const extra = new Store({ adapter: createMemoryAdapter(), saveDelay: 0 });
  extra.load();
  extra.createQuest({ title: "Theirs" });
  const theirs = JSON.parse(JSON.stringify(extra.exportArchive()));

  store.importArchive(theirs, { mode: "merge" });
  assert.deepEqual(store.state.quests.map((q) => q.title).sort(), [
    "Mine",
    "Theirs",
  ]);

  store.importArchive(archive, { mode: "merge" });
  assert.equal(
    store.state.quests.filter((q) => q.title === "Mine").length,
    1,
    "no duplicate",
  );
});

test("importing a malformed archive is refused and leaves state intact", () => {
  const { store } = makeStore();
  quest(store, { title: "Safe" });
  const result = store.importArchive({ nonsense: true });
  assert.equal(result.ok, false);
  assert.equal(store.state.quests.length, 1);
});

test("removing sample data leaves user records untouched", () => {
  const { store } = makeStore();
  store.seed({
    categories: [{ id: "cat_seed", name: "Sample realm", seed: true }],
    quests: [
      {
        id: "qst_seed",
        title: "Sample quest",
        categoryId: "cat_seed",
        seed: true,
      },
    ],
    notes: [{ id: "not_seed", title: "Sample note", body: "x", seed: true }],
    log: [
      {
        id: "log_seed",
        questId: "qst_seed",
        priority: "minor",
        xp: 10,
        at: new Date().toISOString(),
      },
    ],
  });
  const mine = quest(store, { title: "Mine", categoryId: "cat_seed" });

  store.removeSeedData();
  assert.equal(store.state.quests.length, 1);
  assert.equal(store.state.quests[0].title, "Mine");
  assert.equal(
    store.questById(mine.id).categoryId,
    null,
    "reference to removed realm cleared",
  );
  assert.equal(store.state.notes.length, 0);
  assert.equal(store.state.log.length, 0);
  assert.equal(store.state.settings.seeded, false);
});

test("reset empties the grimoire and clears storage", () => {
  const { store, adapter } = makeStore();
  quest(store, { title: "Gone" });
  store.flush();
  store.reset();
  assert.equal(store.state.quests.length, 0);
  assert.equal(adapter.getItem("grimoire:state"), null);
});

test("subscribers receive a reason and can unsubscribe", () => {
  const { store } = makeStore();
  const reasons = [];
  const unsubscribe = store.subscribe((reason) => reasons.push(reason));

  store.createQuest({ title: "One" });
  store.createNote({ title: "Note", body: "body" });
  assert.deepEqual(reasons, ["quests", "notes"]);

  unsubscribe();
  store.createQuest({ title: "Two" });
  assert.equal(reasons.length, 2, "no further notifications");
});

test("a throwing subscriber does not stop the others", () => {
  const { store } = makeStore();
  let reached = false;
  store.subscribe(() => {
    throw new Error("boom");
  });
  store.subscribe(() => {
    reached = true;
  });
  store.createQuest({ title: "Resilient" });
  assert.equal(reached, true);
});
