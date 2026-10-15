import test from "node:test";
import assert from "node:assert/strict";

import { Store, DEFAULT_FILTERS } from "../js/core/store.js";
import { createMemoryAdapter } from "../js/core/storage.js";
import { buildSeedData } from "../js/seed.js";
import {
  toHtml,
  html,
  esc,
  formatBody,
  excerpt,
  formatBytes,
} from "../js/ui/dom.js";
import { todayKey } from "../js/core/dates.js";

import { hearthView } from "../js/views/hearth.js";
import { questsView, questResults } from "../js/views/quests.js";
import { chainsView } from "../js/views/chains.js";
import { chronicleView } from "../js/views/chronicle.js";
import { codexView } from "../js/views/codex.js";
import { annalsView } from "../js/views/annals.js";
import { sanctumView } from "../js/views/sanctum.js";

function makeUi() {
  return {
    route: "hearth",
    filters: { ...DEFAULT_FILTERS },
    expanded: new Set(),
    chronicleQuery: "",
    codex: { query: "", tag: "all", categoryId: "all" },
  };
}

function seededStore() {
  const store = new Store({ adapter: createMemoryAdapter(), saveDelay: 0 });
  store.load();
  store.seed(buildSeedData());
  return store;
}

function emptyStore() {
  const store = new Store({ adapter: createMemoryAdapter(), saveDelay: 0 });
  store.load();
  return store;
}

const VIEWS = [
  ["hearth", hearthView],
  ["quests", questsView],
  ["chains", chainsView],
  ["chronicle", chronicleView],
  ["codex", codexView],
  ["annals", annalsView],
  ["sanctum", sanctumView],
];

test("every view renders against a seeded grimoire", () => {
  const store = seededStore();
  const ui = makeUi();
  for (const [name, view] of VIEWS) {
    const markup = toHtml(view(store, ui));
    assert.ok(markup.length > 200, `${name} produced almost nothing`);
    assert.ok(markup.includes("<h1"), `${name} has no page heading`);
    assert.ok(
      !markup.includes("[object Object]"),
      `${name} leaked an object into markup`,
    );
    assert.ok(
      !markup.includes("undefined"),
      `${name} rendered the string "undefined"`,
    );
  }
});

test("every view renders against an empty grimoire without throwing", () => {
  const store = emptyStore();
  const ui = makeUi();
  for (const [name, view] of VIEWS) {
    const markup = toHtml(view(store, ui));
    assert.ok(
      markup.length > 100,
      `${name} produced almost nothing when empty`,
    );
    assert.ok(
      !markup.includes("[object Object]"),
      `${name} leaked an object into markup`,
    );
  }
});

test("empty states offer a way forward rather than a blank panel", () => {
  const store = emptyStore();
  const ui = makeUi();
  assert.match(toHtml(hearthView(store, ui)), /Your grimoire is empty/);
  assert.match(toHtml(questsView(store, ui)), /No quests yet/);
  assert.match(toHtml(chainsView(store, ui)), /No questlines yet/);
  assert.match(toHtml(chronicleView(store, ui)), /chronicle is blank/i);
  assert.match(toHtml(codexView(store, ui)), /codex is empty/i);
  assert.match(toHtml(annalsView(store, ui)), /No history recorded yet/);
  assert.match(toHtml(questsView(store, ui)), /data-action="new-quest"/);
});

test("the quest board reflects the active filters", () => {
  const store = seededStore();
  const ui = makeUi();

  const all = toHtml(questResults(store, ui));
  assert.match(all, /Morning drill/);

  ui.filters.query = "boiler";
  const filtered = toHtml(questResults(store, ui));
  assert.match(filtered, /Service the boiler/);
  assert.doesNotMatch(
    filtered,
    /Morning drill/,
    "non-matching quests are excluded",
  );

  ui.filters.query = "zzzznothingmatches";
  assert.match(
    toHtml(questResults(store, ui)),
    /Nothing matches those filters/,
  );
});

test("sealed questline steps are rendered as sealed", () => {
  const store = seededStore();
  const ui = makeUi();
  const markup = toHtml(chainsView(store, ui));
  assert.match(markup, /Sealed/, "the sealed state is surfaced to the user");
  assert.match(markup, /The Unfinished Relic/);
});

test("expanding a quest reveals its objectives", () => {
  const store = seededStore();
  const ui = makeUi();
  const quest = store.state.quests.find(
    (q) => q.objectives.length > 0 && q.status === "active",
  );

  const collapsed = toHtml(questResults(store, ui));
  assert.doesNotMatch(collapsed, new RegExp(esc(quest.objectives[0].title)));

  ui.expanded.add(quest.id);
  const open = toHtml(questResults(store, ui));
  assert.match(open, new RegExp(esc(quest.objectives[0].title)));
});

test("the annals chart draws one bar per day in the window", () => {
  const store = seededStore();
  const markup = toHtml(annalsView(store, makeUi()));
  const bars = markup.match(/class="chart__bar/g) ?? [];
  assert.equal(bars.length, 63);
  assert.match(
    markup,
    /role="img"/,
    "the chart is labelled for assistive tech",
  );
});

test("the sanctum states the storage limitations plainly", () => {
  const markup = toHtml(sanctumView(seededStore(), makeUi()));
  assert.match(markup, /localStorage/);
  assert.match(markup, /does not sync/i);
  assert.match(markup, /5 MB/);
});

test("user content cannot inject markup", () => {
  const store = emptyStore();
  const ui = makeUi();
  const payload = '<img src=x onerror="alert(1)">';
  store.createQuest({
    title: payload,
    description: `${payload} in the body`,
    tags: "safe",
  });

  const markup = toHtml(questResults(store, ui));
  assert.ok(
    !markup.includes("<img src=x"),
    "the tag was not emitted as markup",
  );
  assert.ok(markup.includes("&lt;img"), "it was escaped instead");
  assert.ok(!markup.includes('onerror="alert'), "no live attribute survived");
});

test("quotes in user content cannot break out of an attribute", () => {
  const store = emptyStore();
  const ui = makeUi();
  store.createQuest({ title: '" onmouseover="alert(1)' });
  const markup = toHtml(questResults(store, ui));
  assert.ok(!markup.includes('onmouseover="alert'), "the quote was escaped");
  assert.ok(markup.includes("&quot;"));
});

test("the html tag escapes interpolations but preserves nested fragments", () => {
  const nested = html`<em>safe</em>`;
  const markup = toHtml(
    html`<p>${"<b>raw</b>"}</p>
      <div>${nested}</div>`,
  );
  assert.ok(
    markup.includes("&lt;b&gt;raw&lt;/b&gt;"),
    "plain strings are escaped",
  );
  assert.ok(markup.includes("<em>safe</em>"), "nested fragments are trusted");
});

test("arrays and nullish values render predictably", () => {
  assert.equal(toHtml(html`${[1, 2, 3]}`), "123");
  assert.equal(toHtml(html`${null}${undefined}${false}`), "");
  assert.equal(toHtml(html`${0}`), "0", "zero is not treated as empty");
});

test("formatBody promotes a small set of patterns and escapes the rest", () => {
  const markup = toHtml(formatBody("**bold** and *italic*\n\n- one\n- two"));
  assert.match(markup, /<strong>bold<\/strong>/);
  assert.match(markup, /<em>italic<\/em>/);
  assert.match(markup, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
});

test("formatBody escapes before it formats, so markup cannot slip through", () => {
  const markup = toHtml(formatBody("<script>alert(1)</script> **bold**"));
  assert.ok(!markup.includes("<script>"));
  assert.match(markup, /&lt;script&gt;/);
  assert.match(
    markup,
    /<strong>bold<\/strong>/,
    "legitimate formatting still applies",
  );
});

test("formatBody turns single newlines into line breaks within a paragraph", () => {
  const markup = toHtml(formatBody("line one\nline two"));
  assert.match(markup, /line one<br>line two/);
});

test("excerpt clips long text on a character budget", () => {
  assert.equal(excerpt("short", 20), "short");
  const clipped = excerpt("x".repeat(300), 50);
  assert.ok(clipped.length <= 51);
  assert.ok(clipped.endsWith("…"));
});

test("excerpt collapses whitespace so previews stay on one line", () => {
  assert.equal(excerpt("a\n\n  b   c"), "a b c");
});

test("formatBytes reads as a human size", () => {
  assert.equal(formatBytes(0), "0 KB");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2.0 KB");
  assert.match(formatBytes(5 * 1024 * 1024), /MB/);
});

test("seed data is internally consistent", () => {
  const data = buildSeedData(todayKey());
  const categoryIds = new Set(data.categories.map((c) => c.id));
  const chainIds = new Set(data.chains.map((c) => c.id));

  for (const quest of data.quests) {
    if (quest.categoryId)
      assert.ok(
        categoryIds.has(quest.categoryId),
        `${quest.title} points at a missing realm`,
      );
    if (quest.chainId)
      assert.ok(
        chainIds.has(quest.chainId),
        `${quest.title} points at a missing questline`,
      );
  }
  for (const note of data.notes) {
    if (note.categoryId) assert.ok(categoryIds.has(note.categoryId));
  }
  for (const entry of data.entries) {
    for (const id of entry.linkedQuestIds) {
      assert.ok(
        data.quests.some((q) => q.id === id),
        "a chronicle entry links a missing quest",
      );
    }
  }
});

test("every seed record is flagged, so removal is complete", () => {
  const data = buildSeedData();
  for (const key of [
    "categories",
    "chains",
    "quests",
    "notes",
    "entries",
    "log",
  ]) {
    for (const record of data[key]) {
      assert.equal(
        record.seed,
        true,
        `an unflagged record in ${key} would survive removal`,
      );
    }
  }
});

test("loading then removing the sample data returns to an empty grimoire", () => {
  const store = seededStore();
  assert.ok(store.state.quests.length > 0);
  store.removeSeedData();
  assert.deepEqual(store.state.quests, []);
  assert.deepEqual(store.state.notes, []);
  assert.deepEqual(store.state.entries, []);
  assert.deepEqual(store.state.chains, []);
  assert.deepEqual(store.state.categories, []);
  assert.deepEqual(store.state.log, []);
});

test("the sample questline demonstrates the sealing rule", () => {
  const store = seededStore();
  const chain = store.state.chains.find(
    (c) => c.name === "The Unfinished Relic",
  );
  const steps = store.questsInChain(chain.id);
  assert.equal(steps[0].status, "completed", "first step is already done");
  assert.equal(store.isSealed(steps[1]), false, "second step is available");
  assert.equal(
    store.isSealed(steps[2]),
    true,
    "third step is sealed behind the second",
  );
});
