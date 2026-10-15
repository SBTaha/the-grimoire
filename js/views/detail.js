import { html, formatBody, qs } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { openOverlay } from "../ui/overlay.js";
import { formatLongDate, formatDate } from "../core/dates.js";
import { categoryChip } from "./components.js";

export function openEntryDetail(store, entryId, { onEdit } = {}) {
  const entry = store.entryById(entryId);
  if (!entry) return;
  const linked = entry.linkedQuestIds
    .map((id) => store.questById(id))
    .filter(Boolean);

  openOverlay({
    title: entry.title,
    subtitle: formatLongDate(entry.date),
    size: "lg",
    body: html` <div class="prose">${formatBody(entry.body)}</div>
      ${entry.tags.length
        ? html`<div class="detail__tags">
            ${entry.tags.map(
              (tag) => html`<span class="tag tag--static">#${tag}</span>`,
            )}
          </div>`
        : ""}
      ${linked.length
        ? html`<section class="detail__section">
            <h3 class="detail__heading">Linked quests</h3>
            <ul class="detail__links">
              ${linked.map(
                (quest) =>
                  html`<li>
                    <span class="detail__link"
                      >${icon("quests", { size: 14 })} ${quest.title}
                      <span class="detail__link-status">${quest.status}</span>
                    </span>
                  </li>`,
              )}
            </ul>
          </section>`
        : ""}`,
    footer: html` <button type="button" class="btn" data-overlay-dismiss>
        Close
      </button>
      <button type="button" class="btn btn--primary" data-detail-edit>
        ${icon("edit", { size: 15 })} Edit
      </button>`,
    onMount: (panel, close) => {
      qs("[data-detail-edit]", panel).addEventListener("click", () => {
        close();
        onEdit?.(entryId);
      });
    },
  });
}

export function openNoteDetail(store, noteId, { onEdit } = {}) {
  const note = store.noteById(noteId);
  if (!note) return;
  const category = store.categoryById(note.categoryId);

  openOverlay({
    title: note.title,
    subtitle: `Updated ${formatDate(note.updatedAt.slice(0, 10), { today: store.today, withYear: true })}`,
    size: "lg",
    body: html` ${category || note.tags.length
        ? html`<div class="detail__tags">
            ${category ? categoryChip(category) : ""}
            ${note.tags.map(
              (tag) => html`<span class="tag tag--static">#${tag}</span>`,
            )}
          </div>`
        : ""}
      <div class="prose">${formatBody(note.body)}</div>`,
    footer: html` <button type="button" class="btn" data-overlay-dismiss>
        Close
      </button>
      <button type="button" class="btn" data-detail-pin>
        ${icon("pin", { size: 15 })} ${note.pinned ? "Unpin" : "Pin"}
      </button>
      <button type="button" class="btn btn--primary" data-detail-edit>
        ${icon("edit", { size: 15 })} Edit
      </button>`,
    onMount: (panel, close) => {
      qs("[data-detail-edit]", panel).addEventListener("click", () => {
        close();
        onEdit?.(noteId);
      });
      qs("[data-detail-pin]", panel).addEventListener("click", () => {
        store.toggleNotePin(noteId);
        close();
      });
    },
  });
}
