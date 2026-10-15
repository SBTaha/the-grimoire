import { html, formatBytes } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { sectionHead, emptyState } from "./components.js";

const LOCALSTORAGE_BUDGET = 5 * 1024 * 1024;

export function sanctumView(store) {
  const counts = store.counts();
  const used = counts.bytes / LOCALSTORAGE_BUDGET;

  return html`
    <header class="view__head">
      <div>
        <p class="view__eyebrow">Realms, archives and storage</p>
        <h1 class="view__title">Sanctum</h1>
      </div>
    </header>

    <section class="section">
      ${sectionHead("Realms", {
        count: counts.categories,
        actions: html`<button
          type="button"
          class="btn btn--ghost btn--sm"
          data-action="new-category"
        >
          ${icon("plus", { size: 14 })} New realm
        </button>`,
      })}
      <p class="section__lede">
        Realms group quests and codex entries. Deleting one leaves its records
        intact and simply unassigns them.
      </p>
      ${store.state.categories.length
        ? html`<ul class="realm-list">
            ${store.state.categories.map((category) => {
              const questCount = store.state.quests.filter(
                (q) => q.categoryId === category.id,
              ).length;
              const noteCount = store.state.notes.filter(
                (n) => n.categoryId === category.id,
              ).length;
              return html`<li
                class="realm"
                style="--chip-color:${category.color}"
              >
                <span class="realm__dot" aria-hidden="true"></span>
                <span class="realm__name">${category.name}</span>
                <span class="realm__counts"
                  >${questCount} quest${questCount === 1 ? "" : "s"} ·
                  ${noteCount} note${noteCount === 1 ? "" : "s"}</span
                >
                <span class="realm__actions">
                  <button
                    type="button"
                    class="icon-btn icon-btn--sm"
                    data-action="edit-category"
                    data-id="${category.id}"
                    aria-label="Edit ${category.name}"
                  >
                    ${icon("edit", { size: 15 })}
                  </button>
                  <button
                    type="button"
                    class="icon-btn icon-btn--sm"
                    data-action="delete-category"
                    data-id="${category.id}"
                    aria-label="Delete ${category.name}"
                  >
                    ${icon("trash", { size: 15 })}
                  </button>
                </span>
              </li>`;
            })}
          </ul>`
        : emptyState({
            glyph: "tag",
            title: "No realms defined",
            message:
              "Realms are optional, but they make the Annals considerably more interesting.",
            actionLabel: "Create a realm",
            action: "new-category",
            subtle: true,
          })}
    </section>

    <section class="section">
      ${sectionHead("Sample grimoire")}
      <p class="section__lede">
        A worked example — five realms, two questlines, recurring quests and a
        month of back-dated history. Every sample record is flagged, so removing
        them never touches anything you wrote.
      </p>
      <div class="button-row">
        ${counts.seeded
          ? html`<button
              type="button"
              class="btn btn--danger"
              data-action="remove-seed"
            >
              ${icon("trash", { size: 15 })} Remove sample data
            </button>`
          : html`<button
              type="button"
              class="btn btn--primary"
              data-action="load-seed"
            >
              ${icon("sparkle", { size: 15 })} Load the sample grimoire
            </button>`}
      </div>
    </section>

    <section class="section">
      ${sectionHead("Archives")}
      <p class="section__lede">
        An archive is a plain JSON file containing everything. It is the only
        way to move a grimoire between browsers or devices, and the only real
        backup.
      </p>
      <div class="button-row">
        <button type="button" class="btn" data-action="export-archive">
          ${icon("download", { size: 15 })} Export archive
        </button>
        <button type="button" class="btn" data-action="import-archive">
          ${icon("upload", { size: 15 })} Import archive
        </button>
        <input
          type="file"
          accept="application/json,.json"
          id="import-input"
          class="visually-hidden"
        />
      </div>
    </section>

    <section class="section">
      ${sectionHead("Storage")}
      <dl class="facts">
        <div class="fact">
          <dt>Quests</dt>
          <dd>
            ${counts.quests} (${counts.active} active, ${counts.completed}
            complete, ${counts.archived} archived)
          </dd>
        </div>
        <div class="fact">
          <dt>Questlines</dt>
          <dd>${counts.chains}</dd>
        </div>
        <div class="fact">
          <dt>Chronicle entries</dt>
          <dd>${counts.entries}</dd>
        </div>
        <div class="fact">
          <dt>Codex entries</dt>
          <dd>${counts.notes}</dd>
        </div>
        <div class="fact">
          <dt>Completion records</dt>
          <dd>${counts.log}</dd>
        </div>
        <div class="fact">
          <dt>Approximate size</dt>
          <dd>${formatBytes(counts.bytes)} of a ~5 MB budget</dd>
        </div>
      </dl>
      <div class="storage-meter">
        <div class="storage-meter__track">
          <div
            class="storage-meter__fill"
            style="width:${Math.min(100, used * 100).toFixed(2)}%"
          ></div>
        </div>
      </div>

      <div class="callout callout--warning">
        <span class="callout__icon" aria-hidden="true"
          >${icon("warning", { size: 18 })}</span
        >
        <div>
          <p class="callout__title">Where this data actually lives</p>
          <p>
            Everything is held in this browser's <code>localStorage</code> under
            the key <code>grimoire:state</code>. There is no server and no
            account, which means:
          </p>
          <ul>
            <li>
              It does not sync. Another browser, another device or another
              profile sees an empty grimoire.
            </li>
            <li>
              Clearing site data, "clear cookies and site data", or an
              aggressive privacy extension erases it.
            </li>
            <li>
              Private or incognito windows usually discard it when the window
              closes.
            </li>
            <li>
              The practical ceiling is roughly 5 MB. Beyond that, saves fail and
              you will be told so.
            </li>
          </ul>
          <p>Export an archive regularly if the contents matter.</p>
        </div>
      </div>
    </section>

    <section class="section">
      ${sectionHead("Danger")}
      <p class="section__lede">
        Permanent, immediate and not recoverable without an archive.
      </p>
      <button type="button" class="btn btn--danger" data-action="wipe-all">
        ${icon("trash", { size: 15 })} Erase the entire grimoire
      </button>
    </section>
  `;
}
