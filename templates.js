const FONT_MAP = {
  system:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  serif: 'ui-serif, Georgia, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

function esc(text) {
  if (text == null) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanUrl(url) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function cleanImageSrc(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Allow https/http image URLs.
  const asUrl = cleanUrl(raw);
  if (asUrl) return asUrl;

  // Allow uploaded inline images for preview/export (may be blocked by some mail clients).
  // Keep a hard size limit to prevent accidental huge strings from freezing the UI.
  if (raw.startsWith("data:image/") && raw.length <= 250_000) return raw;
  return "";
}

function normalizeHost(host) {
  return String(host || "").trim().toLowerCase().replace(/\.$/, "");
}

function cleanUrlForHosts(url, allowedHosts) {
  const cleaned = cleanUrl(url);
  if (!cleaned) return "";
  try {
    const parsed = new URL(cleaned);
    const host = normalizeHost(parsed.host);
    const allowed = (allowedHosts || []).map((h) => normalizeHost(h));
    const ok = allowed.some((h) => host === h || host.endsWith(`.${h}`));
    return ok ? cleaned : "";
  } catch {
    return "";
  }
}

function formatWebsiteLabel(url) {
  try {
    const parsed = new URL(url);
    return parsed.host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizePhoneHref(phone) {
  const raw = String(phone ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function normalizeEmailHref(email) {
  const raw = String(email ?? "").trim();
  if (!raw) return "";
  return `mailto:${raw}`;
}

function lineOrEmpty(label, value) {
  const v = String(value ?? "").trim();
  return v ? `${label}${esc(v)}` : "";
}

function buildLines(data) {
  const lines = [];
  const phone = String(data.phone ?? "").trim();
  const mobile = String(data.mobile ?? "").trim();
  const email = String(data.email ?? "").trim();
  const website = cleanUrl(data.website);
  const address = String(data.address ?? "").trim();
  const linkedin = cleanUrlForHosts(data.linkedin, ["linkedin.com"]);
  const calendarLink = cleanUrl(data.calendarLink);
  const vcardUrl = cleanUrl(data.vcardUrl);

  if (phone) lines.push({ key: "phone", label: "Tel:", text: phone, href: normalizePhoneHref(phone) });
  if (mobile) lines.push({ key: "mobile", label: "Mobil:", text: mobile, href: normalizePhoneHref(mobile) });
  if (email) lines.push({ key: "email", label: "E‑Mail:", text: email, href: normalizeEmailHref(email) });
  if (website) lines.push({ key: "website", label: "Web:", text: formatWebsiteLabel(website), href: website });
  if (address) lines.push({ key: "address", label: "Adresse:", text: address, href: "" });
  if (calendarLink) lines.push({ key: "calendar", label: "Termin:", text: "Buchen", href: calendarLink });
  if (vcardUrl) lines.push({ key: "vcard", label: "vCard:", text: "Download", href: vcardUrl });
  return lines;
}

function buildSocialLinks(data) {
  const items = [];
  const linkedin = cleanUrlForHosts(data.linkedin, ["linkedin.com"]);
  const github = cleanUrlForHosts(data.github, ["github.com"]);
  const instagram = cleanUrlForHosts(data.instagram, ["instagram.com"]);
  const x = cleanUrlForHosts(data.x, ["x.com", "twitter.com"]);
  const xing = cleanUrlForHosts(data.xing, ["xing.com"]);
  const facebook = cleanUrlForHosts(data.facebook, ["facebook.com"]);
  const website = cleanUrl(data.website);
  const calendar = cleanUrl(data.calendarLink);

  if (linkedin) items.push({ key: "in", label: "LinkedIn", href: linkedin });
  if (github) items.push({ key: "gh", label: "GitHub", href: github });
  if (instagram) items.push({ key: "ig", label: "Instagram", href: instagram });
  if (x) items.push({ key: "x", label: "X", href: x });
  if (xing) items.push({ key: "xing", label: "XING", href: xing });
  if (facebook) items.push({ key: "fb", label: "Facebook", href: facebook });
  if (website) items.push({ key: "web", label: "Web", href: website });
  if (calendar) items.push({ key: "cal", label: "Termin", href: calendar });
  return items;
}

function renderSocialRow(data, options) {
  const style = options.socialStyle ?? "badges";
  if (style === "none") return "";

  const links = buildSocialLinks(data);
  if (!links.length) return "";

  const accent = options.accentColor;
  const textColor = options.textColor;
  const outlookSafe = options.compatMode === "outlook";

  if (style === "text" || (outlookSafe && (style === "badges" || style === "icons"))) {
    const html = links
      .map((l) => `<a href="${esc(l.href)}" style="color:${esc(textColor)};text-decoration:none;">${esc(l.label)}</a>`)
      .join(`<span style="color:rgba(0,0,0,0.35);"> · </span>`);
    return `<div style="margin-top:8px;font-size:12.5px;line-height:1.25;">${html}</div>`;
  }

  const ICON_SVG = {
    // Icons from Bootstrap Icons (MIT). See THIRD_PARTY_NOTICES.md.
    gh: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
    </svg>`,
    in: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/>
    </svg>`,
    ig: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
    </svg>`,
    // Icon from Tabler Icons (MIT). See THIRD_PARTY_NOTICES.md.
    xing: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M16 21l-4 -7l6.5 -11" />
      <path d="M7 7l2 3.5l-3 4.5" />
    </svg>`,
    x: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
    </svg>`,
    fb: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951"/>
    </svg>`,
    web: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5ZM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
    </svg>`,
    cal: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857z"/>
      <path d="M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
    </svg>`,
  };

  // Badges (mail-client friendly): small linked cells with short label.
  const cells = links
    .map((l) => {
      const short = l.key.toUpperCase();
      const icon = ICON_SVG[l.key] || "";
      const iconFallback = esc(short);
      const inner =
        style === "icons"
          ? icon
            ? `<span style="display:inline-flex;align-items:center;justify-content:center;color:#ffffff;">${icon}</span>`
            : iconFallback
          : esc(short);
      return `
        <td style="padding:0 6px 0 0;vertical-align:middle;">
          <a href="${esc(l.href)}" style="display:inline-block;background:${esc(
        accent
      )};color:#ffffff;text-decoration:none;font-weight:800;font-size:11px;line-height:1;padding:6px 8px;border-radius:999px;">
            ${inner}
          </a>
        </td>`;
    })
    .join("");

  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
      <tr>${cells}</tr>
    </table>`;
}

function richNameBlock(data, options) {
  const name = String(data.fullName ?? "").trim();
  const job = String(data.jobTitle ?? "").trim();
  const company = String(data.company ?? "").trim();
  const dept = String(data.department ?? "").trim();
  const tagline = String(data.tagline ?? "").trim();

  const nameLine = name ? esc(name) : "Dein Name";
  const jobParts = [job, dept].filter(Boolean).map(esc);
  const jobLine = jobParts.join(" · ");
  const companyLine = company ? esc(company) : "";
  const taglineLine = tagline ? esc(tagline) : "";

  const font = FONT_MAP[options.fontFamily] ?? FONT_MAP.system;
  const textColor = options.textColor;

  return {
    font,
    textColor,
    nameLine,
    jobLine,
    companyLine,
    taglineLine,
  };
}

function templateMinimal(data, options) {
  const base = richNameBlock(data, options);
  const lines = buildLines(data);
  const social = renderSocialRow(data, options);
  const accent = options.accentColor;
  const density = options.density;
  const compact = density === "compact";

  const nameSize = compact ? 14 : 16;
  const small = compact ? 12 : 13;
  const gap = compact ? 3 : 5;

  const contactHtml = lines
    .map((l) => {
      const val = esc(l.text);
      const content = l.href
        ? `<a href="${esc(l.href)}" style="color:${esc(base.textColor)};text-decoration:none;">${val}</a>`
        : val;
      return `<tr><td style="padding:0 0 ${gap}px 0;vertical-align:top;"><span style="color:rgba(0,0,0,0.55);">${esc(
        l.label
      )}</span> <span>${content}</span></td></tr>`;
    })
    .join("");

  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${esc(base.font)};color:${esc(
    base.textColor
  )};">
  <tr>
    <td style="padding:0;">
      <div style="font-size:${nameSize}px;font-weight:700;line-height:1.2;margin:0;">${base.nameLine}</div>
      ${
        base.jobLine || base.companyLine
          ? `<div style="margin-top:${gap}px;font-size:${small}px;line-height:1.3;color:rgba(0,0,0,0.70);">
              ${[base.jobLine, base.companyLine].filter(Boolean).join(" — ")}
            </div>`
          : ""
      }
      ${
        base.taglineLine
          ? `<div style="margin-top:${gap}px;font-size:${small}px;line-height:1.35;color:${esc(
              accent
            )};font-weight:600;">${base.taglineLine}</div>`
          : ""
      }
      ${
        contactHtml
          ? `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:${gap + 6}px;font-size:${small}px;line-height:1.25;">
              ${contactHtml}
            </table>`
          : ""
      }
      ${social}
    </td>
  </tr>
</table>`.trim();
}

function templateLeftBar(data, options) {
  const base = richNameBlock(data, options);
  const lines = buildLines(data);
  const social = renderSocialRow(data, options);
  const accent = options.accentColor;
  const density = options.density;
  const compact = density === "compact";

  const nameSize = compact ? 14 : 16;
  const small = compact ? 12 : 13;
  const gap = compact ? 3 : 6;

  const contactHtml = lines
    .map((l) => {
      const val = esc(l.text);
      const content = l.href
        ? `<a href="${esc(l.href)}" style="color:${esc(base.textColor)};text-decoration:none;">${val}</a>`
        : val;
      return `<div style="margin-top:${gap}px;"><span style="color:rgba(0,0,0,0.55);">${esc(l.label)}</span> ${content}</div>`;
    })
    .join("");

  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${esc(base.font)};color:${esc(
    base.textColor
  )};">
  <tr>
    <td style="padding:0;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:6px;background:${esc(accent)};border-radius:4px;"></td>
          <td style="width:14px;"></td>
          <td style="padding:0;">
            <div style="font-size:${nameSize}px;font-weight:800;line-height:1.2;margin:0;">${base.nameLine}</div>
            ${
              base.jobLine || base.companyLine
                ? `<div style="margin-top:${gap}px;font-size:${small}px;line-height:1.3;color:rgba(0,0,0,0.70);">
                    ${[base.jobLine, base.companyLine].filter(Boolean).join(" · ")}
                  </div>`
                : ""
            }
            ${
              base.taglineLine
                ? `<div style="margin-top:${gap}px;font-size:${small}px;line-height:1.35;color:rgba(0,0,0,0.78);">
                    ${base.taglineLine}
                  </div>`
                : ""
            }
            ${
              contactHtml
                ? `<div style="margin-top:${gap + 6}px;font-size:${small}px;line-height:1.25;">
                    ${contactHtml}
                  </div>`
                : ""
            }
            ${social}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function templateCard(data, options) {
  const base = richNameBlock(data, options);
  const lines = buildLines(data);
  const social = renderSocialRow(data, options);
  const accent = options.accentColor;
  const density = options.density;
  const compact = density === "compact";
  const imgUrl = cleanImageSrc(data.imageUrl);
  const outlookSafe = options.compatMode === "outlook";
  const radius = outlookSafe ? 0 : 14;

  const nameSize = compact ? 14 : 16;
  const small = compact ? 12 : 13;
  const pad = compact ? 10 : 12;

  const contactHtml = lines
    .map((l) => {
      const val = esc(l.text);
      const content = l.href
        ? `<a href="${esc(l.href)}" style="color:${esc(base.textColor)};text-decoration:none;">${val}</a>`
        : val;
      return `<tr>
        <td style="padding:0 0 4px 0;vertical-align:top;color:rgba(0,0,0,0.55);white-space:nowrap;">${esc(l.label)}</td>
        <td style="padding:0 0 4px 8px;vertical-align:top;">${content}</td>
      </tr>`;
    })
    .join("");

  const imgHtml = imgUrl
    ? `<img src="${esc(imgUrl)}" alt="Logo" width="${compact ? 44 : 52}" height="${
        compact ? 44 : 52
      }" style="display:block;border-radius:12px;object-fit:cover;" />`
    : "";

  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${esc(base.font)};color:${esc(
    base.textColor
  )};">
  <tr>
    <td style="padding:0;">
      <table cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(0,0,0,0.12);border-radius:${radius}px;overflow:hidden;">
        <tr>
          <td style="padding:${pad}px;background:${esc(accent)};color:#ffffff;">
            <div style="font-size:${nameSize}px;font-weight:800;line-height:1.2;margin:0;">${base.nameLine}</div>
            ${
              base.jobLine || base.companyLine
                ? `<div style="margin-top:4px;font-size:${small}px;line-height:1.3;opacity:0.95;">
                    ${[base.jobLine, base.companyLine].filter(Boolean).join(" · ")}
                  </div>`
                : ""
            }
          </td>
          <td style="padding:${pad}px;background:#ffffff;vertical-align:top;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${
                  imgHtml
                    ? `<td style="padding:0 12px 0 0;vertical-align:top;">${imgHtml}</td>`
                    : ""
                }
                <td style="padding:0;vertical-align:top;">
                  ${
                    base.taglineLine
                      ? `<div style="font-size:${small}px;line-height:1.35;color:${esc(
                          base.textColor
                        )};font-weight:650;margin:0 0 8px 0;">${base.taglineLine}</div>`
                      : ""
                  }
                  ${
                    contactHtml
                      ? `<table cellpadding="0" cellspacing="0" border="0" style="font-size:${small}px;line-height:1.25;">
                          ${contactHtml}
                        </table>`
                      : ""
                  }
                  ${social}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function templateSplitPhoto(data, options) {
  const base = richNameBlock(data, options);
  const lines = buildLines(data);
  const social = renderSocialRow(data, options);
  const accent = options.accentColor;
  const density = options.density;
  const compact = density === "compact";
  const imgUrl = cleanImageSrc(data.imageUrl);
  const outlookSafe = options.compatMode === "outlook";

  const nameSize = compact ? 14 : 16;
  const small = compact ? 12 : 13;
  const gap = compact ? 3 : 6;
  const imageSize = compact ? 52 : 64;

  const contactHtml = lines
    .map((l) => {
      const val = esc(l.text);
      const content = l.href
        ? `<a href="${esc(l.href)}" style="color:${esc(base.textColor)};text-decoration:none;">${val}</a>`
        : val;
      return `<div style="margin-top:${gap}px;"><span style="color:rgba(0,0,0,0.55);">${esc(l.label)}</span> ${content}</div>`;
    })
    .join("");

  const imgHtml = imgUrl
    ? `<img src="${esc(imgUrl)}" alt="Foto/Logo" width="${imageSize}" height="${imageSize}" style="display:block;border-radius:${
        outlookSafe ? 0 : imageSize / 2
      }px;object-fit:cover;border:2px solid ${esc(accent)};" />`
    : `<div style="width:${imageSize}px;height:${imageSize}px;border-radius:${
        outlookSafe ? 0 : imageSize / 2
      }px;background:${esc(accent)};opacity:0.18;border:2px solid ${esc(accent)};"></div>`;

  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${esc(base.font)};color:${esc(
    base.textColor
  )};">
  <tr>
    <td style="padding:0;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:0;vertical-align:top;">${imgHtml}</td>
          <td style="width:14px;"></td>
          <td style="padding:0;vertical-align:top;">
            <div style="font-size:${nameSize}px;font-weight:800;line-height:1.2;margin:0;">${base.nameLine}</div>
            ${
              base.jobLine || base.companyLine
                ? `<div style="margin-top:${gap}px;font-size:${small}px;line-height:1.3;color:rgba(0,0,0,0.70);">
                    ${[base.jobLine, base.companyLine].filter(Boolean).join(" · ")}
                  </div>`
                : ""
            }
            ${
              base.taglineLine
                ? `<div style="margin-top:${gap}px;font-size:${small}px;line-height:1.35;color:${esc(
                    accent
                  )};font-weight:700;">${base.taglineLine}</div>`
                : ""
            }
            ${
              contactHtml
                ? `<div style="margin-top:${gap + 6}px;font-size:${small}px;line-height:1.25;">
                    ${contactHtml}
                  </div>`
                : ""
            }
            ${social}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function templateGradientBadge(data, options) {
  const base = richNameBlock(data, options);
  const lines = buildLines(data);
  const social = renderSocialRow(data, options);
  const accent = options.accentColor;
  const density = options.density;
  const compact = density === "compact";
  const outlookSafe = options.compatMode === "outlook";

  const nameSize = compact ? 14 : 16;
  const small = compact ? 12 : 13;
  const gap = compact ? 3 : 6;

  const topRight = options.accentColor;
  const bottomLeft = "#10b981";
  const headerBg = outlookSafe ? esc(accent) : `linear-gradient(135deg, ${esc(bottomLeft)} 0%, ${esc(topRight)} 100%)`;
  const radius = outlookSafe ? 0 : 16;

  const contactItems = lines
    .map((l) => {
      const val = esc(l.text);
      const content = l.href
        ? `<a href="${esc(l.href)}" style="color:${esc(base.textColor)};text-decoration:none;">${val}</a>`
        : val;
      return `<tr>
        <td style="padding:0 0 ${gap}px 0;vertical-align:top;"><span style="color:rgba(0,0,0,0.55);">${esc(
          l.label
        )}</span> ${content}</td>
      </tr>`;
    })
    .join("");

  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${esc(base.font)};color:${esc(
    base.textColor
  )};">
  <tr>
    <td style="padding:0;">
      <table cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(0,0,0,0.12);border-radius:${radius}px;overflow:hidden;">
        <tr>
          <td style="padding:${compact ? 10 : 12}px;background: ${headerBg}; color:#ffffff;">
            <div style="margin-top:6px;font-size:${nameSize}px;font-weight:850;line-height:1.2;">${base.nameLine}</div>
            ${
              base.jobLine || base.companyLine
                ? `<div style="margin-top:6px;font-size:${small}px;line-height:1.3;opacity:0.95;">
                    ${[base.jobLine, base.companyLine].filter(Boolean).join(" · ")}
                  </div>`
                : ""
            }
          </td>
          <td style="padding:${compact ? 10 : 12}px;background:#ffffff;vertical-align:top;">
            ${
              base.taglineLine
                ? `<div style="font-size:${small}px;line-height:1.35;color:rgba(0,0,0,0.80);font-weight:650;margin:0 0 8px 0;">
                    ${base.taglineLine}
                  </div>`
                : ""
            }
            ${
              contactItems
                ? `<table cellpadding="0" cellspacing="0" border="0" style="font-size:${small}px;line-height:1.25;">
                    ${contactItems}
                  </table>`
                : ""
            }
            ${social}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

export const TEMPLATES = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Sehr kompatibel, clean und leicht.",
    render: templateMinimal,
  },
  {
    id: "leftbar",
    name: "Left Bar",
    description: "Akzentleiste links, professionell.",
    render: templateLeftBar,
  },
  {
    id: "card",
    name: "Card",
    description: "Kachel‑Look, optional mit Logo/Foto.",
    render: templateCard,
  },
  {
    id: "splitphoto",
    name: "Split + Foto",
    description: "Rundes Foto/Logo links, modern.",
    render: templateSplitPhoto,
  },
  {
    id: "gradient",
    name: "Gradient Badge",
    description: "Stärkeres Branding mit Verlauf.",
    render: templateGradientBadge,
  },
];

export function buildSignatureHtml(templateId, data, options) {
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const fragment = template.render(data, options);
  const branding = Boolean(options?.brandingComment);
  if (!branding) return fragment;
  return `${fragment}\n<!-- Erstellt mit signatur-generator.com -->`;
}

export function defaultState() {
  return {
    templateId: TEMPLATES[0].id,
    persist: true,
    data: {
      fullName: "",
      jobTitle: "",
      company: "",
      department: "",
      phone: "",
      mobile: "",
      email: "",
      website: "",
      address: "",
      linkedin: "",
      github: "",
      calendarLink: "",
      vcardUrl: "",
      instagram: "",
      tagline: "",
      x: "",
      xing: "",
      facebook: "",
      imageUrl: "",
    },
    options: {
      accentColor: "#2563eb",
      textColor: "#0f172a",
      fontFamily: "system",
      density: "normal",
      socialStyle: "icons",
      compatMode: "standard",
      brandingComment: false,
    },
  };
}
