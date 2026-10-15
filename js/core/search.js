import { normalize, tokenize } from "./util.js";

export const WEIGHTS = {
  titleExact: 14,
  titlePrefix: 9,
  titleInfix: 5,
  tagExact: 10,
  tagPrefix: 5,
  bodyExact: 3,
  bodyInfix: 1,
  phraseInTitle: 12,
  phraseInBody: 4,
};

export function scoreDocument(query, doc) {
  const tokens = tokenize(query);
  if (!tokens.length) return 0;

  const title = normalize(doc.title);
  const body = normalize(doc.body);
  const tags = (doc.tags ?? []).map(normalize);
  const titleWords = new Set(tokenize(doc.title));
  const bodyWords = new Set(tokenize(doc.body));

  let total = 0;

  for (const token of tokens) {
    let best = 0;

    if (titleWords.has(token)) best = Math.max(best, WEIGHTS.titleExact);
    else if (title.split(/\s+/).some((w) => w.startsWith(token)))
      best = Math.max(best, WEIGHTS.titlePrefix);
    else if (title.includes(token)) best = Math.max(best, WEIGHTS.titleInfix);

    for (const tag of tags) {
      if (tag === token) best = Math.max(best, WEIGHTS.tagExact);
      else if (tag.startsWith(token)) best = Math.max(best, WEIGHTS.tagPrefix);
    }

    if (bodyWords.has(token)) best = Math.max(best, WEIGHTS.bodyExact);
    else if (body.includes(token)) best = Math.max(best, WEIGHTS.bodyInfix);

    if (best === 0) return 0;
    total += best;
  }

  const phrase = normalize(query);
  if (tokens.length > 1) {
    if (title.includes(phrase)) total += WEIGHTS.phraseInTitle;
    else if (body.includes(phrase)) total += WEIGHTS.phraseInBody;
  }

  return total;
}

export function rank(query, items, project) {
  if (!tokenize(query).length) return items.map((item) => ({ item, score: 0 }));
  const hits = [];
  for (const item of items) {
    const score = scoreDocument(query, project(item));
    if (score > 0) hits.push({ item, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}

export function filterByQuery(query, items, project) {
  return rank(query, items, project).map((hit) => hit.item);
}
