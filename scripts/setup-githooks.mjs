import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const gitDir = path.join(ROOT, ".git");
  if (!(await fileExists(gitDir))) return;

  const hooksPath = ".githooks";
  if (!(await fileExists(path.join(ROOT, hooksPath)))) return;

  try {
    await execFileAsync("git", ["config", "core.hooksPath", hooksPath], { cwd: ROOT });
  } catch {
    // git not available or non-git environment (ignore)
    return;
  }
}

await main();

