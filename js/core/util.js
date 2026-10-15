let counter = 0;

export function uid(prefix = "id") {
  counter += 1;
  const time = Date.now().toString(36);
  const seq = counter.toString(36).padStart(3, "0");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${seq}${rand}`;
}

export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

export function clone(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {}
  }
  return JSON.parse(JSON.stringify(value));
}

export function debounce(fn, ms) {
  let timer = null;
  const wrapped = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
  wrapped.flush = (...args) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      fn(...args);
    }
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return wrapped;
}

export function groupBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export function sumBy(list, fn) {
  return list.reduce((total, item) => total + (fn(item) || 0), 0);
}

export function unique(list) {
  return Array.from(new Set(list));
}

export function sortBy(list, ...comparators) {
  return [...list].sort((a, b) => {
    for (const cmp of comparators) {
      const result = cmp(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}

export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function tokenize(text) {
  const normalized = normalize(text);
  if (!normalized) return [];
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

export function plural(count, singular, pluralForm) {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}
