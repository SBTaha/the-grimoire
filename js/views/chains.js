import { html, classes } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { describeDue } from "../core/dates.js";
import { priorityOf } from "../core/model.js";
import {
  sectionHead,
  emptyState,
  progressBar,
  priorityPill,
} from "./components.js";

function step(store, quest, index, total) {
  const sealed = store.isSealed(quest);
  const done = quest.status === "completed";
  const due = describeDue(quest.dueDate, store.today);

  return html`<li
    class="${classes({ step: true, "is-done": done, "is-sealed": sealed })}"
  >
    <div class="step__marker" aria-hidden="true">
      <span class="step__dot"
        >${done
          ? icon("check", { size: 12 })
          : sealed
            ? icon("lock", { size: 11 })
            : index + 1}</span
      >
      ${index < total - 1 ? html`<span class="step__line"></span>` : ""}
    </div>

    <div class="step__body">
      <div class="step__head">
        <button
          type="button"
          class="step__title"
          data-action="edit-quest"
          data-id="${quest.id}"
        >
          ${quest.title}
        </button>
        <div class="step__controls">
          <button
            type="button"
            class="icon-btn icon-btn--sm"
            data-action="move-step-up"
            data-id="${quest.id}"
            ${index === 0 ? "disabled" : ""}
            aria-label="Move “${quest.title}” earlier"
          >
            ${icon("up", { size: 14 })}
          </button>
          <button
            type="button"
            class="icon-btn icon-btn--sm"
            data-action="move-step-down"
            data-id="${quest.id}"
            ${index === total - 1 ? "disabled" : ""}
            aria-label="Move “${quest.title}” later"
          >
            ${icon("down", { size: 14 })}
          </button>
          ${quest.status === "active" && !sealed
            ? html`<button
                type="button"
                class="btn btn--ghost btn--sm"
                data-action="complete-quest"
                data-id="${quest.id}"
              >
                ${icon("check", { size: 14 })} Complete
              </button>`
            : ""}
        </div>
      </div>
      <div class="step__meta">
        ${priorityPill(quest.priority)}
        ${quest.dueDate
          ? html`<span class="step__due step__due--${due.tone}"
              >${due.label}</span
            >`
          : ""}
        ${sealed
          ? html`<span class="step__sealed"
              >${icon("lock", { size: 12 })} Sealed</span
            >`
          : ""}
        ${done
          ? html`<span class="step__complete"
              >Complete · ${priorityOf(quest.priority).xp} XP</span
            >`
          : ""}
      </div>
      ${quest.description
        ? html`<p class="step__desc">${quest.description}</p>`
        : ""}
    </div>
  </li>`;
}

export function chainsView(store) {
  const chains = store.state.chains;

  return html`
    <header class="view__head">
      <div>
        <p class="view__eyebrow">
          ${chains.length} questline${chains.length === 1 ? "" : "s"}
        </p>
        <h1 class="view__title">Questlines</h1>
      </div>
      <div class="view__head-actions">
        <button type="button" class="btn btn--primary" data-action="new-chain">
          ${icon("plus", { size: 16 })} New questline
        </button>
      </div>
    </header>

    <p class="view__lede">
      A questline is a sequence. Every step stays sealed until the ones before
      it are complete, so a long project presents one next action instead of
      twelve competing ones.
    </p>

    ${chains.length === 0
      ? emptyState({
          glyph: "chains",
          title: "No questlines yet",
          message:
            "Use one for anything with a required order — a project, a move, a course of study.",
          actionLabel: "Create a questline",
          action: "new-chain",
        })
      : html`<div class="chain-list">
          ${chains.map((chain) => {
            const progress = store.chainProgress(chain.id);
            const complete =
              progress.total > 0 && progress.done === progress.total;
            return html`<section
              class="${classes({ chain: true, "chain--complete": complete })}"
              data-chain-id="${chain.id}"
            >
              ${sectionHead(chain.name, {
                actions: html` <button
                    type="button"
                    class="icon-btn icon-btn--sm"
                    data-action="edit-chain"
                    data-id="${chain.id}"
                    aria-label="Edit ${chain.name}"
                  >
                    ${icon("edit", { size: 15 })}
                  </button>
                  <button
                    type="button"
                    class="icon-btn icon-btn--sm"
                    data-action="delete-chain"
                    data-id="${chain.id}"
                    aria-label="Delete ${chain.name}"
                  >
                    ${icon("trash", { size: 15 })}
                  </button>`,
              })}
              ${chain.description
                ? html`<p class="chain__desc">${chain.description}</p>`
                : ""}

              <div class="chain__progress">
                ${progressBar(progress.ratio, {
                  label: `${chain.name} progress`,
                })}
                <span class="chain__progress-label">
                  ${progress.done} of ${progress.total} complete
                  ${complete
                    ? html` · <strong>questline finished</strong>`
                    : ""}
                </span>
              </div>

              ${progress.total === 0
                ? emptyState({
                    glyph: "scroll",
                    title: "No steps yet",
                    message: "Add the first step to begin the line.",
                    subtle: true,
                  })
                : html`<ol class="steps">
                    ${progress.steps.map((quest, index) =>
                      step(store, quest, index, progress.total),
                    )}
                  </ol>`}

              <button
                type="button"
                class="btn btn--ghost btn--sm"
                data-action="add-step"
                data-id="${chain.id}"
              >
                ${icon("plus", { size: 14 })} Add a step
              </button>
            </section>`;
          })}
        </div>`}
  `;
}
