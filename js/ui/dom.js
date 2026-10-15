const RAW = Symbol("raw-html");

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function raw(markup) {
  return { [RAW]: String(markup ?? "") };
}

function render(value) {
  if (
    value === null ||
    value === undefined ||
    value === false ||
    value === true
  )
    return "";
  if (Array.isArray(value)) return value.map(render).join("");
  if (typeof value === "object" && RAW in value) return value[RAW];
  return esc(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += render(values[i]) + strings[i + 1];
  }
  return raw(out);
}

export function toHtml(value) {
  return render(value);
}

export function classes(map) {
  return Object.entries(map)
    .filter(([, on]) => Boolean(on))
    .map(([name]) => name)
    .join(" ");
}

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];

export function mount(target, fragment) {
  const node = typeof target === "string" ? qs(target) : target;
  if (!node) return null;
  node.innerHTML = toHtml(fragment);
  return node;
}

export function formData(form) {
  const data = {};
  for (const element of form.elements) {
    if (!element.name || element.disabled) continue;
    if (element.type === "checkbox") {
      if (element.dataset.multi === "true") {
        data[element.name] = data[element.name] ?? [];
        if (element.checked) data[element.name].push(element.value);
      } else {
        data[element.name] = element.checked;
      }
    } else if (element.type === "radio") {
      if (element.checked) data[element.name] = element.value;
    } else {
      data[element.name] =
        typeof element.value === "string"
          ? element.value.trim()
          : element.value;
    }
  }
  return data;
}

export function showFormErrors(form, errors = {}) {
  for (const node of qsa("[data-error-for]", form)) {
    node.textContent = "";
    node.hidden = true;
  }
  for (const field of qsa("[name]", form)) {
    field.removeAttribute("aria-invalid");
  }

  const entries = Object.entries(errors);
  if (!entries.length) return;

  for (const [field, message] of entries) {
    const slot = qs(`[data-error-for="${CSS.escape(field)}"]`, form);
    if (slot) {
      slot.textContent = message;
      slot.hidden = false;
    }
    const input = form.elements[field];
    if (input && input.setAttribute) input.setAttribute("aria-invalid", "true");
  }

  const [firstField] = entries[0];
  const target = form.elements[firstField];
  if (target?.focus) target.focus();
}

if (typeof CSS === "undefined" || !CSS.escape) {
  globalThis.CSS = globalThis.CSS ?? {};
  globalThis.CSS.escape = (value) =>
    String(value).replace(/[^\w-]/g, (c) => `\\${c}`);
}

export function downloadFile(filename, contents, type = "application/json") {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function percent(ratio) {
  return `${Math.round((ratio ?? 0) * 100)}%`;
}

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatBody(text) {
  const escaped = esc(text);
  const withInline = escaped
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");

  const blocks = withInline.split(/\n{2,}/).filter((block) => block.trim());
  const markup = blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        const items = lines
          .map((line) => `<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
        const items = lines
          .map((line) => `<li>${line.replace(/^\s*\d+[.)]\s+/, "")}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      }
      return `<p>${lines.join("<br>")}</p>`;
    })
    .join("");

  return raw(markup);
}

export function excerpt(text, length = 160) {
  const flat = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > length ? `${flat.slice(0, length).trimEnd()}…` : flat;
}
