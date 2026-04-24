import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const htmlFiles = ["index.html", "impressum.html", "datenschutz.html", "cookies.html"];
const semverRe = /^(\d+)\.(\d+)\.(\d+)$/;

function parseSemver(version) {
  const m = version.match(semverRe);
  if (!m) throw new Error(`Invalid semver: ${version}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpPatch(version) {
  const parsed = parseSemver(version);
  return formatSemver({ ...parsed, patch: parsed.patch + 1 });
}

function replaceMetaVersion(html, nextVersion) {
  const re = /(<meta\s+name=["']app-version["']\s+content=["'])([^"']+)(["']\s*\/?>)/i;
  if (!re.test(html)) return null;
  return html.replace(re, `$1${nextVersion}$3`);
}

function replaceSwVersion(swJs, nextVersion) {
  const re = /(const\s+APP_VERSION\s*=\s*["'])([^"']+)(["'];)/;
  if (!re.test(swJs)) return null;
  return swJs.replace(re, `$1${nextVersion}$3`);
}

async function readJson(file) {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

async function writeJson(file, data) {
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

async function main() {
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = await readJson(pkgPath);
  const currentVersion = pkg.version || "";
  if (!semverRe.test(currentVersion)) throw new Error(`package.json has invalid version: ${currentVersion}`);

  const to = readArg("--to");
  const nextVersion = to ? (semverRe.test(to) ? to : null) : bumpPatch(currentVersion);
  if (!nextVersion) throw new Error(`Invalid --to version: ${to}`);

  if (nextVersion === currentVersion) return;

  pkg.version = nextVersion;
  await writeJson(pkgPath, pkg);

  const lockPath = path.join(ROOT, "package-lock.json");
  try {
    const lock = await readJson(lockPath);
    if (typeof lock.version === "string") lock.version = nextVersion;
    if (lock.packages?.[""]?.version) lock.packages[""].version = nextVersion;
    await writeJson(lockPath, lock);
  } catch {
    // optional
  }

  for (const file of htmlFiles) {
    const filePath = path.join(ROOT, file);
    const content = await fs.readFile(filePath, "utf8");
    const updated = replaceMetaVersion(content, nextVersion);
    if (!updated) throw new Error(`Missing app-version meta in ${file}`);
    await fs.writeFile(filePath, updated, "utf8");
  }

  const swPath = path.join(ROOT, "service-worker.js");
  const sw = await fs.readFile(swPath, "utf8");
  const swUpdated = replaceSwVersion(sw, nextVersion);
  if (!swUpdated) throw new Error("Missing APP_VERSION const in service-worker.js");
  await fs.writeFile(swPath, swUpdated, "utf8");
}

await main();

