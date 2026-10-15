import {
  SCHEMA_VERSION,
  emptyState,
  makeQuest,
  makeChain,
  makeCategory,
  makeEntry,
  makeNote,
} from "./model.js";

export const STORAGE_KEY = "grimoire:state";

export function createMemoryAdapter(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    kind: "memory",
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

export function createLocalStorageAdapter(globalObj = globalThis) {
  try {
    const ls = globalObj.localStorage;
    if (!ls) return null;
    const probe = "__grimoire_probe__";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    return {
      kind: "localStorage",
      getItem: (key) => ls.getItem(key),
      setItem: (key, value) => ls.setItem(key, value),
      removeItem: (key) => ls.removeItem(key),
    };
  } catch {
    return null;
  }
}

export function createBestAdapter(globalObj = globalThis) {
  return createLocalStorageAdapter(globalObj) ?? createMemoryAdapter();
}

export function isQuotaError(error) {
  return Boolean(
    error &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014),
  );
}

export function migrate(raw) {
  const data = { ...raw };
  const from = Number(data.version) || 1;

  if (from < 2) {
    if (Array.isArray(data.journal) && !Array.isArray(data.entries)) {
      data.entries = data.journal;
    }
    if (Array.isArray(data.quests)) {
      data.quests = data.quests.map((quest) => ({
        ...quest,
        objectives: quest.objectives ?? quest.subtasks ?? [],
      }));
    }
  }

  delete data.journal;
  data.version = SCHEMA_VERSION;
  return data;
}

export function hydrate(raw) {
  const base = emptyState();
  const data = migrate(raw ?? {});
  const categories = (data.categories ?? []).map(makeCategory);
  const categoryIds = new Set(categories.map((c) => c.id));
  const chains = (data.chains ?? []).map(makeChain);
  const chainIds = new Set(chains.map((c) => c.id));

  return {
    ...base,
    version: SCHEMA_VERSION,
    categories,
    chains,
    quests: (data.quests ?? []).map(makeQuest).map((quest) => ({
      ...quest,
      categoryId:
        quest.categoryId && categoryIds.has(quest.categoryId)
          ? quest.categoryId
          : null,
      chainId:
        quest.chainId && chainIds.has(quest.chainId) ? quest.chainId : null,
    })),
    entries: (data.entries ?? []).map(makeEntry),
    notes: (data.notes ?? []).map(makeNote).map((note) => ({
      ...note,
      categoryId:
        note.categoryId && categoryIds.has(note.categoryId)
          ? note.categoryId
          : null,
    })),
    log: (data.log ?? []).filter((r) => r && r.at),
    settings: { ...base.settings, ...(data.settings ?? {}) },
  };
}

export function loadState(adapter, key = STORAGE_KEY) {
  try {
    const raw = adapter.getItem(key);
    if (!raw) return { ok: true, state: emptyState(), fresh: true };
    const parsed = JSON.parse(raw);
    return { ok: true, state: hydrate(parsed), fresh: false };
  } catch (error) {
    return {
      ok: false,
      state: emptyState(),
      fresh: true,
      error,
      message:
        "Saved data could not be read and has been left untouched. Starting with an empty grimoire.",
    };
  }
}

export function saveState(adapter, state, key = STORAGE_KEY) {
  try {
    adapter.setItem(key, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error,
      message: isQuotaError(error)
        ? "Storage is full. Export an archive and remove old entries to free space."
        : "Changes could not be saved to this browser.",
    };
  }
}

export function clearState(adapter, key = STORAGE_KEY) {
  try {
    adapter.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error, message: "Stored data could not be cleared." };
  }
}

export function estimateSize(state) {
  try {
    return new Blob([JSON.stringify(state)]).size;
  } catch {
    return JSON.stringify(state).length;
  }
}
