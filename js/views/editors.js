import {
  html,
  toHtml,
  raw,
  qs,
  qsa,
  formData,
  showFormErrors,
} from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { openOverlay, confirmAction } from "../ui/overlay.js";
import { toast } from "../ui/toast.js";
import { fieldGroup } from "./components.js";
import {
  PRIORITIES,
  STATUSES,
  RECURRENCE_FREQS,
  CATEGORY_COLORS,
  priorityOf,
} from "../core/model.js";
import {
  WEEKDAY_LABELS,
  todayKey,
  formatDate,
  formatLongDate,
} from "../core/dates.js";
import { describeRecurrence, projectOccurrences } from "../core/recurrence.js";
import { LIMITS } from "../core/validate.js";

function objectiveRow(objective = { id: "", title: "" }) {
  return html`<li class="objective-row">
    <span class="objective-row__grip" aria-hidden="true"
      >${icon("check", { size: 12 })}</span
    >
    <input
      type="text"
      class="input input--sm"
      value="${objective.title}"
      data-objective-input
      data-objective-id="${objective.id}"
      data-done="${objective.done ? "true" : "false"}"
      maxlength="${LIMITS.objectiveTitle}"
      placeholder="An objective…"
      aria-label="Objective"
    />
    <button
      type="button"
      class="icon-btn icon-btn--sm"
      data-remove-objective
      aria-label="Remove objective"
    >
      ${icon("close", { size: 14 })}
    </button>
  </li>`;
}

export function openQuestEditor(store, questId = null, defaults = {}) {
  const existing = questId ? store.questById(questId) : null;
  const quest = existing ?? {
    title: "",
    description: "",
    priority: "standard",
    status: "active",
    dueDate: "",
    categoryId: "",
    chainId: "",
    tags: [],
    objectives: [],
    recurrence: null,
    ...defaults,
  };
  const isEdit = Boolean(existing);

  const body = html`
    <form id="quest-form" novalidate>
      ${fieldGroup({
        name: "title",
        label: "Quest name",
        required: true,
        control: html`<input
          class="input"
          id="field-title"
          name="title"
          type="text"
          value="${quest.title}"
          maxlength="${LIMITS.title}"
          data-autofocus
          placeholder="What needs doing?"
          autocomplete="off"
        />`,
      })}
      ${fieldGroup({
        name: "description",
        label: "Description",
        hint: "Optional. What does success look like?",
        control: html`<textarea
          class="input input--area"
          id="field-description"
          name="description"
          rows="3"
          maxlength="${LIMITS.description}"
        >
${quest.description}</textarea
        >`,
      })}

      <div class="field-row">
        ${fieldGroup({
          name: "priority",
          label: "Priority",
          control: html`<select
            class="input"
            id="field-priority"
            name="priority"
          >
            ${PRIORITIES.map(
              (p) =>
                html`<option
                  value="${p.id}"
                  ${p.id === quest.priority ? raw("selected") : ""}
                >
                  ${p.label} · ${p.xp} XP
                </option>`,
            )}
          </select>`,
        })}
        ${fieldGroup({
          name: "dueDate",
          label: "Deadline",
          control: html`<input
            class="input"
            id="field-dueDate"
            name="dueDate"
            type="date"
            value="${quest.dueDate ?? ""}"
          />`,
        })}
      </div>

      <div class="field-row">
        ${fieldGroup({
          name: "categoryId",
          label: "Realm",
          control: html`<select
            class="input"
            id="field-categoryId"
            name="categoryId"
          >
            <option value="">Unassigned</option>
            ${store.state.categories.map(
              (c) =>
                html`<option
                  value="${c.id}"
                  ${c.id === quest.categoryId ? raw("selected") : ""}
                >
                  ${c.name}
                </option>`,
            )}
          </select>`,
        })}
        ${fieldGroup({
          name: "chainId",
          label: "Questline",
          hint: "Steps unseal in order.",
          control: html`<select class="input" id="field-chainId" name="chainId">
            <option value="">Standalone</option>
            ${store.state.chains.map(
              (c) =>
                html`<option
                  value="${c.id}"
                  ${c.id === quest.chainId ? raw("selected") : ""}
                >
                  ${c.name}
                </option>`,
            )}
          </select>`,
        })}
      </div>

      ${isEdit
        ? fieldGroup({
            name: "status",
            label: "Status",
            control: html`<select class="input" id="field-status" name="status">
              ${STATUSES.map(
                (s) =>
                  html`<option
                    value="${s.id}"
                    ${s.id === quest.status ? raw("selected") : ""}
                  >
                    ${s.label}
                  </option>`,
              )}
            </select>`,
          })
        : ""}
      ${fieldGroup({
        name: "tags",
        label: "Tags",
        hint: "Comma-separated.",
        control: html`<input
          class="input"
          id="field-tags"
          name="tags"
          type="text"
          value="${quest.tags.join(", ")}"
          placeholder="home, deep-work"
          autocomplete="off"
        />`,
      })}

      <fieldset class="fieldset">
        <legend class="fieldset__legend">
          <label class="switch">
            <input
              type="checkbox"
              name="repeats"
              id="field-repeats"
              ${quest.recurrence ? raw("checked") : ""}
            />
            <span class="switch__track" aria-hidden="true"
              ><span class="switch__thumb"></span
            ></span>
            <span>This quest repeats</span>
          </label>
        </legend>
        <div
          class="recurrence"
          data-recurrence
          ${quest.recurrence ? "" : raw("hidden")}
        >
          <div class="field-row">
            ${fieldGroup({
              name: "freq",
              label: "Repeats",
              control: html`<select class="input" id="field-freq" name="freq">
                ${RECURRENCE_FREQS.map(
                  (f) =>
                    html`<option
                      value="${f.id}"
                      ${f.id === quest.recurrence?.freq ? raw("selected") : ""}
                    >
                      ${f.label}
                    </option>`,
                )}
              </select>`,
            })}
            ${fieldGroup({
              name: "interval",
              label: "Every",
              control: html`<input
                class="input"
                id="field-interval"
                name="interval"
                type="number"
                min="1"
                max="52"
                value="${quest.recurrence?.interval ?? 1}"
              />`,
            })}
          </div>
          <div
            class="field"
            data-weekdays
            ${quest.recurrence?.freq === "weekly" ? "" : raw("hidden")}
          >
            <span class="field__label">On these days</span>
            <div class="weekdays">
              ${WEEKDAY_LABELS.map(
                (label, index) =>
                  html`<label class="weekday">
                    <input
                      type="checkbox"
                      name="weekdays"
                      data-multi="true"
                      value="${index}"
                      ${quest.recurrence?.weekdays?.includes(index)
                        ? raw("checked")
                        : ""}
                    />
                    <span>${label}</span>
                  </label>`,
              )}
            </div>
            <p class="field__hint">
              Leave all unchecked to repeat on the same weekday as the deadline.
            </p>
          </div>
          <p class="recurrence__preview" data-recurrence-preview></p>
          <p
            class="field__error"
            data-error-for="recurrence"
            role="alert"
            hidden
          ></p>
        </div>
      </fieldset>

      <div class="field">
        <span class="field__label">Objectives</span>
        <ul class="objective-rows" data-objective-list>
          ${quest.objectives.map((o) => objectiveRow(o))}
        </ul>
        <button type="button" class="btn btn--ghost btn--sm" data-add-objective>
          ${icon("plus", { size: 14 })} Add objective
        </button>
        <p
          class="field__error"
          data-error-for="objectives"
          role="alert"
          hidden
        ></p>
      </div>

      <p class="field__error" data-error-for="form" role="alert" hidden></p>
    </form>
  `;

  const footer = html`
    <button type="button" class="btn" data-overlay-dismiss>Cancel</button>
    <button type="submit" form="quest-form" class="btn btn--primary">
      ${isEdit ? "Save changes" : "Raise quest"}
    </button>
  `;

  openOverlay({
    title: isEdit ? "Edit quest" : "Raise a new quest",
    subtitle: isEdit
      ? quest.title
      : "Give it a name now; the details can follow.",
    size: "lg",
    body,
    footer,
    onMount: (panel, close) => {
      const form = qs("#quest-form", panel);
      const list = qs("[data-objective-list]", panel);
      const repeats = qs('[name="repeats"]', panel);
      const recurrenceBox = qs("[data-recurrence]", panel);
      const weekdayBox = qs("[data-weekdays]", panel);
      const freq = qs('[name="freq"]', panel);
      const preview = qs("[data-recurrence-preview]", panel);
      const dueInput = qs('[name="dueDate"]', panel);

      const syncRecurrence = () => {
        recurrenceBox.hidden = !repeats.checked;
        weekdayBox.hidden = freq.value !== "weekly";
        if (!repeats.checked) {
          preview.textContent = "";
          return;
        }
        const rule = readRecurrence(form);
        const anchor = dueInput.value || todayKey();
        const upcoming = projectOccurrences(rule, anchor, 3);
        preview.textContent = dueInput.value
          ? `${describeRecurrence(rule)} — next: ${upcoming.map((d) => formatDate(d)).join(", ")}`
          : `${describeRecurrence(rule)} — set a deadline to anchor the series.`;
      };

      repeats.addEventListener("change", syncRecurrence);
      freq.addEventListener("change", syncRecurrence);
      form.addEventListener("input", (event) => {
        if (
          event.target.closest("[data-recurrence]") ||
          event.target === dueInput
        )
          syncRecurrence();
      });
      syncRecurrence();

      qs("[data-add-objective]", panel).addEventListener("click", () => {
        const node = document.createElement("li");
        node.innerHTML = toHtml(objectiveRow());
        list.appendChild(node.firstElementChild);
        qsa("[data-objective-input]", list).at(-1).focus();
      });

      list.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-remove-objective]");
        if (remove) remove.closest(".objective-row").remove();
      });

      list.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" &&
          event.target.matches("[data-objective-input]")
        ) {
          event.preventDefault();
          qs("[data-add-objective]", panel).click();
        }
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(form);
        const payload = {
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate || null,
          categoryId: data.categoryId || null,
          chainId: data.chainId || null,
          tags: data.tags,
          objectives: readObjectives(list),
          recurrence: data.repeats ? readRecurrence(form) : null,
        };
        if (isEdit) payload.status = data.status;

        const result = isEdit
          ? store.updateQuest(questId, payload)
          : store.createQuest(payload);

        if (!result.ok) {
          showFormErrors(form, result.errors ?? {});
          return;
        }
        close();
        toast(
          isEdit ? "Quest updated." : `Quest raised: ${result.data.title}`,
          { tone: "success" },
        );
      });
    },
  });
}

function readObjectives(list) {
  return qsa("[data-objective-input]", list)
    .map((input) => ({
      id: input.dataset.objectiveId || undefined,
      title: input.value.trim(),
      done: input.dataset.done === "true",
    }))
    .filter((objective) => objective.title);
}

function readRecurrence(form) {
  const data = formData(form);
  return {
    freq: data.freq,
    interval: Number(data.interval) || 1,
    weekdays: (data.weekdays ?? []).map(Number),
  };
}

export function openQuestMenu(store, questId) {
  const quest = store.questById(questId);
  if (!quest) return;

  const action = (name, label, iconName, tone = "") =>
    html` <button
      type="button"
      class="menu-item ${tone}"
      data-menu-action="${name}"
    >
      ${icon(iconName, { size: 16 })}<span>${label}</span>
    </button>`;

  openOverlay({
    title: quest.title,
    subtitle: `${priorityOf(quest.priority).label} · ${quest.status}`,
    size: "sm",
    body: html`<div class="menu">
      ${quest.status === "active"
        ? action("complete", "Mark complete", "check")
        : ""}
      ${quest.status !== "active"
        ? action("reopen", "Return to active", "undo")
        : ""}
      ${action("edit", "Edit quest", "edit")}
      ${action("duplicate", "Duplicate", "scroll")}
      ${quest.status !== "archived"
        ? action("archive", "Archive", "archive")
        : ""}
      ${action("delete", "Delete permanently", "trash", "menu-item--danger")}
    </div>`,
    onMount: (panel, close) => {
      panel.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-menu-action]");
        if (!button) return;
        const name = button.dataset.menuAction;
        close();

        if (name === "edit") {
          openQuestEditor(store, questId);
          return;
        }
        if (name === "complete") {
          const result = store.completeQuest(questId);
          toast(result.ok ? `Completed — ${result.xp} XP` : result.message, {
            tone: result.ok ? "success" : "danger",
          });
          return;
        }
        if (name === "reopen") {
          store.reopenQuest(questId);
          toast("Returned to active.");
          return;
        }
        if (name === "archive") {
          store.setQuestStatus(questId, "archived");
          toast("Quest archived.");
          return;
        }
        if (name === "duplicate") {
          openQuestEditor(store, null, {
            title: `${quest.title} (copy)`,
            description: quest.description,
            priority: quest.priority,
            categoryId: quest.categoryId ?? "",
            chainId: quest.chainId ?? "",
            tags: quest.tags,
            objectives: quest.objectives.map((o) => ({
              ...o,
              id: "",
              done: false,
            })),
            dueDate: quest.dueDate ?? "",
          });
          return;
        }
        if (name === "delete") {
          const confirmed = await confirmAction({
            title: "Delete this quest?",
            message: `"${quest.title}" will be removed. Completion history already recorded in the Annals is kept.`,
            confirmLabel: "Delete quest",
          });
          if (!confirmed) return;
          const snapshot = {
            ...quest,
            objectives: quest.objectives.map((o) => ({ ...o })),
          };
          store.deleteQuest(questId);
          toast("Quest deleted.", {
            tone: "danger",
            action: {
              label: "Undo",
              onClick: () => {
                store.createQuest(snapshot);
                toast("Quest restored.", { tone: "success" });
              },
            },
          });
        }
      });
    },
  });
}

export function openCategoryEditor(store, categoryId = null) {
  const existing = categoryId ? store.categoryById(categoryId) : null;
  const category = existing ?? {
    name: "",
    color: CATEGORY_COLORS[0],
    glyph: "◆",
  };

  openOverlay({
    title: existing ? "Edit realm" : "New realm",
    size: "sm",
    body: html`<form id="category-form" novalidate>
      ${fieldGroup({
        name: "name",
        label: "Name",
        required: true,
        control: html`<input
          class="input"
          id="field-name"
          name="name"
          type="text"
          value="${category.name}"
          maxlength="${LIMITS.categoryName}"
          data-autofocus
          autocomplete="off"
        />`,
      })}
      <div class="field">
        <span class="field__label">Colour</span>
        <div class="swatches">
          ${CATEGORY_COLORS.map(
            (color) =>
              html`<label class="swatch" style="--swatch:${color}">
                <input
                  type="radio"
                  name="color"
                  value="${color}"
                  ${color === category.color ? raw("checked") : ""}
                />
                <span class="swatch__dot" aria-hidden="true"></span>
                <span class="visually-hidden">${color}</span>
              </label>`,
          )}
        </div>
        <p class="field__error" data-error-for="color" role="alert" hidden></p>
      </div>
      <p class="field__error" data-error-for="form" role="alert" hidden></p>
    </form>`,
    footer: html` <button type="button" class="btn" data-overlay-dismiss>
        Cancel
      </button>
      <button type="submit" form="category-form" class="btn btn--primary">
        ${existing ? "Save" : "Create realm"}
      </button>`,
    onMount: (panel, close) => {
      const form = qs("#category-form", panel);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(form);
        const result = existing
          ? store.updateCategory(categoryId, data)
          : store.createCategory(data);
        if (!result.ok) {
          showFormErrors(form, result.errors ?? {});
          return;
        }
        close();
        toast(existing ? "Realm updated." : "Realm created.", {
          tone: "success",
        });
      });
    },
  });
}

export function openChainEditor(store, chainId = null) {
  const existing = chainId ? store.chainById(chainId) : null;
  const chain = existing ?? { name: "", description: "" };

  openOverlay({
    title: existing ? "Edit questline" : "New questline",
    subtitle:
      "A questline runs in order — each step unseals when the one before it is done.",
    size: "md",
    body: html`<form id="chain-form" novalidate>
      ${fieldGroup({
        name: "name",
        label: "Name",
        required: true,
        control: html`<input
          class="input"
          id="field-name"
          name="name"
          type="text"
          value="${chain.name}"
          maxlength="${LIMITS.chainName}"
          data-autofocus
          autocomplete="off"
        />`,
      })}
      ${fieldGroup({
        name: "description",
        label: "Description",
        control: html`<textarea
          class="input input--area"
          id="field-description"
          name="description"
          rows="3"
          maxlength="${LIMITS.description}"
        >
${chain.description}</textarea
        >`,
      })}
      <p class="field__error" data-error-for="form" role="alert" hidden></p>
    </form>`,
    footer: html` <button type="button" class="btn" data-overlay-dismiss>
        Cancel
      </button>
      <button type="submit" form="chain-form" class="btn btn--primary">
        ${existing ? "Save" : "Create questline"}
      </button>`,
    onMount: (panel, close) => {
      const form = qs("#chain-form", panel);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const result = existing
          ? store.updateChain(chainId, formData(form))
          : store.createChain(formData(form));
        if (!result.ok) {
          showFormErrors(form, result.errors ?? {});
          return;
        }
        close();
        toast(existing ? "Questline updated." : "Questline created.", {
          tone: "success",
        });
      });
    },
  });
}

export function openEntryEditor(store, entryId = null) {
  const existing = entryId ? store.entryById(entryId) : null;
  const entry = existing ?? {
    date: todayKey(),
    title: "",
    body: "",
    tags: [],
    linkedQuestIds: [],
  };
  const linkable = store.state.quests
    .filter((q) => q.status !== "archived")
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));

  openOverlay({
    title: existing ? "Edit chronicle entry" : "New chronicle entry",
    subtitle: existing
      ? formatLongDate(entry.date)
      : "What happened, and what did it teach you?",
    size: "lg",
    body: html`<form id="entry-form" novalidate>
      <div class="field-row">
        ${fieldGroup({
          name: "title",
          label: "Title",
          required: true,
          control: html`<input
            class="input"
            id="field-title"
            name="title"
            type="text"
            value="${entry.title}"
            maxlength="${LIMITS.title}"
            data-autofocus
            autocomplete="off"
          />`,
        })}
        ${fieldGroup({
          name: "date",
          label: "Date",
          required: true,
          control: html`<input
            class="input"
            id="field-date"
            name="date"
            type="date"
            value="${entry.date}"
          />`,
        })}
      </div>
      ${fieldGroup({
        name: "body",
        label: "Entry",
        required: true,
        hint: "**bold**, *italic* and - bullet lists are understood.",
        control: html`<textarea
          class="input input--area input--tall"
          id="field-body"
          name="body"
          rows="10"
          maxlength="${LIMITS.body}"
        >
${entry.body}</textarea
        >`,
      })}
      ${fieldGroup({
        name: "tags",
        label: "Tags",
        hint: "Comma-separated.",
        control: html`<input
          class="input"
          id="field-tags"
          name="tags"
          type="text"
          value="${entry.tags.join(", ")}"
          autocomplete="off"
        />`,
      })}
      ${linkable.length
        ? html`<div class="field">
            <span class="field__label">Linked quests</span>
            <div class="link-list">
              ${linkable.map(
                (q) =>
                  html`<label class="link-list__item">
                    <input
                      type="checkbox"
                      name="linkedQuestIds"
                      data-multi="true"
                      value="${q.id}"
                      ${entry.linkedQuestIds.includes(q.id)
                        ? raw("checked")
                        : ""}
                    />
                    <span>${q.title}</span>
                  </label>`,
              )}
            </div>
          </div>`
        : ""}
      <p class="field__error" data-error-for="form" role="alert" hidden></p>
    </form>`,
    footer: html` <button type="button" class="btn" data-overlay-dismiss>
        Cancel
      </button>
      <button type="submit" form="entry-form" class="btn btn--primary">
        ${existing ? "Save entry" : "Record entry"}
      </button>`,
    onMount: (panel, close) => {
      const form = qs("#entry-form", panel);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(form);
        const payload = { ...data, linkedQuestIds: data.linkedQuestIds ?? [] };
        const result = existing
          ? store.updateEntry(entryId, payload)
          : store.createEntry(payload);
        if (!result.ok) {
          showFormErrors(form, result.errors ?? {});
          return;
        }
        close();
        toast(existing ? "Entry updated." : "Entry recorded.", {
          tone: "success",
        });
      });
    },
  });
}

export function openNoteEditor(store, noteId = null) {
  const existing = noteId ? store.noteById(noteId) : null;
  const note = existing ?? {
    title: "",
    body: "",
    tags: [],
    categoryId: "",
    pinned: false,
  };

  openOverlay({
    title: existing ? "Edit codex entry" : "New codex entry",
    size: "lg",
    body: html`<form id="note-form" novalidate>
      ${fieldGroup({
        name: "title",
        label: "Title",
        required: true,
        control: html`<input
          class="input"
          id="field-title"
          name="title"
          type="text"
          value="${note.title}"
          maxlength="${LIMITS.title}"
          data-autofocus
          autocomplete="off"
        />`,
      })}
      ${fieldGroup({
        name: "body",
        label: "Contents",
        required: true,
        hint: "**bold**, *italic*, `code` and - bullet lists are understood.",
        control: html`<textarea
          class="input input--area input--tall"
          id="field-body"
          name="body"
          rows="12"
          maxlength="${LIMITS.body}"
        >
${note.body}</textarea
        >`,
      })}
      <div class="field-row">
        ${fieldGroup({
          name: "categoryId",
          label: "Realm",
          control: html`<select
            class="input"
            id="field-categoryId"
            name="categoryId"
          >
            <option value="">Unassigned</option>
            ${store.state.categories.map(
              (c) =>
                html`<option
                  value="${c.id}"
                  ${c.id === note.categoryId ? raw("selected") : ""}
                >
                  ${c.name}
                </option>`,
            )}
          </select>`,
        })}
        ${fieldGroup({
          name: "tags",
          label: "Tags",
          hint: "Comma-separated.",
          control: html`<input
            class="input"
            id="field-tags"
            name="tags"
            type="text"
            value="${note.tags.join(", ")}"
            autocomplete="off"
          />`,
        })}
      </div>
      <label class="switch">
        <input
          type="checkbox"
          name="pinned"
          ${note.pinned ? raw("checked") : ""}
        />
        <span class="switch__track" aria-hidden="true"
          ><span class="switch__thumb"></span
        ></span>
        <span>Pin to the top of the codex</span>
      </label>
      <p class="field__error" data-error-for="form" role="alert" hidden></p>
    </form>`,
    footer: html` <button type="button" class="btn" data-overlay-dismiss>
        Cancel
      </button>
      <button type="submit" form="note-form" class="btn btn--primary">
        ${existing ? "Save entry" : "Add to codex"}
      </button>`,
    onMount: (panel, close) => {
      const form = qs("#note-form", panel);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const result = existing
          ? store.updateNote(noteId, formData(form))
          : store.createNote(formData(form));
        if (!result.ok) {
          showFormErrors(form, result.errors ?? {});
          return;
        }
        close();
        toast(existing ? "Codex entry updated." : "Added to the codex.", {
          tone: "success",
        });
      });
    },
  });
}
