import { html, excerpt } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { formatLongDate, formatDate, startOfWeek } from "../core/dates.js";
import { emptyState } from "./components.js";

export function chronicleView(store, ui) {
  const entries = store.searchEntries(ui.chronicleQuery);
  const total = store.state.entries.length;

  return html`
    <header class="view__head">
      <div>
        <p class="view__eyebrow">${total} entr${total === 1 ? "y" : "ies"}</p>
        <h1 class="view__title">Chronicle</h1>
      </div>
      <div class="view__head-actions">
        <button type="button" class="btn btn--primary" data-action="new-entry">
          ${icon("plus", { size: 16 })} Record an entry
        </button>
      </div>
    </header>

    <section class="toolbar toolbar--slim">
      <div class="toolbar__search">
        <span class="toolbar__search-icon" aria-hidden="true"
          >${icon("search", { size: 16 })}</span
        >
        <input
          class="input input--search"
          type="search"
          data-chronicle-search
          value="${ui.chronicleQuery}"
          placeholder="Search the chronicle…"
          aria-label="Search chronicle entries"
        />
      </div>
    </section>

    <div id="chronicle-results">${chronicleResults(store, ui)}</div>
  `;
}

export function chronicleResults(store, ui) {
  const entries = store.searchEntries(ui.chronicleQuery);
  const today = store.today;

  if (!entries.length) {
    return store.state.entries.length === 0
      ? emptyState({
          glyph: "chronicle",
          title: "The chronicle is blank",
          message:
            "Record what happened and why you chose it. Months later this is the only part you cannot reconstruct.",
          actionLabel: "Record the first entry",
          action: "new-entry",
        })
      : emptyState({
          glyph: "search",
          title: "No entries match",
          message: "Try a different word, or clear the search.",
          subtle: true,
        });
  }

  const groups = [];
  for (const entry of entries) {
    const week = startOfWeek(entry.date) ?? "undated";
    const last = groups.at(-1);
    if (last && last.week === week) last.entries.push(entry);
    else groups.push({ week, entries: [entry] });
  }

  return html`${groups.map(
    (group) =>
      html` <section class="section">
        <h2 class="chronicle__week">
          Week of ${formatDate(group.week, { today, withYear: true })}
        </h2>
        <ul class="entry-list">
          ${group.entries.map(
            (entry) =>
              html`<li>
                <article class="entry">
                  <div class="entry__head">
                    <div>
                      <h3 class="entry__title">
                        <button
                          type="button"
                          class="entry__title-btn"
                          data-action="open-entry"
                          data-id="${entry.id}"
                        >
                          ${entry.title}
                        </button>
                      </h3>
                      <p class="entry__date">${formatLongDate(entry.date)}</p>
                    </div>
                    <div class="entry__actions">
                      <button
                        type="button"
                        class="icon-btn icon-btn--sm"
                        data-action="edit-entry"
                        data-id="${entry.id}"
                        aria-label="Edit ${entry.title}"
                      >
                        ${icon("edit", { size: 15 })}
                      </button>
                      <button
                        type="button"
                        class="icon-btn icon-btn--sm"
                        data-action="delete-entry"
                        data-id="${entry.id}"
                        aria-label="Delete ${entry.title}"
                      >
                        ${icon("trash", { size: 15 })}
                      </button>
                    </div>
                  </div>
                  <p class="entry__excerpt">${excerpt(entry.body, 240)}</p>
                  <div class="entry__meta">
                    ${entry.tags.map(
                      (tag) =>
                        html`<span class="tag tag--static">#${tag}</span>`,
                    )}
                    ${entry.linkedQuestIds.length
                      ? html`<span class="chip chip--muted"
                          >${icon("quests", { size: 13 })}
                          ${entry.linkedQuestIds.length} linked
                          quest${entry.linkedQuestIds.length === 1
                            ? ""
                            : "s"}</span
                        >`
                      : ""}
                  </div>
                </article>
              </li>`,
          )}
        </ul>
      </section>`,
  )}`;
}
