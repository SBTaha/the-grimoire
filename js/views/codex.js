import { html, raw, classes, excerpt } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { formatDate } from "../core/dates.js";
import { emptyState, categoryChip } from "./components.js";

export function codexView(store, ui) {
  const tags = [
    ...new Set(store.state.notes.flatMap((note) => note.tags)),
  ].sort();
  const total = store.state.notes.length;

  return html`
    <header class="view__head">
      <div>
        <p class="view__eyebrow">${total} entr${total === 1 ? "y" : "ies"}</p>
        <h1 class="view__title">Codex</h1>
      </div>
      <div class="view__head-actions">
        <button type="button" class="btn btn--primary" data-action="new-note">
          ${icon("plus", { size: 16 })} New entry
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
          data-codex-search
          value="${ui.codex.query}"
          placeholder="Search the codex…"
          aria-label="Search codex entries"
        />
      </div>
      <div class="toolbar__filters">
        <label class="filter">
          <span class="filter__label">Realm</span>
          <select class="input input--sm" data-codex-filter="categoryId">
            <option value="all">All realms</option>
            ${store.state.categories.map(
              (c) =>
                html`<option
                  value="${c.id}"
                  ${c.id === ui.codex.categoryId ? raw("selected") : ""}
                >
                  ${c.name}
                </option>`,
            )}
            <option
              value="none"
              ${ui.codex.categoryId === "none" ? raw("selected") : ""}
            >
              Unassigned
            </option>
          </select>
        </label>
        ${tags.length
          ? html`<label class="filter">
              <span class="filter__label">Tag</span>
              <select class="input input--sm" data-codex-filter="tag">
                <option value="all">Any tag</option>
                ${tags.map(
                  (tag) =>
                    html`<option
                      value="${tag}"
                      ${tag === ui.codex.tag ? raw("selected") : ""}
                    >
                      #${tag}
                    </option>`,
                )}
              </select>
            </label>`
          : ""}
      </div>
    </section>

    <div id="codex-results">${codexResults(store, ui)}</div>
  `;
}

export function codexResults(store, ui) {
  const notes = store.searchNotes(ui.codex.query, {
    tag: ui.codex.tag,
    categoryId: ui.codex.categoryId,
  });
  const today = store.today;

  if (!notes.length) {
    return store.state.notes.length === 0
      ? emptyState({
          glyph: "codex",
          title: "The codex is empty",
          message:
            "Keep the things you keep relearning here — settings, checklists, hard-won conclusions.",
          actionLabel: "Write the first entry",
          action: "new-note",
        })
      : emptyState({
          glyph: "search",
          title: "Nothing matches",
          message: "Try a different word, or widen the filters.",
          subtle: true,
        });
  }

  return html`
    <p class="results__count" role="status">
      ${notes.length} entr${notes.length === 1 ? "y" : "ies"}
    </p>
    <div class="note-grid">
      ${notes.map(
        (note) =>
          html`<article
            class="${classes({ note: true, "note--pinned": note.pinned })}"
          >
            <div class="note__head">
              <h3 class="note__title">
                <button
                  type="button"
                  class="note__title-btn"
                  data-action="open-note"
                  data-id="${note.id}"
                >
                  ${note.title}
                </button>
              </h3>
              <button
                type="button"
                class="${classes({
                  "icon-btn": true,
                  "icon-btn--sm": true,
                  "is-active": note.pinned,
                })}"
                data-action="toggle-pin"
                data-id="${note.id}"
                aria-pressed="${note.pinned ? "true" : "false"}"
                aria-label="${note.pinned ? "Unpin" : "Pin"} ${note.title}"
              >
                ${icon("pin", { size: 15 })}
              </button>
            </div>
            <p class="note__excerpt">${excerpt(note.body, 180)}</p>
            <div class="note__meta">
              ${note.categoryId
                ? categoryChip(store.categoryById(note.categoryId))
                : ""}
              ${note.tags.map(
                (tag) => html`<span class="tag tag--static">#${tag}</span>`,
              )}
            </div>
            <footer class="note__foot">
              <span class="note__date"
                >Updated
                ${formatDate(note.updatedAt.slice(0, 10), { today })}</span
              >
              <span class="note__actions">
                <button
                  type="button"
                  class="icon-btn icon-btn--sm"
                  data-action="edit-note"
                  data-id="${note.id}"
                  aria-label="Edit ${note.title}"
                >
                  ${icon("edit", { size: 15 })}
                </button>
                <button
                  type="button"
                  class="icon-btn icon-btn--sm"
                  data-action="delete-note"
                  data-id="${note.id}"
                  aria-label="Delete ${note.title}"
                >
                  ${icon("trash", { size: 15 })}
                </button>
              </span>
            </footer>
          </article>`,
      )}
    </div>
  `;
}
