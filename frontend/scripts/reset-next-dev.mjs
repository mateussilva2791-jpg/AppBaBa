import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const nextBuildDir = join(projectRoot, ".next-dev");

if (existsSync(nextBuildDir)) {
  rmSync(nextBuildDir, { recursive: true, force: true });
  console.log("[dev-reset] Removed stale .next-dev directory before starting Next dev.");
} else {
  console.log("[dev-reset] No existing .next-dev directory found.");
}
