const OWNER = "Schello805";
const REPO = "signatur-generator";
const BRANCH = "main";

const VERSION_META = document.querySelector('meta[name="app-version"]');
const LOCAL_VERSION = (VERSION_META?.getAttribute("content") || "").trim() || "dev";
const VERSION_EL = document.getElementById("versionInfo");

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

function getCachedCheck() {
  const raw = window.localStorage.getItem("signaturgenerator:updatecheck:v2");
  const parsed = raw ? safeParse(raw) : null;
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.checkedAt || !parsed.latestSha) return null;
  return parsed;
}

function setCachedCheck({ latestSha }) {
  window.localStorage.setItem(
    "signaturgenerator:updatecheck:v2",
    JSON.stringify({ latestSha, checkedAt: Date.now() })
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
  setVersionHtml(`v${LOCAL_VERSION} · <a href="${repoUrl()}" target="_blank" rel="noreferrer">GitHub</a>`);
}

function renderWithLatest(latestSha) {
  const latestShort = shortSha(latestSha);
  const installed = getInstalledInfo();

  // If the user updated the app files (version changed), re-baseline.
  if (installed.version !== LOCAL_VERSION && latestSha) setInstalledInfo({ version: LOCAL_VERSION, sha: latestSha });
  // First run: remember current latest sha as installed baseline.
  if (!installed.sha && latestSha) setInstalledInfo({ version: LOCAL_VERSION, sha: latestSha });

  const baseline = getInstalledInfo();
  const baselineShort = shortSha(baseline.sha);
  const same = Boolean(latestShort && baselineShort && latestShort === baselineShort);

  if (!latestShort) return renderLocalOnly();

  if (same) {
    setVersionHtml(
      `v${LOCAL_VERSION} · up to date · GitHub ${latestShort} · <a href="${repoUrl(
        "commits/" + BRANCH
      )}" target="_blank" rel="noreferrer">Commits</a>`
    );
    return;
  }

  setVersionHtml(
    `v${LOCAL_VERSION} · <strong>Update verfügbar</strong> (GitHub ${latestShort}) · <a href="${repoUrl(
      "archive/refs/heads/" + BRANCH + ".zip"
    )}" target="_blank" rel="noreferrer">Download</a> · <a href="${repoUrl(
      "compare/" + (baselineShort || "main") + "..." + latestShort
    )}" target="_blank" rel="noreferrer">Diff</a> · <a href="#" data-action="reload">Neu laden</a>`
  );
}

async function checkForUpdates() {
  if (!shouldCheckUpdates()) return renderLocalOnly();

  const cached = getCachedCheck();
  const cacheMaxAgeMs = 6 * 60 * 60 * 1000; // 6h
  if (cached && Date.now() - cached.checkedAt < cacheMaxAgeMs) return renderWithLatest(cached.latestSha);

  try {
    const latestSha = await fetchLatestCommitSha();
    if (latestSha) setCachedCheck({ latestSha });
    renderWithLatest(latestSha);
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
