import { existsSync, renameSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  path.join(root, "api", "public", "home"),
];

for (const target of targets) {
  if (existsSync(target)) {
    const backup = `${target}.stale-backup-2026-07-21`;
    renameSync(target, backup);
    console.log(`Statik golge dosyasi tasindi: ${target} -> ${backup}`);
  } else {
    console.log(`Statik golge dosyasi yok (iyi): ${target}`);
  }
}
