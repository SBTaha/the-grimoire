import { html, toHtml, qs } from "./dom.js";
import { icon } from "./icons.js";

const DEFAULT_TIMEOUT = 5000;

function toastRoot() {
  let root = qs("#toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    root.className = "toast-root";
    document.body.appendChild(root);
  }
  return root;
}

function liveRegion() {
  let region = qs("#live-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "live-region";
    region.className = "visually-hidden";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
  }
  return region;
}

export function announce(message) {
  const region = liveRegion();
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 50);
}

export function toast(
  message,
  { tone = "info", action = null, timeout = DEFAULT_TIMEOUT } = {},
) {
  const root = toastRoot();
  const node = document.createElement("div");
  node.className = `toast toast--${tone}`;
  const glyph = {
    success: "check",
    danger: "warning",
    warning: "warning",
    info: "sparkle",
  }[tone];

  node.innerHTML = toHtml(html`
    <span class="toast__icon">${icon(glyph, { size: 16 })}</span>
    <span class="toast__text">${message}</span>
    ${action
      ? html`<button type="button" class="toast__action">
          ${action.label}
        </button>`
      : ""}
    <button
      type="button"
      class="toast__close icon-btn icon-btn--sm"
      aria-label="Dismiss notification"
    >
      ${icon("close", { size: 14 })}
    </button>
  `);

  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    node.classList.add("is-leaving");
    setTimeout(() => node.remove(), 200);
  };

  qs(".toast__close", node).addEventListener("click", dismiss);
  const actionButton = qs(".toast__action", node);
  if (actionButton) {
    actionButton.addEventListener("click", () => {
      action.onClick();
      dismiss();
    });
  }

  node.addEventListener("mouseenter", () => {
    if (timer) clearTimeout(timer);
  });
  node.addEventListener("mouseleave", () => {
    timer = setTimeout(dismiss, 2000);
  });

  root.appendChild(node);
  requestAnimationFrame(() => node.classList.add("is-visible"));
  if (timeout > 0) timer = setTimeout(dismiss, timeout);

  announce(message);
  return dismiss;
}
