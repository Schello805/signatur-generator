const OWNER = "Schello805";
const REPO = "signatur-generator";
const BRANCH = "main";

const VERSION_META = document.querySelector('meta[name="app-version"]');
const LOCAL_VERSION = (VERSION_META?.getAttribute("content") || "").trim() || "dev";
const VERSION_EL = document.getElementById("versionInfo");

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function updateHelpText({ latestVersion }) {
  const v = latestVersion ? ` (v${latestVersion})` : "";
  return `Neue Version${v} auf GitHub verfügbar. Update: Wenn unten „Update installieren“ erscheint → klicken. Bei file:// bitte ZIP laden/ersetzen (PWA-Updates nur via HTTPS/localhost).`;
}

function setVersionHtml(html) {
  if (!VERSION_EL) return;
  VERSION_EL.innerHTML = html;
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function shortSha(sha) {
  return String(sha || "").slice(0, 7);
}

function repoUrl(path = "") {
  const base = `https://github.com/${OWNER}/${REPO}`;
  return path ? `${base}/${path}` : base;
}

function semverTuple(v) {
  const m = String(v || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareSemver(a, b) {
  const ta = semverTuple(a);
  const tb = semverTuple(b);
  if (!ta || !tb) return 0;
  for (let i = 0; i < 3; i += 1) {
    if (ta[i] > tb[i]) return 1;
    if (ta[i] < tb[i]) return -1;
  }
  return 0;
}

async function fetchLatestCommitSha() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits/${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`github-api-${res.status}`);
  const data = await res.json();
  return String(data?.sha || "");
}

function getCachedCheck() {
  const raw = window.localStorage.getItem("signaturgenerator:updatecheck:v3");
  const parsed = raw ? safeParse(raw) : null;
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.checkedAt || (!parsed.latestVersion && !parsed.latestSha)) return null;
  return parsed;
}

function setCachedCheck({ latestSha, latestVersion }) {
  window.localStorage.setItem(
    "signaturgenerator:updatecheck:v3",
    JSON.stringify({ latestSha: latestSha || "", latestVersion: latestVersion || "", checkedAt: Date.now() })
  );
}

function getInstalledInfo() {
  const raw = window.localStorage.getItem("signaturgenerator:installed:v1");
  const parsed = raw ? safeParse(raw) : null;
  if (!parsed || typeof parsed !== "object") return { version: "", sha: "" };
  return { version: String(parsed.version || ""), sha: String(parsed.sha || "") };
}

function setInstalledInfo({ version, sha }) {
  window.localStorage.setItem("signaturgenerator:installed:v1", JSON.stringify({ version, sha }));
}

function shouldCheckUpdates() {
  if (!LOCAL_VERSION) return false;
  if (navigator.onLine === false) return false;
  return true;
}

function renderLocalOnly() {
  setVersionHtml(`<span class="version-inline"><span class="version-pill">v${LOCAL_VERSION}</span> · <a href="${repoUrl()}" target="_blank" rel="noreferrer">GitHub</a></span>`);
}

function renderWithLatest({ latestSha, latestVersion }) {
  const latestShort = shortSha(latestSha);
  const cmp = latestVersion ? compareSemver(latestVersion, LOCAL_VERSION) : 0;

  if (latestVersion && cmp > 0) {
    const help = updateHelpText({ latestVersion });
    const helpAttr = escapeAttr(help);
    setVersionHtml(
      `<span class="version-inline"><span class="version-pill">v${LOCAL_VERSION}</span><span class="version-badge version-badge--update hint" tabindex="0" role="note" aria-label="Update verfügbar" title="${helpAttr}" data-tip="${helpAttr}">Update</span> · <span class="version-latest">(v${latestVersion}${latestShort ? ` · GitHub ${latestShort}` : ""})</span> · <a href="${repoUrl(
        "archive/refs/heads/" + BRANCH + ".zip"
      )}" target="_blank" rel="noreferrer">Download</a> · <a href="#" data-action="reload">Neu laden</a></span>`
    );
    return;
  }

  if (latestVersion && cmp === 0) {
    setVersionHtml(
      `<span class="version-inline"><span class="version-pill">v${LOCAL_VERSION}</span> · up to date${
        latestShort ? ` · GitHub ${latestShort}` : ""
      } · <a href="${repoUrl("commits/" + BRANCH)}" target="_blank" rel="noreferrer">Commits</a></span>`
    );
    return;
  }

  // Fallback (no version info): show local + optional sha.
  setVersionHtml(
    `<span class="version-inline"><span class="version-pill">v${LOCAL_VERSION}</span>${
      latestShort ? ` · GitHub ${latestShort}` : ""
    } · <a href="${repoUrl()}" target="_blank" rel="noreferrer">GitHub</a></span>`
  );
}

async function fetchLatestVersion() {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${encodeURIComponent(BRANCH)}/package.json`;
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(`raw-${res.status}`);
  const data = await res.json();
  return String(data?.version || "").trim();
}

async function checkForUpdates() {
  if (!shouldCheckUpdates()) return renderLocalOnly();

  const cached = getCachedCheck();
  const cacheMaxAgeMs = 6 * 60 * 60 * 1000; // 6h
  if (cached && Date.now() - cached.checkedAt < cacheMaxAgeMs) {
    return renderWithLatest({ latestSha: cached.latestSha, latestVersion: cached.latestVersion });
  }

  try {
    const [latestVersion, latestSha] = await Promise.all([
      fetchLatestVersion().catch(() => ""),
      fetchLatestCommitSha().catch(() => ""),
    ]);
    setCachedCheck({ latestSha, latestVersion });
    renderWithLatest({ latestSha, latestVersion });
  } catch {
    renderLocalOnly();
  }
}

renderLocalOnly();
checkForUpdates();

document.addEventListener("click", (e) => {
  const a = e.target?.closest?.("a[data-action='reload']");
  if (!a) return;
  e.preventDefault();
  window.location.reload();
});
