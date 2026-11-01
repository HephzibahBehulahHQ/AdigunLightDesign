import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
for (const path of ["src", "index.html"]) {
  try { cpSync(path, `dist/${path}`, { recursive: true }); } catch { /* M0 has no editor entry yet. */ }
}
console.log("Static build completed.");
