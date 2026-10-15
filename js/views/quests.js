import { html, raw, classes } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { PRIORITIES, STATUSES } from "../core/model.js";
import { SORTS, DEFAULT_FILTERS } from "../core/store.js";
import { questCard, emptyState } from "./components.js";

const DUE_WINDOWS = [
  { id: "all", label: "Any deadline" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Due today" },
  { id: "week", label: "Next 7 days" },
  { id: "month", label: "Next 31 days" },
  { id: "undated", label: "No deadline" },
];

function select({ name, label, value, options }) {
  return html`<label class="filter">
    <span class="filter__label">${label}</span>
    <select class="input input--sm" name="${name}" data-filter="${name}">
      ${options.map(
        (option) =>
          html`<option
            value="${option.id}"
            ${option.id === value ? raw("selected") : ""}
          >
            ${option.label}
          </option>`,
      )}
    </select>
  </label>`;
}

function countActiveFilters(filters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === "sort" || key === "status") return false;
    return value !== DEFAULT_FILTERS[key];
  }).length;
}

export function questsView(store, ui) {
  const { filters } = ui;
  const categories = store.state.categories;
  const chains = store.state.chains;
  const tags = store.questTags();
  const activeFilters = countActiveFilters(filters);

  return html`
    <header class="view__head">
      <div>
        <p class="view__eyebrow">${store.counts().quests} recorded</p>
        <h1 class="view__title">Quest Board</h1>
      </div>
      <div class="view__head-actions">
        <button type="button" class="btn btn--primary" data-action="new-quest">
          ${icon("plus", { size: 16 })} Raise a quest
        </button>
      </div>
    </header>

    <section class="toolbar" aria-label="Filter quests">
      <div class="toolbar__search">
        <span class="toolbar__search-icon" aria-hidden="true"
          >${icon("search", { size: 16 })}</span
        >
        <input
          class="input input--search"
          type="search"
          data-filter="query"
          value="${filters.query}"
          placeholder="Search quests, descriptions and objectives…"
          aria-label="Search quests"
        />
      </div>

      <div class="segmented" role="group" aria-label="Status">
        ${[
          { id: "active", label: "Active" },
          ...STATUSES.filter((s) => s.id !== "active"),
          { id: "all", label: "All" },
        ].map(
          (status) =>
            html`<button
              type="button"
              class="${classes({
                segmented__btn: true,
                "is-active": filters.status === status.id,
              })}"
              data-filter-set="status"
              data-value="${status.id}"
              aria-pressed="${filters.status === status.id ? "true" : "false"}"
            >
              ${status.label}
            </button>`,
        )}
      </div>

      <div class="toolbar__filters">
        ${select({
          name: "categoryId",
          label: "Realm",
          value: filters.categoryId,
          options: [
            { id: "all", label: "All realms" },
            ...categories.map((c) => ({ id: c.id, label: c.name })),
            { id: "none", label: "Unassigned" },
          ],
        })}
        ${select({
          name: "priority",
          label: "Priority",
          value: filters.priority,
          options: [
            { id: "all", label: "Any priority" },
            ...PRIORITIES.map((p) => ({ id: p.id, label: p.label })),
          ],
        })}
        ${select({
          name: "due",
          label: "Deadline",
          value: filters.due,
          options: DUE_WINDOWS,
        })}
        ${chains.length
          ? select({
              name: "chainId",
              label: "Questline",
              value: filters.chainId,
              options: [
                { id: "all", label: "All" },
                ...chains.map((c) => ({ id: c.id, label: c.name })),
                { id: "none", label: "Standalone" },
              ],
            })
          : ""}
        ${tags.length
          ? select({
              name: "tag",
              label: "Tag",
              value: filters.tag,
              options: [
                { id: "all", label: "Any tag" },
                ...tags.map((t) => ({ id: t, label: `#${t}` })),
              ],
            })
          : ""}
        ${select({
          name: "sort",
          label: "Sort",
          value: filters.sort,
          options: SORTS,
        })}
        ${activeFilters > 0
          ? html`<button
              type="button"
              class="btn btn--ghost btn--sm toolbar__clear"
              data-action="clear-filters"
            >
              ${icon("close", { size: 14 })} Clear ${activeFilters}
              filter${activeFilters === 1 ? "" : "s"}
            </button>`
          : ""}
      </div>
    </section>

    <div id="quest-results" class="section">${questResults(store, ui)}</div>
  `;
}

export function questResults(store, ui) {
  const results = store.filterQuests(ui.filters);
  const total = store.state.quests.length;

  if (!results.length) {
    return total === 0
      ? emptyState({
          glyph: "scroll",
          title: "No quests yet",
          message:
            "Raise your first quest, or load the sample grimoire from the Sanctum.",
          actionLabel: "Raise a quest",
          action: "new-quest",
        })
      : emptyState({
          glyph: "search",
          title: "Nothing matches those filters",
          message:
            "Loosen the search or clear the filters to see the rest of the board.",
          actionLabel: "Clear filters",
          action: "clear-filters",
        });
  }

  return html`
    <p class="results__count" role="status">
      ${results.length}
      quest${results.length === 1 ? "" : "s"}${ui.filters.query
        ? html` matching “${ui.filters.query}”`
        : ""}
    </p>
    <div class="quest-list">
      ${results.map((quest) =>
        questCard(quest, { store, expanded: ui.expanded }),
      )}
    </div>
  `;
}
