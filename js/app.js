import { Store, DEFAULT_FILTERS } from "./core/store.js";
import { createBestAdapter } from "./core/storage.js";
import { html, mount, qs, qsa, downloadFile } from "./ui/dom.js";
import { debounce } from "./core/util.js";
import { icon } from "./ui/icons.js";
import { toast, announce } from "./ui/toast.js";
import { openOverlay, confirmAction } from "./ui/overlay.js";
import { buildSeedData } from "./seed.js";
import { todayKey } from "./core/dates.js";
import { levelInfo } from "./core/stats.js";

import { hearthView } from "./views/hearth.js";
import { questsView, questResults } from "./views/quests.js";
import { chainsView } from "./views/chains.js";
import { chronicleView, chronicleResults } from "./views/chronicle.js";
import { codexView, codexResults } from "./views/codex.js";
import { annalsView } from "./views/annals.js";
import { sanctumView } from "./views/sanctum.js";
import {
  openQuestEditor,
  openQuestMenu,
  openCategoryEditor,
  openChainEditor,
  openEntryEditor,
  openNoteEditor,
} from "./views/editors.js";
import { openEntryDetail, openNoteDetail } from "./views/detail.js";

const ROUTES = [
  { id: "hearth", label: "Hearth", glyph: "hearth", render: hearthView },
  { id: "quests", label: "Quest Board", glyph: "quests", render: questsView },
  { id: "chains", label: "Questlines", glyph: "chains", render: chainsView },
  {
    id: "chronicle",
    label: "Chronicle",
    glyph: "chronicle",
    render: chronicleView,
  },
  { id: "codex", label: "Codex", glyph: "codex", render: codexView },
  { id: "annals", label: "Annals", glyph: "annals", render: annalsView },
  { id: "sanctum", label: "Sanctum", glyph: "sanctum", render: sanctumView },
];

const DEFAULT_ROUTE = "hearth";

const ui = {
  route: DEFAULT_ROUTE,
  filters: { ...DEFAULT_FILTERS },
  expanded: new Set(),
  chronicleQuery: "",
  codex: { query: "", tag: "all", categoryId: "all" },
};

const store = new Store({ adapter: createBestAdapter() });

function focusSignature() {
  const el = document.activeElement;
  if (!el?.dataset?.action) return null;
  return {
    action: el.dataset.action,
    id: el.dataset.id,
    objective: el.dataset.objective,
  };
}

function restoreFocus(signature, scope = document) {
  if (!signature) return;
  let selector = `[data-action="${signature.action}"]`;
  if (signature.id) selector += `[data-id="${signature.id}"]`;
  if (signature.objective)
    selector += `[data-objective="${signature.objective}"]`;
  qs(selector, scope)?.focus();
}

function renderShell() {
  const level = levelInfo(store.state.log);
  mount(
    "#app",
    html`
      <a class="skip-link" href="#view">Skip to content</a>

      <header class="topbar">
        <button
          type="button"
          class="icon-btn topbar__menu"
          data-action="toggle-nav"
          aria-label="Open navigation"
          aria-expanded="false"
          aria-controls="sidebar"
        >
          ${icon("menu", { size: 20 })}
        </button>
        <span class="topbar__brand">The Grimoire</span>
        <button
          type="button"
          class="icon-btn"
          data-action="new-quest"
          aria-label="Raise a quest"
        >
          ${icon("plus", { size: 20 })}
        </button>
      </header>

      <nav class="sidebar" id="sidebar" aria-label="Main">
        <div class="sidebar__brand">
          <span class="sidebar__sigil" aria-hidden="true"
            >${icon("codex", { size: 22 })}</span
          >
          <span>
            <span class="sidebar__name">The Grimoire</span>
            <span class="sidebar__tagline">quests &amp; knowledge</span>
          </span>
        </div>

        <ul class="nav">
          ${ROUTES.map(
            (route) =>
              html`<li>
                <a
                  class="nav__link"
                  href="#/${route.id}"
                  data-route="${route.id}"
                >
                  <span class="nav__icon" aria-hidden="true"
                    >${icon(route.glyph, { size: 18 })}</span
                  >
                  <span>${route.label}</span>
                </a>
              </li>`,
          )}
        </ul>

        <div class="sidebar__foot">
          <div class="rank">
            <span class="rank__level">${level.level}</span>
            <div class="rank__body">
              <span class="rank__title">${level.title}</span>
              <span class="rank__meter">
                <span
                  class="rank__fill"
                  style="width:${Math.round(level.progress * 100)}%"
                ></span>
              </span>
              <span class="rank__xp">${level.xp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
      </nav>

      <div class="nav-scrim" data-action="close-nav" hidden></div>
      <main class="main" id="view" tabindex="-1"></main>
    `,
  );
}

function renderView({ preserveFocus = false } = {}) {
  const route = ROUTES.find((r) => r.id === ui.route) ?? ROUTES[0];
  const signature = preserveFocus ? focusSignature() : null;

  try {
    mount("#view", route.render(store, ui));
  } catch (error) {
    console.error("[grimoire] render failed", error);
    mount(
      "#view",
      html` <div class="callout callout--danger">
        <span class="callout__icon" aria-hidden="true"
          >${icon("warning", { size: 18 })}</span
        >
        <div>
          <p class="callout__title">This view could not be drawn</p>
          <p>
            The rest of the app still works. Your data has not been changed.
          </p>
          <button type="button" class="btn" data-action="goto-hearth">
            Return to the Hearth
          </button>
        </div>
      </div>`,
    );
  }

  for (const link of qsa(".nav__link")) {
    const current = link.dataset.route === ui.route;
    link.classList.toggle("is-active", current);
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  document.title = `${route.label} · The Grimoire`;
  if (signature) restoreFocus(signature);
}

function renderResults() {
  const signature = focusSignature();
  if (ui.route === "quests" && qs("#quest-results")) {
    mount("#quest-results", questResults(store, ui));
  } else if (ui.route === "chronicle" && qs("#chronicle-results")) {
    mount("#chronicle-results", chronicleResults(store, ui));
  } else if (ui.route === "codex" && qs("#codex-results")) {
    mount("#codex-results", codexResults(store, ui));
  } else {
    renderView({ preserveFocus: true });
    return;
  }
  restoreFocus(signature);
}

function renderRank() {
  const level = levelInfo(store.state.log);
  const fill = qs(".rank__fill");
  if (!fill) return;
  fill.style.width = `${Math.round(level.progress * 100)}%`;
  qs(".rank__level").textContent = level.level;
  qs(".rank__title").textContent = level.title;
  qs(".rank__xp").textContent = `${level.xp.toLocaleString()} XP`;
}

function routeFromHash() {
  const id = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return ROUTES.some((r) => r.id === id) ? id : DEFAULT_ROUTE;
}

function navigate(routeId, { replace = false } = {}) {
  const target = `#/${routeId}`;
  if (window.location.hash === target) {
    ui.route = routeId;
    renderView();
    return;
  }
  if (replace) window.location.replace(target);
  else window.location.hash = target;
}

function onHashChange() {
  const next = routeFromHash();
  if (next === ui.route && qs("#view")?.childElementCount) return;
  ui.route = next;
  closeNav();
  renderView();
  qs("#view")?.focus({ preventScroll: true });
  window.scrollTo({
    top: 0,
    behavior: "instant" in window ? "instant" : "auto",
  });
}

function toggleNav(force) {
  const sidebar = qs(".sidebar");
  const scrim = qs(".nav-scrim");
  const button = qs(".topbar__menu");
  const open = force ?? !sidebar.classList.contains("is-open");
  sidebar.classList.toggle("is-open", open);
  scrim.hidden = !open;
  button?.setAttribute("aria-expanded", open ? "true" : "false");
  button?.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
}

const closeNav = () => toggleNav(false);

const applyQueryFilter = debounce((value) => {
  ui.filters.query = value;
  renderResults();
}, 180);

const applyChronicleQuery = debounce((value) => {
  ui.chronicleQuery = value;
  renderResults();
}, 180);

const applyCodexQuery = debounce((value) => {
  ui.codex.query = value;
  renderResults();
}, 180);

function clearFilters() {
  ui.filters = { ...DEFAULT_FILTERS, status: ui.filters.status };
  renderView();
  announce("Filters cleared.");
}

function exportArchive() {
  const archive = store.exportArchive();
  const stamp = todayKey();
  downloadFile(`grimoire-${stamp}.json`, JSON.stringify(archive, null, 2));
  toast("Archive exported.", { tone: "success" });
}

function importArchive(file) {
  const reader = new FileReader();
  reader.onerror = () =>
    toast("That file could not be read.", { tone: "danger" });
  reader.onload = () => {
    let payload;
    try {
      payload = JSON.parse(reader.result);
    } catch {
      toast("That file is not valid JSON.", { tone: "danger" });
      return;
    }

    openOverlay({
      title: "Import archive",
      subtitle: file.name,
      size: "sm",
      body: html`<p class="overlay__message">
        <strong>Replace</strong> discards everything currently in this grimoire
        and installs the archive. <strong>Merge</strong> keeps what you have and
        adds any records the archive contains that are not already here.
      </p>`,
      footer: html` <button type="button" class="btn" data-overlay-dismiss>
          Cancel
        </button>
        <button type="button" class="btn" data-import-mode="merge">
          Merge
        </button>
        <button
          type="button"
          class="btn btn--danger"
          data-import-mode="replace"
        >
          Replace everything
        </button>`,
      onMount: (panel, close) => {
        panel.addEventListener("click", (event) => {
          const button = event.target.closest("[data-import-mode]");
          if (!button) return;
          const mode = button.dataset.importMode;
          const result = store.importArchive(payload, { mode });
          close();
          if (!result.ok) {
            const [message] = Object.values(result.errors ?? {});
            toast(message ?? "That archive could not be imported.", {
              tone: "danger",
            });
            return;
          }
          toast(
            `Archive imported — ${result.data.quests} quests, ${result.data.notes} codex entries.`,
            {
              tone: "success",
            },
          );
        });
      },
    });
  };
  reader.readAsText(file);
}

const actions = {
  "toggle-nav": () => toggleNav(),
  "close-nav": () => closeNav(),

  "new-quest": () => openQuestEditor(store),
  "new-chain": () => openChainEditor(store),
  "new-entry": () => openEntryEditor(store),
  "new-note": () => openNoteEditor(store),
  "new-category": () => openCategoryEditor(store),

  "edit-quest": (id) => openQuestEditor(store, id),
  "quest-menu": (id) => openQuestMenu(store, id),

  "complete-quest": (id) => {
    const result = store.completeQuest(id);
    if (!result.ok) {
      toast(result.message, { tone: "danger" });
      return;
    }
    const message = result.spawned
      ? `Completed — ${result.xp} XP. Next occurrence scheduled.`
      : `Completed — ${result.xp} XP.`;
    toast(message, {
      tone: "success",
      action: {
        label: "Undo",
        onClick: () => {
          store.reopenQuest(id);
          toast("Completion withdrawn.");
        },
      },
    });
  },

  "reopen-quest": (id) => {
    store.reopenQuest(id);
    toast("Returned to active.");
  },

  "toggle-expand": (id) => {
    if (ui.expanded.has(id)) ui.expanded.delete(id);
    else ui.expanded.add(id);
    renderResults();
  },

  "open-chain": (id) => {
    navigate("chains");
    requestAnimationFrame(() => {
      qs(`[data-chain-id="${id}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  },
  "edit-chain": (id) => openChainEditor(store, id),
  "add-step": (id) => openQuestEditor(store, null, { chainId: id }),
  "move-step-up": (id) => {
    store.moveQuestInChain(id, "up");
  },
  "move-step-down": (id) => {
    store.moveQuestInChain(id, "down");
  },
  "delete-chain": async (id) => {
    const chain = store.chainById(id);
    const progress = store.chainProgress(id);
    const confirmed = await confirmAction({
      title: `Delete “${chain?.name}”?`,
      message: progress.total
        ? `Its ${progress.total} step${progress.total === 1 ? "" : "s"} will be kept as standalone quests.`
        : "This questline has no steps.",
      confirmLabel: "Delete questline",
    });
    if (confirmed) {
      store.deleteChain(id);
      toast("Questline deleted. Its steps are now standalone.", {
        tone: "danger",
      });
    }
  },

  "open-entry": (id) =>
    openEntryDetail(store, id, {
      onEdit: (eid) => openEntryEditor(store, eid),
    }),
  "edit-entry": (id) => openEntryEditor(store, id),
  "delete-entry": async (id) => {
    const entry = store.entryById(id);
    const confirmed = await confirmAction({
      title: "Delete this entry?",
      message: `“${entry?.title}” will be removed from the chronicle.`,
      confirmLabel: "Delete entry",
    });
    if (!confirmed) return;
    const snapshot = { ...entry };
    store.deleteEntry(id);
    toast("Entry deleted.", {
      tone: "danger",
      action: {
        label: "Undo",
        onClick: () => {
          store.createEntry(snapshot);
          toast("Entry restored.", { tone: "success" });
        },
      },
    });
  },

  "open-note": (id) =>
    openNoteDetail(store, id, { onEdit: (nid) => openNoteEditor(store, nid) }),
  "edit-note": (id) => openNoteEditor(store, id),
  "toggle-pin": (id) => {
    const result = store.toggleNotePin(id);
    if (result.ok) announce(result.data.pinned ? "Pinned." : "Unpinned.");
  },
  "delete-note": async (id) => {
    const note = store.noteById(id);
    const confirmed = await confirmAction({
      title: "Delete this codex entry?",
      message: `“${note?.title}” will be removed.`,
      confirmLabel: "Delete entry",
    });
    if (!confirmed) return;
    const snapshot = { ...note };
    store.deleteNote(id);
    toast("Codex entry deleted.", {
      tone: "danger",
      action: {
        label: "Undo",
        onClick: () => {
          store.createNote(snapshot);
          toast("Entry restored.", { tone: "success" });
        },
      },
    });
  },

  "edit-category": (id) => openCategoryEditor(store, id),
  "delete-category": async (id) => {
    const category = store.categoryById(id);
    const used =
      store.state.quests.filter((q) => q.categoryId === id).length +
      store.state.notes.filter((n) => n.categoryId === id).length;
    const confirmed = await confirmAction({
      title: `Delete “${category?.name}”?`,
      message: used
        ? `${used} record${used === 1 ? "" : "s"} will become unassigned. Nothing is deleted.`
        : "Nothing is currently assigned to this realm.",
      confirmLabel: "Delete realm",
    });
    if (confirmed) {
      store.deleteCategory(id);
      toast("Realm deleted.", { tone: "danger" });
    }
  },

  "filter-tag": (_id, element) => {
    ui.filters = {
      ...DEFAULT_FILTERS,
      tag: element.dataset.tag,
      status: "all",
    };
    navigate("quests");
    announce(`Filtered by tag ${element.dataset.tag}.`);
  },
  "clear-filters": () => clearFilters(),

  "goto-quests": () => {
    ui.filters = { ...DEFAULT_FILTERS };
    navigate("quests");
  },
  "goto-today": () => {
    ui.filters = { ...DEFAULT_FILTERS, due: "today" };
    navigate("quests");
  },
  "goto-overdue": () => {
    ui.filters = { ...DEFAULT_FILTERS, due: "overdue" };
    navigate("quests");
  },
  "goto-hearth": () => navigate("hearth"),

  "load-seed": () => {
    store.seed(buildSeedData());
    toast("Sample grimoire loaded. Remove it any time from the Sanctum.", {
      tone: "success",
    });
  },
  "remove-seed": async () => {
    const confirmed = await confirmAction({
      title: "Remove the sample data?",
      message:
        "Only records flagged as samples are removed. Anything you created yourself is kept.",
      confirmLabel: "Remove samples",
    });
    if (confirmed) {
      store.removeSeedData();
      toast("Sample data removed.", { tone: "success" });
    }
  },
  "export-archive": () => exportArchive(),
  "import-archive": () => qs("#import-input")?.click(),
  "wipe-all": async () => {
    const confirmed = await confirmAction({
      title: "Erase the entire grimoire?",
      message:
        "Every quest, questline, chronicle entry, codex entry and completion record is destroyed. " +
        "This cannot be undone without an exported archive.",
      confirmLabel: "Erase everything",
    });
    if (!confirmed) return;
    store.reset();
    toast("The grimoire has been erased.", { tone: "danger" });
    navigate("hearth");
  },
};

function onClick(event) {
  const trigger = event.target.closest("[data-action]");
  if (trigger && !trigger.disabled) {
    if (trigger.matches('input[type="checkbox"]')) return;
    const handler = actions[trigger.dataset.action];
    if (handler) {
      event.preventDefault();
      handler(trigger.dataset.id, trigger);
      return;
    }
  }

  const segment = event.target.closest("[data-filter-set]");
  if (segment) {
    ui.filters[segment.dataset.filterSet] = segment.dataset.value;
    renderView();
    return;
  }

  if (event.target.closest(".nav__link")) closeNav();
}

function onChange(event) {
  const target = event.target;

  if (target.matches('[data-action="toggle-objective"]')) {
    store.toggleObjective(target.dataset.id, target.dataset.objective);
    return;
  }
  if (target.matches("[data-filter]") && target.dataset.filter !== "query") {
    ui.filters[target.dataset.filter] = target.value;
    renderResults();
    return;
  }
  if (target.matches("[data-codex-filter]")) {
    ui.codex[target.dataset.codexFilter] = target.value;
    renderResults();
    return;
  }
  if (target.matches("#import-input")) {
    const [file] = target.files ?? [];
    if (file) importArchive(file);
    target.value = "";
  }
}

function onInput(event) {
  const target = event.target;
  if (target.matches('[data-filter="query"]')) applyQueryFilter(target.value);
  else if (target.matches("[data-chronicle-search]"))
    applyChronicleQuery(target.value);
  else if (target.matches("[data-codex-search]")) applyCodexQuery(target.value);
}

function onKeydown(event) {
  const inField = event.target.closest(
    "input, textarea, select, [contenteditable]",
  );
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.key === "Escape" && qs(".sidebar")?.classList.contains("is-open")) {
    closeNav();
    return;
  }
  if (inField) return;

  if (event.key === "n") {
    event.preventDefault();
    openQuestEditor(store);
  } else if (event.key === "/") {
    const search = qs(
      '[data-filter="query"], [data-chronicle-search], [data-codex-search]',
    );
    if (search) {
      event.preventDefault();
      search.focus();
      search.select?.();
    } else {
      event.preventDefault();
      ui.filters = { ...DEFAULT_FILTERS };
      navigate("quests");
      requestAnimationFrame(() => qs('[data-filter="query"]')?.focus());
    }
  } else if (event.key === "?") {
    event.preventDefault();
    openShortcuts();
  }
}

function openShortcuts() {
  openOverlay({
    title: "Keyboard shortcuts",
    size: "sm",
    body: html`<dl class="shortcuts">
      <div>
        <dt><kbd>n</kbd></dt>
        <dd>Raise a new quest</dd>
      </div>
      <div>
        <dt><kbd>/</kbd></dt>
        <dd>Jump to search</dd>
      </div>
      <div>
        <dt><kbd>?</kbd></dt>
        <dd>This list</dd>
      </div>
      <div>
        <dt><kbd>Esc</kbd></dt>
        <dd>Close a dialog or the navigation</dd>
      </div>
      <div>
        <dt><kbd>Tab</kbd></dt>
        <dd>Cycles within an open dialog</dd>
      </div>
    </dl>`,
  });
}

function boot() {
  const loaded = store.load();

  renderShell();
  ui.route = routeFromHash();
  if (!window.location.hash) navigate(DEFAULT_ROUTE, { replace: true });
  renderView();

  if (!loaded.ok) {
    toast(loaded.message, { tone: "danger", timeout: 12000 });
  }

  if (
    loaded.fresh &&
    store.state.quests.length === 0 &&
    !store.state.settings.seeded
  ) {
    toast(
      "Welcome. Load the sample grimoire to see how it all fits together.",
      {
        tone: "info",
        timeout: 15000,
        action: {
          label: "Load samples",
          onClick: () => {
            store.seed(buildSeedData());
            toast("Sample grimoire loaded.", { tone: "success" });
          },
        },
      },
    );
  }

  store.subscribe((reason) => {
    renderRank();
    if (reason === "storage-error") {
      toast(store.lastError ?? "Changes could not be saved.", {
        tone: "danger",
        timeout: 12000,
      });
      return;
    }
    if (reason === "load") return;
    renderResults();
  });

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("hashchange", onHashChange);

  window.addEventListener("pagehide", () => store.flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") store.flush();
  });

  window.addEventListener("error", (event) => {
    console.error("[grimoire] uncaught", event.error ?? event.message);
    toast(
      "Something went wrong. Your data is safe — the last save completed.",
      { tone: "danger" },
    );
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[grimoire] unhandled rejection", event.reason);
  });

  document.body.classList.remove("is-booting");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

export { store, ui, ROUTES };
