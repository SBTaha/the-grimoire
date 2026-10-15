import { uid } from "./util.js";
import { nowISO } from "./dates.js";

export const SCHEMA_VERSION = 2;

export const PRIORITIES = [
  { id: "minor", label: "Minor", rank: 1, xp: 10, blurb: "A small errand" },
  {
    id: "standard",
    label: "Standard",
    rank: 2,
    xp: 25,
    blurb: "Ordinary work",
  },
  {
    id: "major",
    label: "Major",
    rank: 3,
    xp: 60,
    blurb: "Demands real effort",
  },
  {
    id: "legendary",
    label: "Legendary",
    rank: 4,
    xp: 150,
    blurb: "A defining undertaking",
  },
];

export const PRIORITY_IDS = PRIORITIES.map((p) => p.id);

export function priorityOf(id) {
  return PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[1];
}

export const STATUSES = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
];

export const STATUS_IDS = STATUSES.map((s) => s.id);

export const RECURRENCE_FREQS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export const FREQ_IDS = RECURRENCE_FREQS.map((f) => f.id);

export function levelFromXp(xp) {
  const safe = Math.max(0, Number(xp) || 0);
  let level = 1;
  while (xpForLevel(level + 1) <= safe && level < 99) level += 1;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = ceiling - floor;
  return {
    level,
    xp: safe,
    into: safe - floor,
    span,
    next: ceiling,
    progress: span > 0 ? Math.min(1, (safe - floor) / span) : 1,
    title:
      RANK_TITLES[
        Math.min(RANK_TITLES.length - 1, Math.floor((level - 1) / 2))
      ],
  };
}

export function xpForLevel(level) {
  const n = Math.max(1, level);
  return (100 * (n - 1) * n) / 2;
}

const RANK_TITLES = [
  "Wanderer",
  "Apprentice",
  "Journeyman",
  "Adept",
  "Warden",
  "Magister",
  "Archon",
  "Luminary",
  "Mythwright",
];

export const CATEGORY_COLORS = [
  "#9b7bd4",
  "#4fa8a0",
  "#d9a441",
  "#c65b3c",
  "#5b82c4",
  "#b45d8f",
  "#7a9a52",
];

export function makeCategory(input = {}) {
  return {
    id: input.id ?? uid("cat"),
    name: String(input.name ?? "Untitled realm").trim(),
    color: input.color ?? CATEGORY_COLORS[0],
    glyph: input.glyph ?? "◆",
    createdAt: input.createdAt ?? nowISO(),
    seed: Boolean(input.seed),
  };
}

export function makeObjective(input = {}) {
  return {
    id: input.id ?? uid("obj"),
    title: String(input.title ?? "").trim(),
    done: Boolean(input.done),
  };
}

export function makeRecurrence(input) {
  if (!input) return null;
  return {
    freq: FREQ_IDS.includes(input.freq) ? input.freq : "weekly",
    interval: Math.max(
      1,
      Math.min(52, Math.round(Number(input.interval) || 1)),
    ),
    weekdays: Array.isArray(input.weekdays)
      ? [
          ...new Set(
            input.weekdays.map(Number).filter((d) => d >= 0 && d <= 6),
          ),
        ].sort()
      : [],
  };
}

export function makeQuest(input = {}) {
  const createdAt = input.createdAt ?? nowISO();
  return {
    id: input.id ?? uid("qst"),
    title: String(input.title ?? "").trim(),
    description: String(input.description ?? "").trim(),
    categoryId: input.categoryId ?? null,
    priority: PRIORITY_IDS.includes(input.priority)
      ? input.priority
      : "standard",
    status: STATUS_IDS.includes(input.status) ? input.status : "active",
    dueDate: input.dueDate || null,
    objectives: Array.isArray(input.objectives)
      ? input.objectives.map(makeObjective)
      : [],
    tags: normalizeTags(input.tags),
    chainId: input.chainId ?? null,
    chainOrder: Number.isFinite(input.chainOrder) ? input.chainOrder : 0,
    recurrence: input.recurrence ? makeRecurrence(input.recurrence) : null,
    originId: input.originId ?? null,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
    completedAt: input.completedAt ?? null,
    seed: Boolean(input.seed),
  };
}

export function makeChain(input = {}) {
  return {
    id: input.id ?? uid("chn"),
    name: String(input.name ?? "Untitled questline").trim(),
    description: String(input.description ?? "").trim(),
    createdAt: input.createdAt ?? nowISO(),
    seed: Boolean(input.seed),
  };
}

export function makeEntry(input = {}) {
  const createdAt = input.createdAt ?? nowISO();
  return {
    id: input.id ?? uid("ent"),
    date: input.date ?? null,
    title: String(input.title ?? "").trim(),
    body: String(input.body ?? ""),
    tags: normalizeTags(input.tags),
    linkedQuestIds: Array.isArray(input.linkedQuestIds)
      ? [...new Set(input.linkedQuestIds)]
      : [],
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
    seed: Boolean(input.seed),
  };
}

export function makeNote(input = {}) {
  const createdAt = input.createdAt ?? nowISO();
  return {
    id: input.id ?? uid("not"),
    title: String(input.title ?? "").trim(),
    body: String(input.body ?? ""),
    tags: normalizeTags(input.tags),
    categoryId: input.categoryId ?? null,
    pinned: Boolean(input.pinned),
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
    seed: Boolean(input.seed),
  };
}

export function makeLogRecord(quest, at = nowISO()) {
  return {
    id: uid("log"),
    questId: quest.id,
    title: quest.title,
    categoryId: quest.categoryId ?? null,
    priority: quest.priority,
    xp: priorityOf(quest.priority).xp,
    recurring: Boolean(quest.recurrence),
    at,
  };
}

export function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags ?? "").split(",");
  const cleaned = list
    .map((tag) => String(tag).trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
  return [...new Set(cleaned)];
}

export function questProgress(quest) {
  const list = quest.objectives ?? [];
  if (!list.length) return quest.status === "completed" ? 1 : 0;
  const done = list.filter((o) => o.done).length;
  return done / list.length;
}

export function emptyState() {
  return {
    version: SCHEMA_VERSION,
    categories: [],
    chains: [],
    quests: [],
    entries: [],
    notes: [],
    log: [],
    settings: { seeded: false, confirmDestructive: true },
  };
}
