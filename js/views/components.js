import { html, classes, percent, excerpt } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { describeDue, formatDate } from "../core/dates.js";
import { priorityOf, questProgress } from "../core/model.js";
import { describeRecurrence } from "../core/recurrence.js";

export function priorityPill(priority) {
  const meta = priorityOf(priority);
  return html`<span
    class="pill pill--priority pill--${meta.id}"
    title="${meta.blurb} · ${meta.xp} XP"
  >
    ${meta.label}
  </span>`;
}

export function duePill(dueDate, today) {
  const due = describeDue(dueDate, today);
  if (due.tone === "none") return "";
  return html`<span class="pill pill--due pill--due-${due.tone}">
    ${icon("calendar", { size: 13 })}${due.label}
  </span>`;
}

export function categoryChip(category) {
  if (!category) return html`<span class="chip chip--muted">Unassigned</span>`;
  return html`<span class="chip" style="--chip-color:${category.color}">
    <span class="chip__dot" aria-hidden="true"></span>${category.name}
  </span>`;
}

export function tagList(tags, { action = "filter-tag" } = {}) {
  if (!tags?.length) return "";
  return html`<ul class="tags">
    ${tags.map(
      (tag) =>
        html`<li>
          <button
            type="button"
            class="tag"
            data-action="${action}"
            data-tag="${tag}"
          >
            #${tag}
          </button>
        </li>`,
    )}
  </ul>`;
}

export function progressBar(ratio, { label = "", compact = false } = {}) {
  const value = Math.round((ratio ?? 0) * 100);
  return html`<div
    class="${classes({ meter: true, "meter--compact": compact })}"
  >
    <div
      class="meter__track"
      role="progressbar"
      aria-valuenow="${value}"
      aria-valuemin="0"
      aria-valuemax="100"
      ${label ? html`aria-label="${label}"` : ""}
    >
      <div class="meter__fill" style="width:${value}%"></div>
    </div>
    ${compact ? "" : html`<span class="meter__value">${value}%</span>`}
  </div>`;
}

export function objectiveList(quest) {
  if (!quest.objectives.length) return "";
  const disabled = quest.status !== "active";
  return html`<ul class="objectives">
    ${quest.objectives.map(
      (objective) =>
        html`<li class="objective">
          <label
            class="${classes({
              objective__label: true,
              "is-done": objective.done,
            })}"
          >
            <input
              type="checkbox"
              ${objective.done ? "checked" : ""}
              ${disabled ? "disabled" : ""}
              data-action="toggle-objective"
              data-id="${quest.id}"
              data-objective="${objective.id}"
            />
            <span class="objective__box" aria-hidden="true"
              >${icon("check", { size: 12 })}</span
            >
            <span class="objective__text">${objective.title}</span>
          </label>
        </li>`,
    )}
  </ul>`;
}

export function questCard(
  quest,
  { store, expanded, compact = false, showChain = true } = {},
) {
  const today = store.today;
  const category = store.categoryById(quest.categoryId);
  const chain = showChain ? store.chainById(quest.chainId) : null;
  const sealed = store.isSealed(quest);
  const progress = questProgress(quest);
  const hasObjectives = quest.objectives.length > 0;
  const isOpen = expanded?.has(quest.id) ?? false;
  const done = quest.status === "completed";
  const overdue =
    quest.status === "active" &&
    quest.dueDate &&
    describeDue(quest.dueDate, today).tone === "overdue";

  return html`<article
    class="${classes({
      quest: true,
      "quest--done": done,
      "quest--archived": quest.status === "archived",
      "quest--sealed": sealed,
      "quest--overdue": overdue,
      "quest--compact": compact,
    })}"
    data-quest-id="${quest.id}"
    data-priority="${quest.priority}"
  >
    <div class="quest__rail" aria-hidden="true"></div>

    <div class="quest__main">
      <div class="quest__head">
        ${quest.status === "active" && !sealed
          ? html`<button
              type="button"
              class="quest__tick"
              data-action="complete-quest"
              data-id="${quest.id}"
              aria-label="Complete: ${quest.title}"
            >
              <span class="quest__tick-box"
                >${icon("check", { size: 14 })}</span
              >
            </button>`
          : ""}
        ${sealed
          ? html`<span
              class="quest__tick quest__tick--sealed"
              title="Sealed until earlier steps are complete"
            >
              <span class="quest__tick-box">${icon("lock", { size: 13 })}</span>
            </span>`
          : ""}
        ${done
          ? html`<button
              type="button"
              class="quest__tick quest__tick--done"
              data-action="reopen-quest"
              data-id="${quest.id}"
              aria-label="Reopen: ${quest.title}"
            >
              <span class="quest__tick-box"
                >${icon("check", { size: 14 })}</span
              >
            </button>`
          : ""}

        <div class="quest__titles">
          <h3 class="quest__title">
            <button
              type="button"
              class="quest__title-btn"
              data-action="edit-quest"
              data-id="${quest.id}"
            >
              ${quest.title}
            </button>
          </h3>
          <div class="quest__meta">
            ${priorityPill(quest.priority)} ${duePill(quest.dueDate, today)}
            ${category ? categoryChip(category) : ""}
            ${chain
              ? html`<button
                  type="button"
                  class="chip chip--chain"
                  data-action="open-chain"
                  data-id="${chain.id}"
                >
                  ${icon("chains", { size: 13 })}${chain.name}
                </button>`
              : ""}
            ${quest.recurrence
              ? html`<span
                  class="chip chip--muted"
                  title="${describeRecurrence(quest.recurrence)}"
                >
                  ${icon("repeat", { size: 13 })}${describeRecurrence(
                    quest.recurrence,
                  )}
                </span>`
              : ""}
          </div>
        </div>

        <div class="quest__actions">
          ${hasObjectives
            ? html`<button
                type="button"
                class="chip chip--ghost"
                data-action="toggle-expand"
                data-id="${quest.id}"
                aria-expanded="${isOpen ? "true" : "false"}"
              >
                ${quest.objectives.filter((o) => o.done).length}/${quest
                  .objectives.length}
                ${icon(isOpen ? "up" : "down", { size: 13 })}
              </button>`
            : ""}
          <button
            type="button"
            class="icon-btn icon-btn--sm"
            data-action="edit-quest"
            data-id="${quest.id}"
            aria-label="Edit: ${quest.title}"
          >
            ${icon("edit", { size: 15 })}
          </button>
          <button
            type="button"
            class="icon-btn icon-btn--sm"
            data-action="quest-menu"
            data-id="${quest.id}"
            aria-label="More actions for: ${quest.title}"
          >
            ${icon("menu", { size: 15 })}
          </button>
        </div>
      </div>

      ${sealed
        ? html`<p class="quest__sealed-note">
            ${icon("lock", { size: 13 })} Sealed — complete the earlier steps of
            this questline first.
          </p>`
        : ""}
      ${!compact && quest.description
        ? html`<p class="quest__desc">${excerpt(quest.description, 220)}</p>`
        : ""}
      ${hasObjectives && !isOpen
        ? progressBar(progress, {
            label: `Objectives for ${quest.title}`,
            compact: true,
          })
        : ""}
      ${hasObjectives && isOpen ? objectiveList(quest) : ""}
      ${!compact ? tagList(quest.tags) : ""}
      ${done && quest.completedAt
        ? html`<p class="quest__done-note">
            Completed ${formatDate(quest.completedAt.slice(0, 10), { today })}
          </p>`
        : ""}
    </div>
  </article>`;
}

export function emptyState({
  glyph = "inbox",
  title,
  message,
  actionLabel = null,
  action = null,
  subtle = false,
}) {
  return html`<div class="${classes({ empty: true, "empty--subtle": subtle })}">
    <span class="empty__glyph" aria-hidden="true"
      >${icon(glyph, { size: 28 })}</span
    >
    <h3 class="empty__title">${title}</h3>
    <p class="empty__message">${message}</p>
    ${actionLabel && action
      ? html`<button
          type="button"
          class="btn btn--primary"
          data-action="${action}"
        >
          ${actionLabel}
        </button>`
      : ""}
  </div>`;
}

export function statTile({
  label,
  value,
  hint = "",
  tone = "neutral",
  action = null,
}) {
  const inner = html`
    <span class="stat__value">${value}</span>
    <span class="stat__label">${label}</span>
    ${hint ? html`<span class="stat__hint">${hint}</span>` : ""}
  `;
  if (action) {
    return html`<button
      type="button"
      class="stat stat--${tone} stat--action"
      data-action="${action}"
    >
      ${inner}
    </button>`;
  }
  return html`<div class="stat stat--${tone}">${inner}</div>`;
}

export function sectionHead(title, { count = null, actions = null } = {}) {
  return html`<div class="section__head">
    <h2 class="section__title">
      ${title}${count !== null
        ? html`<span class="section__count">${count}</span>`
        : ""}
    </h2>
    ${actions ? html`<div class="section__actions">${actions}</div>` : ""}
  </div>`;
}

export function fieldGroup({
  name,
  label,
  hint = "",
  required = false,
  control,
}) {
  return html`<div class="field">
    <label class="field__label" for="field-${name}">
      ${label}${required
        ? html`<span class="field__required" aria-hidden="true">*</span>`
        : ""}
    </label>
    ${control}
    ${hint ? html`<p class="field__hint" id="hint-${name}">${hint}</p>` : ""}
    <p class="field__error" data-error-for="${name}" role="alert" hidden></p>
  </div>`;
}

export function chainBadge(progress) {
  return html`<span class="chip chip--ghost"
    >${progress.done}/${progress.total} complete</span
  >`;
}

export { percent };
