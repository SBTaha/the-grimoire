import { html, raw, percent } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import {
  formatDate,
  formatLongDate,
  isoToDateKey,
  addDays,
} from "../core/dates.js";
import {
  totalXp,
  levelInfo,
  activitySeries,
  streaks,
  byCategory,
  byPriority,
  averageDaysToComplete,
  completionRate,
  completionsSince,
} from "../core/stats.js";
import {
  statTile,
  sectionHead,
  emptyState,
  progressBar,
} from "./components.js";

const CHART_DAYS = 63;

function activityChart(series) {
  const max = Math.max(1, ...series.map((point) => point.count));
  const barWidth = 3;
  const gap = 1;
  const height = 64;
  const width = series.length * (barWidth + gap);

  const bars = series
    .map((point, index) => {
      const barHeight =
        point.count === 0 ? 1.5 : Math.max(3, (point.count / max) * height);
      const x = index * (barWidth + gap);
      const y = height - barHeight;
      const tone = point.count === 0 ? "is-empty" : "";
      return (
        `<rect class="chart__bar ${tone}" x="${x}" y="${y}" width="${barWidth}" ` +
        `height="${barHeight}" rx="1"><title>${point.date}: ${point.count} completed</title></rect>`
      );
    })
    .join("");

  return html`<div class="chart">
    <svg
      viewBox="0 0 ${width} ${height}"
      preserveAspectRatio="none"
      class="chart__svg"
      role="img"
      aria-label="Daily completions over the last ${series.length} days"
    >
      ${raw(bars)}
    </svg>
    <div class="chart__axis">
      <span>${formatDate(series[0].date, { withYear: false })}</span>
      <span>${formatDate(series.at(-1).date, { withYear: false })}</span>
    </div>
  </div>`;
}

function barRows(rows, { max, colorOf, labelOf, valueOf, hintOf }) {
  return html`<ul class="bars">
    ${rows.map(
      (row) =>
        html`<li class="bars__row">
          <span class="bars__label">${labelOf(row)}</span>
          <span class="bars__track">
            <span
              class="bars__fill"
              style="width:${max
                ? (valueOf(row) / max) * 100
                : 0}%;--bar:${colorOf(row)}"
            ></span>
          </span>
          <span class="bars__value"
            >${valueOf(row)}${hintOf
              ? html` <span class="bars__hint">${hintOf(row)}</span>`
              : ""}</span
          >
        </li>`,
    )}
  </ul>`;
}

export function annalsView(store) {
  const { log, quests, categories } = store.state;
  const today = store.today;

  if (!log.length) {
    return html` <header class="view__head">
        <div><h1 class="view__title">Annals</h1></div>
      </header>
      ${emptyState({
        glyph: "annals",
        title: "No history recorded yet",
        message:
          "Complete a quest and it is written here permanently — even if the quest itself is later deleted.",
        actionLabel: "Go to the Quest Board",
        action: "goto-quests",
      })}`;
  }

  const level = levelInfo(log);
  const streak = streaks(log, today);
  const series = activitySeries(log, CHART_DAYS, today);
  const categoryRows = byCategory(log, categories);
  const priorityRows = byPriority(log);
  const rate = completionRate(quests);
  const avgDays = averageDaysToComplete(quests);
  const maxCategory = Math.max(1, ...categoryRows.map((r) => r.count));
  const maxPriority = Math.max(1, ...priorityRows.map((r) => r.count));
  const recent = [...log].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  const last30 = completionsSince(log, 30, today);
  const previous30 = log.filter((record) => {
    const key = isoToDateKey(record.at);
    return key && key >= addDays(today, -59) && key < addDays(today, -29);
  }).length;
  const trend = previous30 === 0 ? null : (last30 - previous30) / previous30;

  return html`
    <header class="view__head">
      <div>
        <p class="view__eyebrow">${log.length} completions recorded</p>
        <h1 class="view__title">Annals</h1>
      </div>
    </header>

    <section class="stats-row">
      ${statTile({
        label: "Total XP",
        value: totalXp(log).toLocaleString(),
        hint: `Level ${level.level} · ${level.title}`,
      })}
      ${statTile({
        label: "Current streak",
        value: `${streak.current}d`,
        hint: `Best ${streak.longest}d`,
        tone: streak.current > 0 ? "good" : "neutral",
      })}
      ${statTile({
        label: "Last 30 days",
        value: last30,
        hint:
          trend === null
            ? "no prior period"
            : `${trend >= 0 ? "+" : ""}${Math.round(trend * 100)}% vs previous 30`,
        tone: trend === null ? "neutral" : trend >= 0 ? "good" : "warn",
      })}
      ${statTile({
        label: "Completion rate",
        value: rate === null ? "—" : percent(rate),
        hint: "of all non-archived quests",
      })}
      ${statTile({
        label: "Average age at completion",
        value: avgDays === null ? "—" : `${avgDays.toFixed(1)}d`,
        hint: "from raised to done",
      })}
      ${statTile({
        label: "Active days",
        value: streak.activeDays,
        hint: "days with at least one completion",
      })}
    </section>

    <section class="section">
      ${sectionHead("Activity", { count: null })}
      <p class="section__lede">
        Completions per day over the last ${CHART_DAYS} days.
      </p>
      ${activityChart(series)}
    </section>

    <div class="annals__split">
      <section class="section">
        ${sectionHead("By realm")}
        ${categoryRows.length
          ? barRows(categoryRows, {
              max: maxCategory,
              colorOf: (row) => row.color,
              labelOf: (row) => row.name,
              valueOf: (row) => row.count,
              hintOf: (row) => `${row.xp} XP`,
            })
          : emptyState({
              glyph: "tag",
              title: "No realms used",
              message: "Assign quests to realms to see the split.",
              subtle: true,
            })}
      </section>

      <section class="section">
        ${sectionHead("By priority")}
        ${barRows(priorityRows, {
          max: maxPriority,
          colorOf: (row) => `var(--priority-${row.id})`,
          labelOf: (row) => row.label,
          valueOf: (row) => row.count,
          hintOf: (row) => `${row.xp} XP`,
        })}
      </section>
    </div>

    <section class="section">
      ${sectionHead("Level progress")}
      <div class="level-progress">
        ${progressBar(level.progress, {
          label: `Progress to level ${level.level + 1}`,
        })}
        <p class="level-progress__label">
          Level ${level.level} — ${level.title}. ${level.span - level.into} XP
          to level ${level.level + 1}.
        </p>
      </div>
    </section>

    <section class="section">
      ${sectionHead("Recent completions", { count: recent.length })}
      <ul class="log-list">
        ${recent.map(
          (record) =>
            html`<li class="log-row">
              <span class="log-row__icon" aria-hidden="true"
                >${icon("check", { size: 14 })}</span
              >
              <span class="log-row__title">${record.title}</span>
              <span class="log-row__xp">+${record.xp} XP</span>
              <span class="log-row__date"
                >${formatLongDate(isoToDateKey(record.at))}</span
              >
            </li>`,
        )}
      </ul>
    </section>
  `;
}
