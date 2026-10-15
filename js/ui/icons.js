import { raw } from "./dom.js";

const PATHS = {
  hearth:
    '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/>',
  quests:
    '<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6"/><path d="M6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2"/><path d="M9 8h7"/><path d="M9 12h7"/><path d="M9 16h4"/>',
  chains:
    '<path d="M9.5 14.5a4 4 0 0 1 0-5l2-2a4 4 0 0 1 5.7 5.7l-1 1"/><path d="M14.5 9.5a4 4 0 0 1 0 5l-2 2a4 4 0 0 1-5.7-5.7l1-1"/>',
  chronicle:
    '<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/><path d="M12 8h4"/><path d="M12 12h4"/>',
  codex:
    '<path d="M4 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20z"/>',
  annals:
    '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  sanctum:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  edit: '<path d="M4 20h4l10-10a2.8 2.8 0 1 0-4-4L4 16z"/><path d="m14 6 4 4"/>',
  trash:
    '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M10 11v6M14 11v6"/>',
  pin: '<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  repeat:
    '<path d="M4 9a5 5 0 0 1 5-5h9"/><path d="m15 1 3 3-3 3"/><path d="M20 15a5 5 0 0 1-5 5H6"/><path d="m9 23-3-3 3-3"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  flame:
    '<path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.7-3 1.5-4 .2 1.2 1 2 2 2 .8 0 1.5-.7 1.5-1.8C12 6.5 12 3 12 3z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  download: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  upload: '<path d="M12 20V9"/><path d="m7 13 5-5 5 5"/><path d="M4 4h16"/>',
  warning:
    '<path d="M12 4 2.5 20h19z"/><path d="M12 10v5"/><path d="M12 18h.01"/>',
  scroll:
    '<path d="M6 4h10a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2z"/><path d="M6 4a2 2 0 0 0-2 2v2h4"/>',
  sparkle:
    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  undo: '<path d="M4 9h11a5 5 0 0 1 0 10H9"/><path d="m8 5-4 4 4 4"/>',
  archive:
    '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  tag: '<path d="M3 3h7l11 11-7 7L3 10z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  inbox:
    '<path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l2 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/>',
};

export function icon(name, { size = 18, className = "" } = {}) {
  const body = PATHS[name];
  if (!body) return raw("");
  return raw(
    `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
      'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
      `stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`,
  );
}

export const ICON_NAMES = Object.keys(PATHS);
