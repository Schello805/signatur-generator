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
  const linkedin = cleanUrl(data.linkedin);
  const calendarLink = cleanUrl(data.calendarLink);

  if (phone) lines.push({ key: "phone", label: "Tel:", text: phone, href: normalizePhoneHref(phone) });
  if (mobile) lines.push({ key: "mobile", label: "Mobil:", text: mobile, href: normalizePhoneHref(mobile) });
  if (email) lines.push({ key: "email", label: "E‑Mail:", text: email, href: normalizeEmailHref(email) });
  if (website) lines.push({ key: "website", label: "Web:", text: formatWebsiteLabel(website), href: website });
  if (address) lines.push({ key: "address", label: "Adresse:", text: address, href: "" });
  if (linkedin) lines.push({ key: "linkedin", label: "LinkedIn:", text: "Profil", href: linkedin });
  if (calendarLink) lines.push({ key: "calendar", label: "Termin:", text: "Buchen", href: calendarLink });
  return lines;
}

function buildSocialLinks(data) {
  const items = [];
  const linkedin = cleanUrl(data.linkedin);
  const github = cleanUrl(data.github);
  const instagram = cleanUrl(data.instagram);
  const x = cleanUrl(data.x);
  const facebook = cleanUrl(data.facebook);
  const website = cleanUrl(data.website);
  const calendar = cleanUrl(data.calendarLink);

  if (linkedin) items.push({ key: "in", label: "LinkedIn", href: linkedin });
  if (github) items.push({ key: "gh", label: "GitHub", href: github });
  if (instagram) items.push({ key: "ig", label: "Instagram", href: instagram });
  if (x) items.push({ key: "x", label: "X", href: x });
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
    in: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9h3v10H6V9Z" fill="currentColor"/><path d="M7.5 5.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z" fill="currentColor"/>
      <path d="M11 9h2.9v1.4h.04c.4-.76 1.39-1.56 2.86-1.56 3.06 0 3.62 2.01 3.62 4.63V19h-3v-4.88c0-1.16-.02-2.65-1.62-2.65-1.62 0-1.87 1.26-1.87 2.57V19h-2.93V9Z" fill="currentColor"/>
    </svg>`,
    gh: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M12 2.2A10 10 0 0 0 8.84 21.3c.5.1.68-.22.68-.48v-1.68c-2.77.6-3.36-1.19-3.36-1.19-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.93.83.09-.65.35-1.09.63-1.34-2.21-.25-4.53-1.1-4.53-4.9 0-1.08.39-1.96 1.03-2.65-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.69 1.03 1.57 1.03 2.65 0 3.81-2.33 4.64-4.55 4.89.36.31.68.92.68 1.86v2.76c0 .27.18.59.69.48A10 10 0 0 0 12 2.2Z"/>
    </svg>`,
    ig: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Z"/>
      <path fill="currentColor" d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
      <path fill="currentColor" d="M18 6.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
    </svg>`,
    x: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M18.2 2H21l-6.1 7 7.2 13H16.2l-4.6-8.2L4.9 22H2l6.6-7.6L1.7 2H7.7l4.2 7.5L18.2 2Zm-1 18h1.5L6.9 3.9H5.3L17.2 20Z"/>
    </svg>`,
    fb: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M14 22v-8h3l.5-4H14V7.7c0-1.1.3-1.7 1.8-1.7H18V2.2C17.2 2.1 15.8 2 14.1 2 10.6 2 8.3 4.1 8.3 7.9V10H5v4h3.3v8H14Z"/>
    </svg>`,
    web: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.9 9h-3.1a15.7 15.7 0 0 0-1.2-5 8.1 8.1 0 0 1 4.3 5ZM12 4c.9 1.2 1.6 3.1 2 7h-4c.4-3.9 1.1-5.8 2-7Zm-6.8 7H2.1a8.1 8.1 0 0 1 4.3-5 15.7 15.7 0 0 0-1.2 5ZM2.1 13h3.1c.2 1.8.7 3.5 1.2 5a8.1 8.1 0 0 1-4.3-5Zm3.1-2h3.6c0 1.7.2 3.5.6 5H6.4c-.6-1.5-1-3.2-1.2-5Zm3.6-2H5.2c.2-1.8.7-3.5 1.2-5h3c-.4 1.5-.6 3.3-.6 5Zm2 2h4c0 1.7-.2 3.5-.6 5h-2.8c-.4-1.5-.6-3.3-.6-5Zm0-2c0-1.7.2-3.5.6-5h2.8c.4 1.5.6 3.3.6 5h-4Zm7.8 2h3.1a8.1 8.1 0 0 1-4.3 5c.5-1.5 1-3.2 1.2-5Zm0-2c-.2-1.8-.7-3.5-1.2-5a8.1 8.1 0 0 1 4.3 5h-3.1Z"/>
    </svg>`,
    cal: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm13 8H4v10h16V10Zm-2-4H6v2h12V6Z"/>
    </svg>`,
  };

  // Badges (mail-client friendly): small linked cells with short label.
  const cells = links
    .map((l) => {
      const short = l.key.toUpperCase();
      const icon = ICON_SVG[l.key] || "";
      const inner =
        style === "icons"
          ? `<span style="display:inline-flex;align-items:center;justify-content:center;color:#ffffff;">${icon}</span>`
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
  const imgUrl = cleanUrl(data.imageUrl);
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
  const imgUrl = cleanUrl(data.imageUrl);
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
            <div style="font-size:${small}px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.95;">Signature</div>
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
            <div style="margin-top:${gap + 6}px;font-size:${small}px;line-height:1.25;color:rgba(0,0,0,0.55);">
              <span style="display:inline-block;padding:4px 8px;border-radius:999px;background:rgba(0,0,0,0.06);">
                Akzent: <span style="font-weight:700;color:${esc(accent)};">${esc(accent)}</span>
              </span>
            </div>
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
  return template.render(data, options);
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
      instagram: "",
      tagline: "",
      x: "",
      facebook: "",
      imageUrl: "",
    },
    options: {
      accentColor: "#2563eb",
      textColor: "#0f172a",
      fontFamily: "system",
      density: "normal",
      socialStyle: "badges",
      compatMode: "standard",
    },
  };
}
