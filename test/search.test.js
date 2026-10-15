import test from "node:test";
import assert from "node:assert/strict";

import { scoreDocument, rank, filterByQuery } from "../js/core/search.js";

const doc = (title, body = "", tags = []) => ({ title, body, tags });

test("an empty query scores nothing", () => {
  assert.equal(scoreDocument("", doc("Forge the iron key")), 0);
  assert.equal(scoreDocument("   ", doc("Forge the iron key")), 0);
});

test("title matches outrank body matches", () => {
  const inTitle = scoreDocument("key", doc("The iron key", "nothing here"));
  const inBody = scoreDocument("key", doc("Something else", "the key is here"));
  assert.ok(inTitle > inBody, `${inTitle} should beat ${inBody}`);
});

test("tag matches outrank body matches", () => {
  const inTag = scoreDocument(
    "smithing",
    doc("A task", "body text", ["smithing"]),
  );
  const inBody = scoreDocument(
    "smithing",
    doc("A task", "some smithing happened"),
  );
  assert.ok(inTag > inBody);
});

test("matching is AND-semantic across tokens", () => {
  assert.equal(
    scoreDocument("iron dragon", doc("The iron key", "a plain body")),
    0,
  );
  assert.ok(scoreDocument("iron key", doc("The iron key")) > 0);
});

test("contiguous phrases outrank scattered tokens", () => {
  const phrase = scoreDocument("iron key", doc("The iron key of Vaelmoor"));
  const scattered = scoreDocument("iron key", doc("The key, forged of iron"));
  assert.ok(phrase > scattered, `${phrase} should beat ${scattered}`);
});

test("prefix matching finds partial words", () => {
  assert.ok(scoreDocument("smith", doc("Smithing practice")) > 0);
  assert.ok(scoreDocument("journ", doc("A journal of travels")) > 0);
});

test("search is case- and accent-insensitive", () => {
  assert.ok(scoreDocument("CAFE", doc("Café notes")) > 0);
  assert.ok(scoreDocument("café", doc("CAFE NOTES")) > 0);
  assert.ok(scoreDocument("vaelmoor", doc("VAELMOOR")) > 0);
});

test("punctuation in the query is ignored", () => {
  assert.ok(scoreDocument("iron, key!", doc("The iron key")) > 0);
});

test("rank returns matches sorted by descending score", () => {
  const items = [
    doc("A passing mention", "the key sits in a drawer"),
    doc("The key", "front and centre"),
    doc("Unrelated", "nothing at all"),
  ];
  const results = rank("key", items, (d) => d);
  assert.equal(results.length, 2, "non-matching record excluded");
  assert.equal(results[0].item.title, "The key");
  assert.ok(results[0].score > results[1].score);
});

test("rank passes everything through when the query is blank", () => {
  const items = [doc("one"), doc("two")];
  assert.equal(rank("", items, (d) => d).length, 2);
});

test("filterByQuery discards scores", () => {
  const items = [doc("The iron key"), doc("A wooden door")];
  const found = filterByQuery("iron", items, (d) => d);
  assert.deepEqual(
    found.map((d) => d.title),
    ["The iron key"],
  );
});
