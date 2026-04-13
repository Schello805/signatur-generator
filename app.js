import { TEMPLATES, buildSignatureHtml, defaultState } from "./templates.js";

const STORAGE_KEY = "signaturgenerator:v1";
const THEME_KEY = "signaturgenerator:theme";

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element not found: ${id}`);
  return el;
}

function clampHexColor(value, fallback) {
  const v = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  return fallback;
}

function toast(message, { kind = "info", timeoutMs = 2200 } = {}) {
  const t = $("toast");
  t.textContent = message;
  t.dataset.kind = kind;
  t.classList.add("show");
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => t.classList.remove("show"), timeoutMs);
}

function readForm(form) {
  const fd = new FormData(form);

  const data = {
    fullName: fd.get("fullName") ?? "",
    jobTitle: fd.get("jobTitle") ?? "",
    company: fd.get("company") ?? "",
    department: fd.get("department") ?? "",
    phone: fd.get("phone") ?? "",
    mobile: fd.get("mobile") ?? "",
    email: fd.get("email") ?? "",
    website: fd.get("website") ?? "",
    address: fd.get("address") ?? "",
    linkedin: fd.get("linkedin") ?? "",
    calendarLink: fd.get("calendarLink") ?? "",
    tagline: fd.get("tagline") ?? "",
    imageUrl: fd.get("imageUrl") ?? "",
  };

  const options = {
    accentColor: clampHexColor(fd.get("accentColor"), "#2563eb"),
    textColor: clampHexColor(fd.get("textColor"), "#0f172a"),
    fontFamily: fd.get("fontFamily") ?? "system",
    density: fd.get("density") ?? "normal",
  };

  const persist = fd.get("persist") === "on";

  return { data, options, persist };
}

function writeForm(form, state) {
  for (const [key, value] of Object.entries(state.data)) {
    const input = form.elements.namedItem(key);
    if (input && "value" in input) input.value = String(value ?? "");
  }
  for (const [key, value] of Object.entries(state.options)) {
    const input = form.elements.namedItem(key);
    if (input && "value" in input) input.value = String(value ?? "");
  }
  const persist = form.elements.namedItem("persist");
  if (persist && "checked" in persist) persist.checked = Boolean(state.persist);
  const upload = form.elements.namedItem("imageUpload");
  if (upload && "value" in upload) upload.value = "";
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeParse(raw) : null;
  const base = defaultState();
  if (!parsed || typeof parsed !== "object") return base;

  const templateId = TEMPLATES.some((t) => t.id === parsed.templateId) ? parsed.templateId : base.templateId;
  return {
    templateId,
    persist: typeof parsed.persist === "boolean" ? parsed.persist : base.persist,
    data: { ...base.data, ...(parsed.data ?? {}) },
    options: { ...base.options, ...(parsed.options ?? {}) },
  };
}

function saveState(state) {
  if (!state.persist) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}

function loadTheme() {
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored) return normalizeTheme(stored);
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  return prefersLight ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
}

function renderDesignCards({ selectedId, onSelect }) {
  const grid = $("designGrid");
  grid.innerHTML = "";

  for (const t of TEMPLATES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "design-card";
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-selected", String(t.id === selectedId));
    btn.dataset.templateId = t.id;
    btn.innerHTML = `<div class="design-name">${t.name}</div><p class="design-desc">${t.description}</p>`;
    btn.addEventListener("click", () => onSelect(t.id));
    grid.appendChild(btn);
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  fallbackCopyText(text);
}

async function copyRichToClipboard({ html, plain }) {
  if ("ClipboardItem" in window && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    return;
  }
  await copyTextToClipboard(html);
}

function downloadHtml({ filename, html }) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function fallbackCopyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "true");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  const ok = document.execCommand?.("copy");
  ta.remove();
  if (!ok) throw new Error("copy-failed");
}

function plainFromState(state) {
  const parts = [];
  if (state.data.fullName) parts.push(state.data.fullName);
  const titleLine = [state.data.jobTitle, state.data.department].filter(Boolean).join(" · ");
  if (titleLine) parts.push(titleLine);
  if (state.data.company) parts.push(state.data.company);
  if (state.data.phone) parts.push(`Tel: ${state.data.phone}`);
  if (state.data.mobile) parts.push(`Mobil: ${state.data.mobile}`);
  if (state.data.email) parts.push(state.data.email);
  if (state.data.website) parts.push(state.data.website);
  if (state.data.address) parts.push(state.data.address);
  return parts.join("\n");
}

function buildFullHtmlDocument(fragment) {
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signatur</title>
  </head>
  <body>
    ${fragment}
  </body>
</html>`;
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    r.onload = () => resolve(String(r.result ?? ""));
    r.readAsDataURL(file);
  });
}

function main() {
  const form = $("signatureForm");
  const preview = $("preview");
  const output = $("outputHtml");

  const initial = loadState();
  writeForm(form, initial);

  let state = { ...initial };

  function setTemplateId(id) {
    state = { ...state, templateId: id };
    renderDesignCards({ selectedId: state.templateId, onSelect: setTemplateId });
    update();
  }

  function update() {
    const { data, options, persist } = readForm(form);
    state = { ...state, persist, data: { ...state.data, ...data }, options: { ...state.options, ...options } };

    const html = buildSignatureHtml(state.templateId, state.data, state.options);
    preview.innerHTML = html;
    output.value = html;
    saveState(state);
  }

  renderDesignCards({ selectedId: state.templateId, onSelect: setTemplateId });
  update();

  form.addEventListener("input", (e) => {
    const target = e.target;
    if (target && target.name === "imageUpload") return;
    update();
  });

  form.addEventListener("change", (e) => {
    const target = e.target;
    if (target && target.name === "imageUpload") {
      const file = target.files?.[0];
      if (!file) return;
      fileToDataUrl(file)
        .then((dataUrl) => {
          const imageUrl = form.elements.namedItem("imageUrl");
          if (imageUrl && "value" in imageUrl) imageUrl.value = dataUrl;
          toast("Bild eingefügt (Data‑URL).", { kind: "info" });
          update();
        })
        .catch(() => toast("Bild konnte nicht geladen werden.", { kind: "error" }));
      return;
    }
    update();
  });

  $("btnCopyHtml").addEventListener("click", async () => {
    try {
      await copyTextToClipboard(output.value);
      toast("HTML kopiert.");
    } catch {
      toast("Kopieren fehlgeschlagen (Browser‑Berechtigung).", { kind: "error" });
    }
  });

  $("btnCopyRich").addEventListener("click", async () => {
    try {
      const fragment = output.value;
      await copyRichToClipboard({ html: fragment, plain: plainFromState(state) });
      toast("Rich‑Text kopiert.");
    } catch {
      toast("Kopieren fehlgeschlagen (Browser‑Berechtigung).", { kind: "error" });
    }
  });

  $("btnCopyPlain").addEventListener("click", async () => {
    try {
      await copyTextToClipboard(plainFromState(state));
      toast("Text kopiert.");
    } catch {
      toast("Kopieren fehlgeschlagen.", { kind: "error" });
    }
  });

  $("btnDownload").addEventListener("click", () => {
    const name = (state.data.fullName || "signatur").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");
    const filename = `${name || "signatur"}.html`;
    downloadHtml({ filename, html: buildFullHtmlDocument(output.value) });
    toast("Download gestartet.");
  });

  $("btnReset").addEventListener("click", () => {
    const fresh = defaultState();
    state = { ...fresh };
    writeForm(form, fresh);
    renderDesignCards({ selectedId: state.templateId, onSelect: setTemplateId });
    update();
    toast("Zurückgesetzt.");
  });

  $("btnTheme").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  applyTheme(loadTheme());
}

main();
