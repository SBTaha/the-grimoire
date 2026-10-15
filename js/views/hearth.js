import { html, excerpt } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { formatLongDate, formatDate, todayKey } from "../core/dates.js";
import { dashboardSummary } from "../core/stats.js";
import {
  questCard,
  statTile,
  sectionHead,
  emptyState,
  progressBar,
} from "./components.js";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "The small hours";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function hearthView(store, ui) {
  const today = todayKey();
  const summary = dashboardSummary(store.state, today);
  const upcoming = store.upcoming(7);
  const undated = store.filterQuests({
    status: "active",
    due: "undated",
    sort: "priority-desc",
  });
  const chains = store.state.chains
    .map((chain) => ({ chain, progress: store.chainProgress(chain.id) }))
    .filter(
      ({ progress }) => progress.total > 0 && progress.done < progress.total,
    );
  const entries = store.searchEntries("").slice(0, 3);
  const pinned = store.state.notes.filter((note) => note.pinned).slice(0, 4);
  const empty = store.state.quests.length === 0;

  return html`
    <header class="view__head">
      <div>
        <p class="view__eyebrow">${formatLongDate(today)}</p>
        <h1 class="view__title">${greeting()}</h1>
      </div>
      <div class="view__head-actions">
        <button type="button" class="btn btn--primary" data-action="new-quest">
          ${icon("plus", { size: 16 })} Raise a quest
        </button>
      </div>
    </header>

    <section class="level-card" aria-label="Progress">
      <div class="level-card__rank">
        <span class="level-card__badge">${summary.level.level}</span>
        <div>
          <p class="level-card__title">${summary.level.title}</p>
          <p class="level-card__xp">
            ${summary.level.xp.toLocaleString()} XP total
          </p>
        </div>
      </div>
      <div class="level-card__meter">
        ${progressBar(summary.level.progress, {
          label: `Progress to level ${summary.level.level + 1}`,
        })}
        <p class="level-card__next">
          ${summary.level.span - summary.level.into} XP to level
          ${summary.level.level + 1}
        </p>
      </div>
      <div class="level-card__streak">
        ${icon("flame", { size: 18 })}
        <span><strong>${summary.streak.current}</strong> day streak</span>
        <span class="level-card__streak-best"
          >best ${summary.streak.longest}</span
        >
      </div>
    </section>

    <section class="stats-row" aria-label="At a glance">
      ${statTile({
        label: "Active quests",
        value: summary.active,
        action: "goto-quests",
      })}
      ${statTile({
        label: "Due today",
        value: summary.dueToday,
        tone: summary.dueToday > 0 ? "warn" : "neutral",
        action: "goto-today",
      })}
      ${statTile({
        label: "Overdue",
        value: summary.overdue,
        tone: summary.overdue > 0 ? "danger" : "neutral",
        action: "goto-overdue",
      })}
      ${statTile({
        label: "Done this week",
        value: summary.completedThisWeek,
        hint: `${summary.xpThisWeek} XP`,
        tone: "good",
      })}
    </section>

    ${empty
      ? emptyState({
          glyph: "scroll",
          title: "Your grimoire is empty",
          message:
            "Raise your first quest, or load the sample grimoire from the Sanctum to see how it all fits together.",
          actionLabel: "Raise your first quest",
          action: "new-quest",
        })
      : html` <div class="dashboard">
          <div class="dashboard__main">
            <section class="section">
              ${sectionHead("On the horizon", {
                count: upcoming.length,
                actions: html`<button
                  type="button"
                  class="btn btn--ghost btn--sm"
                  data-action="goto-quests"
                >
                  View all ${icon("down", { size: 14 })}
                </button>`,
              })}
              ${upcoming.length
                ? html`<div class="quest-list">
                    ${upcoming.map((quest) =>
                      questCard(quest, {
                        store,
                        expanded: ui.expanded,
                        compact: true,
                      }),
                    )}
                  </div>`
                : emptyState({
                    glyph: "calendar",
                    title: "Nothing due in the next seven days",
                    message:
                      "Either you are genuinely ahead, or something needs a deadline.",
                    subtle: true,
                  })}
            </section>

            ${undated.length
              ? html`<section class="section">
                  ${sectionHead("Undated", { count: undated.length })}
                  <div class="quest-list">
                    ${undated
                      .slice(0, 4)
                      .map((quest) =>
                        questCard(quest, {
                          store,
                          expanded: ui.expanded,
                          compact: true,
                        }),
                      )}
                  </div>
                </section>`
              : ""}
          </div>

          <aside class="dashboard__side">
            ${chains.length
              ? html`<section class="section">
                  ${sectionHead("Questlines in progress")}
                  <ul class="side-list">
                    ${chains.map(
                      ({ chain, progress }) =>
                        html`<li>
                          <button
                            type="button"
                            class="side-card"
                            data-action="open-chain"
                            data-id="${chain.id}"
                          >
                            <span class="side-card__title">${chain.name}</span>
                            ${progressBar(progress.ratio, {
                              label: `${chain.name} progress`,
                              compact: true,
                            })}
                            <span class="side-card__meta">
                              ${progress.done}/${progress.total}
                              complete${progress.next
                                ? html` · next: ${progress.next.title}`
                                : ""}
                            </span>
                          </button>
                        </li>`,
                    )}
                  </ul>
                </section>`
              : ""}

            <section class="section">
              ${sectionHead("Recent chronicle", {
                actions: html`<button
                  type="button"
                  class="icon-btn icon-btn--sm"
                  data-action="new-entry"
                  aria-label="New chronicle entry"
                >
                  ${icon("plus", { size: 15 })}
                </button>`,
              })}
              ${entries.length
                ? html`<ul class="side-list">
                    ${entries.map(
                      (entry) =>
                        html`<li>
                          <button
                            type="button"
                            class="side-card"
                            data-action="open-entry"
                            data-id="${entry.id}"
                          >
                            <span class="side-card__title">${entry.title}</span>
                            <span class="side-card__meta"
                              >${formatDate(entry.date, { today })}</span
                            >
                            <span class="side-card__excerpt"
                              >${excerpt(entry.body, 90)}</span
                            >
                          </button>
                        </li>`,
                    )}
                  </ul>`
                : emptyState({
                    glyph: "chronicle",
                    title: "No entries yet",
                    message:
                      "The chronicle is where the reasoning behind the work lives.",
                    subtle: true,
                  })}
            </section>

            ${pinned.length
              ? html`<section class="section">
                  ${sectionHead("Pinned codex")}
                  <ul class="side-list">
                    ${pinned.map(
                      (note) =>
                        html`<li>
                          <button
                            type="button"
                            class="side-card"
                            data-action="open-note"
                            data-id="${note.id}"
                          >
                            <span class="side-card__title"
                              >${icon("pin", { size: 13 })} ${note.title}</span
                            >
                            <span class="side-card__excerpt"
                              >${excerpt(note.body, 90)}</span
                            >
                          </button>
                        </li>`,
                    )}
                  </ul>
                </section>`
              : ""}
          </aside>
        </div>`}
  `;
}
