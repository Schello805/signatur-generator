const OWNER = "Schello805";
const REPO = "signatur-generator";
const BRANCH = "main";

const VERSION_META = document.querySelector('meta[name="app-version"]');
const LOCAL_VERSION = (VERSION_META?.getAttribute("content") || "").trim() || "dev";
const VERSION_EL = document.getElementById("versionInfo");

function setVersionText(text) {
  if (!VERSION_EL) return;
  VERSION_EL.textContent = text;
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

function shouldCheckUpdates() {
  // Only check if we have a version to compare and we're likely online.
  if (!LOCAL_VERSION || LOCAL_VERSION === "dev") return false;
  if (navigator.onLine === false) return false;
  return true;
}

function getCachedCheck() {
  const raw = window.localStorage.getItem("signaturgenerator:updatecheck:v1");
  const parsed = raw ? safeParse(raw) : null;
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.checkedAt || !parsed.latestSha) return null;
  return parsed;
}

function setCachedCheck({ latestSha }) {
  window.localStorage.setItem(
    "signaturgenerator:updatecheck:v1",
    JSON.stringify({ latestSha, checkedAt: Date.now() })
  );
}

async function checkForUpdates() {
  if (!shouldCheckUpdates()) {
    setVersionHtml(
      `v${LOCAL_VERSION} · <a href="${repoUrl()}" target="_blank" rel="noreferrer">GitHub</a>`
    );
    return;
  }

  const cached = getCachedCheck();
  const cacheMaxAgeMs = 6 * 60 * 60 * 1000; // 6h
  if (cached && Date.now() - cached.checkedAt < cacheMaxAgeMs) {
    return renderWithLatest(cached.latestSha);
  }

  try {
    const latestSha = await fetchLatestCommitSha();
    if (latestSha) setCachedCheck({ latestSha });
    renderWithLatest(latestSha);
  } catch {
    // No network / rate limited / blocked — show local only.
    setVersionHtml(
      `v${LOCAL_VERSION} · <a href="${repoUrl()}" target="_blank" rel="noreferrer">GitHub</a>`
    );
  }
}

function renderWithLatest(latestSha) {
  const localShort = LOCAL_VERSION;
  const latestShort = shortSha(latestSha);
  const same = latestShort && localShort && latestShort === localShort;

  if (!latestShort) {
    setVersionHtml(`v${localShort} · <a href="${repoUrl()}" target="_blank" rel="noreferrer">GitHub</a>`);
    return;
  }

  if (same) {
    setVersionHtml(
      `v${localShort} · up to date · <a href="${repoUrl("commits/" + BRANCH)}" target="_blank" rel="noreferrer">Commits</a>`
    );
    return;
  }

  setVersionHtml(
    `v${localShort} · <strong>Update verfügbar</strong> (latest ${latestShort}) · <a href="${repoUrl(
      "archive/refs/heads/" + BRANCH + ".zip"
    )}" target="_blank" rel="noreferrer">Download</a> · <a href="${repoUrl(
      "compare/" + localShort + "..." + latestShort
    )}" target="_blank" rel="noreferrer">Diff</a>`
  );
}

setVersionText(`v${LOCAL_VERSION}`);
checkForUpdates();

