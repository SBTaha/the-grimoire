import { clone, debounce, sortBy, unique } from "./util.js";
import { nowISO, todayKey, diffDays } from "./dates.js";
import {
  makeQuest,
  makeChain,
  makeCategory,
  makeEntry,
  makeNote,
  makeObjective,
  makeLogRecord,
  makeRecurrence,
  normalizeTags,
  questProgress,
  priorityOf,
  emptyState,
  SCHEMA_VERSION,
} from "./model.js";
import {
  validateQuest,
  validateCategory,
  validateChain,
  validateEntry,
  validateNote,
  validateImport,
} from "./validate.js";
import { nextOccurrenceOnOrAfter } from "./recurrence.js";
import { rank } from "./search.js";
import {
  loadState,
  saveState,
  clearState,
  hydrate,
  estimateSize,
  STORAGE_KEY,
} from "./storage.js";

export const DEFAULT_FILTERS = Object.freeze({
  query: "",
  status: "active",
  categoryId: "all",
  priority: "all",
  tag: "all",
  due: "all",
  chainId: "all",
  sort: "due-asc",
});

export const SORTS = [
  { id: "due-asc", label: "Deadline, soonest first" },
  { id: "due-desc", label: "Deadline, latest first" },
  { id: "priority-desc", label: "Priority, highest first" },
  { id: "progress-desc", label: "Progress, furthest along" },
  { id: "created-desc", label: "Newest first" },
  { id: "created-asc", label: "Oldest first" },
  { id: "title-asc", label: "Name, A to Z" },
];

export class Store {
  #state;
  #adapter;
  #key;
  #listeners = new Set();
  #save;

  constructor({ adapter, key = STORAGE_KEY, saveDelay = 250 } = {}) {
    this.#adapter = adapter;
    this.#key = key;
    this.#state = emptyState();
    this.lastError = null;
    this.#save = debounce(() => this.flush(), saveDelay);
  }

  load() {
    const result = loadState(this.#adapter, this.#key);
    this.#state = result.state;
    if (!result.ok) this.lastError = result.message;
    this.#emit("load");
    return result;
  }

  flush() {
    const result = saveState(this.#adapter, this.#state, this.#key);
    if (!result.ok) {
      this.lastError = result.message;
      this.#emit("storage-error");
    }
    return result;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(reason, detail = null) {
    for (const listener of this.#listeners) {
      try {
        listener(reason, detail);
      } catch (error) {
        console.error("[grimoire] subscriber failed", error);
      }
    }
  }

  #commit(reason, detail) {
    this.#save();
    this.#emit(reason, detail);
  }

  get state() {
    return this.#state;
  }

  get today() {
    return todayKey();
  }

  categoryById(id) {
    return this.#state.categories.find((c) => c.id === id) ?? null;
  }

  chainById(id) {
    return this.#state.chains.find((c) => c.id === id) ?? null;
  }

  questById(id) {
    return this.#state.quests.find((q) => q.id === id) ?? null;
  }

  entryById(id) {
    return this.#state.entries.find((e) => e.id === id) ?? null;
  }

  noteById(id) {
    return this.#state.notes.find((n) => n.id === id) ?? null;
  }

  questsInChain(chainId) {
    return sortBy(
      this.#state.quests.filter((q) => q.chainId === chainId),
      (a, b) => a.chainOrder - b.chainOrder,
      (a, b) => a.createdAt.localeCompare(b.createdAt),
    );
  }

  isSealed(quest) {
    if (!quest?.chainId) return false;
    return this.questsInChain(quest.chainId).some(
      (step) =>
        step.chainOrder < quest.chainOrder && step.status !== "completed",
    );
  }

  chainProgress(chainId) {
    const steps = this.questsInChain(chainId);
    const done = steps.filter((s) => s.status === "completed").length;
    return {
      steps,
      done,
      total: steps.length,
      ratio: steps.length ? done / steps.length : 0,
      next: steps.find((s) => s.status === "active") ?? null,
    };
  }

  allTags() {
    const tags = [
      ...this.#state.quests.flatMap((q) => q.tags),
      ...this.#state.notes.flatMap((n) => n.tags),
      ...this.#state.entries.flatMap((e) => e.tags),
    ];
    return unique(tags).sort();
  }

  questTags() {
    return unique(this.#state.quests.flatMap((q) => q.tags)).sort();
  }

  filterQuests(filters = {}) {
    const f = { ...DEFAULT_FILTERS, ...filters };
    const today = this.today;
    let list = [...this.#state.quests];

    if (f.status !== "all") list = list.filter((q) => q.status === f.status);
    if (f.categoryId !== "all") {
      list = list.filter((q) =>
        f.categoryId === "none" ? !q.categoryId : q.categoryId === f.categoryId,
      );
    }
    if (f.priority !== "all")
      list = list.filter((q) => q.priority === f.priority);
    if (f.tag !== "all") list = list.filter((q) => q.tags.includes(f.tag));
    if (f.chainId !== "all") {
      list = list.filter((q) =>
        f.chainId === "none" ? !q.chainId : q.chainId === f.chainId,
      );
    }

    if (f.due !== "all") {
      list = list.filter((q) => {
        if (f.due === "undated") return !q.dueDate;
        if (!q.dueDate) return false;
        const delta = diffDays(today, q.dueDate);
        if (delta === null) return false;
        if (f.due === "overdue") return delta < 0;
        if (f.due === "today") return delta === 0;
        if (f.due === "week") return delta >= 0 && delta <= 7;
        if (f.due === "month") return delta >= 0 && delta <= 31;
        return true;
      });
    }

    if (f.query.trim()) {
      const ranked = rank(f.query, list, (q) => ({
        title: q.title,
        body: `${q.description} ${q.objectives.map((o) => o.title).join(" ")}`,
        tags: q.tags,
      }));
      list = ranked.map((hit) => hit.item);
      if (f.sort === DEFAULT_FILTERS.sort) return list;
    }

    return this.#applySort(list, f.sort);
  }

  #applySort(list, sort) {
    const undatedLast = (a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return 0;
    };
    const byTitle = (a, b) => a.title.localeCompare(b.title);

    switch (sort) {
      case "due-desc":
        return sortBy(
          list,
          undatedLast,
          (a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""),
          byTitle,
        );
      case "priority-desc":
        return sortBy(
          list,
          (a, b) => priorityOf(b.priority).rank - priorityOf(a.priority).rank,
          undatedLast,
          (a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
        );
      case "progress-desc":
        return sortBy(
          list,
          (a, b) => questProgress(b) - questProgress(a),
          byTitle,
        );
      case "created-desc":
        return sortBy(list, (a, b) => b.createdAt.localeCompare(a.createdAt));
      case "created-asc":
        return sortBy(list, (a, b) => a.createdAt.localeCompare(b.createdAt));
      case "title-asc":
        return sortBy(list, byTitle);
      case "due-asc":
      default:
        return sortBy(
          list,
          undatedLast,
          (a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
          byTitle,
        );
    }
  }

  upcoming(days = 7) {
    const today = this.today;
    return sortBy(
      this.#state.quests.filter((q) => {
        if (q.status !== "active" || !q.dueDate) return false;
        const delta = diffDays(today, q.dueDate);
        return delta !== null && delta <= days;
      }),
      (a, b) => a.dueDate.localeCompare(b.dueDate),
      (a, b) => priorityOf(b.priority).rank - priorityOf(a.priority).rank,
    );
  }

  searchEntries(query) {
    const list = sortBy(this.#state.entries, (a, b) =>
      (b.date ?? "").localeCompare(a.date ?? ""),
    );
    if (!query?.trim()) return list;
    return rank(query, list, (e) => ({
      title: e.title,
      body: e.body,
      tags: e.tags,
    })).map((h) => h.item);
  }

  searchNotes(query, { tag = "all", categoryId = "all" } = {}) {
    let list = [...this.#state.notes];
    if (tag !== "all") list = list.filter((n) => n.tags.includes(tag));
    if (categoryId !== "all") {
      list = list.filter((n) =>
        categoryId === "none" ? !n.categoryId : n.categoryId === categoryId,
      );
    }
    if (query?.trim()) {
      list = rank(query, list, (n) => ({
        title: n.title,
        body: n.body,
        tags: n.tags,
      })).map((h) => h.item);
    } else {
      list = sortBy(list, (a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return sortBy(list, (a, b) => Number(b.pinned) - Number(a.pinned));
  }

  counts() {
    const s = this.#state;
    return {
      quests: s.quests.length,
      active: s.quests.filter((q) => q.status === "active").length,
      completed: s.quests.filter((q) => q.status === "completed").length,
      archived: s.quests.filter((q) => q.status === "archived").length,
      categories: s.categories.length,
      chains: s.chains.length,
      entries: s.entries.length,
      notes: s.notes.length,
      log: s.log.length,
      seeded:
        s.quests.some((q) => q.seed) ||
        s.notes.some((n) => n.seed) ||
        s.entries.some((e) => e.seed),
      bytes: estimateSize(s),
    };
  }

  createQuest(input) {
    const check = validateQuest(input, this.#context());
    if (!check.ok) return check;
    const quest = makeQuest({
      ...input,
      recurrence: input.recurrence ? makeRecurrence(input.recurrence) : null,
      tags: normalizeTags(input.tags),
      chainOrder: input.chainId ? this.#nextChainOrder(input.chainId) : 0,
    });
    this.#state.quests.push(quest);
    this.#commit("quests", { id: quest.id });
    return { ok: true, errors: {}, data: quest };
  }

  updateQuest(id, patch) {
    const quest = this.questById(id);
    if (!quest)
      return { ok: false, errors: { form: "That quest no longer exists." } };
    const merged = { ...quest, ...patch };
    const check = validateQuest(merged, this.#context());
    if (!check.ok) return check;

    const movedChain = "chainId" in patch && patch.chainId !== quest.chainId;
    Object.assign(quest, {
      ...merged,
      recurrence: merged.recurrence ? makeRecurrence(merged.recurrence) : null,
      tags: normalizeTags(merged.tags),
      objectives: (merged.objectives ?? []).map(makeObjective),
      chainOrder:
        movedChain && merged.chainId
          ? this.#nextChainOrder(merged.chainId)
          : quest.chainOrder,
      updatedAt: nowISO(),
    });
    this.#commit("quests", { id });
    return { ok: true, errors: {}, data: quest };
  }

  deleteQuest(id) {
    const index = this.#state.quests.findIndex((q) => q.id === id);
    if (index === -1)
      return { ok: false, message: "That quest no longer exists." };
    const [removed] = this.#state.quests.splice(index, 1);
    // Keep journal links honest.
    for (const entry of this.#state.entries) {
      if (entry.linkedQuestIds.includes(id)) {
        entry.linkedQuestIds = entry.linkedQuestIds.filter((q) => q !== id);
      }
    }
    this.#commit("quests", { id });
    return { ok: true, data: removed };
  }

  completeQuest(id) {
    const quest = this.questById(id);
    if (!quest) return { ok: false, message: "That quest no longer exists." };
    if (quest.status === "completed")
      return { ok: false, message: "That quest is already complete." };
    if (this.isSealed(quest)) {
      return {
        ok: false,
        message: "Earlier steps in this questline must be completed first.",
      };
    }

    const at = nowISO();
    quest.status = "completed";
    quest.completedAt = at;
    quest.updatedAt = at;
    quest.objectives = quest.objectives.map((o) => ({ ...o, done: true }));
    this.#state.log.push({
      ...makeLogRecord(quest, at),
      seed: Boolean(quest.seed),
    });

    let spawned = null;
    if (quest.recurrence) {
      const anchor = quest.dueDate ?? todayKey();
      const nextDue = nextOccurrenceOnOrAfter(
        quest.recurrence,
        anchor,
        todayKey(),
      );
      spawned = makeQuest({
        ...quest,
        id: undefined,
        status: "active",
        completedAt: null,
        dueDate: nextDue,
        objectives: quest.objectives.map((o) => ({
          ...o,
          id: undefined,
          done: false,
        })),
        originId: quest.originId ?? quest.id,
        createdAt: at,
        updatedAt: at,
      });
      this.#state.quests.push(spawned);
    }

    this.#commit("quests", { id, spawned: spawned?.id ?? null });
    return {
      ok: true,
      data: quest,
      spawned,
      xp: priorityOf(quest.priority).xp,
    };
  }

  reopenQuest(id) {
    const quest = this.questById(id);
    if (!quest) return { ok: false, message: "That quest no longer exists." };
    quest.status = "active";
    quest.completedAt = null;
    quest.updatedAt = nowISO();
    for (let i = this.#state.log.length - 1; i >= 0; i -= 1) {
      if (this.#state.log[i].questId === id) {
        this.#state.log.splice(i, 1);
        break;
      }
    }
    this.#commit("quests", { id });
    return { ok: true, data: quest };
  }

  setQuestStatus(id, status) {
    if (status === "completed") return this.completeQuest(id);
    if (status === "active") return this.reopenQuest(id);
    const quest = this.questById(id);
    if (!quest) return { ok: false, message: "That quest no longer exists." };
    quest.status = "archived";
    quest.updatedAt = nowISO();
    this.#commit("quests", { id });
    return { ok: true, data: quest };
  }

  toggleObjective(questId, objectiveId) {
    const quest = this.questById(questId);
    if (!quest) return { ok: false, message: "That quest no longer exists." };
    const objective = quest.objectives.find((o) => o.id === objectiveId);
    if (!objective)
      return { ok: false, message: "That objective no longer exists." };
    objective.done = !objective.done;
    quest.updatedAt = nowISO();
    this.#commit("quests", { id: questId, objectiveId });
    return { ok: true, data: objective };
  }

  #nextChainOrder(chainId) {
    const steps = this.questsInChain(chainId);
    return steps.length ? Math.max(...steps.map((s) => s.chainOrder)) + 1 : 0;
  }

  moveQuestInChain(questId, direction) {
    const quest = this.questById(questId);
    if (!quest?.chainId)
      return { ok: false, message: "That quest is not part of a questline." };
    const steps = this.questsInChain(quest.chainId);
    const index = steps.findIndex((s) => s.id === questId);
    const target = index + (direction === "up" ? -1 : 1);
    if (target < 0 || target >= steps.length)
      return { ok: false, message: "Already at the end of the line." };
    const reordered = [...steps];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    reordered.forEach((step, i) => {
      step.chainOrder = i;
      step.updatedAt = nowISO();
    });
    this.#commit("quests", { id: questId });
    return { ok: true };
  }

  createCategory(input) {
    const check = validateCategory(input, {
      categories: this.#state.categories,
    });
    if (!check.ok) return check;
    const category = makeCategory(check.value);
    this.#state.categories.push(category);
    this.#commit("categories", { id: category.id });
    return { ok: true, errors: {}, data: category };
  }

  updateCategory(id, patch) {
    const category = this.categoryById(id);
    if (!category)
      return { ok: false, errors: { form: "That realm no longer exists." } };
    const check = validateCategory(
      { ...category, ...patch },
      { categories: this.#state.categories },
    );
    if (!check.ok) return check;
    Object.assign(category, check.value);
    this.#commit("categories", { id });
    return { ok: true, errors: {}, data: category };
  }

  deleteCategory(id) {
    const index = this.#state.categories.findIndex((c) => c.id === id);
    if (index === -1)
      return { ok: false, message: "That realm no longer exists." };
    this.#state.categories.splice(index, 1);
    for (const quest of this.#state.quests)
      if (quest.categoryId === id) quest.categoryId = null;
    for (const note of this.#state.notes)
      if (note.categoryId === id) note.categoryId = null;
    this.#commit("categories", { id });
    return { ok: true };
  }

  createChain(input) {
    const check = validateChain(input);
    if (!check.ok) return check;
    const chain = makeChain(check.value);
    this.#state.chains.push(chain);
    this.#commit("chains", { id: chain.id });
    return { ok: true, errors: {}, data: chain };
  }

  updateChain(id, patch) {
    const chain = this.chainById(id);
    if (!chain)
      return {
        ok: false,
        errors: { form: "That questline no longer exists." },
      };
    const check = validateChain({ ...chain, ...patch });
    if (!check.ok) return check;
    Object.assign(chain, check.value);
    this.#commit("chains", { id });
    return { ok: true, errors: {}, data: chain };
  }

  deleteChain(id) {
    const index = this.#state.chains.findIndex((c) => c.id === id);
    if (index === -1)
      return { ok: false, message: "That questline no longer exists." };
    this.#state.chains.splice(index, 1);
    for (const quest of this.#state.quests) {
      if (quest.chainId === id) {
        quest.chainId = null;
        quest.chainOrder = 0;
      }
    }
    this.#commit("chains", { id });
    return { ok: true };
  }

  createEntry(input) {
    const check = validateEntry(input);
    if (!check.ok) return check;
    const entry = makeEntry({
      ...check.value,
      tags: normalizeTags(input.tags),
    });
    this.#state.entries.push(entry);
    this.#commit("entries", { id: entry.id });
    return { ok: true, errors: {}, data: entry };
  }

  updateEntry(id, patch) {
    const entry = this.entryById(id);
    if (!entry)
      return { ok: false, errors: { form: "That entry no longer exists." } };
    const check = validateEntry({ ...entry, ...patch });
    if (!check.ok) return check;
    Object.assign(entry, check.value, {
      tags: normalizeTags(check.value.tags),
      updatedAt: nowISO(),
    });
    this.#commit("entries", { id });
    return { ok: true, errors: {}, data: entry };
  }

  deleteEntry(id) {
    const index = this.#state.entries.findIndex((e) => e.id === id);
    if (index === -1)
      return { ok: false, message: "That entry no longer exists." };
    this.#state.entries.splice(index, 1);
    this.#commit("entries", { id });
    return { ok: true };
  }

  createNote(input) {
    const check = validateNote(input, this.#context());
    if (!check.ok) return check;
    const note = makeNote({ ...check.value, tags: normalizeTags(input.tags) });
    this.#state.notes.push(note);
    this.#commit("notes", { id: note.id });
    return { ok: true, errors: {}, data: note };
  }

  updateNote(id, patch) {
    const note = this.noteById(id);
    if (!note)
      return {
        ok: false,
        errors: { form: "That codex entry no longer exists." },
      };
    const check = validateNote({ ...note, ...patch }, this.#context());
    if (!check.ok) return check;
    Object.assign(note, check.value, {
      tags: normalizeTags(check.value.tags),
      updatedAt: nowISO(),
    });
    this.#commit("notes", { id });
    return { ok: true, errors: {}, data: note };
  }

  deleteNote(id) {
    const index = this.#state.notes.findIndex((n) => n.id === id);
    if (index === -1)
      return { ok: false, message: "That codex entry no longer exists." };
    this.#state.notes.splice(index, 1);
    this.#commit("notes", { id });
    return { ok: true };
  }

  toggleNotePin(id) {
    const note = this.noteById(id);
    if (!note)
      return { ok: false, message: "That codex entry no longer exists." };
    note.pinned = !note.pinned;
    note.updatedAt = nowISO();
    this.#commit("notes", { id });
    return { ok: true, data: note };
  }

  #context() {
    return {
      categoryIds: this.#state.categories.map((c) => c.id),
      chainIds: this.#state.chains.map((c) => c.id),
    };
  }

  exportArchive() {
    return {
      format: "grimoire-archive",
      version: SCHEMA_VERSION,
      exportedAt: nowISO(),
      ...clone(this.#state),
    };
  }

  importArchive(payload, { mode = "replace" } = {}) {
    const check = validateImport(payload);
    if (!check.ok) return check;
    const incoming = hydrate(payload);

    if (mode === "replace") {
      this.#state = incoming;
    } else {
      const merge = (key, idKey = "id") => {
        const seen = new Set(this.#state[key].map((item) => item[idKey]));
        for (const item of incoming[key]) {
          if (!seen.has(item[idKey])) this.#state[key].push(item);
        }
      };
      merge("categories");
      merge("chains");
      merge("quests");
      merge("entries");
      merge("notes");
      merge("log");
    }

    const result = this.flush();
    this.#emit("import");
    return { ok: true, errors: {}, data: this.counts(), persisted: result.ok };
  }

  seed(data) {
    const incoming = hydrate(data);
    this.#state.categories.push(...incoming.categories);
    this.#state.chains.push(...incoming.chains);
    this.#state.quests.push(...incoming.quests);
    this.#state.entries.push(...incoming.entries);
    this.#state.notes.push(...incoming.notes);
    this.#state.log.push(...incoming.log.map((r) => ({ ...r, seed: true })));
    this.#state.settings.seeded = true;
    this.#commit("import");
    return { ok: true, data: this.counts() };
  }

  removeSeedData() {
    const s = this.#state;
    const seededCategoryIds = new Set(
      s.categories.filter((c) => c.seed).map((c) => c.id),
    );
    s.quests = s.quests.filter((q) => !q.seed);
    s.entries = s.entries.filter((e) => !e.seed);
    s.notes = s.notes.filter((n) => !n.seed);
    s.chains = s.chains.filter((c) => !c.seed);
    s.categories = s.categories.filter((c) => !c.seed);
    s.log = s.log.filter((r) => !r.seed);
    for (const quest of s.quests) {
      if (quest.categoryId && seededCategoryIds.has(quest.categoryId))
        quest.categoryId = null;
    }
    for (const note of s.notes) {
      if (note.categoryId && seededCategoryIds.has(note.categoryId))
        note.categoryId = null;
    }
    s.settings.seeded = false;
    this.#commit("import");
    return { ok: true, data: this.counts() };
  }

  reset() {
    this.#state = emptyState();
    clearState(this.#adapter, this.#key);
    this.#commit("import");
    return { ok: true };
  }
}
