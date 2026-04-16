import { TEMPLATES, buildSignatureHtml, defaultState } from "./templates.js";

const STORAGE_KEY = "signaturgenerator:v2";
const STORAGE_KEY_LEGACY = "signaturgenerator:v1";

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

function isLikelyDomainish(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (v.includes(" ")) return false;
  // Basic: contains a dot and no scheme.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) return false;
  return v.includes(".");
}

function normalizeUrlForInput(raw) {
  let v = String(raw ?? "").trim();
  if (!v) return { value: "", changed: false };
  if (v.startsWith("www.")) {
    v = `https://${v}`;
    return { value: v, changed: true };
  }
  if (isLikelyDomainish(v) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) {
    v = `https://${v}`;
    return { value: v, changed: true };
  }
  return { value: v, changed: false };
}

function parseHttpUrl(value) {
  const v = String(value ?? "").trim();
  if (!v) return { url: null, error: "" };
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return { url: null, error: "Nur http/https URLs sind erlaubt." };
    return { url: u, error: "" };
  } catch {
    return { url: null, error: "Ungültige URL (bitte prüfen)." };
  }
}

function hostEndsWith(host, allowed) {
  const h = String(host || "").toLowerCase().replace(/\.$/, "");
  const a = String(allowed || "").toLowerCase().replace(/\.$/, "");
  return h === a || h.endsWith(`.${a}`);
}

const URL_HOST_RULES = {
  linkedin: ["linkedin.com"],
  github: ["github.com"],
  instagram: ["instagram.com"],
  x: ["x.com", "twitter.com"],
  xing: ["xing.com"],
  facebook: ["facebook.com"],
};

const URL_FIELDS = [
  "website",
  "linkedin",
  "github",
  "instagram",
  "x",
  "xing",
  "facebook",
  "calendarLink",
  "vcardUrl",
  "eventLink",
  "imageUrl",
];

const PHONE_FIELDS = ["phone", "mobile"];
const EVENT_FIELDS = ["eventTitle", "eventStart", "eventDuration", "eventReminders"];

function validateUrlField(name, value) {
  const raw = String(value ?? "").trim();
  if (!raw) return { error: "" };
  if (name === "imageUrl" && raw.startsWith("data:image/")) return { error: "" };

  const { url, error } = parseHttpUrl(raw);
  if (error) return { error };

  const allowedHosts = URL_HOST_RULES[name] || [];
  if (allowedHosts.length) {
    const ok = allowedHosts.some((h) => hostEndsWith(url.host, h));
    if (!ok) return { error: `Bitte eine URL von ${allowedHosts.join(" oder ")} eingeben.` };
  }

  return { error: "" };
}

function validatePhoneField(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return { error: "" };
  // Allow digits, whitespace, +, (), -, /
  if (/^[\d\s()+\-\/]+$/.test(raw)) return { error: "" };
  return { error: "Nur Ziffern, Leerzeichen und + ( ) - / sind erlaubt." };
}

function validateEventFields(data) {
  const title = String(data?.eventTitle ?? "").trim();
  const start = String(data?.eventStart ?? "").trim();
  const durationRaw = String(data?.eventDuration ?? "").trim();
  const remindersRaw = String(data?.eventReminders ?? "").trim();
  const link = String(data?.eventLink ?? "").trim();
  const location = String(data?.eventLocation ?? "").trim();

  const any = Boolean(title || start || durationRaw || remindersRaw || link || location);
  if (!any) {
    return {
      eventTitle: "",
      eventStart: "",
      eventDuration: "",
      eventReminders: "",
    };
  }

  const out = { eventTitle: "", eventStart: "", eventDuration: "", eventReminders: "" };

  if (!title) out.eventTitle = "Bitte einen Titel angeben.";
  if (!start) out.eventStart = "Bitte Startdatum/-zeit angeben.";
  if (start) {
    const d = new Date(start);
    if (Number.isNaN(d.getTime())) out.eventStart = "Ungültiges Datum/Zeit.";
  }

  const duration = durationRaw ? Number(durationRaw) : 30;
  if (!Number.isFinite(duration) || duration < 5 || duration > 1440) {
    out.eventDuration = "Dauer muss zwischen 5 und 1440 Minuten liegen.";
  }

  if (remindersRaw) {
    const parts = remindersRaw
      .split(/[,\s]+/g)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) {
      out.eventReminders = "Ungültiges Format (z. B. „15, 60“).";
    } else {
      const nums = parts.map((p) => Number(p));
      const ok = nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 10080);
      if (!ok) out.eventReminders = "Nur ganze Minuten (0–10080), z. B. „5, 15, 60“.";
      if (nums.length > 5) out.eventReminders = "Max. 5 Erinnerungen (z. B. „5, 15, 60“).";
    }
  }

  return out;
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
    vcardUrl: fd.get("vcardUrl") ?? "",
    eventTitle: fd.get("eventTitle") ?? "",
    eventStart: fd.get("eventStart") ?? "",
    eventDuration: fd.get("eventDuration") ?? "",
    eventLink: fd.get("eventLink") ?? "",
    eventReminders: fd.get("eventReminders") ?? "",
    eventLocation: fd.get("eventLocation") ?? "",
    instagram: fd.get("instagram") ?? "",
    tagline: fd.get("tagline") ?? "",
    x: fd.get("x") ?? "",
    xing: fd.get("xing") ?? "",
    facebook: fd.get("facebook") ?? "",
    imageUrl: fd.get("imageUrl") ?? "",
  };

  const options = {
    accentColor: clampHexColor(fd.get("accentColor"), "#2563eb"),
    textColor: clampHexColor(fd.get("textColor"), "#0f172a"),
    fontFamily: fd.get("fontFamily") ?? "system",
    density: fd.get("density") ?? "normal",
    socialStyle: fd.get("socialStyle") ?? "icons",
    compatMode: fd.get("compatMode") ?? "standard",
    brandingComment: fd.get("brandingComment") === "on",
  };

  const persist = fd.get("persist") === "on";

  return { data, options, persist };
}

function writeForm(form, state) {
  for (const [key, value] of Object.entries(state.data)) {
    const input = form.elements.namedItem(key);
    if (input && "value" in input) {
      if (key === "imageUrl") {
        const raw = String(value ?? "");
        // Prevent accidental huge pastes from making the UI sluggish/crash.
        if (raw.startsWith("data:") && raw.length > 250_000) {
          input.value = "";
          continue;
        }
        if (!raw.startsWith("data:") && raw.length > 300) {
          input.value = raw.slice(0, 300);
          continue;
        }
      }
      input.value = String(value ?? "");
    }
  }
  for (const [key, value] of Object.entries(state.options)) {
    const input = form.elements.namedItem(key);
    if (!input) continue;
    // Support checkboxes inside options (e.g. brandingComment).
    if ("type" in input && input.type === "checkbox" && "checked" in input) {
      input.checked = Boolean(value);
      continue;
    }
    if ("value" in input) input.value = String(value ?? "");
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
  let parsed = raw ? safeParse(raw) : null;

  // One-time migration from v1 -> v2 (keeps user data, but defaults Social logos to icons).
  if (!parsed) {
    const legacyRaw = window.localStorage.getItem(STORAGE_KEY_LEGACY);
    const legacyParsed = legacyRaw ? safeParse(legacyRaw) : null;
    if (legacyParsed && typeof legacyParsed === "object") {
      parsed = legacyParsed;
    }
  }

  const base = defaultState();
  if (!parsed || typeof parsed !== "object") return base;

  const templateId = TEMPLATES.some((t) => t.id === parsed.templateId) ? parsed.templateId : base.templateId;
  const options = { ...base.options, ...(parsed.options ?? {}) };
  // Migration behavior: previously saved "badges" are upgraded to icon logos by default.
  if (options.socialStyle === "badges") options.socialStyle = "icons";

  const next = {
    templateId,
    persist: typeof parsed.persist === "boolean" ? parsed.persist : base.persist,
    data: { ...base.data, ...(parsed.data ?? {}) },
    options,
  };
  // Safety: if an extremely large data URL was pasted previously, drop it.
  if (String(next.data.imageUrl || "").startsWith("data:") && String(next.data.imageUrl || "").length > 250_000) {
    next.data.imageUrl = "";
  }
  // Persist v2 format best-effort.
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

function saveState(state) {
  if (!state.persist) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyTheme() {
  // App runs in light mode only (simpler and consistent across devices/clients).
  document.documentElement.dataset.theme = "light";
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
    xing: "",
    facebook: "",
    calendarLink: "https://cal.com/example",
    vcardUrl: "https://example.com/kontakt.vcf",
    tagline: "Kurz. Klar. Kompetent.",
    imageUrl: "",
  };
}

function renderDesignCards({ selectedId, onSelect }) {
  const grid = $("designGrid");
  grid.innerHTML = "";

  const sampleData = buildSampleData();

  for (const t of TEMPLATES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "design-card";
    btn.setAttribute("role", "listitem");
    btn.dataset.templateId = t.id;
    btn.dataset.selected = String(t.id === selectedId);
    btn.setAttribute("aria-pressed", String(t.id === selectedId));
    btn.title = "Klick: Design wählen · Doppelklick: Vorschau öffnen";
    btn.innerHTML = `<div class="design-name">${t.name}</div><p class="design-desc">${t.description}</p>`;

    btn.addEventListener("click", () => onSelect(t.id));
    btn.addEventListener("dblclick", () => {
      document.dispatchEvent(
        new CustomEvent("open-design-preview", {
          detail: { templateId: t.id, name: t.name, description: t.description, sampleData },
        })
      );
    });

    btn.addEventListener("keydown", (e) => {
      // Accessibility: "p" opens preview when focused.
      if (e.key?.toLowerCase?.() === "p") {
        e.preventDefault();
        document.dispatchEvent(
          new CustomEvent("open-design-preview", {
            detail: { templateId: t.id, name: t.name, description: t.description, sampleData },
          })
        );
      }
    });

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

function downloadIcs({ filename, ics }) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadJson({ filename, jsonText }) {
  const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
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

function escIcsText(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\n")
    .trim();
}

function fmtIcsUtc(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function buildIcs(data) {
  const title = String(data?.eventTitle ?? "").trim();
  const startRaw = String(data?.eventStart ?? "").trim();
  const durationMin = Number(String(data?.eventDuration ?? "").trim() || "30");
  const link = String(data?.eventLink ?? "").trim();
  const location = String(data?.eventLocation ?? "").trim();
  const remindersRaw = String(data?.eventReminders ?? "").trim();

  if (!title || !startRaw) return "";
  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) return "";

  const dur = Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 30;
  const end = new Date(start.getTime() + dur * 60 * 1000);

  let reminders = [15];
  if (remindersRaw) {
    const nums = remindersRaw
      .split(/[,\s]+/g)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => Number(p))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 10080);
    if (nums.length) reminders = nums.slice(0, 5);
  }

  const uid = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`) + "@signatur-generator.com";
  const dtstamp = fmtIcsUtc(new Date());
  const dtstart = fmtIcsUtc(start);
  const dtend = fmtIcsUtc(end);

  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("PRODID:-//signatur-generator.com//ICS Generator//DE");
  lines.push("METHOD:PUBLISH");
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${escIcsText(uid)}`);
  lines.push(`DTSTAMP:${dtstamp}`);
  lines.push(`DTSTART:${dtstart}`);
  lines.push(`DTEND:${dtend}`);
  lines.push(`SUMMARY:${escIcsText(title)}`);
  if (location) lines.push(`LOCATION:${escIcsText(location)}`);
  if (link) {
    lines.push(`URL:${escIcsText(link)}`);
    lines.push(`DESCRIPTION:${escIcsText(`Meeting-Link: ${link}`)}`);
  }

  for (const min of reminders) {
    lines.push("BEGIN:VALARM");
    lines.push(`TRIGGER:-PT${min}M`);
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${escIcsText(title)}`);
    lines.push("END:VALARM");
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
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
    ["XING", data.xing],
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
    if (social === "icons") {
      parts.push("Hinweis: Icons/Badges werden in Outlook‑sicher automatisch als Textlinks dargestellt.");
    }
  } else {
    parts.push(
      "<strong>Standard:</strong> Moderne Optik – einzelne Elemente (Rundungen/Verläufe) können in Outlook (Windows‑Desktop) anders aussehen."
    );
  }

  if (compat !== "outlook" && social === "icons") {
    parts.push(
      "<strong>Icons:</strong> Viele Mail‑Clients entfernen inline‑SVG. Icons können dann fehlen – für maximale Kompatibilität sind Textlinks am sichersten."
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

  function ensureFieldErrors() {
    for (const name of [...URL_FIELDS, ...PHONE_FIELDS, ...EVENT_FIELDS]) {
      const input = form.elements.namedItem(name);
      if (!input) continue;
      const field = input.closest?.(".field");
      if (!field) continue;
      if (field.querySelector?.(`[data-error-for="${CSS.escape(name)}"]`)) continue;
      const span = document.createElement("span");
      span.className = "field-error";
      span.dataset.errorFor = name;
      span.setAttribute("aria-live", "polite");
      field.appendChild(span);
    }
  }

  function setFieldError(name, message) {
    const el = form.querySelector?.(`[data-error-for="${CSS.escape(name)}"]`);
    const input = form.elements.namedItem(name);
    if (el) el.textContent = message || "";
    if (input && "setAttribute" in input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function validateAll(data) {
    for (const name of URL_FIELDS) {
      if (!data || typeof data !== "object") continue;
      setFieldError(name, validateUrlField(name, data[name]).error);
    }
    for (const name of PHONE_FIELDS) {
      if (!data || typeof data !== "object") continue;
      setFieldError(name, validatePhoneField(data[name]).error);
    }
    const events = validateEventFields(data);
    for (const [k, v] of Object.entries(events)) setFieldError(k, v);
  }

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
    validateAll(state.data);
    saveState(state);
  }

  renderDesignCards({ selectedId: state.templateId, onSelect: setTemplateId });
  ensureFieldErrors();
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
    if (target && target.name === "imageUrl") {
      const v = String(target.value || "");
      if (v.startsWith("data:")) {
        // Avoid pasting huge base64 strings into the URL field (can freeze/crash the UI).
        target.value = "";
        toast("Data‑URL bitte über „Bild hochladen“ einfügen (Feld ist für HTTPS‑Bildlinks).", { kind: "info" });
      } else if (v.length > 300) {
        target.value = v.slice(0, 300);
        toast("Bild‑URL wurde auf 300 Zeichen gekürzt.", { kind: "info" });
      }
    }
    update();
  });

  // On blur: best-effort auto-correct (no spammy toasts during typing).
  form.addEventListener(
    "blur",
    (e) => {
      const target = e.target;
      const name = target?.name;
      if (!name) return;

      if (URL_FIELDS.includes(name) && target && "value" in target) {
        const before = String(target.value || "");
        const { value: normalized, changed } = normalizeUrlForInput(before);
        if (changed) {
          target.value = normalized;
          toast("https:// wurde ergänzt.", { kind: "info" });
        }
        // Re-validate on blur (shows message if still invalid).
        update();
        return;
      }

      if (PHONE_FIELDS.includes(name) && target && "value" in target) {
        const before = String(target.value || "");
        // Remove clearly invalid characters (letters, emojis) but keep common separators.
        const cleaned = before.replace(/[^\d\s()+\-\/]/g, "");
        if (cleaned !== before) {
          target.value = cleaned;
          toast("Telefonnummer: ungültige Zeichen entfernt.", { kind: "info" });
        }
        update();
      }
    },
    true
  );

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

  async function doCopyRich({ label = "Kopiert." } = {}) {
    try {
      const fragment = output.value;
      await copyRichToClipboard({ html: fragment, plain: plainFromState(state) });
      toast(label);
    } catch {
      toast("Kopieren fehlgeschlagen (Browser‑Berechtigung).", { kind: "error" });
    }
  }

  $("btnCopyHtml").addEventListener("click", async () => {
    try {
      await copyTextToClipboard(output.value);
      toast("HTML kopiert.");
    } catch {
      toast("Kopieren fehlgeschlagen (Browser‑Berechtigung).", { kind: "error" });
    }
  });

  $("btnCopy").addEventListener("click", () => doCopyRich({ label: "Kopiert." }));

  $("btnCopyRich").addEventListener("click", async () => {
    await doCopyRich({ label: "Rich‑Text kopiert." });
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

  $("btnIcs").addEventListener("click", () => {
    const errors = validateEventFields(state.data);
    const hasErr = Object.values(errors).some(Boolean);
    if (hasErr) {
      toast("Bitte Termin‑Felder prüfen (Titel/Start/Dauer/Erinnerung).", { kind: "error" });
      validateAll(state.data);
      return;
    }
    const ics = buildIcs(state.data);
    if (!ics) {
      toast("Bitte Termin‑Titel und Startzeit ausfüllen.", { kind: "error" });
      return;
    }
    const name = (state.data.eventTitle || "termin").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");
    const filename = `${name || "termin"}.ics`;
    downloadIcs({ filename, ics });
    toast("ICS Download gestartet.");
  });

  const fileImport = document.getElementById("fileImportJson");
  const btnExport = document.getElementById("btnExportJson");
  const btnImport = document.getElementById("btnImportJson");

  btnExport?.addEventListener("click", () => {
    const name = (state.data.fullName || "profil")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");
    const filename = `${name || "profil"}.json`;
    const jsonText = JSON.stringify(
      {
        templateId: state.templateId,
        data: state.data,
        options: state.options,
      },
      null,
      2
    );
    downloadJson({ filename, jsonText });
    toast("JSON exportiert.");
  });

  btnImport?.addEventListener("click", () => fileImport?.click());
  fileImport?.addEventListener("change", () => {
    const file = fileImport.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => toast("Import fehlgeschlagen.", { kind: "error" });
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const fresh = defaultState();
        const templateId = TEMPLATES.some((t) => t.id === parsed.templateId) ? parsed.templateId : fresh.templateId;
        const next = {
          ...fresh,
          templateId,
          data: { ...fresh.data, ...(parsed.data || {}) },
          options: { ...fresh.options, ...(parsed.options || {}) },
        };
        state = next;
        writeForm(form, next);
        renderDesignCards({ selectedId: state.templateId, onSelect: setTemplateId });
        update();
        toast("JSON importiert.");
      } catch {
        toast("Ungültige JSON-Datei.", { kind: "error" });
      } finally {
        fileImport.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  });

  $("btnReset").addEventListener("click", () => {
    const fresh = defaultState();
    state = { ...fresh };
    writeForm(form, fresh);
    renderDesignCards({ selectedId: state.templateId, onSelect: setTemplateId });
    update();
    toast("Zurückgesetzt.");
  });

  applyTheme();
}

main();
