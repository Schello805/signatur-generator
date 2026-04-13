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

function setupTooltips() {
  const tooltip = $("tooltip");
  const tooltipContent = $("tooltipContent");
  const arrow = tooltip.querySelector(".tooltip-arrow");

  let activeHint = null;
  let hideTimer = null;

  function hide() {
    window.clearTimeout(hideTimer);
    activeHint = null;
    tooltip.classList.remove("show");
    tooltip.hidden = true;
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, 160);
  }

  function position({ hintRect, placement }) {
    const margin = 10;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    tooltip.dataset.placement = placement;

    // Ensure tooltip is measurable.
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    const tipRect = tooltip.getBoundingClientRect();

    let left = hintRect.left + hintRect.width / 2 - tipRect.width / 2;
    left = Math.max(margin, Math.min(vpW - tipRect.width - margin, left));

    let top;
    if (placement === "top") {
      top = hintRect.top - tipRect.height - 12;
      top = Math.max(margin, top);
      arrow.style.left = `${Math.max(14, Math.min(tipRect.width - 14, hintRect.left + hintRect.width / 2 - left))}px`;
      arrow.style.top = "auto";
      arrow.style.bottom = "-6px";
    } else {
      top = hintRect.bottom + 12;
      top = Math.min(vpH - tipRect.height - margin, top);
      arrow.style.left = `${Math.max(14, Math.min(tipRect.width - 14, hintRect.left + hintRect.width / 2 - left))}px`;
      arrow.style.top = "-6px";
      arrow.style.bottom = "auto";
    }

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function showFor(hintEl) {
    const tip = hintEl?.dataset?.tip;
    if (!tip) return;

    window.clearTimeout(hideTimer);
    activeHint = hintEl;
    tooltipContent.textContent = tip;

    tooltip.hidden = false;
    // Decide placement based on available space.
    const rect = hintEl.getBoundingClientRect();
    tooltip.classList.add("show");

    // Initial placement guess.
    const preferBottom = rect.bottom + 180 < window.innerHeight;
    const placement = preferBottom ? "bottom" : "top";
    position({ hintRect: rect, placement });
  }

  document.addEventListener("mouseover", (e) => {
    const hint = e.target?.closest?.(".hint[data-tip]");
    if (!hint) return;
    showFor(hint);
  });
  document.addEventListener("focusin", (e) => {
    const hint = e.target?.closest?.(".hint[data-tip]");
    if (!hint) return;
    showFor(hint);
  });
  document.addEventListener("mouseout", (e) => {
    if (!activeHint) return;
    const to = e.relatedTarget;
    if (to && (to.closest?.("#tooltip") || to.closest?.(".hint[data-tip]"))) return;
    scheduleHide();
  });
  document.addEventListener("focusout", (e) => {
    if (!activeHint) return;
    const to = e.relatedTarget;
    if (to && (to.closest?.("#tooltip") || to.closest?.(".hint[data-tip]"))) return;
    scheduleHide();
  });

  tooltip.addEventListener("mouseenter", () => window.clearTimeout(hideTimer));
  tooltip.addEventListener("mouseleave", scheduleHide);

  document.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !tooltip.hidden) hide();
  });
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
    github: fd.get("github") ?? "",
    calendarLink: fd.get("calendarLink") ?? "",
    instagram: fd.get("instagram") ?? "",
    tagline: fd.get("tagline") ?? "",
    x: fd.get("x") ?? "",
    facebook: fd.get("facebook") ?? "",
    imageUrl: fd.get("imageUrl") ?? "",
  };

  const options = {
    accentColor: clampHexColor(fd.get("accentColor"), "#2563eb"),
    textColor: clampHexColor(fd.get("textColor"), "#0f172a"),
    fontFamily: fd.get("fontFamily") ?? "system",
    density: fd.get("density") ?? "normal",
    socialStyle: fd.get("socialStyle") ?? "badges",
    compatMode: fd.get("compatMode") ?? "standard",
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

function buildSampleData() {
  return {
    fullName: "Max Mustermann",
    jobTitle: "Senior Consultant",
    company: "Muster GmbH",
    department: "Sales",
    phone: "+49 30 1234567",
    mobile: "+49 170 1234567",
    email: "max@muster.de",
    website: "https://muster.de",
    address: "Musterstraße 1, 10115 Berlin",
    linkedin: "https://www.linkedin.com/in/max-mustermann",
    github: "https://github.com/example",
    instagram: "",
    x: "",
    facebook: "",
    calendarLink: "https://cal.com/example",
    tagline: "Kurz. Klar. Kompetent.",
    imageUrl: "",
  };
}

function renderDesignCards({ selectedId, onSelect }) {
  const grid = $("designGrid");
  grid.innerHTML = "";

  const sampleData = buildSampleData();

  for (const t of TEMPLATES) {
    const card = document.createElement("div");
    card.className = "design-card";
    card.setAttribute("role", "listitem");
    card.dataset.templateId = t.id;
    card.dataset.selected = String(t.id === selectedId);

    const mainBtn = document.createElement("button");
    mainBtn.type = "button";
    mainBtn.className = "design-card-main";
    mainBtn.setAttribute("aria-pressed", String(t.id === selectedId));
    mainBtn.innerHTML = `
      <div class="design-name">${t.name}</div>
      <p class="design-desc">${t.description}</p>
    `.trim();

    const actions = document.createElement("div");
    actions.className = "design-card-actions";

    const previewBtn = document.createElement("button");
    previewBtn.type = "button";
    previewBtn.className = "pill";
    previewBtn.textContent = "Vorschau";
    previewBtn.title = "Zeigt eine kompakte Vorschau dieses Designs (ohne Auswahl zu ändern).";
    previewBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.dispatchEvent(
        new CustomEvent("open-design-preview", {
          detail: { templateId: t.id, name: t.name, description: t.description, sampleData },
        })
      );
    });

    actions.appendChild(previewBtn);

    const top = document.createElement("div");
    top.className = "design-card-top";
    top.appendChild(mainBtn);
    top.appendChild(actions);

    mainBtn.addEventListener("click", () => onSelect(t.id));
    card.addEventListener("dblclick", () => onSelect(t.id));

    card.appendChild(top);
    grid.appendChild(card);
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

function downloadVcard({ filename, vcard }) {
  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
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

function escVcardText(value) {
  // vCard 3.0 escaping: backslash, semicolon, comma, newline
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\n")
    .trim();
}

function splitName(fullName) {
  const raw = String(fullName ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return { first: "", last: "" };
  const parts = raw.split(" ");
  if (parts.length === 1) return { first: raw, last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1) ?? "" };
}

function buildVcard(data) {
  const { first, last } = splitName(data.fullName);
  const lines = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  if (first || last) lines.push(`N:${escVcardText(last)};${escVcardText(first)};;;`);
  if (data.fullName) lines.push(`FN:${escVcardText(data.fullName)}`);
  if (data.company) lines.push(`ORG:${escVcardText(data.company)}`);
  if (data.jobTitle) lines.push(`TITLE:${escVcardText(data.jobTitle)}`);
  if (data.phone) lines.push(`TEL;TYPE=WORK,VOICE:${escVcardText(data.phone)}`);
  if (data.mobile) lines.push(`TEL;TYPE=CELL:${escVcardText(data.mobile)}`);
  if (data.email) lines.push(`EMAIL;TYPE=INTERNET:${escVcardText(data.email)}`);
  if (data.website) lines.push(`URL:${escVcardText(data.website)}`);
  if (data.address) lines.push(`ADR;TYPE=WORK:;;${escVcardText(data.address)};;;;`);

  const urls = [
    ["LinkedIn", data.linkedin],
    ["GitHub", data.github],
    ["Instagram", data.instagram],
    ["X", data.x],
    ["Facebook", data.facebook],
    ["Termin", data.calendarLink],
  ]
    .map(([label, url]) => [label, String(url ?? "").trim()])
    .filter(([, url]) => Boolean(url));

  if (urls.length) {
    const note = urls.map(([label, url]) => `${label}: ${url}`).join(" | ");
    lines.push(`NOTE:${escVcardText(note)}`);
  }

  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
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

function buildCompatibilityNotice(state) {
  const parts = [];
  const compat = state.options.compatMode;
  const social = state.options.socialStyle;
  const img = String(state.data.imageUrl ?? "").trim();

  if (compat === "outlook") {
    parts.push(
      "<strong>Outlook‑sicher aktiv:</strong> Effekte werden vereinfacht, damit die Signatur in Outlook (Windows‑Desktop) zuverlässiger aussieht."
    );
    if (social === "badges") {
      parts.push("Hinweis: Badges werden in Outlook‑sicher automatisch als Textlinks dargestellt.");
    }
  } else {
    parts.push(
      "<strong>Standard:</strong> Moderne Optik – einzelne Elemente (Rundungen/Verläufe) können in Outlook (Windows‑Desktop) anders aussehen."
    );
  }

  if (img.startsWith("data:")) {
    parts.push(
      "<strong>Bild als Data‑URL:</strong> Manche Mail‑Clients blockieren/entfernen das. Für maximale Zuverlässigkeit nutze eine öffentliche HTTPS‑Bild‑URL."
    );
  }

  return parts.join(" ");
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
  const notice = $("compatNotice");
  const modal = $("designPreviewModal");
  const modalClose = $("modalClose");
  const modalPreview = $("modalPreview");
  const modalSubtitle = $("modalSubtitle");
  const modalSelect = $("modalSelect");
  let modalTemplateId = null;
  let lastFocus = null;

  const initial = loadState();
  writeForm(form, initial);

  let state = { ...initial };

  function setTemplateId(id) {
    state = { ...state, templateId: id };
    renderDesignCards({ selectedId: state.templateId, onSelect: setTemplateId });
    update();
  }

  function openModal({ templateId, name, description, sampleData }) {
    lastFocus = document.activeElement;
    modalTemplateId = templateId;

    const mini = buildSignatureHtml(templateId, sampleData, {
      ...state.options,
      density: "compact",
    });
    modalPreview.innerHTML = mini;
    modalSubtitle.textContent = `${name} — ${description}`;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modalClose.focus();
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modalTemplateId = null;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function update() {
    const { data, options, persist } = readForm(form);
    state = { ...state, persist, data: { ...state.data, ...data }, options: { ...state.options, ...options } };

    const html = buildSignatureHtml(state.templateId, state.data, state.options);
    preview.innerHTML = html;
    output.value = html;
    notice.innerHTML = buildCompatibilityNotice(state);
    saveState(state);
  }

  renderDesignCards({ selectedId: state.templateId, onSelect: setTemplateId });
  update();
  setupTooltips();

  document.addEventListener("open-design-preview", (e) => {
    const detail = e.detail;
    if (!detail) return;
    openModal(detail);
  });

  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.dataset && target.dataset.modalClose === "true") closeModal();
  });
  modalClose.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
  modalSelect.addEventListener("click", () => {
    if (!modalTemplateId) return;
    setTemplateId(modalTemplateId);
    closeModal();
  });

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

  $("btnVcard").addEventListener("click", () => {
    const name = (state.data.fullName || "kontakt").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");
    const filename = `${name || "kontakt"}.vcf`;
    downloadVcard({ filename, vcard: buildVcard(state.data) });
    toast("vCard Download gestartet.");
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
