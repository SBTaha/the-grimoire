import { html, toHtml, raw, qs, qsa } from "./dom.js";
import { icon } from "./icons.js";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

let openCount = 0;

function rootNode() {
  let root = qs("#overlay-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "overlay-root";
    document.body.appendChild(root);
  }
  return root;
}

export function openOverlay({
  title,
  subtitle = "",
  body,
  footer = null,
  size = "md",
  onMount,
  onClose,
  dismissible = true,
} = {}) {
  const root = rootNode();
  const previouslyFocused = document.activeElement;
  const id = `overlay-${Date.now().toString(36)}`;

  const wrapper = document.createElement("div");
  wrapper.className = "overlay";
  wrapper.innerHTML = toHtml(html`
    <div class="overlay__backdrop" data-overlay-dismiss></div>
    <div
      class="overlay__panel overlay__panel--${size}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${id}-title"
      ${subtitle ? raw(`aria-describedby="${id}-sub"`) : ""}
    >
      <header class="overlay__head">
        <div>
          <h2 class="overlay__title" id="${id}-title">${title}</h2>
          ${subtitle
            ? html`<p class="overlay__subtitle" id="${id}-sub">${subtitle}</p>`
            : ""}
        </div>
        ${dismissible
          ? html`<button
              type="button"
              class="icon-btn"
              data-overlay-dismiss
              aria-label="Close dialog"
            >
              ${icon("close")}
            </button>`
          : ""}
      </header>
      <div class="overlay__body">${body}</div>
      ${footer ? html`<footer class="overlay__foot">${footer}</footer>` : ""}
    </div>
  `);

  root.appendChild(wrapper);
  openCount += 1;
  document.body.classList.add("is-locked");
  qs("#app")?.setAttribute("inert", "");

  const panel = qs(".overlay__panel", wrapper);

  const close = () => {
    if (!wrapper.isConnected) return;
    wrapper.remove();
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) {
      document.body.classList.remove("is-locked");
      qs("#app")?.removeAttribute("inert");
    }
    document.removeEventListener("keydown", onKeydown, true);
    if (previouslyFocused?.focus) previouslyFocused.focus();
    onClose?.();
  };

  function onKeydown(event) {
    if (!wrapper.isConnected) return;
    if (event.key === "Escape" && dismissible) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    const items = qsa(FOCUSABLE, panel).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  wrapper.addEventListener("click", (event) => {
    if (dismissible && event.target.closest("[data-overlay-dismiss]")) close();
  });
  document.addEventListener("keydown", onKeydown, true);

  onMount?.(panel, close);

  const target =
    qs("[data-autofocus]", panel) ?? qsa(FOCUSABLE, panel)[0] ?? panel;
  if (target === panel) panel.setAttribute("tabindex", "-1");
  target.focus();

  return close;
}

export function confirmAction({
  title = "Are you sure?",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const close = openOverlay({
      title,
      size: "sm",
      body: html`<p class="overlay__message">${message}</p>`,
      footer: html`
        <button type="button" class="btn" data-confirm-cancel>
          ${cancelLabel}
        </button>
        <button
          type="button"
          class="btn btn--${tone}"
          data-confirm-ok
          data-autofocus
        >
          ${confirmLabel}
        </button>
      `,
      onClose: () => finish(false),
      onMount: (panel) => {
        qs("[data-confirm-ok]", panel).addEventListener("click", () => {
          finish(true);
          close();
        });
        qs("[data-confirm-cancel]", panel).addEventListener("click", () => {
          finish(false);
          close();
        });
      },
    });
  });
}
