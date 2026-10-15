

import { isDateKey } from './dates.js';
import { PRIORITY_IDS, STATUS_IDS, FREQ_IDS } from './model.js';

export const LIMITS = {
  title: 120,
  description: 2000,
  body: 20000,
  objectiveTitle: 140,
  categoryName: 40,
  chainName: 80,
  tags: 12,
  tagLength: 24,
  objectives: 40,
};

function ok(value) {
  return { ok: true, errors: {}, value };
}

function fail(errors) {
  return { ok: false, errors, value: null };
}

function requireText(value, field, max, errors, { required = true, label = 'This field' } = {}) {
  const text = String(value ?? '').trim();
  if (required && !text) {
    errors[field] = `${label} is required.`;
    return text;
  }
  if (text.length > max) {
    errors[field] = `${label} must be ${max} characters or fewer (currently ${text.length}).`;
  }
  return text;
}

export function validateQuest(input = {}, context = {}) {
  const errors = {};
  const title = requireText(input.title, 'title', LIMITS.title, errors, { label: 'Quest name' });
  const description = requireText(input.description, 'description', LIMITS.description, errors, {
    required: false,
    label: 'Description',
  });

  if (input.priority && !PRIORITY_IDS.includes(input.priority)) {
    errors.priority = 'Unknown priority.';
  }
  if (input.status && !STATUS_IDS.includes(input.status)) {
    errors.status = 'Unknown status.';
  }
  if (input.dueDate && !isDateKey(input.dueDate)) {
    errors.dueDate = 'Use a real calendar date.';
  }
  if (input.categoryId && context.categoryIds && !context.categoryIds.includes(input.categoryId)) {
    errors.categoryId = 'That realm no longer exists.';
  }
  if (input.chainId && context.chainIds && !context.chainIds.includes(input.chainId)) {
    errors.chainId = 'That questline no longer exists.';
  }

  const objectives = Array.isArray(input.objectives) ? input.objectives : [];
  if (objectives.length > LIMITS.objectives) {
    errors.objectives = `A quest can hold at most ${LIMITS.objectives} objectives.`;
  } else if (objectives.some((o) => String(o.title ?? '').trim().length > LIMITS.objectiveTitle)) {
    errors.objectives = `Each objective must be ${LIMITS.objectiveTitle} characters or fewer.`;
  }

  if (input.recurrence) {
    const r = input.recurrence;
    if (!FREQ_IDS.includes(r.freq)) {
      errors.recurrence = 'Choose how often this quest returns.';
    } else {
      const interval = Number(r.interval);
      if (!Number.isFinite(interval) || interval < 1 || interval > 52) {
        errors.recurrence = 'Repeat interval must be between 1 and 52.';
      } else if (r.freq === 'weekly' && Array.isArray(r.weekdays)
        && r.weekdays.some((d) => Number(d) < 0 || Number(d) > 6)) {
        errors.recurrence = 'Weekday selection is out of range.';
      }
    }
    if (!input.dueDate && !errors.dueDate) {
      errors.dueDate = 'A recurring quest needs a first due date to repeat from.';
    }
  }

  const tagError = validateTags(input.tags);
  if (tagError) errors.tags = tagError;

  return Object.keys(errors).length
    ? fail(errors)
    : ok({ ...input, title, description });
}

export function validateCategory(input = {}, context = {}) {
  const errors = {};
  const name = requireText(input.name, 'name', LIMITS.categoryName, errors, { label: 'Realm name' });
  const existing = context.categories ?? [];
  const clash = existing.some(
    (c) => c.id !== input.id && c.name.toLowerCase() === name.toLowerCase(),
  );
  if (name && clash) errors.name = 'A realm with that name already exists.';
  if (input.color && !/^#[0-9a-f]{6}$/i.test(input.color)) errors.color = 'Colour must be a hex value.';
  return Object.keys(errors).length ? fail(errors) : ok({ ...input, name });
}

export function validateChain(input = {}) {
  const errors = {};
  const name = requireText(input.name, 'name', LIMITS.chainName, errors, { label: 'Questline name' });
  const description = requireText(input.description, 'description', LIMITS.description, errors, {
    required: false,
    label: 'Description',
  });
  return Object.keys(errors).length ? fail(errors) : ok({ ...input, name, description });
}

export function validateEntry(input = {}) {
  const errors = {};
  const title = requireText(input.title, 'title', LIMITS.title, errors, { label: 'Entry title' });
  const body = requireText(input.body, 'body', LIMITS.body, errors, {
    required: false,
    label: 'Entry text',
  });
  if (!input.date) errors.date = 'Pick a date for this entry.';
  else if (!isDateKey(input.date)) errors.date = 'Use a real calendar date.';
  if (!String(input.body ?? '').trim() && !errors.body) {
    errors.body = 'An entry needs some text.';
  }
  const tagError = validateTags(input.tags);
  if (tagError) errors.tags = tagError;
  return Object.keys(errors).length ? fail(errors) : ok({ ...input, title, body });
}

export function validateNote(input = {}, context = {}) {
  const errors = {};
  const title = requireText(input.title, 'title', LIMITS.title, errors, { label: 'Note title' });
  const body = requireText(input.body, 'body', LIMITS.body, errors, {
    required: false,
    label: 'Note body',
  });
  if (!String(input.body ?? '').trim() && !errors.body) {
    errors.body = 'A codex entry needs some content.';
  }
  if (input.categoryId && context.categoryIds && !context.categoryIds.includes(input.categoryId)) {
    errors.categoryId = 'That realm no longer exists.';
  }
  const tagError = validateTags(input.tags);
  if (tagError) errors.tags = tagError;
  return Object.keys(errors).length ? fail(errors) : ok({ ...input, title, body });
}

export function validateTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags ?? '').split(',');
  const cleaned = list.map((t) => String(t).trim()).filter(Boolean);
  if (cleaned.length > LIMITS.tags) return `Use at most ${LIMITS.tags} tags.`;
  if (cleaned.some((t) => t.length > LIMITS.tagLength)) {
    return `Each tag must be ${LIMITS.tagLength} characters or fewer.`;
  }
  return null;
}

export function validateImport(payload) {
  const errors = {};
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fail({ file: "That file is not a Grimoire archive." });
  }
  const collections = ["quests", "categories", "chains", "entries", "notes", "log"];
  const present = collections.filter((key) => key in payload);
  if (!present.length) {
    return fail({ file: "No Grimoire collections found in that file." });
  }
  for (const key of present) {
    if (!Array.isArray(payload[key])) errors[key] = `"${key}" should be a list.`;
  }
  if (payload.version != null && !Number.isFinite(Number(payload.version))) {
    errors.version = "Archive version is not a number.";
  }
  return Object.keys(errors).length ? fail(errors) : ok(payload);
}
