import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
console.log("cwd:", root);

const apiDir = path.join(root, "api");
console.log("api dir exists:", existsSync(apiDir));
if (existsSync(apiDir)) {
  console.log("api dir contents:", readdirSync(apiDir));
  const publicDir = path.join(apiDir, "public");
  console.log("api/public dir exists:", existsSync(publicDir));
  if (existsSync(publicDir)) {
    console.log("api/public dir contents:", readdirSync(publicDir));
    for (const name of ["home", "__diag"]) {
      const target = path.join(publicDir, name);
      if (existsSync(target)) {
        const st = statSync(target);
        console.log(`${name} => isFile:${st.isFile()} size:${st.size} mtime:${st.mtime}`);
        if (st.isFile()) console.log(`${name} content:`, readFileSync(target, "utf8").slice(0, 600));
      } else {
        console.log(`${name} => does not exist on disk (good, expected for a route)`);
      }
    }
  }
}

// Also check for any top-level "home" or stray export files that could be misrouted
for (const candidate of ["home", "home.json", "public", "dist", "build", ".output"]) {
  const p = path.join(root, candidate);
  console.log(`root/${candidate} exists:`, existsSync(p));
}
